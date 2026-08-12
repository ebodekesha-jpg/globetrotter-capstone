# Yaoundé Community Explorer

A community-built travel/outings guide to Yaoundé — Flask + JSON-file backend,
vanilla HTML/CSS/JS frontend, maps powered by Leaflet.js + OpenStreetMap.

## Features
- **Explore** — search & filter 36 real Yaoundé destinations across 14
  categories (markets, universities, schools, cinema, restaurants,
  supermarkets, museums, heritage, sports, nature, hotels, culture) with a
  live map + card grid.
- **Maps that work reliably everywhere** — Leaflet.js + standard OpenStreetMap
  tiles, on the homepage, Explore, each destination page, and itinerary items.
  Both the map library (cdnjs) and the tile server (tile.openstreetmap.org)
  are chosen for being about as widely reachable as any map stack gets; if a
  map still can't load on a given network, it swaps to a direct
  "Open in OpenStreetMap ↗" link rather than showing a dead blank box.
- **Real photos** — 10 well-documented landmarks (Marché Central, the
  Cathédrale, the Reunification Monument, Stade Ahmadou Ahidjo, the National
  Museum, Université de Yaoundé I, the Basilique de Mvolyé, and more) show
  real, properly licensed photos from Wikimedia Commons; places without a
  confirmed photo keep a crafted icon/gradient banner rather than a guessed
  or broken link.
- **Live directions** — "Get directions" uses your browser location, free
  OSRM road routing for driving/taxi distance & time, and a labelled
  straight-line walking-time estimate.
- **Destination pages** — facts, community reviews (star rating + comment,
  visible to everyone, no login needed to read), and "add to itinerary".
- **Community reviews feed** — a dedicated `/reviews` page and a homepage
  widget show every review site-wide, not just per destination.
- **Live weather** — current Yaoundé conditions on the homepage via the free
  [Open-Meteo](https://open-meteo.com) API (no key required).
- **Accounts** — register/login (Flask session + hashed passwords), no
  database required.
- **My Itinerary** — save places, expand any saved item to see a mini map,
  get directions to it, mark it visited, or remove it.
- **JSON-file storage** — `data/destinations.json`, `data/users.json`,
  `data/itineraries.json`, `data/reviews.json` act as the database, per the
  Phase 1 assignment requirement.

Built by **Ebode Kesha**.

## Run it locally

```bash
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Then open **http://127.0.0.1:5000** in your browser.

## Project structure

```
yaounde-community/
├── app.py                  # Flask app: pages + REST API
├── requirements.txt
├── data/
│   ├── destinations.json   # seed data — 16 Yaoundé places
│   ├── users.json          # created at runtime
│   ├── itineraries.json    # created at runtime
│   └── reviews.json        # created at runtime
├── templates/              # Jinja2 HTML templates
│   ├── base.html, index.html, explore.html, destination.html,
│   ├── my_itinerary.html, login.html, register.html, about.html, 404.html
│   └── _icons.html         # shared SVG icon macro
└── static/
    ├── css/style.css       # design system (see below)
    └── js/                 # main.js, home.js, explore.js, destination.js,
                             # itinerary.js, icons.js
```

## Built for slow connections

Loading is not all-or-nothing. Specifically:

- **The map library only loads on pages that have a map** (Home, Explore, a
  destination page, My Itinerary). Login, Register, About and Reviews never
  download Leaflet at all.
- **Maps load lazily**, only once scrolled into view — or, on a detected
  slow/data-saver connection (`navigator.connection`), only after a "Tap to
  load map" button is pressed. The page around the map (destination facts,
  reviews, search results) never waits on this.
- **Explore's search/filter results load and work independently of the map** —
  filtering doesn't block on map tiles, and vice versa.
- **Destination card photos are requested at a smaller size** (420px) than
  the full-size hero photo (900px) on a destination's own page.
- **HTML and JSON API responses are gzip-compressed** on the server when the
  browser supports it (most do).
- **Static files (CSS/JS) are cache-controlled** for a week, so repeat page
  loads on the same visit don't re-download them.

For a real production deployment on top of this, also put the app behind
nginx or a CDN with gzip/Brotli and long-lived cache headers for `/static/`,
since the Flask dev server here doesn't compress its own static file
responses (only the dynamically rendered pages and API responses).

## Design system
- **Palette**: laterite clay red, deep indigo dusk, market ochre/gold, forest
  green (Mont Fébé), cream paper background — drawn from Yaoundé's own
  materials rather than a generic template palette.
- **Type**: Fraunces (display) + Work Sans (body).
- **Signature element**: a repeating diagonal "pagne" (wax-print) stripe used
  as a divider under the header and above the footer, and a concentric-circle
  "seven hills" mark as the logo.

## REST API (JSON)

| Method | Route                                  | Auth | Purpose                        |
|--------|-----------------------------------------|------|---------------------------------|
| GET    | `/api/destinations`                     | –    | List + filter/search destinations |
| GET    | `/api/destinations/<id>`                | –    | Destination detail + reviews    |
| POST   | `/api/destinations/<id>/reviews`        | ✅   | Add a review                    |
| POST   | `/api/register`                         | –    | Create an account               |
| POST   | `/api/login`                            | –    | Log in                          |
| POST   | `/api/logout`                           | ✅   | Log out                         |
| GET    | `/api/me`                               | –    | Current session user            |
| GET    | `/api/itinerary`                        | ✅   | Your saved places               |
| POST   | `/api/itinerary`                        | ✅   | Add a place to your itinerary   |
| PATCH  | `/api/itinerary/<entry_id>`             | ✅   | Mark a saved place visited/unvisited |
| DELETE | `/api/itinerary/<entry_id>`             | ✅   | Remove a place                  |
| GET    | `/api/reviews/recent?limit=N`           | –    | Latest reviews site-wide        |

## Notes on the free services used
- **Maps**: [OpenStreetMap](https://openstreetmap.org)'s standard tile servers
  (no key, no rate limit for reasonable use) rendered with Leaflet.js — chosen
  over a vector-tile/WebGL stack specifically for maximum reachability across
  ordinary networks and older devices.
- **Routing**: [OSRM's public demo server](https://project-osrm.org) — driving
  profile only; fine for a student project, but swap in a self-hosted OSRM or a
  keyed provider before any real production use.
- **Weather**: [Open-Meteo](https://open-meteo.com) — free, no key required.
- **Photos**: Wikimedia Commons, `Special:FilePath` links, CC BY-SA licensed.

## Ideas to extend further
- Add a "suggest a place" form so community members can submit new spots for
  approval.
- Let users upload their own photos per destination.
- Add walking/cycling routing once a keyed routing provider is available
  (OSRM's free demo only serves driving).
- Add pagination once the destination list grows past ~50 entries.
