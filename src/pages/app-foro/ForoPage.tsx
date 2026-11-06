import React, { useState } from 'react';
import { MessageSquare, Send, ThumbsUp } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';

const DISCIPLINES = ['TODAS', 'BJJ GI', 'GRAPPLING', 'MMA', 'LUCHA', 'KIDS'] as const;
type DisciplineFilter = (typeof DISCIPLINES)[number];

interface ForumPost {
  id: string;
  discipline: DisciplineFilter;
  author: string;
  belt: string;
  avatarText: string;
  date: string;
  content: string;
  likes: number;
  commentsCount: number;
}

export const ForoPage: React.FC = () => {
  const { userData } = useAuth();
  const [selectedDiscipline, setSelectedDiscipline] = useState<DisciplineFilter>('TODAS');
  const [newPostText, setNewPostText] = useState('');
  const [newPostDiscipline, setNewPostDiscipline] = useState<DisciplineFilter>('BJJ GI');

  const [posts, setPosts] = useState<ForumPost[]>([
    {
      id: '1',
      discipline: 'GRAPPLING',
      author: 'Mario Bros',
      belt: 'Faixa Preta (Cinturón Negro)',
      avatarText: 'MB',
      date: 'Hoy · 14:30',
      content: 'Chicos, para la sesión de Sparring No-Gi de este jueves nos enfocaremos en transiciones desde guardia mariposa a single leg X. Traed rodilleras si tenéis.',
      likes: 12,
      commentsCount: 3,
    },
    {
      id: '2',
      discipline: 'BJJ GI',
      author: 'David',
      belt: 'Faixa Preta (Cinturón Negro)',
      avatarText: 'D',
      date: 'Ayer · 19:15',
      content: 'Repaso técnico de estrangulaciones con solapa desde cross-side. Gran asistencia en el grupo de las 19:30, seguid con esa intensidad y disciplina.',
      likes: 8,
      commentsCount: 2,
    },
    {
      id: '3',
      discipline: 'MMA',
      author: 'Carlos R.',
      belt: 'Grappler Avanzado',
      avatarText: 'CR',
      date: 'Hace 2 días',
      content: '¿Alguien para hacer drill de golpeo contra la jaula el sábado por la mañana antes del Open Mat libre?',
      likes: 5,
      commentsCount: 4,
    },
  ]);

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostText.trim()) return;

    const newPost: ForumPost = {
      id: Date.now().toString(),
      discipline: newPostDiscipline,
      author: userData?.alias || 'Alumno 247',
      belt: userData?.belt ? `Cinturón ${userData.belt}` : 'Atleta 247',
      avatarText: (userData?.alias || 'A').slice(0, 2).toUpperCase(),
      date: 'Ahora mismo',
      content: newPostText.trim(),
      likes: 0,
      commentsCount: 0,
    };

    setPosts([newPost, ...posts]);
    setNewPostText('');
  };

  const filteredPosts =
    selectedDiscipline === 'TODAS'
      ? posts
      : posts.filter((p) => p.discipline === selectedDiscipline);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-studio-red text-xs font-black uppercase tracking-wider mb-1">
          <MessageSquare className="w-4 h-4" />
          <span>Comunidad & Foro</span>
        </div>
        <h1 className="text-2xl font-black text-white uppercase tracking-wider">Foro de la Academia</h1>
        <p className="text-xs text-studio-cream/70 mt-1">
          Publica preguntas, avisos de tatami o drills filtrados por disciplina.
        </p>
      </div>

      {/* Formulario de Nueva Publicación (Diseño Slide 9) */}
      <div className="p-5 rounded-2xl bg-studio-navy-light border border-white/10 space-y-4">
        <h2 className="text-xs font-black uppercase tracking-wider text-studio-cream">
          Crear Nuevo Mensaje
        </h2>

        <form onSubmit={handleCreatePost} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-[11px] font-bold text-studio-cream/70 uppercase mb-1">
                Seleccione Disciplina
              </label>
              <select
                value={newPostDiscipline}
                onChange={(e) => setNewPostDiscipline(e.target.value as DisciplineFilter)}
                className="w-full px-3 py-2.5 bg-studio-navy border border-white/10 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-studio-red"
              >
                {DISCIPLINES.filter((d) => d !== 'TODAS').map((disc) => (
                  <option key={disc} value={disc}>
                    {disc}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-studio-cream/70 uppercase mb-1">
                Escriba el Texto
              </label>
              <textarea
                value={newPostText}
                onChange={(e) => setNewPostText(e.target.value)}
                placeholder="Escribe tu mensaje para los compañeros o instructores..."
                rows={2}
                className="w-full px-3 py-2 bg-studio-navy border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-studio-red resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!newPostText.trim()}
              className="py-2.5 px-5 bg-studio-red hover:bg-studio-red-dark text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-2 shadow-lg shadow-studio-red/20 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Publicar Mensaje</span>
            </button>
          </div>
        </form>
      </div>

      {/* Filtros por disciplina */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-studio-cream/60">
            Filtrar por disciplina:
          </span>
          <span className="text-[11px] text-studio-cream/50">
            {filteredPosts.length} publicaciones
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {DISCIPLINES.map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDiscipline(d)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition ${
                selectedDiscipline === d
                  ? 'bg-studio-red text-white shadow-md'
                  : 'bg-studio-navy-light border border-white/10 text-studio-cream/70 hover:text-white hover:bg-white/5'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Publicaciones */}
      <div className="space-y-4">
        {filteredPosts.map((post) => (
          <div
            key={post.id}
            className="p-5 rounded-2xl bg-studio-navy-light border border-white/10 hover:border-white/20 transition space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-studio-red/20 border border-studio-red/40 flex items-center justify-center font-black text-sm text-studio-red">
                  {post.avatarText}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-white">{post.author}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-studio-cream/80 font-bold">
                      {post.discipline}
                    </span>
                  </div>
                  <span className="text-[11px] text-studio-cream/50 block">{post.belt}</span>
                </div>
              </div>

              <span className="text-[11px] text-studio-cream/40">{post.date}</span>
            </div>

            <p className="text-xs text-studio-cream/90 leading-relaxed">{post.content}</p>

            <div className="pt-2 flex items-center gap-4 text-xs text-studio-cream/60 border-t border-white/5">
              <button
                onClick={() =>
                  setPosts(
                    posts.map((p) => (p.id === post.id ? { ...p, likes: p.likes + 1 } : p))
                  )
                }
                className="flex items-center gap-1.5 hover:text-studio-red transition"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>{post.likes}</span>
              </button>
              <div className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{post.commentsCount} respuestas</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
