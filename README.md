# TripPlanner

## Configuración

### Variables de entorno

Todas son variables **del servidor**: ninguna lleva el prefijo `VITE_`, así que
Vite no las incluye en el bundle y nunca llegan al navegador. En local van en
`.env.local` (ignorado por git); en producción, en el panel de Vercel
(Settings → Environment Variables).

| Variable | Para qué | Si falta |
|---|---|---|
| `SUPABASE_URL` | Persistencia de viajes y caché | Se omite el guardado; los viajes se generan igual |
| `SUPABASE_SERVICE_ROLE_KEY` | Ídem | Ídem |
| `GEOAPIFY_API_KEY` | Geocodificar el destino (coordenadas reales) | Se usan coordenadas simuladas (`MockGeocodingProvider`) |

`VITE_PEXELS_API_KEY` es la excepción y sí es pública a propósito: la búsqueda
de la foto de portada la hace el navegador. Es opcional; sin ella se usan las
imágenes curadas de `src/services/destinationImage.ts`.

### Base de datos

El esquema completo está en `supabase/schema.sql`. Se ejecuta pegándolo en el
SQL Editor del proyecto de Supabase. Es idempotente (`create table if not
exists`), así que se puede volver a ejecutar entero cuando se añadan tablas
nuevas.

## Desarrollo

`npm run dev` levanta el frontend **y** las funciones de `api/` dentro del
mismo servidor de Vite (ver `devApiPlugin` en `vite.config.ts`), así que no
hace falta `vercel dev` aparte.

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
