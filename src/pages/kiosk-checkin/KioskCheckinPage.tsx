import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
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
  User,
  X,
} from 'lucide-react';
import { db } from '@/shared/api/firebase';
import { getAttendanceWeight } from '@/shared/domain/attendance';
import { getMadridTimeComponents, isClassInProgress } from '@/shared/domain/schedule';
import {
  ScheduleDomainModel,
  ScheduleExceptionDomainModel,
  SessionType,
  UserDomainModel,
} from '@/shared/domain/types';

export const KioskCheckinPage: React.FC = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [activeSchedule, setActiveSchedule] = useState<ScheduleDomainModel | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserDomainModel[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<UserDomainModel | null>(null);
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

  const now = new Date();
  const madridNow = getMadridTimeComponents(now);

  // Cargar horarios y detectar clase en curso
  useEffect(() => {
    const loadSchedules = async () => {
      try {
        const schedSnap = await getDocs(query(collection(db, 'schedules'), where('active', '==', true)));
        const sList: ScheduleDomainModel[] = [];
        schedSnap.forEach((d) => sList.push({ id: d.id, ...(d.data() as Omit<ScheduleDomainModel, 'id'>) }));

        const excSnap = await getDocs(collection(db, 'scheduleExceptions'));
        const eList: ScheduleExceptionDomainModel[] = [];
        excSnap.forEach((d) => eList.push({ id: d.id, ...(d.data() as Omit<ScheduleExceptionDomainModel, 'id'>) }));

        // Encontrar clase en curso en Madrid
        const inProgress = sList.find((s) => isClassInProgress(s, eList, now));
        setActiveSchedule(inProgress || sList[0] || null);
      } catch (err) {
        console.error('Error in kiosk:', err);
      }
    };

    loadSchedules();
  }, []);

  // Búsqueda por nombre (mínimo 2 letras)
  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const searchUsers = async () => {
      try {
        const usersSnap = await getDocs(
          query(collection(db, 'users'), where('accountStatus', '==', 'ACTIVE'))
        );
        const term = searchTerm.toLowerCase();
        const matches: UserDomainModel[] = [];

        usersSnap.forEach((d) => {
          const data = d.data() as Omit<UserDomainModel, 'uid'>;
          if (
            data.alias?.toLowerCase().includes(term) ||
            data.contactEmail?.toLowerCase().includes(term)
          ) {
            matches.push({ uid: d.id, ...data } as UserDomainModel);
          }
        });

        setSearchResults(matches.slice(0, 5));
      } catch (err) {
        console.error('Error searching users in kiosk:', err);
      }
    };

    const timer = setTimeout(searchUsers, 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Manejo de escáner de cámara para leer QR del móvil
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

          // BarcodeDetector API si está disponible en Chromium/Android
          if ('BarcodeDetector' in window) {
            const barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
            detectorTimer = setInterval(async () => {
              if (videoRef.current && videoRef.current.readyState === 4) {
                try {
                  const codes = await barcodeDetector.detect(videoRef.current);
                  if (codes.length > 0) {
                    const rawValue = codes[0].rawValue;
                    handleQrDetected(rawValue);
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
        const snap = await getDocs(query(collection(db, 'users'), where('__name__', '==', parsed.uid)));
        if (!snap.empty) {
          const uData = { uid: snap.docs[0].id, ...(snap.docs[0].data() as Omit<UserDomainModel, 'uid'>) };
          setSelectedStudent(uData);
        }
      }
    } catch {
      console.warn('QR no reconocido:', rawQr);
    }
  };

  const handleConfirmCheckin = async (student: UserDomainModel) => {
    if (!activeSchedule) return;
    setLoadingCheckin(true);

    try {
      const bookingId = `bk_${student.uid}_${activeSchedule.id}_${madridNow.dateStr}`;
      const weight = getAttendanceWeight(sessionType);

      await setDoc(
        doc(db, 'bookings', bookingId),
        {
          uid: student.uid,
          scheduleId: activeSchedule.id,
          date: madridNow.dateStr,
          status: 'ATTENDED',
          sessionType,
          attendanceWeight: weight,
          checkInSource: 'TABLET',
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );

      // Notificación sonora/visual de bienvenida
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
      console.error('Error confirming kiosk checkin:', err);
    } finally {
      setLoadingCheckin(false);
    }
  };

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    // PIN por defecto para el centro 2470
    if (pinInput === '2470') {
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
            <p className="text-xs text-studio-cream/70 font-semibold tracking-wide">
              Tablet de Recepción • Registro Presencial
            </p>
          </div>
        </div>

        {/* Bloqueo PIN Admin */}
        <button
          onClick={() => {
            setPinModalOpen(true);
            setPinError(false);
          }}
          className="p-3 bg-white/5 hover:bg-white/10 text-studio-cream rounded-2xl border border-white/10 transition"
          title="Salir del Modo Kiosco"
        >
          <Lock className="w-5 h-5" />
        </button>
      </header>

      {/* Main Kiosk Content */}
      <main className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full my-6">
        {/* Banner de Clase Activa */}
        <div className="mb-6 p-4 rounded-3xl bg-studio-navy-light/95 border border-white/15 shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-studio-red text-white rounded-2xl shadow-lg shadow-studio-red/30">
              <Swords className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Clase en Tatami
              </span>
              <h2 className="text-lg font-black text-white">
                {activeSchedule ? activeSchedule.program : 'Entrenamiento Libre'}
              </h2>
              <span className="text-xs text-studio-cream/70">
                {activeSchedule ? `${activeSchedule.startTime} a ${activeSchedule.endTime} • Prof. ${activeSchedule.professor}` : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Modal / Selector de Estudiante Identificado */}
        {selectedStudent ? (
          <div className="bg-studio-navy-light border-2 border-studio-red rounded-3xl p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="text-center mb-6">
              <div className="w-20 h-20 rounded-2xl bg-studio-navy border-2 border-studio-cream/40 flex items-center justify-center mx-auto mb-3 shadow">
                <User className="w-10 h-10 text-studio-cream" />
              </div>
              <h3 className="text-2xl font-black text-white">{selectedStudent.alias}</h3>
              <p className="text-xs text-studio-cream/70 mt-1 uppercase font-bold tracking-wider">
                Cinturón {selectedStudent.belt} ({selectedStudent.stripes} grados)
              </p>
            </div>

            {/* Selector Participante vs Observador */}
            <div className="mb-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-studio-cream mb-2 text-center">
                ¿Cómo entrenas hoy?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSessionType('PARTICIPANT')}
                  className={`py-3.5 px-4 rounded-2xl border text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition ${
                    sessionType === 'PARTICIPANT'
                      ? 'bg-studio-red text-white border-studio-red shadow-lg shadow-studio-red/30'
                      : 'bg-studio-navy text-studio-cream/70 border-white/10'
                  }`}
                >
                  <Swords className="w-4 h-4" />
                  <span>Participante (1.0)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSessionType('OBSERVER')}
                  className={`py-3.5 px-4 rounded-2xl border text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition ${
                    sessionType === 'OBSERVER'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/30'
                      : 'bg-studio-navy text-studio-cream/70 border-white/10'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  <span>Observador (0.5)</span>
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="flex-1 py-3.5 rounded-2xl border border-white/10 text-xs font-bold uppercase text-studio-cream hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={loadingCheckin}
                onClick={() => handleConfirmCheckin(selectedStudent)}
                className="flex-1 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-studio-navy font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2"
              >
                {loadingCheckin ? (
                  <div className="w-5 h-5 border-2 border-studio-navy border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" /> Confirmar Check-in
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Opción 1: Escanear QR con Cámara */}
            <div className="bg-studio-navy-light/95 border border-white/15 rounded-3xl p-6 text-center shadow-xl">
              {scannerActive ? (
                <div className="space-y-3">
                  <div className="relative w-full max-w-xs mx-auto aspect-square rounded-2xl overflow-hidden border-2 border-studio-red bg-black">
                    <video ref={videoRef} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 border-2 border-studio-cream/40 rounded-2xl pointer-events-none" />
                  </div>
                  <button
                    onClick={() => setScannerActive(false)}
                    className="py-2 px-4 rounded-xl bg-white/10 text-xs font-bold text-studio-cream hover:bg-white/20"
                  >
                    Detener Cámara
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setScannerActive(true)}
                  className="w-full py-5 px-6 rounded-2xl bg-gradient-to-r from-studio-red to-studio-red-dark hover:brightness-110 text-white font-black text-sm uppercase tracking-wider shadow-xl shadow-studio-red/30 flex items-center justify-center gap-3 transition"
                >
                  <Camera className="w-6 h-6" />
                  <span>Escanear QR de mi Móvil</span>
                </button>
              )}
            </div>

            {/* Separador */}
            <div className="flex items-center gap-3 text-studio-cream/40 text-xs font-bold uppercase tracking-wider">
              <div className="flex-1 h-px bg-white/10" />
              <span>O busca por tu nombre</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Opción 2: Búsqueda Táctil por Nombre */}
            <div className="bg-studio-navy-light/95 border border-white/15 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="relative">
                <Search className="w-5 h-5 text-studio-cream/50 absolute left-4 top-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Escribe tu nombre o alias (mínimo 2 letras)..."
                  className="w-full pl-12 pr-4 py-3.5 bg-studio-navy border border-white/10 rounded-2xl text-base text-white placeholder-white/30 focus:outline-none focus:border-studio-red shadow-inner"
                />
              </div>

              {/* Resultados */}
              {searchResults.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-white/10">
                  {searchResults.map((user) => (
                    <button
                      key={user.uid}
                      onClick={() => setSelectedStudent(user)}
                      className="w-full p-3.5 bg-studio-navy hover:bg-white/10 rounded-xl border border-white/10 flex items-center justify-between text-left transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-studio-navy-light border border-white/10 flex items-center justify-center font-black text-sm text-studio-cream">
                          {user.alias?.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-extrabold text-sm text-white block">{user.alias}</span>
                          <span className="text-[11px] text-studio-cream/60">
                            Cinturón {user.belt} ({user.stripes} grados)
                          </span>
                        </div>
                      </div>

                      <span className="text-xs font-black text-studio-red uppercase tracking-wider">
                        Registrar →
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notificación de Último Check-in */}
        {lastCheckedInStudent && (
          <div className="mt-6 p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold text-center flex items-center justify-center gap-2 animate-in fade-in duration-300">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>
              ¡Check-in confirmado para <strong>{lastCheckedInStudent.alias}</strong>! Disfruta del entrenamiento.
            </span>
          </div>
        )}
      </main>

      {/* Footer Kiosco */}
      <footer className="text-center text-xs text-studio-cream/50 pt-4 border-t border-white/10">
        247Studio WebApp • Modo Kiosco v1.0
      </footer>

      {/* Modal Salida por PIN */}
      {pinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-studio-navy-light border border-white/20 rounded-3xl max-w-xs w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-sm uppercase text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-studio-red" /> PIN de Seguridad
              </h3>
              <button
                onClick={() => setPinModalOpen(false)}
                className="p-1 rounded-full text-studio-cream/60 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-studio-cream/70 mb-4">
              Introduce el PIN de 4 dígitos para salir al panel de administración.
            </p>

            <form onSubmit={handleVerifyPin} className="space-y-4">
              <input
                type="password"
                maxLength={4}
                autoFocus
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="••••"
                className="w-full text-center text-2xl font-mono tracking-widest py-3 bg-studio-navy border border-white/10 rounded-xl text-white focus:outline-none focus:border-studio-red"
              />

              {pinError && (
                <p className="text-xs text-studio-red font-bold text-center">PIN incorrecto.</p>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-studio-red hover:bg-studio-red-dark text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow"
              >
                Desbloquear
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
