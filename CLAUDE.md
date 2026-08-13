# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the Vite dev server
- `npm run build` — type-check (`tsc -b`) then build with Vite
- `npm run lint` — run Oxlint
- `npm run preview` — preview the production build
- `npm test` — run the Vitest suite (`npm run test:watch` to keep it running)
- `npm run test:integration` — hit Geoapify for real; needs `GEOAPIFY_API_KEY`

Tests live next to the code they cover (`schedule-itinerary.test.ts` beside `schedule-itinerary.ts`) and only cover `server/` and `api/` — there are no React component tests, on purpose. `.github/workflows/test.yml` runs lint, `tsc -b` and the suite on every push.

The whole suite runs offline with no keys: without `SUPABASE_URL` and `GEOAPIFY_API_KEY` the chain degrades to the seeded mocks (geocoding → `MockGeocodingProvider`, activities → `MockPlacesProvider`, persistence → no-op), so a full `/api/trips/generate` call is deterministic and hermetic. Keep it that way — a test that needs the network belongs in `*.integration.test.ts`, which is excluded from `npm test` by a separate Vitest config.

Environment variables and the Supabase schema are documented in `README.md`. Server-side keys (`SUPABASE_*`, `GEOAPIFY_API_KEY`) must never take the `VITE_` prefix — that prefix is what puts a value in the browser bundle.

## Architecture

TripPlanner is a React + TypeScript + Vite frontend on top of a Node backend that runs as Vercel functions (`api/` = HTTP handlers, `server/` = all the logic). The backend is what actually plans the trip: budget allocation, scoring, combination filtering and day-by-day scheduling. Hotels, flights and activities are still simulated (`server/mocks/`) behind provider interfaces, so swapping in a real supplier means writing one provider, not touching the engine. There is no booking API — the app links out instead (see "Deep links").

City coordinates are real (Geoapify, see "Geocoding"); everything else about a place is still made up.

`npm run dev` serves the frontend **and** runs the `api/` functions inside the same Vite server (`devApiPlugin` in `vite.config.ts`), so no separate `vercel dev` is needed.

### Data flow

`SearchScreen` collects a `SearchParams` (origin, destination, dates, budget, travelers, category, preferences) and POSTs it to `/api/trips/generate` via `src/services/trip-api.client.ts`. If that call fails it throws instead of navigating — `/results` has nothing to show without a backend answer. On success it navigates to `/results` passing `{ searchParams, generation }` in router state (`ResultsScreen` redirects to `/` if that state is missing — results are never fetched from a URL).

`server/services/trip-planner.service.ts` is the backend orchestrator: it resolves the city center once, asks the three providers for offers, builds every viable combination, scores and filters them, and returns up to three proposals (`economical`/`recommended`/`comfort`). Fewer than three — or none — is a legitimate outcome when the budget doesn't stretch; `metadata.cheapestTotalCost` is what lets the empty state say how much is missing.

`src/services/tripAdapter.ts` is the **single** translation point between the backend contract (`server/types`: offers, timed blocks, a 7-line budget breakdown) and the view model (`src/types`: morning/afternoon/night, hotel, expense summary). Anything the engine computes but the UI has nowhere to show is dropped there, and it is documented at the top of that file. Keep the translation in that one place rather than teaching components to read the network shape.

Saving a proposal (`useTrips` → `tripStorage`) wraps it with an id/timestamp into a `Trip` and persists it to `localStorage` under the `"trips"` key; `MyTripsScreen`/`TripDetailScreen` read back from there. There is no server sync.

### Deterministic mock generation

Everything randomized in `server/mocks/` is seeded, not random: `hashString` + `createSeededRandom` (mulberry32 PRNG, `server/utils/random.ts`) derive a numeric seed from stable inputs (destination, dates, etc.), so the same search always reproduces the same hotels/flights/activities. When adding new generated content, follow this pattern rather than calling `Math.random()` directly.

`constants/blockImages.ts` maps a stable activity id (e.g. `"cultura"`, `"playa"`, `"llegada"`) to a hand-picked, verified real Wikimedia Commons photo (never illustrations/icons). The backend does not yet tag activities with a category, so `tripAdapter` passes an empty id and cards currently fall back to a generic icon; adding `category` to `ItineraryItem` is what would light these back up.

### Geocoding

`server/services/geocoding.service.ts` turns a destination name into real coordinates, resolving in this order: process memory → `geocoding_cache` in Supabase → Geoapify → the seeded mock. It never throws: a search must not fail because a geocoder is down, so the worst case degrades to a fake center.

Two rules that are easy to break by accident: only results from a **real** provider are persisted (caching a mock result would pin invented coordinates forever, and setting `GEOAPIFY_API_KEY` later would no longer fix that destination), and network failures are not cached at all (they must be retried). "Not found" **is** cached, as `found = false`.

`services/destinationImage.ts` resolves a hero photo per destination: a curated `CURATED_IMAGES` map first, then (only if `VITE_PEXELS_API_KEY` is set) a live Pexels API search, cached in-memory per city. `normalizeCityName` (`utils/text.ts`) is what both this and `deepLinks.ts` use to key city names, so lookups are accent/case-insensitive.

### Deep links, not bookings

`services/deepLinks.ts` builds outbound URLs to real travel sites (Google Flights, Booking.com, GetYourGuide, Google Maps) instead of performing any booking. For a handful of airlines/cities it has direct deep-link builders keyed by IATA code (`IATA_BY_CITY`); anything unresolvable degrades gracefully to a generic Google Flights search — always keep that fallback when extending this file.

### Tier theming

`TierLevel` (`"barato" | "medio" | "caro"`) is the recurring axis across hotels, itineraries, pricing, and UI. `constants/tierTheme.ts` centralizes the Tailwind classes (color, label) per tier so every screen/component stays visually in sync — use `TIER_THEME[tier]` rather than hardcoding tier colors in a component.

### Styling

Tailwind v4 via `@tailwindcss/vite`, with a custom theme (`sunset`/`lagoon`/`ink` color scales, `Fraunces`/`Inter` fonts) defined in `src/index.css` using `@theme`. Custom keyframe animations (`fade-in-up`, `tab-hop`, `slide-in-trail`) also live there. `Icon.tsx` is a small hand-rolled SVG icon set (no icon library) — add new icons there by extending `IconName` and `PATHS`.

### Routing

React Router (`react-router-dom`), all client-side, defined in `App.tsx`: `/` (search), `/results` (requires router state from search), `/mis-viajes` (saved trips), `/mis-viajes/:tripId` (trip detail).

### Language

All user-facing copy (labels, generated itinerary text, validation messages) is in Spanish. Keep new user-facing strings consistent with this.
