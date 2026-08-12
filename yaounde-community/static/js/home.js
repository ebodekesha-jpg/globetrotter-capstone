(async function () {
  const grid = document.getElementById('featuredGrid');
  let destinations = [];

  try {
    const data = await api('/api/destinations');
    destinations = data.destinations;
    grid.innerHTML = destinations.slice(0, 9).map(renderDestCard).join('');
  } catch (e) {
    grid.innerHTML = '<p>Could not load places right now.</p>';
  }

  // Mini 3D overview map — only loads once scrolled into view (or on tap on
  // a slow connection), so it never competes with the list above for bandwidth.
  mountMapLazily('miniMap', () => {
    const map = createMapWithFallback(
      'miniMap',
      { center: [11.517, 3.868], zoom: 12 },
      { lat: 3.868, lng: 11.517 }
    );
    if (!map) return;
    map.scrollWheelZoom.disable();
    destinations.forEach((d) => {
      addMapPin(map, [d.lng, d.lat], categoryColor(d.category), `<strong>${d.name}</strong><br>${d.category}`);
    });
  });
})();

// ---- Weather widget (Open-Meteo, free, no key) ----
(async function loadWeather() {
  const el = document.getElementById('weatherWidget');
  if (!el) return;
  const CODES = {
    0: 'Clear sky', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Fog', 51: 'Light drizzle', 61: 'Light rain', 63: 'Rain',
    65: 'Heavy rain', 80: 'Rain showers', 81: 'Rain showers', 82: 'Violent showers',
    95: 'Thunderstorm',
  };
  try {
    const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=3.848&longitude=11.502&current=temperature_2m,weather_code&timezone=Africa%2FDouala');
    const data = await res.json();
    const temp = Math.round(data.current.temperature_2m);
    const desc = CODES[data.current.weather_code] || 'Local weather';
    el.innerHTML = `
      <div>
        <span class="weather-temp">${temp}°C</span>
        <span class="weather-desc">${desc}</span>
      </div>
      <div><span class="weather-label">Yaoundé right now</span></div>`;
  } catch (e) {
    el.innerHTML = '<span class="weather-desc">Weather unavailable right now.</span>';
  }
})();

// ---- Recent community reviews ----
(async function loadRecentReviews() {
  const el = document.getElementById('recentReviews');
  if (!el) return;
  try {
    const data = await api('/api/reviews/recent?limit=3');
    if (!data.reviews.length) {
      el.innerHTML = '<p>No reviews yet — be the first to share one!</p>';
      return;
    }
    el.innerHTML = data.reviews.map((r) => `
      <div class="review-feed-item">
        <div class="review-dest"><a href="/destination/${r.destination_id}">${r.destination_name}</a></div>
        <div class="stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
        <p style="margin:6px 0 4px;">${r.comment}</p>
        <span class="review-date">— ${r.user_name}</span>
      </div>`).join('');
  } catch (e) {
    el.innerHTML = '<p>Could not load recent reviews.</p>';
  }
})();
