(async function () {
  const listEl = document.getElementById('itinList');
  if (!listEl) return; // not logged in, nothing to load

  let currentItems = [];

  function itemHTML(item) {
    const d = item.destination;
    return `
      <div class="itin-item" data-entry="${item.entry_id}" data-lat="${d.lat}" data-lng="${d.lng}" data-color="${categoryColor(d.category)}">
        <div class="itin-row">
          <div class="itin-thumb" style="background:${categoryColor(d.category)}">${window.__iconSVG(d.icon)}</div>
          <div class="itin-info">
            <h4>${d.name} ${item.visited ? '<span class="visited-badge">Visited</span>' : ''}</h4>
            <span>${d.category} · ${d.neighborhood} · ${d.price}</span>
          </div>
          <button class="btn btn-sm btn-ghost" data-remove="${item.entry_id}">Remove</button>
        </div>
        <div class="itin-expand">
          <div class="itin-mini-map" id="itinMap-${item.entry_id}"></div>
          <div class="itin-actions">
            <button class="btn btn-sm btn-primary" data-directions="${item.entry_id}">📍 Get directions</button>
            <a class="btn btn-sm btn-ghost" href="/destination/${d.id}">Open full page</a>
            <button class="btn btn-sm ${item.visited ? 'btn-ghost' : 'btn-forest'}" data-visited="${item.entry_id}">
              ${item.visited ? 'Mark not visited' : '✓ Mark visited'}
            </button>
          </div>
          <div class="directions-result-inline"></div>
        </div>
      </div>`;
  }

  async function load() {
    try {
      const data = await api('/api/itinerary');
      currentItems = data.items;
      if (!data.items.length) {
        listEl.innerHTML = `<div class="empty-state">
          <h3>Your itinerary is empty</h3>
          <p>Browse places and tap "Add to my itinerary" to start planning.</p>
          <a class="btn btn-primary" href="/explore" style="margin-top:12px;">Explore places</a>
        </div>`;
        return;
      }
      listEl.innerHTML = data.items.map(itemHTML).join('');
      attachHandlers();
    } catch (e) {
      listEl.innerHTML = '<p>Could not load your itinerary.</p>';
    }
  }

  function attachHandlers() {
    // Toggle expand on row click (but not on buttons/links inside it)
    listEl.querySelectorAll('.itin-item').forEach((row) => {
      row.querySelector('.itin-row').addEventListener('click', (e) => {
        if (e.target.closest('button') || e.target.closest('a')) return;
        const wasOpen = row.classList.contains('open');
        listEl.querySelectorAll('.itin-item.open').forEach((r) => r.classList.remove('open'));
        if (!wasOpen) {
          row.classList.add('open');
          const entryId = row.dataset.entry;
          const lat = parseFloat(row.dataset.lat);
          const lng = parseFloat(row.dataset.lng);
          const color = row.dataset.color;
          if (!row.dataset.mapReady) {
            const map = createMapWithFallback(
              `itinMap-${entryId}`,
              { center: [lng, lat], zoom: 14 },
              { lat, lng }
            );
            if (map) addMapPin(map, [lng, lat], color, '');
            row._map = map;
            row.dataset.mapReady = '1';
          } else {
            setTimeout(() => row._map && row._map.invalidateSize(), 60);
          }
        }
      });
    });

    // Remove
    listEl.querySelectorAll('[data-remove]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          await api(`/api/itinerary/${btn.dataset.remove}`, { method: 'DELETE' });
          showToast('Removed from itinerary.');
          load();
        } catch (err) {
          showToast(err.message, true);
        }
      });
    });

    // Toggle visited
    listEl.querySelectorAll('[data-visited]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const item = currentItems.find((i) => String(i.entry_id) === btn.dataset.visited);
        try {
          await api(`/api/itinerary/${btn.dataset.visited}`, {
            method: 'PATCH',
            body: JSON.stringify({ visited: !item.visited }),
          });
          showToast(item.visited ? 'Marked as not visited yet.' : 'Marked as visited — nice!');
          load();
        } catch (err) {
          showToast(err.message, true);
        }
      });
    });

    // Directions
    listEl.querySelectorAll('[data-directions]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const row = btn.closest('.itin-item');
        const lat = parseFloat(row.dataset.lat);
        const lng = parseFloat(row.dataset.lng);
        const resultBox = row.querySelector('.directions-result-inline');
        btn.disabled = true;
        resultBox.innerHTML = '<p class="directions-loading">Finding the best route…</p>';
        try {
          const result = await getDirectionsTo(lat, lng);
          if (result.driving && row._map) {
            drawRouteLine(row._map, result.driving.geometry, row.dataset.color);
            fitToPoints(row._map, [[result.from.lng, result.from.lat], [lng, lat]], 50);
            addMapPin(row._map, [result.from.lng, result.from.lat], '#1C1B39', '');
            resultBox.innerHTML = `
              <div class="directions-summary">
                <div class="directions-figure"><b>${formatDistance(result.driving.distance)}</b><span>By road</span></div>
                <div class="directions-figure"><b>${formatDuration(result.driving.duration)}</b><span>Driving / taxi</span></div>
                <div class="directions-figure"><b>~${result.walkingMinutes} min</b><span>On foot (est.)</span></div>
              </div>`;
          } else {
            resultBox.innerHTML = `<p class="directions-note">~${result.straightLineKm.toFixed(1)} km straight-line, about ${result.walkingMinutes} min on foot.</p>`;
          }
        } catch (err) {
          resultBox.innerHTML = '<p class="directions-note">Could not get directions right now.</p>';
        } finally {
          btn.disabled = false;
        }
      });
    });
  }

  load();
})();
