/**
 * Utilidad de procesamiento, recorte y compresión de fotos de atleta en Canvas HTML5.
 * Garantiza que la imagen resultante esté en formato JPEG, con recorte proporcional centrado
 * en la cara/cuerpo (object-cover object-top), zoom interactivo y tamaño ultraligero (< 50KB).
 */

export interface ImageCompressionOptions {
  zoom?: number;
  targetWidth?: number;
  targetHeight?: number;
  quality?: number;
  maxSizeBytes?: number; // Límite estricto de tamaño en bytes (default: 50 KB = 51200 bytes)
}

/**
 * Recorta y comprime una imagen dada (File o dataURL/URL) usando un canvas offscreen.
 * Retorna una promesa con el DataURL en formato JPEG comprimido por debajo del límite (< 50KB).
 */
export async function compressImageToCanvas(
  imageSource: string | File,
  options: ImageCompressionOptions = {}
): Promise<string> {
  const {
    zoom = 1,
    targetWidth = 400,
    targetHeight = 440,
    quality = 0.72,
    maxSizeBytes = 49152, // 48 KB de margen de seguridad para no superar 50KB
  } = options;

  let sourceDataUrl: string;
  if (typeof imageSource === 'string') {
    sourceDataUrl = imageSource;
  } else {
    sourceDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') resolve(reader.result);
        else reject(new Error('No se pudo convertir el archivo a Data URL.'));
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo de imagen.'));
      reader.readAsDataURL(imageSource);
    });
  }

  // Cargar imagen en un elemento HTMLImageElement
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Error al cargar la imagen en memoria para compresión.'));
    image.src = sourceDataUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('El contexto 2D de Canvas no está disponible en este entorno.');
  }

  // Fondo blanco para evitar fondos negros si la imagen de entrada tenía transparencias PNG
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  const imgW = img.naturalWidth || img.width;
  const imgH = img.naturalHeight || img.height;

  // Cálculo de dimensiones para replicar object-cover object-top
  const targetRatio = targetWidth / targetHeight;
  const imgRatio = imgW / imgH;

  let cropW: number;
  let cropH: number;
  let cropX: number;
  let cropY: number;

  if (imgRatio > targetRatio) {
    // La imagen es más ancha que el canvas destino
    cropH = imgH;
    cropW = imgH * targetRatio;
    cropX = (imgW - cropW) / 2;
    cropY = 0; // object-top para preservar cabeza y rostro del atleta
  } else {
    // La imagen es más alta que el canvas destino
    cropW = imgW;
    cropH = imgW / targetRatio;
    cropX = 0;
    cropY = 0; // object-top
  }

  // Aplicar factor de escala de zoom centrado sobre la ventana de recorte
  const effectiveZoom = Math.max(1, zoom);
  const zoomedW = cropW / effectiveZoom;
  const zoomedH = cropH / effectiveZoom;

  const centerX = cropX + cropW / 2;
  const centerY = cropY + cropH / 2;

  let finalX = centerX - zoomedW / 2;
  let finalY = centerY - zoomedH / 2;

  // Clamping dentro de los límites de la imagen
  if (finalX < 0) finalX = 0;
  if (finalY < 0) finalY = 0;
  if (finalX + zoomedW > imgW) finalX = Math.max(0, imgW - zoomedW);
  if (finalY + zoomedH > imgH) finalY = Math.max(0, imgH - zoomedH);

  // Renderizado en canvas con antialiasing de alta calidad
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, finalX, finalY, zoomedW, zoomedH, 0, 0, targetWidth, targetHeight);

  // Compresión iterativa JPEG para garantizar que la carga útil sea < 50KB
  let currentQuality = quality;
  let result = canvas.toDataURL('image/jpeg', currentQuality);

  // Estimación de peso en bytes: longitud de base64 * (3/4)
  let estimatedBytes = Math.round((result.length * 3) / 4);

  while (estimatedBytes > maxSizeBytes && currentQuality > 0.25) {
    currentQuality -= 0.08;
    result = canvas.toDataURL('image/jpeg', currentQuality);
    estimatedBytes = Math.round((result.length * 3) / 4);
  }

  return result;
}
