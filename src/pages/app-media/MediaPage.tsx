import React, { useState } from 'react';
import { Camera, Image, Play, Upload } from 'lucide-react';

const DISCIPLINES = ['TODAS', 'BJJ GI', 'GRAPPLING', 'COMPETICIÓN', 'GRADUACIONES'] as const;
type MediaFilter = (typeof DISCIPLINES)[number];

interface MediaItem {
  id: string;
  type: 'photo' | 'video';
  title: string;
  discipline: MediaFilter;
  date: string;
  thumbnailGradient: string;
}

export const MediaPage: React.FC = () => {
  const [filter, setFilter] = useState<MediaFilter>('TODAS');

  const items: MediaItem[] = [
    {
      id: '1',
      type: 'photo',
      title: 'Graduación de Faixas & Entrega de Grados Verano',
      discipline: 'GRADUACIONES',
      date: 'Octubre 2026',
      thumbnailGradient: 'from-amber-700/60 to-studio-navy-light',
    },
    {
      id: '2',
      type: 'video',
      title: 'Highlights Open Mat No-Gi del Fin de Semana',
      discipline: 'GRAPPLING',
      date: 'Noviembre 2026',
      thumbnailGradient: 'from-studio-red/50 to-studio-navy-light',
    },
    {
      id: '3',
      type: 'photo',
      title: 'Equipo de Competición en el Campeonato Nacional',
      discipline: 'COMPETICIÓN',
      date: 'Septiembre 2026',
      thumbnailGradient: 'from-blue-700/50 to-studio-navy-light',
    },
    {
      id: '4',
      type: 'photo',
      title: 'Seminario de Guardia Lapel con Mario Bros',
      discipline: 'BJJ GI',
      date: 'Agosto 2026',
      thumbnailGradient: 'from-purple-800/50 to-studio-navy-light',
    },
  ];

  const filteredItems =
    filter === 'TODAS' ? items : items.filter((i) => i.discipline === filter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-studio-red text-xs font-black uppercase tracking-wider mb-1">
            <Image className="w-4 h-4" />
            <span>Galería Oficial</span>
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-wider">Media & Fotos</h1>
          <p className="text-xs text-studio-cream/70 mt-1">
            Fotos y vídeos de entrenamientos, seminarios y graduaciones.
          </p>
        </div>

        <button
          onClick={() => alert('Función de subida activada para administradores y alumnos autorizados.')}
          className="py-2.5 px-4 bg-white/10 hover:bg-white/20 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-2 border border-white/10 w-fit"
        >
          <Upload className="w-4 h-4 text-studio-red" />
          <span>Compartir Foto / Vídeo</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {DISCIPLINES.map((d) => (
          <button
            key={d}
            onClick={() => setFilter(d)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition ${
              filter === d
                ? 'bg-studio-red text-white shadow-md'
                : 'bg-studio-navy-light border border-white/10 text-studio-cream/70 hover:text-white'
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl bg-studio-navy-light border border-white/10 overflow-hidden group hover:border-white/30 transition flex flex-col justify-between"
          >
            <div
              className={`h-48 bg-gradient-to-br ${item.thumbnailGradient} flex items-center justify-center relative p-4`}
            >
              {item.type === 'video' ? (
                <div className="w-12 h-12 rounded-full bg-studio-red text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition">
                  <Play className="w-5 h-5 fill-white ml-0.5" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-black/40 text-white flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition">
                  <Camera className="w-5 h-5 text-studio-cream" />
                </div>
              )}

              <span className="absolute top-3 right-3 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-black/60 text-white border border-white/10">
                {item.discipline}
              </span>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-studio-red transition">
                  {item.title}
                </h3>
                <span className="text-[11px] text-studio-cream/50">{item.date}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

