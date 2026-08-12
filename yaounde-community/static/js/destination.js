(function () {
  const D = window.__DEST;
  let map = null; // loads lazily — directions still work via text even if map isn't ready

  mountMapLazily('detailMap', () => {
    map = createMapWithFallback(
      'detailMap',
      { center: [D.lng, D.lat], zoom: 15.5 },
      { lat: D.lat, lng: D.lng }
    );
    if (map) {
      addMapPin(map, [D.lng, D.lat], categoryColor(D.category), `<strong>${D.name}</strong>`);
    }
  });

  // ---- Reviews ----
  function starString(n) {
    return '★'.repeat(n) + '☆'.repeat(5 - n);
  }

  function renderReviews(reviews, avg, count) {
    document.getElementById('factRating').textContent = avg ? `★ ${avg} (${count} review${count === 1 ? '' : 's'})` : 'No reviews yet';
    const list = document.getElementById('reviewsList');
    if (!reviews.length) {
      list.innerHTML = '<p>No reviews yet — be the first to share your experience.</p>';
      return;
    }
    list.innerHTML = reviews.map((r) => `
      <div class="review">
        <div class="review-head">
          <b>${r.user_name}</b>
          <span class="review-date">${new Date(r.created_at).toLocaleDateString()}</span>
        </div>
        <div class="stars">${starString(r.rating)}</div>
        <p style="margin:6px 0 0;">${r.comment}</p>
      </div>`).join('');
  }

  async function loadDetail() {
    try {
      const data = await api(`/api/destinations/${D.id}`);
      renderReviews(data.reviews, data.destination.rating_avg, data.destination.rating_count);
    } catch (e) {
      document.getElementById('reviewsList').innerHTML = '<p>Could not load reviews.</p>';
    }
  }

  if (D.loggedIn) {
    document.getElementById('reviewFormArea').style.display = 'block';
  }

  let selectedRating = 0;
  const stars = document.querySelectorAll('#starPicker span');
  stars.forEach((s) => {
    s.addEventListener('click', () => {
      selectedRating = parseInt(s.dataset.v, 10);
      stars.forEach((st) => st.classList.toggle('active', parseInt(st.dataset.v, 10) <= selectedRating));
    });
  });

  document.getElementById('submitReviewBtn')?.addEventListener('click', async () => {
    const comment = document.getElementById('reviewComment').value.trim();
    if (!selectedRating) { showToast('Pick a star rating first.', true); return; }
    if (!comment) { showToast('Write a short comment.', true); return; }
    try {
      await api(`/api/destinations/${D.id}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ rating: selectedRating, comment }),
      });
      document.getElementById('reviewComment').value = '';
      selectedRating = 0;
      stars.forEach((st) => st.classList.remove('active'));
      showToast('Thanks for your review!');
      loadDetail();
    } catch (e) {
      showToast(e.message, true);
    }
  });

  // ---- Add to itinerary (button only exists in the DOM when logged in) ----
  document.getElementById('addItineraryBtn')?.addEventListener('click', async (e) => {
    if (!D.loggedIn) {
      window.location.href = '/login';
      return;
    }
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      await api('/api/itinerary', { method: 'POST', body: JSON.stringify({ destination_id: D.id }) });
      btn.textContent = '✓ Added to itinerary';
      showToast(`${D.name} added to your itinerary.`);
    } catch (err) {
      btn.disabled = false;
      showToast(err.message, true);
    }
  });

  // ---- Directions (works even if the map above hasn't loaded yet) ----
  document.getElementById('getDirectionsBtn').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const resultEl = document.getElementById('directionsResult');
    btn.disabled = true;
    resultEl.innerHTML = '<p class="directions-loading">Finding your location and the best route…</p>';

    try {
      const result = await getDirectionsTo(D.lat, D.lng, {
        onFallbackLocation: () => {
          resultEl.insertAdjacentHTML(
            'beforeend',
            '<p class="directions-note">Couldn\'t access your exact location — using central Yaoundé as your starting point.</p>'
          );
        },
      });

      if (result.driving) {
        if (map) {
          drawRouteLine(map, result.driving.geometry, categoryColor(D.category));
          fitToPoints(map, [[result.from.lng, result.from.lat], [D.lng, D.lat]], 70);
          addMapPin(map, [result.from.lng, result.from.lat], '#1C1B39', '<strong>Your location</strong>');
        }
        resultEl.innerHTML = `
          <div class="directions-summary">
            <div class="directions-figure"><b>${formatDistance(result.driving.distance)}</b><span>By road</span></div>
            <div class="directions-figure"><b>${formatDuration(result.driving.duration)}</b><span>Driving / taxi</span></div>
            <div class="directions-figure"><b>~${result.walkingMinutes} min</b><span>On foot (est.)</span></div>
          </div>
          <p class="directions-note">Route calculated with OpenStreetMap data via OSRM. Walking time is a straight-line estimate.</p>
        ` + resultEl.innerHTML;
      } else {
        resultEl.innerHTML = `
          <div class="directions-summary">
            <div class="directions-figure"><b>${result.straightLineKm.toFixed(1)} km</b><span>Straight-line distance</span></div>
            <div class="directions-figure"><b>~${result.walkingMinutes} min</b><span>On foot (est.)</span></div>
          </div>
          <p class="directions-note">Couldn't reach the routing service for a road route — showing a straight-line estimate instead.</p>
        ` + resultEl.innerHTML;
      }
    } catch (err) {
      resultEl.innerHTML = '<p class="directions-note">Could not get directions right now. Please try again.</p>';
    } finally {
      btn.disabled = false;
    }
  });

  loadDetail();
})();
