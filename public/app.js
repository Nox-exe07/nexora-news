/* ════════════════════════════════════════════════════════════
   NEXORA NEWS — Frontend Application
   ════════════════════════════════════════════════════════════ */

// ── State ────────────────────────────────────────────────────
const state = {
  feedType: 'headlines',   // headlines | topic | search | nearme | bookmarks | community
  topic: '',
  searchQuery: '',
  country: localStorage.getItem('nx_country') || 'US',
  language: localStorage.getItem('nx_language') || 'en',
  theme: localStorage.getItem('nx_theme') || 'dark',
  bookmarks: JSON.parse(localStorage.getItem('nx_bookmarks') || '[]'),
  userLocation: null,
  verificationPassed: false,
};

const TOPIC_LABELS = {
  WORLD: 'World News', NATION: 'Nation & Local', BUSINESS: 'Business',
  TECHNOLOGY: 'Technology', ENTERTAINMENT: 'Entertainment',
  SPORTS: 'Sports', SCIENCE: 'Science', HEALTH: 'Health',
};

const COUNTRY_NAMES = {
  US:'United States',GB:'United Kingdom',CA:'Canada',AU:'Australia',
  IN:'India',DE:'Germany',FR:'France',JP:'Japan',BR:'Brazil',
  MX:'Mexico',ZA:'South Africa',KR:'South Korea',SG:'Singapore',
  AE:'UAE',NG:'Nigeria',PK:'Pakistan',
};

// ── DOM helpers ──────────────────────────────────────────────
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  lucide.createIcons();
  applyPreferencesUI();
  updateRegionChip();
  updateBookmarkBadge();
  requestLocationAndWeather();
  fetchAndRender();
  bindEvents();
});

// ════════════════════════════════════════════════════════════
//  EVENT LISTENERS
// ════════════════════════════════════════════════════════════
function bindEvents() {
  // Hamburger / sidebar toggle
  $('hamburger-btn').addEventListener('click', toggleSidebar);
  // Overlay close
  document.getElementById('sidebar-overlay')?.addEventListener('click', closeSidebar);

  // Nav items
  $$('#sidebar-nav .nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const feed = btn.dataset.feed;
      const topic = btn.dataset.topic;
      setActiveNav(btn);
      clearSearch();

      if (feed === 'headlines') {
        state.feedType = 'headlines'; state.topic = '';
        fetchAndRender();
      } else if (feed === 'nearme') {
        state.feedType = 'nearme'; state.topic = '';
        fetchNearMeNews();
      } else if (feed === 'bookmarks') {
        state.feedType = 'bookmarks';
        renderBookmarks();
      } else if (feed === 'community') {
        state.feedType = 'community';
        fetchCommunityNews();
      } else if (topic) {
        state.feedType = 'topic'; state.topic = topic;
        fetchAndRender();
      }
    });
  });

  // Search form
  $('search-form').addEventListener('submit', e => {
    e.preventDefault();
    const q = $('search-input').value.trim();
    if (!q) return;
    clearActiveNav();
    state.feedType = 'search';
    state.searchQuery = q;
    fetchAndRender();
  });

  // Refresh
  $('refresh-btn').addEventListener('click', () => {
    if (state.feedType === 'bookmarks') renderBookmarks();
    else if (state.feedType === 'community') fetchCommunityNews();
    else fetchAndRender();
  });

  // Theme toggle
  $('theme-toggle').addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('nx_theme', state.theme);
    applyTheme();
  });

  // Settings modal
  $('settings-trigger').addEventListener('click', () => openModal('settings-modal'));
  $('settings-form').addEventListener('submit', e => {
    e.preventDefault();
    state.country = $('country-select').value;
    state.language = $('language-select').value;
    localStorage.setItem('nx_country', state.country);
    localStorage.setItem('nx_language', state.language);
    updateRegionChip();
    closeModal('settings-modal');
    if (state.feedType !== 'bookmarks' && state.feedType !== 'community') fetchAndRender();
  });

  // Submit News modal
  $('submit-news-btn').addEventListener('click', () => openModal('submit-modal'));

  // Verify button
  $('verify-btn').addEventListener('click', runAIVerification);

  // Submit form
  $('submit-form').addEventListener('submit', submitArticle);

  // Character counters
  $('sub-title').addEventListener('input', () => {
    $('title-counter').textContent = `${$('sub-title').value.length} / 200`;
    state.verificationPassed = false;
    $('final-submit-btn').disabled = true;
  });
  $('sub-content').addEventListener('input', () => {
    $('content-counter').textContent = `${$('sub-content').value.length} chars`;
    state.verificationPassed = false;
    $('final-submit-btn').disabled = true;
  });

  // Modal close buttons (data-close attribute)
  $$('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.close));
  });

  // Close modals on overlay click
  $$('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });
}

