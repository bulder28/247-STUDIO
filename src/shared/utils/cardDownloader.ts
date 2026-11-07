/**
 * 247 STUDIO - Fighter FUT Card HD Image Downloader
 * Converts the DOM card element into a high-res PNG for Instagram Stories and social media
 */

export async function downloadFighterCardAsPng(
  elementId: string,
  athleteAlias: string
): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found.`);
    return false;
  }

  try {
    const html2canvasModule = await import('html2canvas');
    const html2canvas = html2canvasModule.default || html2canvasModule;
    const canvas = await html2canvas(element, {
      scale: 3, // High-DPI crystal clear quality
      useCORS: true,
      allowTaint: true,
      backgroundColor: null, // Transparent background outside the shield
    });

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    const cleanAlias = athleteAlias.trim().replace(/\s+/g, '_');
    link.download = `247_Fighter_${cleanAlias}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch (err) {
    console.error('Error generating card image:', err);
    return false;
  }
}

