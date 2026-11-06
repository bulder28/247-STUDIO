import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import {
  ArrowRight,
  Sparkles,
  Swords,
  User,
} from 'lucide-react';
import { db } from '@/shared/api/firebase';
import { ScheduleDomainModel } from '@/shared/domain/types';

export const LandingPage: React.FC = () => {
  const [activeSchedules, setActiveSchedules] = useState<ScheduleDomainModel[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(true);

  useEffect(() => {
    const fetchPublicSchedules = async () => {
      try {
        // Query acotada con where('active', '==', true) para cumplir la regla de Firestore
        const q = query(collection(db, 'schedules'), where('active', '==', true));
        const snap = await getDocs(q);
        const list: ScheduleDomainModel[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<ScheduleDomainModel, 'id'>) }));
        setActiveSchedules(list);
      } catch (err) {
        console.error('Error fetching public schedule preview:', err);
      } finally {
        setLoadingSchedule(false);
      }
    };

    fetchPublicSchedules();
  }, []);

  const programs = [
    { title: 'BJJ GI', desc: 'Jiu-Jitsu tradicional con kimono. Defensa personal, estrangulaciones y palancas articulares.' },
    { title: 'GRAPPLING', desc: 'No-Gi y sumisión sin kimono. Enfoque dinámico, lucha cuerpo a cuerpo y transiciones rápidas.' },
    { title: 'KIDS 1', desc: 'Iniciación marcial, psicomotricidad, coordinación y disciplina para los más pequeños.' },
    { title: 'KIDS 2', desc: 'Técnica deportiva infantil, respeto, autocontrol y valores esenciales del tatami.' },
    { title: 'MMA', desc: 'Artes marciales mixtas: golpeo, derribos en la jaula y control en el suelo.' },
    { title: 'LUCHA', desc: 'Lucha olímpica y libre: dominio de derribos, agarres y control posicional de pie.' },
    { title: 'BJJ FEM', desc: 'Clase femenina exclusiva: técnica depurada, empoderamiento y comunidad.' },
    { title: 'OPEN MAT', desc: 'Tatami abierto para sparring libre, resolución de dudas y rodar con compañeros.' },
  ];

  const instructors = [
    { name: 'Mario', role: 'Head Coach & Cinturón Negro', bio: 'Especialista en BJJ de competición, metodología técnica y desarrollo de atletas.' },
    { name: 'David', role: 'Instructor & Especialista Grappling/Lucha', bio: 'Enfoque en derribos, transiciones explosivas y sumisiones de piernas.' },
  ];

  const days = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  return (
    <div className="space-y-24 py-8 sm:py-16">
      {/* 1. HERO SECTION */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-studio-red/15 text-studio-red border border-studio-red/30 text-xs font-black uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" /> Brazilian Jiu-Jitsu & Grappling en Madrid
        </div>

        <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tight text-white leading-tight">
          Entrena, Evoluciona y Domina el Tatami en <span className="text-studio-red">247Studio</span>
        </h1>

        <p className="text-base sm:text-lg text-studio-cream/80 max-w-2xl mx-auto leading-relaxed">
          Digitalizamos tu experiencia deportiva. Horarios en vivo, control de asistencia en tablet y seguimiento
          técnico de tu progresión de cinturón en una sola plataforma.
        </p>

        {/* Un único CTA grande */}
        <div className="pt-4">
          <Link
            to="/reserva-prueba"
            className="inline-flex items-center gap-3 py-4 px-8 rounded-2xl bg-studio-red hover:bg-studio-red-dark text-white font-black text-sm uppercase tracking-wider transition shadow-2xl shadow-studio-red/40 transform hover:scale-[1.02]"
          >
            <span>Reserva tu clase de prueba</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
          <span className="block text-xs text-studio-cream/60 mt-3 font-semibold">
            100% gratuita • Sin permanencia • Tatami abierto
          </span>
        </div>
      </section>

      {/* 2. PROGRAMAS (8 Cards Reales) */}
      <section id="programas" className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-black uppercase tracking-widest text-studio-red">Nuestras Disciplinas</span>
          <h2 className="text-3xl font-black uppercase text-white">Programas de Entrenamiento</h2>
          <p className="text-xs text-studio-cream/70 max-w-lg mx-auto">
            Planes adaptados desde principiantes absolutos hasta competidores de alto rendimiento.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {programs.map((p, idx) => (
            <div
              key={idx}
              className="bg-studio-navy-light/80 border border-white/10 rounded-3xl p-5 shadow-xl hover:border-studio-red/40 transition group"
            >
              <div className="w-10 h-10 rounded-xl bg-studio-navy border border-white/10 flex items-center justify-center mb-3 group-hover:scale-105 transition">
                <Swords className="w-5 h-5 text-studio-red" />
              </div>
              <h3 className="font-black text-sm uppercase text-white mb-1.5">{p.title}</h3>
              <p className="text-xs text-studio-cream/70 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. HORARIO PREVIEW (Lectura pública acotada) */}
      <section id="horario" className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="bg-gradient-to-b from-studio-navy-light/90 to-studio-navy border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-studio-red">Parrilla Semanal</span>
              <h2 className="text-2xl font-black uppercase text-white">Próximas Clases Destacadas</h2>
              <p className="text-xs text-studio-cream/70 mt-0.5">
                Consulta en vivo algunas de las sesiones semanales activas en el centro.
              </p>
            </div>

            <Link
              to="/reserva-prueba"
              className="py-2.5 px-4 bg-white/10 hover:bg-white/15 text-white font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 shrink-0"
            >
              <span>Ver horario completo</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="mt-6">
            {loadingSchedule ? (
              <div className="py-8 flex justify-center">
                <div className="w-6 h-6 border-2 border-studio-red border-t-transparent rounded-full animate-spin" />
              </div>
            ) : activeSchedules.length === 0 ? (
              <p className="text-xs text-studio-cream/60 text-center py-6">
                Horario en actualización. Consulta los detalles al reservar tu clase.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {activeSchedules.slice(0, 3).map((s) => (
                  <div
                    key={s.id}
                    className="p-4 bg-studio-navy rounded-2xl border border-white/5 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-black uppercase text-studio-red">{days[s.dayOfWeek]}</span>
                      <span className="font-mono font-bold text-white/90">{s.startTime} - {s.endTime}</span>
                    </div>
                    <div className="font-extrabold text-sm text-white">{s.program}</div>
                    <div className="text-[11px] text-studio-cream/70 flex items-center gap-1">
                      <User className="w-3 h-3 text-studio-cream/50" /> Prof. {s.professor}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4. INSTRUCTORES (Mario y David) */}
      <section id="instructores" className="max-w-5xl mx-auto px-4 sm:px-6 space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-black uppercase tracking-widest text-studio-red">Equipo Técnico</span>
          <h2 className="text-3xl font-black uppercase text-white">Nuestros Instructores</h2>
          <p className="text-xs text-studio-cream/70 max-w-lg mx-auto">
            Pasión marcial y dedicación pedagógica para acompañarte desde tu primera guardia.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {instructors.map((inst, i) => (
            <div
              key={i}
              className="bg-studio-navy-light/90 border border-white/10 rounded-3xl p-6 shadow-xl flex items-start gap-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-studio-navy border-2 border-studio-cream/30 flex items-center justify-center font-black text-xl text-studio-cream shrink-0">
                {inst.name[0]}
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-lg text-white">{inst.name}</h3>
                <span className="text-xs font-bold text-studio-red block">{inst.role}</span>
                <p className="text-xs text-studio-cream/70 leading-relaxed pt-1">{inst.bio}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. CTA FINAL */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <div className="bg-gradient-to-r from-studio-red-dark via-studio-red to-studio-navy p-8 sm:p-12 rounded-3xl shadow-2xl space-y-4">
          <h2 className="text-2xl sm:text-4xl font-black uppercase text-white tracking-tight">
            ¿Listo para Probar el Tatami de 247Studio?
          </h2>
          <p className="text-xs sm:text-sm text-studio-cream/90 max-w-xl mx-auto leading-relaxed">
            Ven a conocernos, rueda con nosotros y experimenta el Brazilian Jiu-Jitsu en un ambiente seguro y familiar.
          </p>
          <div className="pt-2">
            <Link
              to="/reserva-prueba"
              className="inline-flex items-center gap-2 py-3.5 px-6 rounded-xl bg-white text-studio-navy font-black text-xs uppercase tracking-wider hover:bg-studio-cream transition shadow-xl"
            >
              <span>Reserva tu clase de prueba gratis</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