// ════════════════════════════════════════════════════════════
//  SIDEBAR MOBILE
// ════════════════════════════════════════════════════════════
function createOverlay() {
  let overlay = document.getElementById('sidebar-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'sidebar-overlay';
    overlay.className = 'sidebar-overlay';
    overlay.addEventListener('click', closeSidebar);
    document.body.appendChild(overlay);
  }
  return overlay;
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const isOpen = sidebar.classList.toggle('open');
  const overlay = createOverlay();
  overlay.classList.toggle('visible', isOpen);
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  createOverlay().classList.remove('visible');
}

// ════════════════════════════════════════════════════════════
//  MODALS
// ════════════════════════════════════════════════════════════
function openModal(id) {
  document.getElementById(id).classList.add('open');
  lucide.createIcons();
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// ════════════════════════════════════════════════════════════
//  THEME & PREFERENCES
// ════════════════════════════════════════════════════════════
function applyTheme() {
  document.body.classList.toggle('dark-theme', state.theme === 'dark');
  document.body.classList.toggle('light-theme', state.theme === 'light');
}

function applyPreferencesUI() {
  $('country-select').value = state.country;
  $('language-select').value = state.language;
}

function updateRegionChip() {
  $('region-label').textContent = `${state.country} · ${state.language}`;
  applyPreferencesUI();
}

// ════════════════════════════════════════════════════════════
//  WEATHER & GEOLOCATION
// ════════════════════════════════════════════════════════════
function requestLocationAndWeather() {
  if (!navigator.geolocation) {
    renderWeatherWidget(null, 'Geolocation not supported');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude: lat, longitude: lon } = pos.coords;
      state.userLocation = { lat, lon };
      fetchWeather(lat, lon);
      autoSetRegion(lat, lon);
    },
    () => renderWeatherWidget(null, 'Location access denied')
  );
}

async function fetchWeather(lat, lon) {
  try {
    const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    renderWeatherWidget(data);
  } catch {
    renderWeatherWidget(null, 'Weather unavailable');
  }
}

function renderWeatherWidget(data, errorMsg) {
  const widget = $('weather-widget');
  if (!data) {
    widget.innerHTML = `<div class="weather-loading"><i data-lucide="cloud-off"></i><span>${errorMsg}</span></div>`;
    lucide.createIcons();
    return;
  }
  widget.innerHTML = `
    <div class="weather-content">
      <div class="weather-main">
        <span class="weather-emoji">${data.emoji}</span>
        <div class="weather-meta">
          <span class="weather-city">${data.city}</span>
          <span class="weather-desc">${data.description}</span>
        </div>
        <span class="weather-temp">${data.temperature}${data.unit}</span>
      </div>
      <div class="weather-details">
        <span class="weather-detail"><i data-lucide="thermometer"></i>${data.feelsLike}° Feels like</span>
        <span class="weather-detail"><i data-lucide="droplets"></i>${data.humidity}%</span>
        <span class="weather-detail"><i data-lucide="wind"></i>${data.windSpeed} km/h</span>
      </div>
    </div>`;
  lucide.createIcons();
}

async function autoSetRegion(lat, lon) {
  try {
    const res = await fetch(`/api/geocode?lat=${lat}&lon=${lon}`);
    const data = await res.json();
    if (data.countryCode && data.countryCode !== state.country) {
      // Only auto-set if user hasn't explicitly changed it
      if (!localStorage.getItem('nx_country')) {
        state.country = data.countryCode;
        updateRegionChip();
      }
    }
  } catch { /* silent */ }
}

