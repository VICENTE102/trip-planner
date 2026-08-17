import { defineConfig } from "vitest/config";

// Las pruebas viven junto al código que comprueban (schedule-itinerary.test.ts
// al lado de schedule-itinerary.ts) para que se vean al abrir el archivo.
//
// No hace falta configurar la resolución de módulos: server/ importa con
// especificadores ".js" sobre archivos ".ts" —obligatorio para Vercel— y el
// resolutor de Vite lo entiende. Es el mismo camino que ya usa devApiPlugin
// en vite.config.ts para servir api/ durante `npm run dev`.
export default defineConfig({
  test: {
    environment: "node",
    // Se incluye src/services porque la capa de consentimiento y analítica
    // tiene lógica de verdad que hay que blindar (sobre todo: que no se mida
    // nada antes de aceptar). Sigue sin haber pruebas de componentes React.
    include: ["{api,server}/**/*.test.ts", "src/services/**/*.test.ts"],
    // Las de integración salen a la red y necesitan GEOAPIFY_API_KEY: se
    // ejecutan a mano con `npm run test:integration`, nunca en CI. Un fallo
    // de un servicio ajeno no debe poner el repositorio en rojo.
    exclude: ["**/*.integration.test.ts", "node_modules/**"],
  },
});
