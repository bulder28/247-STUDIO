import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/shared/api/firebase';
import { DEFAULT_OFFICIAL_SCHEDULES } from '@/shared/domain/schedule';
import { ScheduleDomainModel } from '@/shared/domain/types';
import { BeltLadder } from '@/widgets/Belt';

const programs = [
  { title: 'BJJ GI', who: '', desc: 'Jiu-jitsu tradicional con kimono. Defensa personal, estrangulaciones y palancas articulares.' },
  { title: 'GRAPPLING', who: '', desc: 'Sumisión sin kimono. Lucha cuerpo a cuerpo, ritmo alto y transiciones rápidas.' },
  { title: 'MMA', who: '', desc: 'Artes marciales mixtas: golpeo, derribos y control en el suelo.' },
  { title: 'LUCHA', who: '', desc: 'Lucha olímpica y libre: derribos, agarres y control de pie.' },
  { title: 'OPEN MAT', who: '', desc: 'Tatami abierto para sparring libre, resolver dudas y rodar con compañeros.' },
  { title: 'BJJ FEM', who: 'Mujeres', desc: 'Clase femenina: técnica depurada y comunidad.' },
  { title: 'KIDS 1', who: 'Niños', desc: 'Iniciación marcial: psicomotricidad, coordinación y disciplina para los más pequeños.' },
  { title: 'KIDS 2', who: 'Niños', desc: 'Técnica deportiva infantil, respeto y autocontrol en el tatami.' },
];

const instructors = [
  {
    name: 'Mario',
    role: 'Head coach, cinturón negro',
    bio: 'Especialista en BJJ de competición. Metodología técnica y desarrollo de atletas.',
  },
  {
    name: 'David',
    role: 'Instructor de grappling y lucha',
    bio: 'Derribos, transiciones explosivas y sumisiones de piernas.',
  },
];

const DAYS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const wrap = 'max-w-6xl mx-auto px-5 sm:px-8';

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
        list.sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));
        setActiveSchedules(list.length > 0 ? list : DEFAULT_OFFICIAL_SCHEDULES);
      } catch (err) {
        console.error('Error fetching public schedule preview:', err);
      } finally {
        setLoadingSchedule(false);
      }
    };

    fetchPublicSchedules();
  }, []);

  return (
    <>
      {/* Portada */}
      <section className="bg-studio-navy">
        <div className={`${wrap} py-16 sm:py-24 grid gap-14 lg:grid-cols-[1fr_1fr] lg:items-center`}>
          <div>
            <h1 className="font-display text-[4.25rem] sm:text-[6.5rem] lg:text-[7.5rem] uppercase text-white">
              Todos empezamos de blanco.
            </h1>
            <p className="mt-8 max-w-md text-lg leading-relaxed text-studio-cream">
              Jiu-jitsu brasileño, grappling, MMA y lucha en Madrid. Tu primera clase es gratis y no hay
              permanencia.
            </p>
            <div className="mt-9">
              <Link to="/reserva-prueba" className="btn-red text-lg px-8 py-4">
                Reserva tu clase de prueba
              </Link>
            </div>
          </div>

          <BeltLadder className="lg:pl-6" />
        </div>
      </section>

      {/* Programas */}
      <section id="programas" className="bg-studio-cream text-studio-navy">
        <div className={`${wrap} py-20 sm:py-28`}>
          <h2 className="font-display text-5xl sm:text-6xl">Qué puedes entrenar</h2>

          <ul className="mt-12 border-t-2 border-studio-navy">
            {programs.map((p) => (
              <li
                key={p.title}
                className="grid gap-x-10 gap-y-1 border-b border-studio-navy/25 py-5 sm:grid-cols-[13rem_1fr_6rem] sm:items-baseline"
              >
                <h3 className="font-display text-3xl uppercase">{p.title}</h3>
                <p className="max-w-lg text-[15px] leading-relaxed text-studio-navy/85">{p.desc}</p>
                <span className="text-sm font-semibold text-studio-red-dark sm:text-right">{p.who}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Horario */}
      <section id="horario" className="bg-studio-navy">
        <div className={`${wrap} py-20 sm:py-28`}>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="font-display text-5xl sm:text-6xl text-white">Cuándo se entrena</h2>
            <Link to="/reserva-prueba" className="btn-outline text-studio-cream self-start sm:self-auto">
              Ver horario completo
            </Link>
          </div>

          <div className="mt-12 border-t-2 border-studio-cream">
            {loadingSchedule ? (
              <div className="py-10" role="status" aria-label="Cargando horario">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-studio-red border-t-transparent" />
              </div>
            ) : activeSchedules.length === 0 ? (
              <p className="py-8 text-studio-cream">
                Horario en actualización. Consulta los detalles al reservar tu clase.
              </p>
            ) : (
              <ul>
                {activeSchedules.slice(0, 6).map((s) => (
                  <li
                    key={s.id}
                    className="grid grid-cols-[6.5rem_1fr] gap-x-6 gap-y-0.5 border-b border-white/15 py-4 sm:grid-cols-[9rem_10rem_1fr_auto] sm:items-baseline"
                  >
                    <span className="font-display text-2xl text-white">{DAYS[s.dayOfWeek]}</span>
                    <span className="num text-lg font-semibold text-studio-cream">
                      {s.startTime} a {s.endTime}
                    </span>
                    <span className="col-span-2 sm:col-span-1 font-semibold text-white">{s.program}</span>
                    <span className="col-span-2 sm:col-span-1 text-sm text-studio-cream/75">
                      Prof. {s.professor}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Instructores */}
      <section id="instructores" className="bg-studio-cream text-studio-navy">
        <div className={`${wrap} py-20 sm:py-28`}>
          <h2 className="font-display text-5xl sm:text-6xl">Quién te da la clase</h2>

          <div className="mt-12 grid gap-12 sm:grid-cols-2 sm:gap-16">
            {instructors.map((inst) => (
              <article key={inst.name} className="border-t-2 border-studio-navy pt-6">
                <h3 className="font-display text-7xl sm:text-8xl">{inst.name}</h3>
                <p className="mt-4 font-bold text-studio-red-dark">{inst.role}</p>
                <p className="mt-2 max-w-sm leading-relaxed text-studio-navy/85">{inst.bio}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Cierre */}
      <section className="bg-studio-red on-red">
        <div className={`${wrap} py-20 sm:py-28 flex flex-col gap-10 md:flex-row md:items-end md:justify-between`}>
          <h2 className="font-display text-6xl sm:text-8xl uppercase text-white max-w-3xl">
            Tu primera clase no cuesta nada.
          </h2>
          <div className="shrink-0">
            <Link
              to="/reserva-prueba"
              className="inline-flex items-center justify-center rounded-xl bg-studio-navy px-8 py-4 text-lg font-bold text-white hover:bg-studio-navy-deep"
            >
              Reservar clase de prueba
            </Link>
            <p className="mt-3 text-sm font-medium text-white">Sin permanencia.</p>
          </div>
        </div>
      </section>
    </>
  );
};