// ════════════════════════════════════════════════════════════
//  NEWS FETCHING
// ════════════════════════════════════════════════════════════
async function fetchAndRender() {
  showSkeletons();
  updateFeedHeader();
  startRefreshSpinner();

  let url = `/api/news?country=${state.country}&language=${state.language}`;
  if (state.feedType === 'topic') url += `&topic=${state.topic}`;
  else if (state.feedType === 'search') url += `&search=${encodeURIComponent(state.searchQuery)}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    await delay(350);
    renderArticleCards(data.items || []);
  } catch {
    await delay(350);
    renderError();
  }
  stopRefreshSpinner();
}

async function fetchNearMeNews() {
  showSkeletons();
  updateFeedHeader();
  startRefreshSpinner();

  if (!state.userLocation) {
    await delay(200);
    renderStatusPanel('map-pin-off', 'Location not available',
      'Please allow location access in your browser to load nearby news.');
    stopRefreshSpinner();
    return;
  }

  const { lat, lon } = state.userLocation;
  // Determine country from geolocation state
  const url = `/api/news?country=${state.country}&language=${state.language}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    await delay(350);
    renderArticleCards(data.items || [], true);
  } catch {
    await delay(350);
    renderError();
  }
  stopRefreshSpinner();
}

async function fetchCommunityNews() {
  showSkeletons();
  updateFeedHeader();
  startRefreshSpinner();
  try {
    const res = await fetch('/api/submissions');
    const data = await res.json();
    await delay(300);
    if (data.length === 0) {
      renderStatusPanel('users', 'No community articles yet',
        'Be the first to share a story! Click "Submit News" in the sidebar.');
    } else {
      renderCommunityCards(data);
    }
  } catch {
    await delay(300);
    renderError();
  }
  stopRefreshSpinner();
}

// ════════════════════════════════════════════════════════════
//  RENDERING
// ════════════════════════════════════════════════════════════
function showSkeletons(n = 6) {
  $('news-grid').innerHTML = Array(n).fill('<div class="skeleton-card"></div>').join('');
}

function renderError() {
  $('news-grid').innerHTML = `
    <div class="status-panel">
      <i data-lucide="wifi-off"></i>
      <h3>Couldn't load news</h3>
      <p>Check your internet connection and try again.</p>
      <button class="btn btn-primary" style="margin-top:14px" onclick="fetchAndRender()">
        <i data-lucide="refresh-cw"></i> Retry
      </button>
    </div>`;
  lucide.createIcons();
}

function renderStatusPanel(icon, title, msg) {
  $('news-grid').innerHTML = `
    <div class="status-panel">
      <i data-lucide="${icon}"></i>
      <h3>${title}</h3>
      <p>${msg}</p>
    </div>`;
  lucide.createIcons();
}

function renderArticleCards(items, nearMe = false) {
  if (!items.length) {
    renderStatusPanel('search-x', 'No articles found', 'Try a different topic or search query.');
    return;
  }
  $('news-grid').innerHTML = items.map(item => {
    const bookmarked = state.bookmarks.some(b => b.guid === item.guid || b.link === item.link);
    const date = item.pubDate ? formatDate(item.pubDate) : 'Recent';
    const locBadge = nearMe ? `<span class="community-badge">📍 Near You</span>` : '';
    return `
      <article class="news-card" data-link="${escHtml(item.link)}">
        <div class="card-meta">
          <span class="card-source">${escHtml(item.source)}${locBadge}</span>
          <div class="card-actions">
            <button class="bookmark-btn ${bookmarked ? 'bookmarked' : ''}"
              data-guid="${escHtml(item.guid || item.link)}"
              data-title="${escHtml(item.title)}"
              data-link="${escHtml(item.link)}"
              data-source="${escHtml(item.source)}"
              data-date="${escHtml(item.pubDate || '')}"
              title="${bookmarked ? 'Remove bookmark' : 'Bookmark'}">
              <i data-lucide="${bookmarked ? 'bookmark-check' : 'bookmark'}"></i>
            </button>
          </div>
        </div>
        <h3 class="card-title">${escHtml(item.title)}</h3>
        <div class="card-footer">
          <span class="pub-date"><i data-lucide="calendar"></i>${date}</span>
          <a href="${escHtml(item.link)}" target="_blank" rel="noopener noreferrer" class="read-link">
            Read <i data-lucide="arrow-right"></i>
          </a>
        </div>
      </article>`;
  }).join('');

  lucide.createIcons();

  // Bookmark button handlers
  $$('.bookmark-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      toggleBookmark(btn);
    });
  });
}

function renderBookmarks() {
  updateFeedHeader();
  if (!state.bookmarks.length) {
    renderStatusPanel('bookmark-x', 'No bookmarks yet',
      'Click the bookmark icon on any article card to save it here.');
    return;
  }
  renderArticleCards(state.bookmarks.map(b => ({
    title: b.title, link: b.link, pubDate: b.date, source: b.source, guid: b.guid
  })));
}

