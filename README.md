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

### Puntos de interés (Overture Maps)

Las actividades reales de los itinerarios salen de [Overture Maps](https://overturemaps.org/),
que **no es una API en vivo**: se publica como GeoParquet en S3 y se consulta
con DuckDB. Por eso los datos se cargan a mano, desde tu máquina, y Vercel
solo lee la tabla `places` ya cargada.

```bash
npm run pois:inspect            # qué categorías tiene Roma y cuáles no mapeamos
npm run pois:load               # carga los destinos que falten
npm run pois:load -- --force    # recarga también los ya cargados
npm run pois:load -- --only=Roma
```

Los destinos están en `scripts/destinations.ts` (10 de momento); ampliar es
añadir nombres y volver a ejecutar `pois:load`, que se salta los que ya
tienen datos. Las bounding boxes se calculan geocodificando cada nombre, así
que no hay coordenadas escritas a mano.

`pois:inspect` es la herramienta para ampliar `scripts/overture-categories.ts`:
lista las categorías que aparecen en una ciudad y cuáles se están
descartando por no estar mapeadas. La documentación de Overture no publica la
lista completa de categorías, así que el mapa se escribe mirando los datos.

Los sitios son reales; **el precio, la duración y el horario son estimaciones
por categoría**, porque Overture no publica ninguno de los tres. Esas
actividades viajan con `verificationStatus: "partial"` y se explica al usuario
en `/fuentes`.

### Mapa

MapLibre GL JS con teselas de [OpenFreeMap](https://openfreemap.org/): sin
clave, sin registro, sin límites declarados y con uso comercial permitido. La
URL del estilo y la atribución están en `src/constants/mapStyle.ts`, en una
sola constante, para que cambiar de proveedor sea una línea — el servicio lo
mantiene una persona con donaciones y no ofrece SLA. La alternativa anotada es
[Maptoolkit](https://www.maptoolkit.org/).

El estilo de OpenFreeMap **no declara `attribution` en sus fuentes**, así que
el control de atribución de MapLibre se rellena a mano desde esa constante. No
es opcional: la ODbL de OpenStreetMap exige el aviso de autoría.

MapLibre se carga con `import()` (`DayMapLazy.tsx`) para mantenerlo fuera del
bundle principal, igual que el generador de PDF.

## Pruebas

```bash
npm test                 # suite completa, sin red ni claves
npm run test:watch       # en modo vigilancia mientras desarrollas
npm run test:integration # contra Geoapify de verdad (necesita GEOAPIFY_API_KEY)
```

Las pruebas viven junto al código que comprueban y cubren solo el backend
(`server/` y `api/`). Se ejecutan solas en cada push mediante GitHub Actions.

`npm test` **no sale a la red ni necesita ninguna clave**: sin `SUPABASE_URL`
ni `GEOAPIFY_API_KEY`, la cadena se resuelve con los proveedores simulados,
que van sembrados y por tanto dan siempre el mismo resultado.

`npm run test:integration` es otra cosa: comprueba que las 10 ciudades
cargadas siguen geocodificando donde deben. Queda fuera de CI porque depende
de un servicio ajeno, pero conviene lanzarla al añadir destinos nuevos.

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
