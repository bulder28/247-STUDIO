import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/shared/api/firebase';
import { DEFAULT_OFFICIAL_SCHEDULES } from '@/shared/domain/schedule';
import { ScheduleDomainModel } from '@/shared/domain/types';
import { BeltLadder } from '@/widgets/Belt';
import { CheckCircle2, ChevronRight, MapPin, MessageCircle } from 'lucide-react';

const programs = [
  {
    title: 'BJJ Gi & Grappling',
    img: '/galeria/bjj/bjj9.webp',
    category: 'Adultos',
    desc: 'Jiu-jitsu tradicional con kimono y grappling sin kimono. Trabajo técnico exhaustivo, sumisiones, estrangulaciones y rodadas.',
    badges: ['Fundamentos', 'Sparring', 'Técnica'],
  },
  {
    title: 'BJJ Kids (Infantil)',
    img: '/galeria/kids/kids1.webp',
    category: 'Niños 3 a 14 años',
    desc: 'Iniciación marcial, psicomotricidad, disciplina, respeto y autoconfianza para los más pequeños en un entorno seguro y positivo.',
    badges: ['3 a 6 años', '+7 años', 'Competición'],
  },
  {
    title: 'BJJ Femenino',
    img: '/galeria/bjj/bjj11.webp',
    category: 'Femenino',
    desc: 'Espacio dedicado al progreso técnico, defensa personal, acondicionamiento y comunidad entre luchadoras.',
    badges: ['Confianza', 'Comunidad', 'Defensa'],
  },
  {
    title: 'MMA (Mixed Martial Arts)',
    img: '/galeria/grappling/grappling11.webp',
    category: 'Adultos',
    desc: 'Integración completa de golpeo (striking), derribos contra la pared y suelo, y transiciones dinámicas de combate.',
    badges: ['Striking', 'Grappling', 'Wall-work'],
  },
  {
    title: 'Lucha & Wrestling',
    img: '/galeria/lucha/lucha5.webp',
    category: 'Todos los niveles',
    desc: 'Lucha libre y olímpica orientada al grappling y MMA: control de pie, postura, entradas y derribos explosivos.',
    badges: ['Derribos', 'Control', 'Fuerza'],
  },
  {
    title: 'Open Mat',
    img: '/galeria/grappling/grappling1.webp',
    category: 'Alumnos',
    desc: 'Tatami abierto para rodar libremente, poner en práctica las técnicas aprendidas y compartir sparring con compañeros.',
    badges: ['Sparring', 'Compañerismo'],
  },
];

const instructors = [
  {
    name: 'Mario',
    role: 'Head Coach — Cinturón Negro BJJ',
    lineage: 'Mathias Ribeiro BJJ Team',
    bio: 'Especialista en BJJ deportivo y competición. Metodología de enseñanza basada en el detalle técnico, la disciplina y el crecimiento continuo.',
  },
  {
    name: 'David',
    role: 'Instructor de Grappling & Lucha',
    lineage: '247Studio Team',
    bio: 'Experto en derribos, ritmo de combate, agarres de pie y sumisiones rápidas de piernas (leglocks).',
  },
];

const DAYS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