function renderCommunityCards(articles) {
  $('news-grid').innerHTML = articles.map(art => {
    const date = art.submittedAt ? formatDate(art.submittedAt) : 'Recent';
    return `
      <article class="news-card">
        <div class="card-meta">
          <span class="card-source">${escHtml(art.category)} <span class="community-badge">Community</span></span>
        </div>
        <h3 class="card-title">${escHtml(art.title)}</h3>
        <div class="card-footer">
          <span class="pub-date"><i data-lucide="calendar"></i>${date}</span>
          <button class="read-link" onclick="showCommunityArticle(${JSON.stringify(art).replace(/"/g, '&quot;')})">
            Read <i data-lucide="arrow-right"></i>
          </button>
        </div>
      </article>`;
  }).join('');
  lucide.createIcons();
}

window.showCommunityArticle = function(art) {
  $('article-modal-source').textContent = `${art.category} · ${art.author}`;
  $('article-modal-body').innerHTML = `
    <h2 class="article-detail-title">${escHtml(art.title)}</h2>
    <div class="article-detail-meta">
      <span>✍️ ${escHtml(art.author)}</span>
      <span>📅 ${formatDate(art.submittedAt)}</span>
      <span>🏷️ ${escHtml(art.category)}</span>
    </div>
    <p class="article-detail-content">${escHtml(art.content)}</p>
    <div class="article-detail-actions">
      ${art.sourceUrl ? `<a href="${escHtml(art.sourceUrl)}" target="_blank" rel="noopener" class="btn btn-ghost"><i data-lucide="external-link"></i> Original Source</a>` : ''}
    </div>`;
  lucide.createIcons();
  openModal('article-modal');
};

// ════════════════════════════════════════════════════════════
//  BOOKMARKS
// ════════════════════════════════════════════════════════════
function toggleBookmark(btn) {
  const { guid, title, link, source, date } = btn.dataset;
  const existsIdx = state.bookmarks.findIndex(b => b.guid === guid || b.link === link);
  if (existsIdx >= 0) {
    state.bookmarks.splice(existsIdx, 1);
    btn.classList.remove('bookmarked');
    btn.title = 'Bookmark';
  } else {
    state.bookmarks.push({ guid, title, link, source, date });
    btn.classList.add('bookmarked');
    btn.title = 'Remove bookmark';
  }
  localStorage.setItem('nx_bookmarks', JSON.stringify(state.bookmarks));
  updateBookmarkBadge();
  // Re-render icon
  btn.innerHTML = `<i data-lucide="${btn.classList.contains('bookmarked') ? 'bookmark-check' : 'bookmark'}"></i>`;
  lucide.createIcons();
}

function updateBookmarkBadge() {
  const badge = $('bookmark-count');
  const count = state.bookmarks.length;
  badge.textContent = count;
  badge.style.display = count > 0 ? 'inline-block' : 'none';
}

// ════════════════════════════════════════════════════════════
//  SUBMIT NEWS + AI VERIFICATION
// ════════════════════════════════════════════════════════════
async function runAIVerification() {
  const title   = $('sub-title').value.trim();
  const content = $('sub-content').value.trim();
  const sourceUrl = $('sub-url').value.trim();
  const category = $('sub-category').value;

  const verifyBtn = $('verify-btn');
  verifyBtn.disabled = true;
  verifyBtn.innerHTML = '<i data-lucide="loader-2"></i> Verifying…';
  lucide.createIcons();

  try {
    const res = await fetch('/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content, sourceUrl, category }),
    });
    const result = await res.json();
    renderVerifyBanner(result);
  } catch {
    $('verify-banner').style.display = 'block';
    $('verify-banner').className = 'verify-banner verify-banner-reject';
    $('verify-banner').innerHTML = '<h4>Verification failed</h4><p>Server error. Try again.</p>';
  }

  verifyBtn.disabled = false;
  verifyBtn.innerHTML = '<i data-lucide="shield-check"></i> Verify with AI';
  lucide.createIcons();
}

function renderVerifyBanner(result) {
  const banner = $('verify-banner');
  banner.style.display = 'block';

  const cssClass = result.verdict === 'APPROVED' ? 'verify-banner-approved'
    : result.verdict === 'WARNING'  ? 'verify-banner-warn'
    : 'verify-banner-reject';

  let html = `<div class="verify-banner ${cssClass}"><h4>${result.message} (Score: ${result.score}/100)</h4>`;
  if (result.issues.length) {
    html += `<ul>${result.issues.map(i => `<li>❌ ${escHtml(i)}</li>`).join('')}</ul>`;
  }
  if (result.warnings.length) {
    html += `<ul>${result.warnings.map(w => `<li>⚠️ ${escHtml(w)}</li>`).join('')}</ul>`;
  }
  html += '</div>';
  banner.innerHTML = html;

  // Enable submit only if not rejected
  if (result.verdict !== 'REJECTED') {
    state.verificationPassed = true;
    $('final-submit-btn').disabled = false;
  } else {
    state.verificationPassed = false;
    $('final-submit-btn').disabled = true;
  }
}

