import { supabase } from '@/lib/supabase';

export async function compressAvatarImage(file: File, maxSize = 400): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo procesar la imagen');
  ctx.drawImage(bitmap, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Error al comprimir imagen'))),
      'image/webp',
      0.82
    );
  });
}

export async function uploadUserAvatar(userId: string, file: File): Promise<string> {
  const compressed = await compressAvatarImage(file);
  const filePath = `${userId}.webp`;

  const { error } = await supabase.storage
    .from('avatars')
    .upload(filePath, compressed, { contentType: 'image/webp', upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
  return `${data.publicUrl}?t=${Date.now()}`;
}

