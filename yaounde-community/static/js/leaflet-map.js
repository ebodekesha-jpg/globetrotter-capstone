// Shared map helper for every map on the site — built on Leaflet.js and
// standard OpenStreetMap raster tiles, both served from very widely
// mirrored/whitelisted CDNs (cdnjs + tile.openstreetmap.org). This trades
// away the earlier MapLibre 3D tilt effect for something that reliably
// renders inside the page on ordinary networks, instead of falling back to
// an external OpenStreetMap link.
//
// All call sites in this app pass coordinates as [lng, lat] (matching the
// data files and OSRM's convention) — this module converts to Leaflet's
// [lat, lng] order internally so nothing elsewhere in the codebase needs to
// change.

const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';

/**
 * Create a standard 2D map centered on a point.
 * @param {string} containerId
 * @param {object} opts - { center: [lng, lat], zoom }
 */
function createMap(containerId, opts = {}) {
  const center = opts.center || [11.517, 3.868];
  const map = L.map(containerId, {
    zoomControl: true,
    attributionControl: true,
  }).setView([center[1], center[0]], opts.zoom ?? 12.5);

  const tileLayer = L.tileLayer(OSM_TILE_URL, {
    maxZoom: 19,
    attribution: OSM_ATTRIBUTION,
  }).addTo(map);

  // Kept for createMapWithFallback's load/error diagnostics below.
  map._tileLayer = tileLayer;
  return map;
}

/** Drop a colored circular pin with an optional popup. Takes [lng, lat]. */
function addMapPin(map, lngLat, color, popupHtml) {
  const icon = L.divIcon({
    className: '',
    html: `<div class="map-pin" style="--pin-color:${color || '#C9522E'}"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  });
  const marker = L.marker([lngLat[1], lngLat[0]], { icon }).addTo(map);
  if (popupHtml) marker.bindPopup(popupHtml);
  return marker;
}

/** Fit the map view to comfortably contain an array of [lng, lat] points. */
function fitToPoints(map, points, padding = 40) {
  if (!points.length) return;
  const latlngs = points.map((p) => [p[1], p[0]]);
  map.fitBounds(L.latLngBounds(latlngs), { padding: [padding, padding], maxZoom: 16 });
}

/** Draw (or replace) a route line from an OSRM GeoJSON LineString geometry. */
function drawRouteLine(map, geometry, color = '#C9522E') {
  const latlngs = geometry.coordinates.map((c) => [c[1], c[0]]);
  if (map._routeLayer) map.removeLayer(map._routeLayer);
  map._routeLayer = L.polyline(latlngs, { color, weight: 5, opacity: 0.9, lineJoin: 'round' }).addTo(map);
}

/**
 * Mount a map only when it's actually needed — either because the visitor
 * scrolled it into view, or (immediately) after they tap a "load map"
 * button. On a detected slow/data-saver connection we skip the automatic
 * scroll-trigger entirely and always ask first, since each map pulls in
 * tile images that cost real data on a 2G/3G connection.
 *
 * @param {string} containerId
 * @param {function} initFn - called once, when the map should actually load
 */
function mountMapLazily(containerId, initFn) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const isSlow = !!conn && (conn.saveData || ['slow-2g', '2g'].includes(conn.effectiveType));

  function showPlaceholder(note) {
    container.classList.add('map-placeholder');
    container.innerHTML = `
      <button type="button" class="btn btn-primary btn-sm map-load-btn">🗺️ Tap to load map</button>
      <p class="map-placeholder-note">${note}</p>`;
    container.querySelector('.map-load-btn').addEventListener(
      'click',
      () => {
        container.classList.remove('map-placeholder');
        container.innerHTML = '';
        initFn();
      },
      { once: true }
    );
  }

  if (isSlow) {
    showPlaceholder('Slow connection detected — maps use extra data.');
    return;
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            observer.disconnect();
            initFn();
          }
        });
      },
      { rootMargin: '150px' }
    );
    observer.observe(container);
  } else {
    initFn();
  }
}

/**
 * Create a map with real failure handling: if Leaflet never loaded, if the
 * map can't construct, or if tiles fail to fetch, the container swaps to a
 * message with a direct link to view the same spot on openstreetmap.org —
 * so a network hiccup never leaves the visitor staring at a blank box.
 *
 * @param {string} containerId
 * @param {object} opts - { center: [lng, lat], zoom }
 * @param {{lat:number,lng:number}} fallbackCoords - used for the OSM link
 * @returns {L.Map|null}
 */
function createMapWithFallback(containerId, opts, fallbackCoords) {
  const container = document.getElementById(containerId);
  if (!container) return null;

  const osmUrl = `https://www.openstreetmap.org/?mlat=${fallbackCoords.lat}&mlon=${fallbackCoords.lng}#map=16/${fallbackCoords.lat}/${fallbackCoords.lng}`;
  const caption = document.createElement('div');
  caption.className = 'map-fallback-link';
  caption.innerHTML = `<a href="${osmUrl}" target="_blank" rel="noopener">Open this location in OpenStreetMap ↗</a>`;
  container.insertAdjacentElement('afterend', caption);

  function showBrokenState(message) {
    container.classList.add('map-placeholder');
    container.innerHTML = `<p class="map-placeholder-note">${message}</p>`;
  }

  if (typeof L === 'undefined') {
    console.error('[map] Leaflet failed to load — check network/CDN access to cdnjs.cloudflare.com.');
    showBrokenState("Couldn't load the map. Use the link below to see the location.");
    return null;
  }

  let map;
  try {
    map = createMap(containerId, opts);
  } catch (err) {
    console.error('[map] failed to initialize:', err);
    showBrokenState("Couldn't load the map. Use the link below to see the location.");
    return null;
  }

  let loaded = false;
  map._tileLayer.on('load', () => { loaded = true; });
  map._tileLayer.on('tileerror', (e) => {
    console.error('[map] a tile failed to load:', e);
  });
  setTimeout(() => {
    if (!loaded) {
      const link = caption.querySelector('a');
      link.textContent = 'Map is taking a while — open it in OpenStreetMap instead ↗';
      caption.classList.add('map-fallback-emphasized');
    }
  }, 7000);

  return map;
}