async function submitArticle(e) {
  e.preventDefault();
  if (!state.verificationPassed) {
    alert('Please verify your article with AI before submitting.');
    return;
  }

  const payload = {
    title:     $('sub-title').value.trim(),
    author:    $('sub-author').value.trim(),
    sourceUrl: $('sub-url').value.trim(),
    category:  $('sub-category').value,
    content:   $('sub-content').value.trim(),
    imageUrl:  $('sub-image').value.trim(),
  };

  const submitBtn = $('final-submit-btn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i data-lucide="loader-2"></i> Submitting…';
  lucide.createIcons();

  try {
    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    if (result.success) {
      closeModal('submit-modal');
      resetSubmitForm();
      showToast('✅ Article submitted successfully! It will appear in the Community section after review.');
    } else {
      showToast('❌ Submission failed: ' + (result.error || 'Unknown error'), true);
    }
  } catch {
    showToast('❌ Network error. Please try again.', true);
  }

  submitBtn.disabled = false;
  submitBtn.innerHTML = '<i data-lucide="send"></i> Submit Article';
  lucide.createIcons();
}

function resetSubmitForm() {
  $('submit-form').reset();
  $('verify-banner').style.display = 'none';
  $('verify-banner').innerHTML = '';
  $('title-counter').textContent = '0 / 200';
  $('content-counter').textContent = '0 chars';
  $('final-submit-btn').disabled = true;
  state.verificationPassed = false;
}

// ════════════════════════════════════════════════════════════
//  FEED HEADER
// ════════════════════════════════════════════════════════════
function updateFeedHeader() {
  const titles = {
    headlines: ['Top Headlines', `Latest stories for ${COUNTRY_NAMES[state.country] || state.country}`],
    nearme: ['Near Me 📍', 'News from your current location'],
    bookmarks: ['Bookmarks 🔖', `${state.bookmarks.length} saved article${state.bookmarks.length !== 1 ? 's' : ''}`],
    community: ['Community News 👥', 'Stories submitted by Nexora readers'],
    topic: [TOPIC_LABELS[state.topic] || state.topic, `Top ${TOPIC_LABELS[state.topic] || state.topic} news`],
    search: ['Search Results 🔍', `Showing results for "${state.searchQuery}"`],
  };
  const [title, sub] = titles[state.feedType] || titles.headlines;
  $('feed-title').textContent = title;
  $('feed-subtitle').textContent = sub;
}

// ════════════════════════════════════════════════════════════
//  NAV HELPERS
// ════════════════════════════════════════════════════════════
function setActiveNav(btn) {
  $$('#sidebar-nav .nav-item').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}
function clearActiveNav() {
  $$('#sidebar-nav .nav-item').forEach(b => b.classList.remove('active'));
}
function clearSearch() { $('search-input').value = ''; state.searchQuery = ''; }

// ════════════════════════════════════════════════════════════
//  SPINNER
// ════════════════════════════════════════════════════════════
function startRefreshSpinner() { $('refresh-btn').classList.add('spinning'); }
function stopRefreshSpinner()  { $('refresh-btn').classList.remove('spinning'); }

// ════════════════════════════════════════════════════════════
//  TOAST NOTIFICATION
// ════════════════════════════════════════════════════════════
function showToast(msg, isError = false) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed; bottom:24px; right:24px; z-index:9999;
    background:${isError ? 'var(--nexora-rose)' : 'var(--nexora-emerald)'};
    color:#fff; padding:14px 20px; border-radius:12px;
    font-size:14px; font-weight:600; max-width:380px;
    box-shadow:0 8px 24px rgba(0,0,0,.25);
    animation:slideInUp .3s ease;
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity .4s'; setTimeout(() => toast.remove(), 400); }, 4000);
}

// ════════════════════════════════════════════════════════════
//  UTILS
// ════════════════════════════════════════════════════════════
function formatDate(str) {
  try {
    return new Date(str).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return 'Recent'; }
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
