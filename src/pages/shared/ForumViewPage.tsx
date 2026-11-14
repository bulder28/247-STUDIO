import { useEffect, useState } from 'react';
import { Megaphone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

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

export function ForumViewPage() {
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
      <div>
        <h1 className="font-headline text-2xl md:text-3xl uppercase tracking-wide text-white">
          Foro de Comunicados
        </h1>
        <p className="text-sm text-slate-400">
          Comunicados oficiales de la academia filtrados por disciplina.
        </p>
      </div>

      {/* Filtro por disciplina (Slide 9) */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterId('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
            filterId === 'all'
              ? 'bg-studio-red border-studio-red text-white'
              : 'bg-studio-navy border-white/10 text-slate-300'
          }`}
        >
          Todas
        </button>
        {disciplines.map((d) => (
          <button
            key={d.id}
            onClick={() => setFilterId(d.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
              filterId === d.id
                ? 'bg-studio-red border-studio-red text-white'
                : 'bg-studio-navy border-white/10 text-slate-300'
            }`}
          >
            {d.name}
          </button>
        ))}
      </div>

      {canPost && (
        <form
          onSubmit={handlePublish}
          className="rounded-2xl bg-studio-navy border border-white/10 p-4 space-y-3"
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
              className="rounded-xl bg-studio-navy-deep border border-white/10 px-3 py-2 text-sm text-white"
            />
            <select
              value={postDiscipline}
              onChange={(e) => setPostDiscipline(e.target.value)}
              className="rounded-xl bg-studio-navy-deep border border-white/10 px-3 py-2 text-sm text-white"
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
            className="w-full rounded-xl bg-studio-navy-deep border border-white/10 px-3 py-2 text-sm text-white"
          />
          <button
            type="submit"
            className="rounded-xl bg-studio-red hover:bg-studio-red-dark px-4 py-2 text-xs font-semibold text-white"
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
              className="rounded-2xl bg-studio-navy border border-white/10 p-5 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase px-2.5 py-0.5 rounded-full bg-studio-red/15 text-red-300">
                  <Megaphone className="w-3 h-3" />
                  {post.disciplines?.name ?? 'General'}
                </span>
                <span className="text-xs text-slate-500">
                  {new Date(post.created_at).toLocaleDateString('es-ES')}
                </span>
              </div>
              <h2 className="font-headline text-lg text-white uppercase">{post.title}</h2>
              <p className="text-sm text-slate-300 whitespace-pre-line">{post.content}</p>
            </article>
          ))
        )}
      </div>
    </div>
  );
}

