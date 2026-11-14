import { supabase } from '@/lib/supabase';

/**
 * Recorta la imagen en formato cuadrado centrado (1:1) y la comprime a 400x400 WebP
 * para que las fichas de alumno y avatares en Pasar Lista sean uniformes y ligeros.
 */
export async function compressAvatarImage(file: File, targetSize = 400): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = Math.floor((bitmap.width - side) / 2);
  const sy = Math.floor((bitmap.height - side) / 2);

  const canvas = document.createElement('canvas');
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('No se pudo procesar la imagen');
  }

  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, targetSize, targetSize);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Error al comprimir imagen'))),
      'image/webp',
      0.85
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
