import React, { useState } from 'react';
import { Camera, Image, Play, Upload } from 'lucide-react';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';

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
      thumbnailGradient: 'from-amber-600 to-slate-900',
    },
    {
      id: '2',
      type: 'video',
      title: 'Highlights Open Mat No-Gi del Fin de Semana',
      discipline: 'GRAPPLING',
      date: 'Noviembre 2026',
      thumbnailGradient: 'from-brand-accent to-slate-900',
    },
    {
      id: '3',
      type: 'photo',
      title: 'Equipo de Competición en el Campeonato Nacional',
      discipline: 'COMPETICIÓN',
      date: 'Septiembre 2026',
      thumbnailGradient: 'from-blue-600 to-slate-900',
    },
    {
      id: '4',
      type: 'photo',
      title: 'Seminario de Guardia Lapel con Mario Bros',
      discipline: 'BJJ GI',
      date: 'Agosto 2026',
      thumbnailGradient: 'from-purple-600 to-slate-900',
    },
  ];

  const filteredItems =
    filter === 'TODAS' ? items : items.filter((i) => i.discipline === filter);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-brand-accent text-xs font-black uppercase tracking-wider mb-1">
            <Image className="w-4 h-4" />
            <span>Galería Oficial</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Media & Fotos</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Fotos y vídeos de entrenamientos, seminarios y graduaciones de 247Studio.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => alert('Función de subida activada para administradores y alumnos autorizados.')}
          className="w-fit"
        >
          <Upload className="w-4 h-4 mr-1.5 text-brand-accent" />
          <span>Compartir Foto / Vídeo</span>
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {DISCIPLINES.map((d) => (
          <button
            key={d}
            onClick={() => setFilter(d)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
              filter === d
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white border border-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
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
            className="rounded-2xl bg-white border border-slate-200/80 overflow-hidden group hover:shadow-card-hover transition-all flex flex-col justify-between shadow-subtle"
          >
            <div
              className={`h-48 bg-gradient-to-br ${item.thumbnailGradient} flex items-center justify-center relative p-4`}
            >
              {item.type === 'video' ? (
                <div className="w-12 h-12 rounded-full bg-brand-accent text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Play className="w-5 h-5 fill-white ml-0.5" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Camera className="w-5 h-5 text-white" />
                </div>
              )}

              <Badge variant="secondary" className="absolute top-3 right-3 text-[10px] bg-black/60 text-white border-0">
                {item.discipline}
              </Badge>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-brand-accent transition-colors">
                  {item.title}
                </h3>
                <span className="text-[11px] text-slate-400 font-medium">{item.date}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

