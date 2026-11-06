import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock,
  Eye,
  KeyRound,
  Lock,
  QrCode,
  Search,
  Swords,
  UserPlus,
  X,
} from 'lucide-react';
import QRCode from 'qrcode';
import { db } from '@/shared/api/firebase';
import { getAttendanceWeight } from '@/shared/domain/attendance';
import { getMadridTimeComponents, isClassInProgress } from '@/shared/domain/schedule';
import {
  ScheduleDomainModel,
  ScheduleExceptionDomainModel,
  SessionType,
} from '@/shared/domain/types';
import { Belt, beltLabelEs } from '@/widgets/Belt';

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

  // Estados para Alta Exprés de Prueba en Kiosco
  const [trialModalOpen, setTrialModalOpen] = useState(false);
  const [trialQrDataUrl, setTrialQrDataUrl] = useState<string>('');
  const [trialName, setTrialName] = useState('');
  const [trialPhone, setTrialPhone] = useState('');
  const [trialSuccess, setTrialSuccess] = useState(false);
  const [trialLoading, setTrialLoading] = useState(false);

  // Estado para advertencia de cuenta pausada / bloqueada
  const [accountAlert, setAccountAlert] = useState<{ alias: string; status: string } | null>(null);

  const now = new Date();
  const madridNow = getMadridTimeComponents(now);

  // Generar QR para el alta de prueba exprés desde el móvil del visitante
  useEffect(() => {
    const trialUrl = `${window.location.origin}/reserva-prueba?source=kiosk`;
    QRCode.toDataURL(trialUrl, { width: 220, margin: 1, color: { dark: '#0F172A', light: '#FFFFFF' } })
      .then(setTrialQrDataUrl)
      .catch(console.error);
  }, []);

  // 1. Cargar configuración de seguridad (PIN) desde Firestore
  useEffect(() => {
    const fetchKioskConfig = async () => {
      try {
        const configSnap = await getDoc(doc(db, 'kiosk_config', 'security'));
        if (configSnap.exists() && configSnap.data().pin) {
          setKioskPin(String(configSnap.data().pin));
        }
      } catch (err) {
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
        const membersSnap = await getDocs(collection(db, 'kiosk_members'));
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

  const handleSelectStudent = (member: KioskMember) => {
    if (member.accountStatus === 'PAUSED' || member.accountStatus === 'SUSPENDED') {
      setAccountAlert({ alias: member.alias, status: member.accountStatus });
      return;
    }
    setSelectedStudent(member);
  };

  const handleQrDetected = async (rawQr: string) => {
    try {
      const parsed = JSON.parse(rawQr);
      if (parsed.prefix === '247STUDIO' && parsed.uid) {
        setScannerActive(false);
        const memberDoc = await getDoc(doc(db, 'kiosk_members', parsed.uid));
        if (memberDoc.exists()) {
          const data = memberDoc.data();
          const status = data.accountStatus || 'ACTIVE';
          if (status === 'PAUSED' || status === 'SUSPENDED') {
            setAccountAlert({ alias: data.alias || parsed.alias || 'Atleta', status });
            return;
          }
          setSelectedStudent({
            uid: memberDoc.id,
            alias: data.alias || parsed.alias || 'Alumno',
            belt: data.belt || 'WHITE',
            stripes: Number(data.stripes || 0),
            beltSystem: data.beltSystem || 'ADULT',
            accountStatus: status,
            photoUrl: data.photoUrl || '',
          });
        } else {
          // Si el alumno aún no está indexado en kiosk_members, intentar leer de users o fallback con datos de QR
          try {
            const userDoc = await getDoc(doc(db, 'users', parsed.uid));
            if (userDoc.exists()) {
              const uData = userDoc.data();
              setSelectedStudent({
                uid: userDoc.id,
                alias: uData.alias || parsed.alias || 'Alumno',
                belt: uData.belt || 'WHITE',
                stripes: Number(uData.stripes || 0),
                beltSystem: uData.beltSystem || 'ADULT',
                accountStatus: uData.accountStatus || 'ACTIVE',
                photoUrl: uData.photoUrl || '',
              });
              return;
            }
          } catch {
            // Regla de Firestore deniega lectura si es rol kiosk
          }

          // Fallback inmediato con el payload firmado
          setSelectedStudent({
            uid: parsed.uid,
            alias: parsed.alias || 'Alumno',
            belt: 'WHITE',
            stripes: 0,
            beltSystem: 'ADULT',
            accountStatus: 'ACTIVE',
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

      // Sincronizar contador agregado en class_capacity
      const capRef = doc(db, 'class_capacity', `cap_${activeSchedule.id}_${madridNow.dateStr}`);
      await setDoc(
        capRef,
        {
          scheduleId: activeSchedule.id,
          date: madridNow.dateStr,
          bookedCount: increment(existingBooking.exists() ? 0 : 1),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

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

  const handleExpressTrialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trialName.trim() || !trialPhone.trim()) return;
    setTrialLoading(true);

    try {
      const leadId = `lead_kiosk_${Date.now()}`;
      await setDoc(doc(db, 'leads', leadId), {
        name: trialName.trim(),
        email: `prueba_${Date.now()}@247studio.local`,
        phone: trialPhone.trim(),
        scheduleId: activeSchedule?.id || 'trial_kiosk',
        status: 'NEW',
        honeypot: '',
        createdAt: serverTimestamp(),
      });

      setTrialSuccess(true);
      setTimeout(() => {
        setTrialSuccess(false);
        setTrialModalOpen(false);
        setTrialName('');
        setTrialPhone('');
      }, 2500);
    } catch (err) {
      console.error('Error registrando prueba exprés:', err);
    } finally {
      setTrialLoading(false);
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
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 flex flex-col justify-between p-4 sm:p-8 select-none font-sans antialiased">
      {/* ======================================================== */}
      {/* 1. CABECERA KIOSCO - ESTILO MATGOAT LIMPIO               */}
      {/* ======================================================== */}
      <header className="flex items-center justify-between pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <img src="/logo.webp" alt="247Studio" className="w-10 h-10 object-contain" />
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-headline text-2xl font-bold tracking-tight text-slate-900 uppercase leading-none">
                247STUDIO
              </h1>
              <span className="w-2 h-2 rounded-full bg-brand-accent inline-block" />
            </div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
              Tablet de Recepción & Asistencia
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeSchedule ? (
            <div className="bg-white border border-slate-200/80 px-4 py-2 rounded-2xl shadow-sm text-right">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center justify-end gap-1">
                <Clock className="w-3 h-3 text-emerald-600" />
                Clase en curso
              </span>
              <span className="text-sm font-extrabold text-slate-900 block leading-tight">
                {activeSchedule.program} ({activeSchedule.startTime} - {activeSchedule.endTime})
              </span>
              <span className="text-xs text-slate-500 font-medium block">
                Prof. {activeSchedule.professor}
              </span>
            </div>
          ) : (
            <div className="bg-white border border-slate-200/80 px-4 py-2 rounded-2xl shadow-sm text-right">
              <span className="text-xs text-slate-400 font-medium">Sin clase activa ahora</span>
            </div>
          )}

          <button
            onClick={() => setPinModalOpen(true)}
            className="p-3 bg-white hover:bg-slate-50 rounded-2xl border border-slate-200/80 text-slate-400 hover:text-slate-800 transition shadow-sm cursor-pointer"
            title="Panel de Administración"
          >
            <Lock className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. CONTENIDO PRINCIPAL                                    */}
      {/* ======================================================== */}
      <main className="flex-1 my-6 flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
        {/* Banner de Bienvenida tras Check-in Exitoso */}
        {lastCheckedInStudent && (
          <div className="w-full mb-6 p-5 rounded-3xl bg-emerald-50 border border-emerald-200/90 flex items-center justify-between shadow-sm animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-sm">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                  ¡Bienvenido al tatami, {lastCheckedInStudent.alias}!
                </h3>
                <span className="text-xs text-slate-600 font-medium">
                  Asistencia registrada como{' '}
                  <strong className="text-slate-900 font-bold">
                    {lastCheckedInStudent.sessionType === 'PARTICIPANT' ? 'Participante (1.0)' : 'Observador (0.5)'}
                  </strong>{' '}
                  · {beltLabelEs(lastCheckedInStudent.belt)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL DE CONFIRMACIÓN DE ENTRADA DEL ALUMNO             */}
        {/* ======================================================== */}
        {selectedStudent ? (
          <div className="w-full p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-4">
                <div className="w-20 shrink-0">
                  <Belt belt={selectedStudent.belt} stripes={selectedStudent.stripes} decorative className="h-5 drop-shadow-sm" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">{selectedStudent.alias}</h2>
                  <span className="text-xs text-slate-500 font-medium">
                    Cinturón {beltLabelEs(selectedStudent.belt)} · {selectedStudent.stripes} {selectedStudent.stripes === 1 ? 'grado' : 'grados'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedStudent(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selector de Modalidad: Participante vs Observador */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Modalidad de la Sesión de Hoy:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSessionType('PARTICIPANT')}
                  className={`p-4 rounded-2xl border text-left transition flex items-center gap-3 cursor-pointer ${
                    sessionType === 'PARTICIPANT'
                      ? 'bg-rose-50 border-brand-accent text-slate-900 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Swords className="w-5 h-5 text-brand-accent shrink-0" />
                  <div>
                    <span className="text-xs font-extrabold uppercase block">Participante</span>
                    <span className="text-[10px] text-slate-500 block">Entrena y lucha (1.0)</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSessionType('OBSERVER')}
                  className={`p-4 rounded-2xl border text-left transition flex items-center gap-3 cursor-pointer ${
                    sessionType === 'OBSERVER'
                      ? 'bg-amber-50 border-amber-400 text-slate-900 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Eye className="w-5 h-5 text-amber-500 shrink-0" />
                  <div>
                    <span className="text-xs font-extrabold uppercase block">Observador</span>
                    <span className="text-[10px] text-slate-500 block">Lesión o estudio (0.5)</span>
                  </div>
                </button>
              </div>
            </div>

            <button
              onClick={() => handleConfirmCheckin(selectedStudent)}
              disabled={loadingCheckin}
              className="w-full py-4 bg-brand-accent hover:bg-brand-accent/90 text-white font-bold text-sm uppercase tracking-wider rounded-2xl transition shadow-lg shadow-brand-accent/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>{loadingCheckin ? 'Registrando...' : 'Confirmar Entrada al Tatami'}</span>
            </button>
          </div>
        ) : (
          /* ======================================================== */
          /* PANTALLA PRINCIPAL DE IDENTIFICACIÓN                     */
          /* ======================================================== */
          <div className="w-full space-y-5">
            {/* Opción 1: Escáner QR con la Cámara */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/90 text-center space-y-4 shadow-sm">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
                Opción 1: Escanear Pase QR del Móvil
              </h2>

              {scannerActive ? (
                <div className="relative rounded-2xl overflow-hidden max-w-xs mx-auto border-2 border-brand-accent shadow-xl bg-black">
                  <video ref={videoRef} className="w-full h-56 object-cover" />
                  <div className="absolute inset-0 border-2 border-brand-accent/50 rounded-2xl animate-pulse pointer-events-none" />
                  <button
                    onClick={() => setScannerActive(false)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setScannerActive(true)}
                  className="py-3 px-6 bg-brand-accent hover:bg-brand-accent/90 text-white font-bold text-xs uppercase tracking-wider rounded-2xl transition shadow-md shadow-brand-accent/20 inline-flex items-center gap-2 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Activar Cámara de la Tablet</span>
                </button>
              )}
            </div>

            {/* Opción 2: Búsqueda rápida por nombre (kiosk_members) */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/90 space-y-4 shadow-sm">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
                Opción 2: Buscar por Nombre o Alias
              </h2>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Escribe tu nombre (mínimo 2 letras)..."
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-accent focus:bg-white transition"
                />
              </div>

              {/* Resultados de Búsqueda Seguros */}
              {searchResults.length > 0 && (
                <div className="space-y-2 pt-2">
                  {searchResults.map((member) => (
                    <button
                      key={member.uid}
                      onClick={() => handleSelectStudent(member)}
                      className="w-full p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/70 transition flex items-center justify-between text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-14 shrink-0">
                          <Belt belt={member.belt} stripes={member.stripes} decorative className="h-3.5" />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-slate-900 block">{member.alias}</span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {beltLabelEs(member.belt)} · {member.stripes} {member.stripes === 1 ? 'grado' : 'grados'}
                            {member.accountStatus !== 'ACTIVE' && (
                              <span className="ml-2 text-rose-600 font-mono text-[10px]">
                                ({member.accountStatus})
                              </span>
                            )}
                          </span>
                        </div>
                      </div>

                      <span className="text-xs font-bold text-brand-accent uppercase">
                        Seleccionar →
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Opción 3: Alta Exprés para Clase de Prueba */}
            <div className="p-5 rounded-3xl bg-white border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-accent block">
                  ¿Primera vez en 247Studio?
                </span>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight mt-0.5">
                  Clase de Prueba Exprés
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Escanea el código QR con tu móvil para registrarte y pasar al tatami.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setTrialModalOpen(true)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition shrink-0 cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-brand-accent" />
                <span>Ver QR de Prueba</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ======================================================== */}
      {/* 3. MODAL PIN DE ADMINISTRADOR                            */}
      {/* ======================================================== */}
      {pinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xs bg-white border border-slate-200 rounded-3xl p-6 relative shadow-2xl text-center space-y-4">
            <button
              onClick={() => {
                setPinModalOpen(false);
                setPinError(false);
                setPinInput('');
              }}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-brand-accent mx-auto flex items-center justify-center border border-rose-100">
              <KeyRound className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-extrabold text-slate-900">Desbloqueo de Gestión</h3>
              <p className="text-xs text-slate-500 mt-1">
                Introduce el PIN de 4 dígitos para acceder al panel de administración.
              </p>
            </div>

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
                className="w-full py-3 bg-slate-50 border border-slate-200 rounded-2xl text-center text-2xl font-mono tracking-widest text-slate-900 focus:outline-none focus:border-brand-accent focus:bg-white transition"
              />

              {pinError && (
                <span className="text-xs text-rose-600 font-bold block">PIN incorrecto</span>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-slate-900 hover:bg-black text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow cursor-pointer"
              >
                Acceder a Administración
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. MODAL ALERTA DE CUENTA PAUSADA                        */}
      {/* ======================================================== */}
      {accountAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white border border-rose-200 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center border border-rose-100">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900">Membresía Pausada</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Hola, <strong className="text-slate-900">{accountAlert.alias}</strong>. Tu cuenta se encuentra actualmente en estado{' '}
              <strong className="text-rose-600 font-mono">“{accountAlert.status}”</strong>.
            </p>
            <p className="text-xs text-slate-500">
              Por favor acude al mostrador de recepción con el profesor para revisar tu ficha antes de pasar al tatami.
            </p>
            <button
              onClick={() => setAccountAlert(null)}
              className="w-full py-2.5 bg-slate-900 hover:bg-black text-white font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. MODAL ALTA EXPRÉS DE PRUEBA                           */}
      {/* ======================================================== */}
      {trialModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 relative shadow-2xl space-y-4">
            <button
              onClick={() => setTrialModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-accent bg-rose-50 px-2.5 py-0.5 rounded-full inline-block border border-rose-100 mb-2">
                Clase de Prueba Gratuita
              </span>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Alta Exprés en Recepción
              </h3>
            </div>

            {trialSuccess ? (
              <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h4 className="text-lg font-bold text-slate-900">¡Bienvenido al Tatami!</h4>
                <p className="text-xs text-slate-600">
                  Tus datos han quedado registrados. Pasa al tatami y habla con el profesor.
                </p>
              </div>
            ) : (
              <>
                {/* QR para hacerlo en el móvil */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center space-y-3">
                  <span className="text-xs font-bold text-slate-700 block">
                    Escanea con tu cámara móvil para firmar en tu teléfono:
                  </span>
                  {trialQrDataUrl && (
                    <img
                      src={trialQrDataUrl}
                      alt="QR Alta Exprés"
                      className="w-36 h-36 mx-auto rounded-xl shadow-sm border border-slate-200 p-1 bg-white"
                    />
                  )}
                  <span className="text-[10px] text-slate-400 block font-mono">
                    247studio.netlify.app/reserva-prueba
                  </span>
                </div>

                {/* Formulario rápido en tablet si no tiene móvil a mano */}
                <form onSubmit={handleExpressTrialSubmit} className="space-y-3 pt-2 border-t border-slate-100">
                  <span className="text-xs font-semibold text-slate-700 block">
                    O introduce tus datos directamente en esta tablet:
                  </span>
                  <input
                    type="text"
                    required
                    value={trialName}
                    onChange={(e) => setTrialName(e.target.value)}
                    placeholder="Nombre y apellidos"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-accent focus:bg-white transition"
                  />
                  <input
                    type="tel"
                    required
                    value={trialPhone}
                    onChange={(e) => setTrialPhone(e.target.value)}
                    placeholder="Número de teléfono móvil"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-accent focus:bg-white transition"
                  />
                  <button
                    type="submit"
                    disabled={trialLoading}
                    className="w-full py-3 bg-brand-accent hover:bg-brand-accent/90 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{trialLoading ? 'Registrando...' : 'Entrar a la clase de prueba'}</span>
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Footer Kiosco */}
      <footer className="text-center text-[11px] text-slate-400 border-t border-slate-200/80 pt-3">
        247Studio Academy Check-in System · Madrid
      </footer>
    </div>
  );
};
