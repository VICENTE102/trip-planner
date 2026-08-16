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
| `ORS_API_KEY` | Tiempos de desplazamiento a pie reales (OpenRouteService) | Se estiman en línea recta, como antes del Paso 5 |

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

### Tiempos de desplazamiento

Los trayectos **a pie** entre paradas los calcula
[OpenRouteService](https://openrouteservice.org/) con calles reales, en vez de
la línea recta de antes. Se pide **una sola matriz por búsqueda** (todos los
hoteles candidatos y todas las actividades a la vez) y se cachea por par de
coordenadas en `routes_cache`, así que en régimen normal la mayoría de
búsquedas no llaman a la API.

**Lo que NO es real: el transporte público.** La API pública de ORS no lo
cubre (sus perfiles son coche, bici, a pie y silla de ruedas). Por encima de
45 minutos andando el trayecto se marca como `transit` y se estima, porque
proponer una caminata de hora y media entre dos museos sería peor.

Esa estimación se calcula sobre la **distancia real por calle** que acaba de
dar ORS, más unos minutos de acceso a la parada — no sobre la línea recta.
Con la línea recta a 20 km/h, el Coliseo y la Basílica de San Pedro salían a
10 minutos cuando andando son 49. Y si la estimación sale peor que ir
andando, se anda: es una opción real y es el dato que sí conocemos.

## Seguridad y control de gasto

**Límite por IP: regla del WAF de Vercel**, no código. Corta en el edge antes
de que se ejecute la función, así que un bot no gasta ni invocación ni
lectura de base de datos. Está incluido en el plan Hobby (1 regla por
proyecto). Se configura en Vercel → Firewall → Configure → New Rule.

**Tope diario de llamadas a APIs externas** (`server/services/usage.service.ts`),
que es lo que el WAF no puede dar: su ventana máxima es de 10 minutos, no un
día, y aquí lo que se protege es la *cuota* de los proveedores.

| Proveedor | Tope diario | Plan gratuito del proveedor |
|---|---|---|
| Geoapify | 500 | ~3.000/día |
| OpenRouteService | 400 | ~2.500/día |

Al superarlo se deja de llamar al proveedor real y se usan los simulados,
avisando en los logs. No es un error: es la misma degradación que ya ocurre
cuando falta una clave.

El contador vive en `api_usage` y se incrementa con una función de Postgres
(`increment_api_usage`), no con un upsert desde el cliente: dos peticiones
simultáneas leyendo y escribiendo `count + 1` se pisarían. **Si el contador
falla, se deja pasar la llamada**: equivocarse por ese lado cuesta unas
llamadas de más; por el otro, romper el producto entero.

Las cachés son la primera defensa y ya estaban: un bot que repita el mismo
destino gasta **cero** llamadas externas. El caso caro es un bot que varíe el
destino en cada petición, y es justo el que topa el contador.

**Ninguna clave llega al navegador.** No queda ningún `import.meta.env` en
`src/`.

## Pruebas

```bash
npm test                 # suite completa, sin red ni claves
npm run test:watch       # en modo vigilancia mientras desarrollas
npm run test:integration # contra Geoapify y ORS de verdad (necesita sus claves)
```

Las pruebas viven junto al código que comprueban y cubren solo el backend
(`server/` y `api/`). Se ejecutan solas en cada push mediante GitHub Actions.

`npm test` **no sale a la red ni necesita ninguna clave**: sin `SUPABASE_URL`,
`GEOAPIFY_API_KEY` ni `ORS_API_KEY`, la cadena se resuelve con los proveedores
simulados, que van sembrados y por tanto dan siempre el mismo resultado. Hay
una prueba que lo vigila contando las llamadas a `fetch` de una generación
completa.

`npm run test:integration` es otra cosa: comprueba que las 10 ciudades
cargadas siguen geocodificando donde deben y que los tiempos a pie de ORS son
creíbles. Queda fuera de CI porque depende de servicios ajenos, pero conviene
lanzarla al añadir destinos nuevos.

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
