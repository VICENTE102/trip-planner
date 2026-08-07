// Las fotos curadas de destino son ficheros originales de Wikimedia Commons
// sin redimensionar (pueden pesar decenas de MB — ver src/services/
// destinationImage.ts). Incrustarlas tal cual en el PDF dispara su peso muy
// por encima de lo razonable para "guardar en el móvil sin conexión", así
// que se recomprimen a un JPEG pequeño antes de pasarlas a TripPdfDocument.
const MAX_WIDTH = 1000;
const JPEG_QUALITY = 0.75;
// Algunos originales de Wikimedia Commons pesan decenas de MB (fichero de
// cámara sin redimensionar). Descargar y decodificar eso solo para
// desecharlo tras el resize bloquea la pestaña varios segundos — por
// encima de este umbral, se prescinde de la portada en vez de arriesgarse.
const MAX_SOURCE_BYTES = 8 * 1024 * 1024;

export async function downscaleImageForPdf(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const contentLength = response.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_SOURCE_BYTES) return null;

    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);

    const scale = Math.min(1, MAX_WIDTH / bitmap.width);
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, width, height);

    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  } catch {
    // Portada sin foto es mejor que bloquear la descarga del PDF por un
    // fallo de red/CORS puntual al recomprimir la imagen.
    return null;
  }
}
