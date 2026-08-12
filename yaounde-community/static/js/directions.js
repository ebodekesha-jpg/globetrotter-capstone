// Directions helper — used on the destination page and the itinerary page.
// Routing comes from OSRM's free public demo server (driving profile only).
// Walking time is a straight-line estimate (labelled as such) since a free
// walking-routing API isn't available without a key.

const YAOUNDE_CENTER = { lat: 3.8480, lng: 11.5021 };

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getUserLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ ...YAOUNDE_CENTER, fallback: true });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, fallback: false }),
      () => resolve({ ...YAOUNDE_CENTER, fallback: true }),
      { timeout: 8000, maximumAge: 60000 }
    );
  });
}

async function fetchDrivingRoute(from, to) {
  const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.code !== 'Ok' || !data.routes?.length) throw new Error('No driving route found.');
  return data.routes[0]; // { geometry, distance (m), duration (s) }
}

function formatDuration(seconds) {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

function formatDistance(meters) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

/**
 * Full directions flow: locate the user, fetch a driving route, and compute a
 * walking-time estimate. Returns null (and calls onFallbackLocation) if the
 * routing request itself fails, but always resolves the user's location.
 */
async function getDirectionsTo(destLat, destLng, { onFallbackLocation } = {}) {
  const from = await getUserLocation();
  if (from.fallback && onFallbackLocation) onFallbackLocation();

  const straightLineKm = haversineKm(from.lat, from.lng, destLat, destLng);
  const walkingMinutes = Math.round((straightLineKm / 5) * 60); // ~5 km/h

  let driving = null;
  try {
    driving = await fetchDrivingRoute(from, { lat: destLat, lng: destLng });
  } catch (e) {
    driving = null; // caller can still show the walking estimate
  }

  return {
    from,
    straightLineKm,
    walkingMinutes,
    driving, // null if OSRM couldn't be reached
  };
}