export const LandingPage: React.FC = () => {
  const [activeSchedules, setActiveSchedules] = useState<ScheduleDomainModel[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(true);

  useEffect(() => {
    const fetchPublicSchedules = async () => {
      try {
        const q = query(collection(db, 'schedules'), where('active', '==', true));
        const snap = await getDocs(q);
        const list: ScheduleDomainModel[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<ScheduleDomainModel, 'id'>) }));
        const workingDaysList = list
          .filter((s) => s.dayOfWeek >= 1 && s.dayOfWeek <= 5)
          .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));
        setActiveSchedules(workingDaysList.length > 0 ? workingDaysList : DEFAULT_OFFICIAL_SCHEDULES);
      } catch (err) {
        console.error('Error fetching public schedule:', err);
        setActiveSchedules(DEFAULT_OFFICIAL_SCHEDULES);
      } finally {
        setLoadingSchedule(false);
      }
    };

    fetchPublicSchedules();
  }, []);

  return (
    <div className="space-y-20 pb-16">
      {/* ======================================================== */}
      {/* 1. HERO OFICIAL 247STUDIO (Lienzo Tatami + Atmósfera)    */}
      {/* ======================================================== */}
      <section className="relative overflow-hidden pt-8 sm:pt-16 pb-12 sm:pb-20 border-b border-brand-text/10">
        {/* Fondo sutil con imagen marcial original */}
        <div className="absolute inset-0 -z-10 opacity-15 mix-blend-multiply pointer-events-none">
          <img
            src="/herobackground.webp"
            alt=""
            className="w-full h-full object-cover object-center filter grayscale"
          />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid gap-12 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-text/10 border border-brand-text/20 mb-6 text-xs font-headline font-bold uppercase tracking-wider text-brand-text">
              <span className="w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
              Academia Oficial Pinto, Madrid Sur
            </div>

            <h1 className="font-headline text-5xl sm:text-7xl lg:text-8xl uppercase tracking-tighter text-brand-text leading-[0.92]">
              247STUDIO <br />
              <span className="text-brand-accent">UNLIMITED</span> <br />
              GRAPPLING.
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-brand-text/85 max-w-xl leading-relaxed">
              Academia de <strong>Brazilian Jiu-Jitsu</strong>, <strong>Grappling</strong>, <strong>MMA</strong> y <strong>Lucha</strong>. 
              Formación técnica para niños y adultos en un ambiente de disciplina, respeto y superación.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3 sm:gap-4">
              <Link to="/reserva-prueba" className="cta-button text-base px-7 py-3.5 shadow-md">
                Reserva tu clase de prueba gratis
              </Link>
              <a
                href="#horario"
                className="cta-soft text-base px-6 py-3"
              >
                Ver Horarios
              </a>
            </div>

            <div className="mt-6 flex items-center gap-6 text-xs font-bold text-brand-text/75 uppercase tracking-wide">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                1ª Clase 100% gratuita
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Sin matrícula ni permanencias
              </span>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white/70 backdrop-blur-md p-6 sm:p-8 rounded-2xl border border-brand-text/15 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-brand-text/10">
              <span className="font-headline text-lg uppercase tracking-tight text-brand-text">
                El Camino del Tatami
              </span>
              <span className="text-xs font-bold text-brand-accent uppercase tracking-wider">
                5 Cinturones
              </span>
            </div>
            <p className="text-xs text-brand-text/75 leading-relaxed mb-6">
              Todos empezamos de blanco. El jiu-jitsu premia la constancia y el trabajo diario, sesión a sesión.
            </p>
            <BeltLadder />
            <div className="mt-6 pt-4 border-t border-brand-text/10 text-center">
              <Link
                to="/reserva-prueba"
                className="text-xs font-headline font-bold text-brand-accent hover:underline uppercase tracking-wide inline-flex items-center gap-1"
              >
                <span>Empieza hoy con tu clase de prueba</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 2. FILOSOFÍA OFICIAL 247STUDIO (Extraída de la web original) */}
      {/* ======================================================== */}
      <section id="filosofia" className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="font-headline text-3xl sm:text-4xl uppercase tracking-tight text-brand-text">
          ¿Quiénes somos? | Filosofía 247Studio
        </h2>

        {/* Separador rombo característico de la web original */}
        <div className="flex items-center justify-center my-6" aria-hidden="true">
          <span className="h-px w-16 sm:w-24 bg-brand-text/20" />
          <span className="mx-4 text-brand-text/50 text-2xl">✦</span>
          <span className="h-px w-16 sm:w-24 bg-brand-text/20" />
        </div>

        <div className="space-y-4 text-brand-text/85 text-base sm:text-lg leading-relaxed text-justify sm:text-center">
          <p>
            El jiu jitsu es un deporte y, a la vez, un arte marcial. En su faceta deportiva encontramos el trabajo físico y el área competitiva. Por otro lado, en su faceta marcial, encontramos el desarrollo técnico y todo el sistema de valores que nos envuelve.
          </p>
          <p className="font-medium text-brand-text">
            El jiu jitsu transforma la vida de muchas personas por todo lo que engloba, y muchas personas transforman su vida para progresar en el jiu jitsu… <span className="text-brand-accent font-bold">De ahí, 24/7.</span>
          </p>
          <p>
            Queremos transmitir un concepto que va más allá de la mera práctica puntual de una actividad. Cuando sales de la academia, uno no deja de ser luchador, y eso se refleja en tus decisiones, alimentación y descanso, así como en tu comportamiento: el respeto como pilar fundamental en el trato a otras personas, pero también la ambición y la superación al enfrentarte a los “combates” que te ofrece la vida.
          </p>
        </div>

        <div className="flex items-center justify-center mt-6" aria-hidden="true">
          <span className="h-px w-16 sm:w-24 bg-brand-text/20" />
          <span className="mx-4 text-brand-text/50 text-2xl">✦</span>
          <span className="h-px w-16 sm:w-24 bg-brand-text/20" />
        </div>
      </section>

      {/* ======================================================== */}
      {/* 3. PROGRAMAS Y DISCIPLINAS (Con fotos reales de la academia) */}
      {/* ======================================================== */}
      <section id="programas" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <span className="text-xs font-headline font-bold uppercase tracking-widest text-brand-accent block mb-1">
              Entrenamiento Completo
            </span>
            <h2 className="font-headline text-4xl sm:text-5xl uppercase tracking-tight text-brand-text">
              Programas y Disciplinas
            </h2>
          </div>
          <Link
            to="/reserva-prueba"
            className="cta-soft py-2 px-4 self-start sm:self-auto text-xs sm:text-sm"
          >
            Consultar Tarifas y Packs
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map((p) => (
            <div
              key={p.title}
              className="bg-white/80 backdrop-blur-sm rounded-xl border border-brand-text/15 overflow-hidden flex flex-col shadow-sm hover:shadow-md transition group"
            >
              <div className="aspect-[4/3] bg-brand-text/5 relative overflow-hidden">
                <img
                  src={p.img}
                  alt={p.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md text-xs font-headline uppercase tracking-wider bg-brand-text text-white">
                  {p.category}
                </span>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-headline text-2xl uppercase tracking-tight text-brand-text">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-sm text-brand-text/80 leading-relaxed">
                    {p.desc}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-brand-text/10 flex items-center justify-between">
                  <div className="flex flex-wrap gap-1.5">
                    {p.badges.map((b) => (
                      <span
                        key={b}
                        className="text-[11px] font-bold px-2 py-0.5 rounded bg-brand-text/5 text-brand-text/80 border border-brand-text/10"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                  <Link
                    to="/reserva-prueba"
                    className="text-brand-accent hover:text-brand-accent-dark font-headline text-sm uppercase tracking-wide inline-flex items-center"
                    title={`Reservar ${p.title}`}
                  >
                    Probar <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ======================================================== */}
      {/* 4. HORARIOS SEMANALES                                    */}
      {/* ======================================================== */}
      <section id="horario" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white/80 backdrop-blur-md p-6 sm:p-10 rounded-2xl border border-brand-text/15 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-brand-text/10">
            <div>
              <span className="text-xs font-headline font-bold uppercase tracking-widest text-brand-accent block mb-1">
                Planificación Semanal
              </span>
              <h2 className="font-headline text-3xl sm:text-5xl uppercase tracking-tight text-brand-text">
                Horario de Clases
              </h2>
            </div>
            <Link to="/reserva-prueba" className="cta-button py-2.5 px-5 text-sm self-start sm:self-auto">
              Reservar Plaza en Clase
            </Link>
          </div>

          <div className="mt-6">
            {loadingSchedule ? (
              <div className="py-12 text-center" role="status">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand-accent border-t-transparent mx-auto" />
                <span className="mt-3 block text-xs font-bold text-brand-text/60">Cargando horario oficial...</span>
              </div>
            ) : activeSchedules.length === 0 ? (
              <p className="py-8 text-center text-sm text-brand-text/70">
                Horario en actualización. Consulta los detalles al reservar tu clase.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b-2 border-brand-text text-xs font-headline uppercase tracking-wider text-brand-text/80">
                      <th className="py-3 px-3">Día</th>
                      <th className="py-3 px-3">Hora</th>
                      <th className="py-3 px-3">Programa</th>
                      <th className="py-3 px-3">Profesor</th>
                      <th className="py-3 px-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-text/10 font-medium text-brand-text/90">
                    {activeSchedules.map((s) => (
                      <tr key={s.id} className="hover:bg-brand-text/5 transition-colors">
                        <td className="py-3.5 px-3 font-headline text-base text-brand-text font-bold">
                          {DAYS[s.dayOfWeek]}
                        </td>
                        <td className="py-3.5 px-3 font-mono text-xs sm:text-sm text-brand-text font-semibold whitespace-nowrap">
                          {s.startTime} – {s.endTime}
                        </td>
                        <td className="py-3.5 px-3 font-bold text-brand-text">
                          <span className="inline-block px-2 py-0.5 rounded bg-brand-text/10 text-xs font-headline uppercase tracking-wide mr-2">
                            {s.program}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-xs text-brand-text/75">
                          Prof. {s.professor}
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <Link
                            to="/reserva-prueba"
                            className="text-xs font-headline font-bold text-brand-accent hover:text-brand-accent-dark uppercase tracking-wider inline-flex items-center gap-1"
                          >
                            Probar <ChevronRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 5. INSTRUCTORES                                          */}
      {/* ======================================================== */}
      <section id="instructores" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <span className="text-xs font-headline font-bold uppercase tracking-widest text-brand-accent block mb-1">
            Equipo Técnico
          </span>
          <h2 className="font-headline text-4xl sm:text-5xl uppercase tracking-tight text-brand-text">
            Quién te da la clase
          </h2>
        </div>

        <div className="grid gap-8 sm:grid-cols-2">
          {instructors.map((inst) => (
            <div
              key={inst.name}
              className="bg-white/80 backdrop-blur-md p-6 sm:p-8 rounded-2xl border border-brand-text/15 shadow-sm"
            >
              <div className="flex items-center justify-between pb-4 border-b border-brand-text/10">
                <h3 className="font-headline text-4xl uppercase tracking-tighter text-brand-text">
                  {inst.name}
                </h3>
                <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-brand-text/10 text-brand-text font-bold uppercase">
                  {inst.lineage}
                </span>
              </div>
              <p className="mt-4 font-headline text-lg uppercase tracking-tight text-brand-accent">
                {inst.role}
              </p>
              <p className="mt-2 text-sm text-brand-text/80 leading-relaxed">
                {inst.bio}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ======================================================== */}
      {/* 6. UBICACIÓN Y CONTACTO                                  */}
      {/* ======================================================== */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-brand-text text-brand-background p-8 sm:p-12 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div>
            <span className="text-xs font-headline font-bold uppercase tracking-widest text-brand-accent block mb-1">
              Visítanos en Pinto
            </span>
            <h2 className="font-headline text-3xl sm:text-5xl uppercase tracking-tight text-white">
              ¿Listo para pisar el tatami?
            </h2>
            <p className="mt-3 text-sm sm:text-base text-brand-background/80 max-w-xl leading-relaxed">
              La primera clase de prueba es totalmente gratuita. Trae ropa deportiva cómoda (camiseta y pantalón corto sin cremalleras) o tu kimono si ya tienes experiencia.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-brand-background/70 font-semibold">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-brand-accent shrink-0" />
                c/ Sisones 2, Nave 30, Pinto (Madrid)
              </span>
              <a
                href="https://maps.app.goo.gl/FR5CukvwrdgwyQ766"
                target="_blank"
                rel="noreferrer"
                className="text-brand-accent hover:underline"
              >
                Abrir en Google Maps ↗
              </a>
            </div>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row gap-3">
            <Link to="/reserva-prueba" className="cta-button text-base px-8 py-4 shadow-lg text-center">
              Reservar Clase Gratis
            </Link>
            <a
              href="https://wa.me/34677528185?text=Hola%2C%20quiero%20reservar%20una%20clase%20de%20prueba."
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-headline text-base px-6 py-4 uppercase tracking-tight border border-white/20 transition"
            >
              <MessageCircle className="w-5 h-5 text-emerald-400" />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};