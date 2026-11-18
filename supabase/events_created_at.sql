-- Añade events.created_at, que la app usa para contar novedades (ClientLayout)
-- y para marcar eventos como NUEVO (ClientNoticesFaqsPage). Idempotente.
alter table public.events
  add column if not exists created_at timestamptz not null default now();
