import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  Camera,
  CheckCircle2,
  Eye,
  KeyRound,
  Lock,
  Search,
  Swords,
  X,
} from 'lucide-react';
import { db } from '@/shared/api/firebase';
import { getAttendanceWeight } from '@/shared/domain/attendance';
import { getMadridTimeComponents, isClassInProgress } from '@/shared/domain/schedule';
import {
  ScheduleDomainModel,
  ScheduleExceptionDomainModel,
  SessionType,
} from '@/shared/domain/types';

export interface KioskMember {
  uid: string;
  alias: string;
  belt: string;
  stripes: number;
  beltSystem: string;
  accountStatus: string;
  photoUrl?: string;
}

export const KioskCheckinPage: React.FC = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [activeSchedule, setActiveSchedule] = useState<ScheduleDomainModel | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<KioskMember[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<KioskMember | null>(null);
  const [sessionType, setSessionType] = useState<SessionType>('PARTICIPANT');
  const [scannerActive, setScannerActive] = useState(false);
  const [lastCheckedInStudent, setLastCheckedInStudent] = useState<{
    alias: string;
    sessionType: SessionType;
    belt: string;
    timestamp: Date;
  } | null>(null);

  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [loadingCheckin, setLoadingCheckin] = useState(false);
  const [kioskPin, setKioskPin] = useState<string>('2470');

  const now = new Date();
  const madridNow = getMadridTimeComponents(now);

  // 1. Cargar configuración de seguridad (PIN) desde Firestore
  useEffect(() => {
    const fetchKioskConfig = async () => {
      try {
        const configSnap = await getDoc(doc(db, 'kiosk_config', 'security'));
        if (configSnap.exists() && configSnap.data().pin) {
          setKioskPin(String(configSnap.data().pin));
        }
      } catch (err) {
        // Fallback seguro al PIN predeterminado si no hay conexión
        console.warn('Usando configuración local de kiosco');
      }
    };
    fetchKioskConfig();
  }, []);

  // 2. Cargar horarios y detectar clase en curso en Madrid
  useEffect(() => {
    const loadSchedules = async () => {
      try {
        const schedSnap = await getDocs(query(collection(db, 'schedules'), where('active', '==', true)));
        const sList: ScheduleDomainModel[] = [];
        schedSnap.forEach((d) => sList.push({ id: d.id, ...(d.data() as Omit<ScheduleDomainModel, 'id'>) }));

        const excSnap = await getDocs(collection(db, 'scheduleExceptions'));
        const eList: ScheduleExceptionDomainModel[] = [];
        excSnap.forEach((d) => eList.push({ id: d.id, ...(d.data() as Omit<ScheduleExceptionDomainModel, 'id'>) }));

        // Encontrar clase en curso en horario peninsular
        const inProgress = sList.find((s) => isClassInProgress(s, eList, now));
        setActiveSchedule(inProgress || sList[0] || null);
      } catch (err) {
        console.error('Error cargando horarios en kiosco:', err);
      }
    };

    loadSchedules();
  }, []);

  // 3. Búsqueda segura en directorio público kiosk_members (SIN notas médicas ni datos privados)
  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const searchMembers = async () => {
      try {
        const membersSnap = await getDocs(
          query(collection(db, 'kiosk_members'), where('accountStatus', '==', 'ACTIVE'))
        );
        const term = searchTerm.toLowerCase();
        const matches: KioskMember[] = [];

        membersSnap.forEach((d) => {
          const data = d.data();
          if (data.alias?.toLowerCase().includes(term)) {
            matches.push({
              uid: d.id,
              alias: data.alias || 'Alumno',
              belt: data.belt || 'WHITE',
              stripes: Number(data.stripes || 0),
              beltSystem: data.beltSystem || 'ADULT',
              accountStatus: data.accountStatus || 'ACTIVE',
              photoUrl: data.photoUrl || '',
            });
          }
        });

        setSearchResults(matches.slice(0, 5));
      } catch (err) {
        console.error('Error buscando atletas en kiosco:', err);
      }
    };

    const timer = setTimeout(searchMembers, 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 4. Manejo de escáner de cámara para leer QR del móvil
  useEffect(() => {
    let stream: MediaStream | null = null;
    let detectorTimer: NodeJS.Timeout | null = null;

    if (scannerActive) {
      navigator.mediaDevices
        ?.getUserMedia({ video: { facingMode: 'environment' } })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play();
          }

          if ('BarcodeDetector' in window) {
            const barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
            detectorTimer = setInterval(async () => {
              if (videoRef.current && videoRef.current.readyState === 4) {
                try {
                  const codes = await barcodeDetector.detect(videoRef.current);
                  if (codes.length > 0) {
                    handleQrDetected(codes[0].rawValue);
                  }
                } catch {
                  // Fallback silencioso
                }
              }
            }, 300);
          }
        })
        .catch((err) => {
          console.error('No se pudo acceder a la cámara:', err);
        });
    }

    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (detectorTimer) clearInterval(detectorTimer);
    };
  }, [scannerActive]);

  const handleQrDetected = async (rawQr: string) => {
    try {
      const parsed = JSON.parse(rawQr);
      if (parsed.prefix === '247STUDIO' && parsed.uid) {
        setScannerActive(false);
        const memberDoc = await getDoc(doc(db, 'kiosk_members', parsed.uid));
        if (memberDoc.exists()) {
          const data = memberDoc.data();
          setSelectedStudent({
            uid: memberDoc.id,
            alias: data.alias || parsed.alias || 'Alumno',
            belt: data.belt || 'WHITE',
            stripes: Number(data.stripes || 0),
            beltSystem: data.beltSystem || 'ADULT',
            accountStatus: data.accountStatus || 'ACTIVE',
            photoUrl: data.photoUrl || '',
          });
        }
      }
    } catch {
      console.warn('QR no reconocido:', rawQr);
    }
  };

  // 5. Confirmación de Check-in respetando reservas previas e inmutabilidad de createdAt
  const handleConfirmCheckin = async (student: KioskMember) => {
    if (!activeSchedule) return;
    setLoadingCheckin(true);

    try {
      const bookingId = `bk_${student.uid}_${activeSchedule.id}_${madridNow.dateStr}`;
      const weight = getAttendanceWeight(sessionType);
      const bookingRef = doc(db, 'bookings', bookingId);
      const existingBooking = await getDoc(bookingRef);

      if (existingBooking.exists()) {
        // Si el alumno ya tenía reserva: actualizamos a ATTENDED sin sobreescribir createdAt
        await updateDoc(bookingRef, {
          status: 'ATTENDED',
          sessionType,
          attendanceWeight: weight,
          checkInSource: 'TABLET',
        });
      } else {
        // Si es drop-in o check-in sin reserva previa: creamos el booking inicial
        await setDoc(bookingRef, {
          uid: student.uid,
          scheduleId: activeSchedule.id,
          date: madridNow.dateStr,
          status: 'ATTENDED',
          sessionType,
          attendanceWeight: weight,
          checkInSource: 'TABLET',
          createdAt: serverTimestamp(),
        });
      }

      // Notificación visual de bienvenida
      setLastCheckedInStudent({
        alias: student.alias,
        sessionType,
        belt: student.belt,
        timestamp: new Date(),
      });

      setSelectedStudent(null);
      setSearchTerm('');
      setSearchResults([]);
    } catch (err) {
      console.error('Error confirmando check-in en kiosco:', err);
    } finally {
      setLoadingCheckin(false);
    }
  };

  // 6. Validación de PIN dinámico de administrador
  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === kioskPin) {
      navigate('/admin/personal');
    } else {
      setPinError(true);
      setPinInput('');
    }
  };

  return (
    <div className="min-h-screen bg-studio-navy text-white flex flex-col justify-between p-4 sm:p-8 select-none">
      {/* Header Kiosco */}
      <header className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="247Studio" className="w-12 h-12 rounded-2xl shadow-xl" />
          <div>
            <h1 className="text-xl font-black uppercase tracking-wider text-white">247Studio Check-in</h1>
            <span className="text-xs text-studio-red font-bold uppercase tracking-widest block">
              Tablet de Recepción
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeSchedule ? (
            <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl text-right">
              <span className="text-[10px] text-studio-cream/60 uppercase font-black tracking-wider block">
                Clase en Curso
              </span>
              <span className="text-sm font-black text-white">
                {activeSchedule.program} ({activeSchedule.startTime} - {activeSchedule.endTime})
              </span>
              <span className="text-xs text-studio-cream/70 block">Prof. {activeSchedule.professor}</span>
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl text-right">
              <span className="text-xs text-studio-cream/60">Sin clase activa ahora</span>
            </div>
          )}

          <button
            onClick={() => setPinModalOpen(true)}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 text-studio-cream hover:text-white transition"
            title="Panel de Administración"
          >
            <Lock className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Contenido Principal Kiosco */}
      <main className="flex-1 my-6 flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
        {/* Banner de Bienvenida tras Check-in Exitoso */}
        {lastCheckedInStudent && (
          <div className="w-full mb-6 p-5 rounded-3xl bg-gradient-to-r from-emerald-500/20 via-emerald-600/10 to-transparent border border-emerald-500/40 flex items-center justify-between animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-black shadow-lg">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wide">
                  ¡Bienvenido al Tatami, {lastCheckedInStudent.alias}!
                </h3>
                <span className="text-xs text-studio-cream/80">
                  Asistencia registrada como{' '}
                  <strong className="text-white">
                    {lastCheckedInStudent.sessionType === 'PARTICIPANT' ? 'Participante' : 'Observador'}
                  </strong>{' '}
                  · {lastCheckedInStudent.belt}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Selección / Confirmación del Alumno */}
        {selectedStudent ? (
          <div className="w-full p-6 sm:p-8 rounded-3xl bg-[#0c0f24] border border-white/15 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-studio-red/20 border border-studio-red/40 flex items-center justify-center text-studio-red font-black text-lg">
                  {selectedStudent.alias.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">{selectedStudent.alias}</h2>
                  <span className="text-xs text-studio-cream/70 font-mono">
                    Cinturón {selectedStudent.belt} · {selectedStudent.stripes} grados
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedStudent(null)}
                className="p-2 rounded-xl bg-white/5 text-studio-cream hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selector de Modalidad: Participante vs Observador */}
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase text-studio-cream tracking-wider">
                Modalidad de la Sesión de Hoy:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSessionType('PARTICIPANT')}
                  className={`p-4 rounded-2xl border text-left transition flex items-center gap-3 ${
                    sessionType === 'PARTICIPANT'
                      ? 'bg-studio-red/20 border-studio-red text-white shadow-lg'
                      : 'bg-white/5 border-white/10 text-studio-cream/70 hover:bg-white/10'
                  }`}
                >
                  <Swords className="w-5 h-5 text-studio-red shrink-0" />
                  <div>
                    <span className="text-xs font-black uppercase block">Participante</span>
                    <span className="text-[10px] opacity-70 block">Entrena y lucha (1.0)</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSessionType('OBSERVER')}
                  className={`p-4 rounded-2xl border text-left transition flex items-center gap-3 ${
                    sessionType === 'OBSERVER'
                      ? 'bg-amber-500/20 border-amber-500 text-white shadow-lg'
                      : 'bg-white/5 border-white/10 text-studio-cream/70 hover:bg-white/10'
                  }`}
                >
                  <Eye className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <span className="text-xs font-black uppercase block">Observador</span>
                    <span className="text-[10px] opacity-70 block">Lesión o estudio (0.5)</span>
                  </div>
                </button>
              </div>
            </div>

            <button
              onClick={() => handleConfirmCheckin(selectedStudent)}
              disabled={loadingCheckin}
              className="w-full py-4 bg-studio-red hover:bg-studio-red-dark text-white font-black text-sm uppercase tracking-wider rounded-2xl transition shadow-xl shadow-studio-red/30 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>{loadingCheckin ? 'Registrando...' : 'Confirmar Entrada al Tatami'}</span>
            </button>
          </div>
        ) : (
          /* Opciones de Identificación: Escaneo QR o Búsqueda por Nombre */
          <div className="w-full space-y-6">
            {/* Opción 1: Escáner QR con la Cámara */}
            <div className="p-6 rounded-3xl bg-[#0c0f24] border border-white/10 text-center space-y-4">
              <h2 className="text-sm font-black uppercase tracking-wider text-white">
                Opción 1: Escanear Código QR del Móvil
              </h2>

              {scannerActive ? (
                <div className="relative rounded-2xl overflow-hidden max-w-xs mx-auto border-2 border-studio-red shadow-2xl">
                  <video ref={videoRef} className="w-full h-56 object-cover" />
                  <div className="absolute inset-0 border-2 border-studio-red/50 rounded-2xl animate-pulse pointer-events-none" />
                  <button
                    onClick={() => setScannerActive(false)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setScannerActive(true)}
                  className="py-3 px-6 bg-studio-red hover:bg-studio-red-dark text-white font-black text-xs uppercase tracking-wider rounded-2xl transition shadow-lg shadow-studio-red/20 inline-flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>Activar Cámara de la Tablet</span>
                </button>
              )}
            </div>

            {/* Opción 2: Búsqueda rápida por nombre (kiosk_members) */}
            <div className="p-6 rounded-3xl bg-[#0c0f24] border border-white/10 space-y-4">
              <h2 className="text-sm font-black uppercase tracking-wider text-white">
                Opción 2: Buscar por Nombre o Alias
              </h2>

              <div className="relative">
                <Search className="w-4 h-4 text-studio-cream/50 absolute left-4 top-3.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Escribe tu nombre (mínimo 2 letras)..."
                  className="w-full pl-11 pr-4 py-3 bg-[#070914] border border-white/10 rounded-2xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-studio-red"
                />
              </div>

              {/* Resultados de Búsqueda Seguros */}
              {searchResults.length > 0 && (
                <div className="space-y-2 pt-2">
                  {searchResults.map((member) => (
                    <button
                      key={member.uid}
                      onClick={() => setSelectedStudent(member)}
                      className="w-full p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition flex items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-studio-red/20 border border-studio-red/30 flex items-center justify-center text-studio-red font-black text-sm">
                          {member.alias.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="text-sm font-bold text-white block">{member.alias}</span>
                          <span className="text-[11px] text-studio-cream/60">
                            Cinturón {member.belt} · {member.stripes} grados
                          </span>
                        </div>
                      </div>

                      <span className="text-xs font-black text-studio-red uppercase">
                        Seleccionar →
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modal de PIN de Seguridad para salir a Admin */}
      {pinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-xs bg-[#0c0f24] border border-white/15 rounded-3xl p-6 relative shadow-2xl text-center space-y-4">
            <button
              onClick={() => {
                setPinModalOpen(false);
                setPinError(false);
                setPinInput('');
              }}
              className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 text-studio-cream hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-studio-red/20 text-studio-red mx-auto flex items-center justify-center">
              <KeyRound className="w-6 h-6" />
            </div>

            <h3 className="text-base font-black uppercase text-white">Desbloqueo de Gestión</h3>
            <p className="text-xs text-studio-cream/70">
              Introduce el PIN de 4 dígitos para acceder al panel de administración.
            </p>

            <form onSubmit={handleVerifyPin} className="space-y-3">
              <input
                type="password"
                maxLength={4}
                autoFocus
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError(false);
                }}
                placeholder="••••"
                className="w-full py-3 bg-[#070914] border border-white/20 rounded-2xl text-center text-2xl font-mono tracking-widest text-white focus:outline-none focus:border-studio-red"
              />

              {pinError && (
                <span className="text-xs text-studio-red font-bold block">PIN incorrecto</span>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-studio-red hover:bg-studio-red-dark text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-studio-red/30"
              >
                Acceder a Administración
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Footer Kiosco */}
      <footer className="text-center text-[11px] text-studio-cream/40 border-t border-white/5 pt-3">
        247Studio Academy Check-in System · Madrid
      </footer>
    </div>
  );
};
