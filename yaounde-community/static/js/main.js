// ---------------------------------------------------------------
// Shared helpers used across every page
// ---------------------------------------------------------------
function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.toggle('error', isError);
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 2600);
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...options,
  });
  let data = {};
  try { data = await res.json(); } catch (e) { /* no body */ }
  if (!res.ok) {
    const err = new Error(data.error || 'Something went wrong.');
    err.status = res.status;
    throw err;
  }
  return data;
}

// Mobile nav toggle
document.getElementById('navToggle')?.addEventListener('click', () => {
  document.getElementById('mainNav').classList.toggle('open');
});

// Logout
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
  try {
    await api('/api/logout', { method: 'POST' });
    window.location.href = '/';
  } catch (e) {
    showToast('Could not log out — try again.', true);
  }
});

// Category -> color used for map markers & small UI accents
const CATEGORY_COLORS = {
  Market: '#C9522E',
  Nature: '#2E6B4F',
  Museum: '#2B2A52',
  Heritage: '#8a6b2e',
  Park: '#3a8562',
  Sports: '#6b2d18',
  Neighborhood: '#46447c',
  University: '#6B3F6B',
  School: '#b98531',
  Cinema: '#4a2a4a',
  Restaurant: '#D9773F',
  Supermarket: '#1f4e4e',
  Hotel: '#5b3f6b',
  Culture: '#2c6e6e',
};

function categoryColor(cat) {
  return CATEGORY_COLORS[cat] || '#C9522E';
}
