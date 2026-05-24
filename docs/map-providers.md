# Map Providers

The BESS map keeps `MapLibre` through `react-map-gl/maplibre`. Base map
configuration lives in `src/data/mapStyles.ts` and currently exposes:

- `standard`: CARTO Voyager raster tiles without an API key, or MapTiler
  Streets when only `NEXT_PUBLIC_MAPTILER_API_KEY` is configured.
- `satellite`: Google Map Tiles API when `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
  is configured; otherwise MapTiler Satellite when `NEXT_PUBLIC_MAPTILER_API_KEY`
  is configured.
- `hybrid`: Google satellite plus roadmap layer when
  `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is configured; otherwise MapTiler Hybrid
  when `NEXT_PUBLIC_MAPTILER_API_KEY` is configured.

## Google Map Tiles API

Google is the preferred satellite provider for this tool because it provides
high-resolution 2D satellite imagery without replacing the MapLibre rendering
stack. The app creates a Google Map Tiles API session token in the browser and
then requests raster tiles through:

```txt
https://tile.googleapis.com/v1/2dtiles/{z}/{x}/{y}?session=SESSION&key=YOUR_KEY
```

Set the browser key in `.env.local`:

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

Enable the Google Maps Platform Map Tiles API, attach billing, restrict the key
by HTTP referrer, and set quotas in Google Cloud Console. Google tiles require
visible attribution; the app displays a compact `Google Maps` attribution when
this provider is active.

## MapTiler Fallback

MapTiler is kept as a fallback through style JSON URLs:

```txt
https://api.maptiler.com/maps/{mapId}/style.json?key=YOUR_KEY
```

Set the key in `.env.local`:

```bash
NEXT_PUBLIC_MAPTILER_API_KEY=your_maptiler_key
```

Then restart `npm run dev` or rebuild the app. Do not commit real keys. Public
browser keys are visible to users by design, so rely on provider-side domain
restrictions and quotas rather than secrecy.

Satellite and hybrid layers are disabled when no key is present because there is
no bundled, stable, high-quality global satellite provider without credentials.
The fallback standard map is suitable for general orientation, but visual map
context is only preliminary. It must not be treated as topographic, cadastral,
legal, or survey validation for a BESS project.
