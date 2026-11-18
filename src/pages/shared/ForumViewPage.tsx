import { useEffect, useState } from 'react';
import { Megaphone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/PageHeader';

interface Discipline {
  id: string;
  name: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  discipline_id: string | null;
  created_at: string;
  disciplines?: { name: string } | null;
}

export function ForumViewPage({ embedded = false }: { embedded?: boolean } = {}) {
  const { user, profile } = useAuth();
  const canPost = profile?.role === 'admin' || profile?.role === 'coach';

  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [filterId, setFilterId] = useState<string>('all');
  const [posts, setPosts] = useState<Announcement[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [postDiscipline, setPostDiscipline] = useState('');

  const loadPosts = async () => {
    const [discRes, postRes] = await Promise.all([
      supabase.from('disciplines').select('id, name').order('sort_order'),
      supabase
        .from('announcements')
        .select('*, disciplines(name)')
        .order('created_at', { ascending: false }),
    ]);
    setDisciplines((discRes.data as Discipline[]) ?? []);
    setPosts((postRes.data as unknown as Announcement[]) ?? []);
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || !content.trim()) return;
    await supabase.from('announcements').insert({
      title: title.trim(),
      content: content.trim(),
      discipline_id: postDiscipline || null,
      author_id: user.id,
    });
    setTitle('');
    setContent('');
    await loadPosts();
  };

  const visiblePosts =
    filterId === 'all'
      ? posts
      : posts.filter((p) => p.discipline_id === filterId || p.discipline_id === null);

  return (
    <div className="space-y-6">
      {!embedded && (
        <PageHeader
          title="Foro"
        />
      )}

      {/* Filtro por disciplina (Slide 9) */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterId('all')}
          className={`min-h-11 px-3.5 rounded-xl text-xs font-medium border ${
            filterId === 'all'
              ? 'bg-studio-cream border-studio-cream text-slate-950'
              : 'bg-white/[0.04] border-white/10 text-slate-300 hover:text-white hover:border-white/25'
          }`}
        >
          Todas
        </button>
        {disciplines.map((d) => (
          <button
            key={d.id}
            onClick={() => setFilterId(d.id)}
            className={`min-h-11 px-3.5 rounded-xl text-xs font-medium border ${
              filterId === d.id
                ? 'bg-studio-cream border-studio-cream text-slate-950'
                : 'bg-white/[0.04] border-white/10 text-slate-300 hover:text-white hover:border-white/25'
            }`}
          >
            {d.name}
          </button>
        ))}
      </div>

      {canPost && (
        <form
          onSubmit={handlePublish}
          className="rounded-2xl studio-panel border border-white/10 p-4 space-y-3"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Publicar comunicado
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título"
              required
              className="rounded-xl studio-field px-3 py-2 text-sm text-white"
            />
            <select
              value={postDiscipline}
              onChange={(e) => setPostDiscipline(e.target.value)}
              className="rounded-xl studio-field px-3 py-2 text-sm text-white"
            >
              <option value="">General (todas las disciplinas)</option>
              {disciplines.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <textarea
            rows={2}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escribe el comunicado para los alumnos..."
            required
            className="w-full rounded-xl studio-field px-3 py-2 text-sm text-white"
          />
          <button
            type="submit"
            className="min-h-11 rounded-xl studio-btn px-4 py-2 text-xs font-semibold text-white"
          >
            Publicar
          </button>
        </form>
      )}

      <div className="space-y-3">
        {visiblePosts.length === 0 ? (
          <p className="text-sm text-slate-400">No hay comunicados en esta disciplina.</p>
        ) : (
          visiblePosts.map((post) => (
            <article
              key={post.id}
              className="rounded-3xl studio-panel border border-white/10 p-5 sm:p-7 grid grid-cols-1 sm:grid-cols-[9.5rem_1fr] gap-x-6 gap-y-2"
            >
              <div className="flex sm:flex-col items-center sm:items-start gap-x-3 gap-y-1 text-xs">
                <time className="text-slate-500 tabular-nums" dateTime={post.created_at}>
                  {new Date(post.created_at).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </time>
                <span className="inline-flex items-center gap-1.5 font-semibold text-studio-cream">
                  <Megaphone className="w-3.5 h-3.5 text-studio-red" />
                  {post.disciplines?.name ?? 'General'}
                </span>
              </div>
              <div className="min-w-0">
                <h2 className="font-headline text-xl sm:text-2xl text-white uppercase leading-tight">
                  {post.title}
                </h2>
                <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed mt-2 max-w-2xl">
                  {post.content}
                </p>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}

