(function () {
  let map = null;       // created lazily — may still be null when results load
  let markers = [];
  let latestDestinations = [];

  const searchInput = document.getElementById('searchInput');
  const categorySelect = document.getElementById('categorySelect');
  const neighborhoodSelect = document.getElementById('neighborhoodSelect');
  const resultsGrid = document.getElementById('resultsGrid');
  const resultsCount = document.getElementById('resultsCount');
  const clearBtn = document.getElementById('clearFiltersBtn');

  const params = new URLSearchParams(window.location.search);
  if (params.get('q')) searchInput.value = params.get('q');

  function clearMarkers() {
    markers.forEach((m) => m.remove());
    markers = [];
  }

  function renderMapMarkers() {
    if (!map) return; // map hasn't loaded yet (still lazy / on a slow connection) — that's fine
    clearMarkers();
    const points = [];
    latestDestinations.forEach((d) => {
      points.push([d.lng, d.lat]);
      const marker = addMapPin(
        map, [d.lng, d.lat], categoryColor(d.category),
        `<strong>${d.name}</strong><br>${d.category} · ${d.neighborhood}<br><a href="/destination/${d.id}">View details →</a>`
      );
      markers.push(marker);
    });
    if (points.length) fitToPoints(map, points, 50);
  }

  let debounceTimer;
  function debouncedLoad() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(loadResults, 250);
  }

  async function loadResults() {
    const qs = new URLSearchParams();
    if (searchInput.value.trim()) qs.set('q', searchInput.value.trim());
    if (categorySelect.value) qs.set('category', categorySelect.value);
    if (neighborhoodSelect.value) qs.set('neighborhood', neighborhoodSelect.value);

    resultsCount.textContent = 'Loading…';
    try {
      const data = await api('/api/destinations?' + qs.toString());
      latestDestinations = data.destinations;

      if (!categorySelect.dataset.filled) {
        data.categories.forEach((c) => {
          const opt = document.createElement('option');
          opt.value = c; opt.textContent = c;
          categorySelect.appendChild(opt);
        });
        categorySelect.dataset.filled = '1';
        if (params.get('category')) categorySelect.value = params.get('category');
      }
      if (!neighborhoodSelect.dataset.filled) {
        data.neighborhoods.forEach((n) => {
          const opt = document.createElement('option');
          opt.value = n; opt.textContent = n;
          neighborhoodSelect.appendChild(opt);
        });
        neighborhoodSelect.dataset.filled = '1';
      }

      resultsCount.textContent = `${data.count} place${data.count === 1 ? '' : 's'} found`;
      resultsGrid.innerHTML = data.destinations.length
        ? data.destinations.map(renderDestCard).join('')
        : '<div class="empty-state"><h3>No places match yet</h3><p>Try clearing a filter or searching a different word.</p></div>';

      renderMapMarkers();
    } catch (e) {
      resultsCount.textContent = 'Could not load places.';
    }
  }

  searchInput.addEventListener('input', debouncedLoad);
  categorySelect.addEventListener('change', () => {
    if (categorySelect.value) params.delete('category');
    loadResults();
  });
  neighborhoodSelect.addEventListener('change', loadResults);
  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    categorySelect.value = '';
    neighborhoodSelect.value = '';
    loadResults();
  });

  // The results list loads immediately — filtering works with or without the map.
  loadResults();

  // The map itself loads lazily (in view, or tap-to-load on a slow connection).
  mountMapLazily('map', () => {
    map = createMapWithFallback(
      'map',
      { center: [11.517, 3.868], zoom: 12 },
      { lat: 3.868, lng: 11.517 }
    );
    if (map) renderMapMarkers();
  });
})();
