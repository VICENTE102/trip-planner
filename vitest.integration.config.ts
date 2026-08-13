import { defineConfig } from "vitest/config";

// Configuración aparte para las pruebas que salen a la red. No comparten
// fichero con las normales a propósito: si estuvieran en el mismo `include`
// con un flag, tarde o temprano alguien las ejecutaría en CI sin querer y el
// repositorio se pondría en rojo por una caída de Geoapify.
//
//   npm run test:integration      (requiere GEOAPIFY_API_KEY en el entorno)
export default defineConfig({
  test: {
    environment: "node",
    include: ["{api,server}/**/*.integration.test.ts"],
    // Geoapify tarda lo suyo y son varias ciudades seguidas.
    testTimeout: 30_000,
  },
});
