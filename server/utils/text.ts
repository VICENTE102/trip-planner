// Copia servidor de src/utils/text.ts. No se comparte el módulo porque
// tsconfig.server.json solo incluye api/ y server/: el backend no compila
// contra src/. Ambas versiones tienen que normalizar igual — el frontend la
// usa para cachear imágenes por ciudad y el backend para cachear
// coordenadas, y una discrepancia solo provocaría fallos de caché.
//
// El rango ̀-ͯ son los diacríticos combinados que deja sueltos
// normalize("NFD"): es lo que convierte "Málaga" en "malaga".
export function normalizeCityName(value: string): string {
  return value
    .split(",")[0]
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}
