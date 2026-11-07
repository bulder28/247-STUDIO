import React, { useMemo, useState } from 'react';
import { Award, Download, Flame, Shield, Sparkles, Target, User as UserIcon } from 'lucide-react';
import { FighterStats, UserDomainModel } from '@/shared/domain/types';
import { Belt, beltLabelEs } from '@/widgets/Belt';
import { FifaFighterCard } from '@/widgets/FifaFighterCard';
import { FighterRadarChart } from '@/widgets/FighterRadarChart';
import { downloadFighterCardAsPng } from '@/shared/utils/cardDownloader';

interface FighterCardProps {
  user: UserDomainModel;
}

const STAT_LABELS: Record<keyof FighterStats, string> = {
  tecnica: 'Técnica Pura',
  fuerza: 'Fuerza / Potencia',
  elasticidad: 'Movilidad / Gas',
  guardia: 'Guardia',
  pase: 'Pase de Guardia',
  derribos: 'Derribos / Judo',
  leglocks: 'Leglocks / Llaves',
  finalizacion: 'Finalización',
};

const DEFAULT_STATS: FighterStats = {
  tecnica: 65,
  fuerza: 60,
  elasticidad: 55,
  guardia: 70,
  pase: 65,
  derribos: 50,
  leglocks: 45,
  finalizacion: 60,
};

