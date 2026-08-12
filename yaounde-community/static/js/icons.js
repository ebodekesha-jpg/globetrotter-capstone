// Mirrors templates/_icons.html so JS-rendered cards match server-rendered ones.
const ICONS = {
  market: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 8l1.5-4h13L20 8" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 8h16v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2 2 2 0 0 1-2 2 2 2 0 0 1-2-2 2 2 0 0 1-2 2 2 2 0 0 1-2-2 2 2 0 0 1-2 2 2 2 0 0 1-2-2V8z" stroke-linejoin="round"/><path d="M5 12v8h14v-8" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 20v-5h6v5" stroke-linejoin="round"/></svg>',
  hill: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2 19l6-9 4 5 2-3 8 7H2z" stroke-linejoin="round"/><circle cx="17" cy="6" r="2.2"/></svg>',
  museum: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 21h18M4 21V10M20 21V10M2 10l10-6 10 6" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 21v-7M12 21v-7M16 21v-7" stroke-linecap="round"/></svg>',
  landmark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 3l7 4v2H5V7l7-4z" stroke-linejoin="round"/><path d="M5 21h14M6 9v10M10 9v10M14 9v10M18 9v10" stroke-linecap="round"/></svg>',
  leaf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 20C4 10 10 4 20 4c0 10-6 16-16 16z" stroke-linejoin="round"/><path d="M4 20c4-4 8-8 16-16" stroke-linecap="round"/></svg>',
  stadium: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><ellipse cx="12" cy="12" rx="9" ry="6"/><ellipse cx="12" cy="12" rx="4.5" ry="3"/></svg>',
  lake: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2 17c2-2 3 2 5 0s3-2 5 0 3-2 5 0 3-2 5 0" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 12c2-2 3 2 5 0s3-2 5 0 3-2 5 0 3-2 5 0" stroke-linecap="round" stroke-linejoin="round" opacity="0.5"/></svg>',
  district: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 21V9l5-4 5 4v12M13 21V13l4-3 4 3v8" stroke-linejoin="round" stroke-linecap="round"/><path d="M6 14h1M6 17h1M11 14h1M11 17h1" stroke-linecap="round"/></svg>',
  monument: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2v20M7 22h10M8 6c1-1 2-1.5 4-1.5S15 5 16 6c-1 3-2 6-4 8-2-2-3-5-4-8z" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  craft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18M6 6l12 12M18 6L6 18" opacity="0.5"/></svg>',
  waterfall: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 3v6M12 3v6M18 3v6" stroke-linecap="round"/><path d="M4 9h16l-2 4H6l-2-4z" stroke-linejoin="round"/><path d="M7 13c0 4-2 5-2 8M12 13c0 4-1 5-1 8M17 13c0 4 2 5 2 8" stroke-linecap="round"/></svg>',
  university: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2 9l10-5 10 5-10 5-10-5z" stroke-linejoin="round"/><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" stroke-linecap="round"/><path d="M22 9v6" stroke-linecap="round"/></svg>',
  school: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 6c-2-1.5-5-2-8-1v13c3-1 6-0.5 8 1 2-1.5 5-2 8-1V5c-3-1-6-0.5-8 1z" stroke-linejoin="round"/><path d="M12 6v13"/></svg>',
  cinema: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 9h18v11H3z" stroke-linejoin="round"/><path d="M3 9l2-5h3l-2 5M9 9l2-5h3l-2 5M15 9l2-5h3l-2 5" stroke-linejoin="round"/></svg>',
  restaurant: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M7 2v8a2 2 0 0 0 2 2v10M7 2v8M9 2v8" stroke-linecap="round" stroke-linejoin="round"/><path d="M17 2c-1.5 0-3 2-3 5s1 5 1 5v10" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  supermarket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M2 3h3l2.4 12.4a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L21 7H6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  hotel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 19v-8a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 14h18v5" stroke-linecap="round"/><path d="M13 12h6a2 2 0 0 1 2 2" stroke-linecap="round"/><path d="M3 19v2M21 19v2" stroke-linecap="round"/></svg>',
  culture: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z" stroke-linejoin="round"/></svg>',
};
const DEFAULT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2C7 2 4 6 4 10c0 6 8 12 8 12s8-6 8-12c0-4-3-8-8-8z" stroke-linejoin="round"/><circle cx="12" cy="10" r="2.5"/></svg>';

window.__iconSVG = function (name) {
  return ICONS[name] || DEFAULT_ICON;
};

// Build a destination card's banner — a real photo when we have one,
// otherwise the crafted icon/gradient banner. Cards use a smaller image
// than the destination hero so grids of 6-16 cards stay light to load.
window.__bannerHTML = function (dest) {
  if (dest.image) {
    const thumbUrl = dest.image.replace('width=900', 'width=420');
    const onerror = `var p=this.parentElement; this.remove(); p.classList.remove('has-photo'); p.insertAdjacentHTML('afterbegin', window.__iconSVG('${dest.icon}'));`;
    return `<div class="dest-banner has-photo" data-cat="${dest.category}">
      <img src="${thumbUrl}" alt="${dest.name}" loading="lazy" decoding="async" onerror="${onerror}">
      <span class="dest-cat-badge">${dest.category}</span>
    </div>`;
  }
  return `<div class="dest-banner" data-cat="${dest.category}">
    ${window.__iconSVG(dest.icon)}
    <span class="dest-cat-badge">${dest.category}</span>
  </div>`;
};

// Build a destination card's HTML (used by home.js and explore.js)
window.renderDestCard = function (dest) {
  const rating = dest.rating_avg
    ? `<span class="rating">★ ${dest.rating_avg} <span class="muted">(${dest.rating_count})</span></span>`
    : `<span class="rating muted">No reviews yet</span>`;
  return `
    <a class="dest-card" href="/destination/${dest.id}">
      ${window.__bannerHTML(dest)}
      <div class="dest-body">
        <h3>${dest.name}</h3>
        <div class="dest-meta">📍 ${dest.neighborhood} &nbsp;·&nbsp; ${dest.price}</div>
        <p class="dest-desc">${dest.description}</p>
        <div class="dest-foot">
          ${rating}
          <span class="btn btn-sm btn-ghost">View →</span>
        </div>
      </div>
    </a>`;
};
