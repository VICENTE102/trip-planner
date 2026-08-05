# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the Vite dev server
- `npm run build` — type-check (`tsc -b`) then build with Vite
- `npm run lint` — run Oxlint
- `npm run preview` — preview the production build

There is no test suite configured in this project.

## Architecture

TripPlanner is a fully client-side (no backend) React + TypeScript + Vite trip-planning app. All content — hotels, flights, itineraries, prices — is deterministically generated mock data; there is no real booking API.

### Data flow

`SearchScreen` collects a `SearchParams` (origin, destination, dates, budget, travelers, category, preferences) and navigates to `/results` passing it via router state (see `ResultsScreen`, which redirects to `/` if that state is missing — results are never fetched from a URL).

`ResultsScreen` calls `buildSearchResult` (`src/services/searchService.ts`), which is the central orchestrator: for each of the three tiers (`barato`/`medio`/`caro`) it combines a hotel (`hotelProvider`), flights (`flightProvider`), a generated day-by-day plan (`itineraryBuilder` + `mockContent`), and a cost breakdown (`economicSummary`) into a `TripProposal`. A `SearchResult` is `{ searchParams, proposals: TripProposal[] }` (always all three tiers — the UI's `category` field only controls which tab is pre-selected, via `CATEGORY_TO_TIER` in `ResultsScreen`).

Saving a proposal (`useTrips` → `tripStorage`) wraps it with an id/timestamp into a `Trip` and persists it to `localStorage` under the `"trips"` key; `MyTripsScreen`/`TripDetailScreen` read back from there. There is no server sync.

### Deterministic mock generation

Everything randomized is actually seeded, not random: `hashString` + `createSeededRandom` (mulberry32 PRNG, `src/utils/random.ts`) derive a numeric seed from stable inputs (destination, dates, tier, budget, etc.), so the same search always reproduces the same hotels/flights/itinerary. When adding new generated content, follow this pattern rather than calling `Math.random()` directly — otherwise results won't be stable across re-renders/navigation.

`itineraryBuilder.ts` builds one `ItineraryDay` per day, picking morning/afternoon activities and a restaurant via `mockContent.ts`. Each activity/restaurant has a stable `id` (e.g. `"cultura"`, `"playa"`, `"llegada"`) which `constants/blockImages.ts` maps to a hand-picked, verified real Wikimedia Commons photo (never illustrations/icons) — themes are reused across tiers/destinations to keep the curated image set small. If you add a new activity id in `mockContent.ts`, add a matching entry in `blockImages.ts` or it will fall back to a generic icon.

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