export const FighterCard: React.FC<FighterCardProps> = ({ user }) => {
  const [viewMode, setViewMode] = useState<'fut' | 'radar' | 'bars'>('fut');
  const [downloadingCard, setDownloadingCard] = useState(false);
  const stats = user.stats || DEFAULT_STATS;
  const stripesLabel = `${user.stripes} ${user.stripes === 1 ? 'grado' : 'grados'}`;

  // Cálculo de media OVR y especialidad
  const { ovr, topStat, styleDesc } = useMemo(() => {
    const keys = Object.keys(STAT_LABELS) as (keyof FighterStats)[];
    const vals = keys.map((k) => ({ key: k, label: STAT_LABELS[k], val: stats[k] ?? 50 }));
    const sum = vals.reduce((acc, curr) => acc + curr.val, 0);
    const avg = Math.round(sum / vals.length);

    // Encontrar atributo más alto
    const sorted = [...vals].sort((a, b) => b.val - a.val);
    const highest = sorted[0];

    // Estilo derivado según especialidad
    let style = 'Atleta Polivalente';
    if (highest.key === 'guardia' || highest.key === 'finalizacion') style = 'Especialista en Guardia & Sumisión';
    else if (highest.key === 'pase' || highest.key === 'derribos') style = 'Luchador de Presión y Control Superior';
    else if (highest.key === 'leglocks') style = 'Cazador de Piernas (Leglocker)';
    else if (highest.key === 'tecnica') style = 'Purista Técnico de Tatami';

    return { ovr: avg, topStat: highest, styleDesc: style };
  }, [stats]);

  return (
    <section className="rounded-3xl bg-white border border-slate-200/80 shadow-sm overflow-hidden text-slate-900 transition-all">
      {/* Cinturón físico SVG */}
      <Belt belt={user.belt} stripes={user.stripes} showEmpty strip className="h-14" />

      <div className="p-6 sm:p-7">
        {/* Cabecera Atleta + Insignia OVR FIFA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              {user.photoUrl ? (
                <img
                  src={user.photoUrl}
                  alt={user.alias}
                  className="h-16 w-16 rounded-2xl object-cover border border-slate-200 shadow-sm"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 border border-slate-200">
                  <UserIcon className="h-7 w-7" aria-hidden="true" />
                </div>
              )}
              {user.pricingTier === 'SF' && (
                <span
                  title="Socio Fundador"
                  className="absolute -right-2 -top-2 rounded-full bg-brand-accent px-1.5 py-0.5 text-[10px] font-black text-white shadow-sm"
                >
                  SF
                </span>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-headline truncate text-3xl uppercase tracking-tight text-slate-900">
                  {user.alias}
                </h2>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white font-mono">
                  {ovr} OVR
                </span>
              </div>
              <p className="mt-0.5 text-xs sm:text-sm font-semibold text-slate-600">
                Cinturón {beltLabelEs(user.belt).toLowerCase()}, {stripesLabel}
                <span className="text-slate-400">
                  {' '}
                  · {user.beltSystem === 'KIDS' ? 'categoría infantil' : 'adultos'}
                </span>
              </p>
            </div>
          </div>

          {/* Selector de Vista: Carta FUT vs Radar FIFA vs Lista */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl self-start sm:self-auto border border-slate-200/60">
            <button
              type="button"
              onClick={() => setViewMode('fut')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'fut'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Carta FUT</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('radar')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'radar'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Target className="w-3.5 h-3.5 text-brand-accent" />
              <span>Radar FIFA</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('bars')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'bars'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              <span>Detalle</span>
            </button>
          </div>
        </div>

        {/* Tarjetas resumen estilo MatGoat / Pro Athlete */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-6">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-brand-accent" /> Estilo en Tatami
            </span>
            <p className="font-extrabold text-xs text-slate-800 mt-1 truncate">{styleDesc}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Award className="w-3 h-3 text-amber-500" /> Especialidad Principal
            </span>
            <p className="font-extrabold text-xs text-slate-800 mt-1">
              {topStat.label} <span className="font-mono text-brand-accent font-black">({topStat.val}%)</span>
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Flame className="w-3 h-3 text-emerald-500" /> Estado Deportivo
            </span>
            <p className="font-extrabold text-xs text-emerald-700 mt-1">
              Racha Activa · Nivel {ovr >= 75 ? 'Avanzado' : 'En Evolución'}
            </p>
          </div>
        </div>

        {/* VISTA 1: CARTA SHIELD FIFA ULTIMATE TEAM */}
        {viewMode === 'fut' ? (
          <div className="flex flex-col lg:flex-row items-center justify-around gap-8 pt-2">
            <div id="fifa-fighter-card-root" className="w-full flex justify-center py-2">
              <FifaFighterCard athlete={user} size="lg" />
            </div>

            <div className="w-full lg:max-w-md space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Tu Carta Oficial FIFA Ultimate Team en 247Studio
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Esta es tu tarjeta deportiva conmemorativa oficial de 247Studio. Tu valoración general (OVR) y atributos de combate
                (Técnica, Guardia, Pase, Finalización, Derribos y Físico) se recalculan automáticamente conforme progresas en el tatami
                y recibes nuevas evaluaciones de los instructores.
              </p>

              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-1.5">
                <span className="text-[11px] font-black text-amber-900 uppercase tracking-wider block">
                  ★ Edición Coleccionable 247
                </span>
                <p className="text-xs text-amber-800">
                  Desbloquea la versión <strong className="font-extrabold">Oro Raro</strong> al superar los 75 de media OVR o el estatus <strong className="font-extrabold">Icon Black</strong> al graduarte a cinturón negro o tarifa Socio Fundador.
                </p>
              </div>

              {/* Botón Descargar en HD para Instagram / WhatsApp */}
              <button
                type="button"
                onClick={async () => {
                  setDownloadingCard(true);
                  await downloadFighterCardAsPng('fifa-fighter-card-root', user.alias);
                  setDownloadingCard(false);
                }}
                disabled={downloadingCard}
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-2xl transition shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4 text-slate-950" />
                <span>
                  {downloadingCard ? 'Generando Imagen HD...' : 'Descargar Tarjeta HD (Instagram / Redes)'}
                </span>
              </button>
            </div>
          </div>
        ) : viewMode === 'radar' ? (
          <div className="flex flex-col lg:flex-row items-center justify-around gap-8 pt-2">
            <div className="w-full max-w-sm flex justify-center">
              <FighterRadarChart stats={stats} alias={user.alias} showOvrBadge={false} size={300} />
            </div>

            <div className="w-full lg:max-w-md space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Lectura de Habilidades 247Studio
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                El polígono representa tu perfil técnico actual según las evaluaciones de Mario y David en el tatami.
                Un área más amplia y equilibrada refleja una técnica integral entre juego de guardia, derribos y finalizaciones.
              </p>

              <div className="p-4 rounded-2xl bg-brand-sand-light/50 border border-brand-sand/60 space-y-2">
                <span className="text-[11px] font-bold text-slate-900 block">
                  🎯 Próximo objetivo de graduación:
                </span>
                <p className="text-xs text-slate-700">
                  Reforzar <span className="font-bold text-slate-900">Derribos</span> y{' '}
                  <span className="font-bold text-slate-900">Pase de guardia</span> para elevar tu media general hacia{' '}
                  <span className="font-mono font-bold text-brand-accent">+{Math.min(99, ovr + 5)} OVR</span>.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* VISTA 2: BARRAS DETALLADAS */
          <div className="pt-2">
            <h3 className="font-bold text-base text-slate-900 mb-4">Métricas técnicas del atleta</h3>
            <dl className="grid grid-cols-1 gap-x-10 gap-y-2 md:grid-cols-2">
              {(Object.keys(STAT_LABELS) as (keyof FighterStats)[]).map((key) => {
                const value = Math.min(100, Math.max(0, stats[key] ?? 50));
                return (
                  <div key={key} className="border-b border-slate-100 py-2.5">
                    <div className="flex items-baseline justify-between">
                      <dt className="text-xs font-semibold text-slate-600">{STAT_LABELS[key]}</dt>
                      <dd className="font-mono text-sm font-bold text-slate-900">{value}%</dd>
                    </div>
                    <div
                      className="mt-1.5 h-2 w-full bg-slate-100 rounded-full overflow-hidden"
                      role="meter"
                      aria-label={STAT_LABELS[key]}
                      aria-valuenow={value}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className="h-full bg-slate-900 rounded-full transition-all duration-300"
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </dl>
          </div>
        )}
      </div>
    </section>
  );
};
