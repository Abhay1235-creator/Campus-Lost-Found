const API = '';
const PAGE_SIZE = 9;
const state = { page: 1, total: 0, kind: '', q: '', adminToken: '' };
const $ = (selector, parent = document) => parent.querySelector(selector);
const grid = $('#item-grid');
const boardNotice = $('#board-notice');
const heroSlideshow = $('#hero-slideshow');
const heroSlideImage = $('#hero-slide-image');
const heroSlideKicker = $('#hero-slide-kicker');
const heroSlideTitle = $('#hero-slide-title');
const heroSlideStatus = $('#hero-slide-status');
const heroSlideDots = [...document.querySelectorAll('[data-slide-to]')];
const heroSlides = [
  { src: '/images/slideshow/lost-keys-landscape.webp', alt: 'Silver keys with a lime-green tag on a campus library table', kicker: 'Campus essentials', title: 'Keys, found together.' },
  { src: '/images/slideshow/lost-laptop.webp', alt: 'Silver laptop on a campus library desk', kicker: 'Study essentials', title: 'A laptop, ready for class.' },
  { src: '/images/slideshow/lost-backpack-landscape.webp', alt: 'Deep-green canvas backpack on a campus library table', kicker: 'Ready for class', title: 'Backpacks find their way.' },
  { src: '/images/slideshow/lost-id-card.webp', alt: 'Student ID card and green lanyard on a campus desk', kicker: 'Campus identity', title: 'An ID card finds its way back.' },
];
let activeHeroSlide = 0;
let heroSlideTimer = null;
let heroAutoplayEnabled = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const heroSlideToggle = $('#hero-slide-toggle');
if (!heroAutoplayEnabled) {
  heroSlideToggle.textContent = 'Play';
  heroSlideToggle.setAttribute('aria-label', 'Play automatic slideshow');
}

function showHeroSlide(index, announce = false) {
  activeHeroSlide = (index + heroSlides.length) % heroSlides.length;
  const slide = heroSlides[activeHeroSlide];
  heroSlideImage.classList.add('is-changing');
  heroSlideImage.onload = () => heroSlideImage.classList.remove('is-changing');
  heroSlideImage.onerror = () => heroSlideImage.classList.remove('is-changing');
  heroSlideImage.src = slide.src;
  heroSlideImage.alt = slide.alt;
  heroSlideKicker.textContent = slide.kicker;
  heroSlideTitle.textContent = slide.title;
  heroSlideDots.forEach((dot, dotIndex) => dot.setAttribute('aria-current', String(dotIndex === activeHeroSlide)));
  if (announce) heroSlideStatus.textContent = `${slide.kicker}: ${slide.title}`;
}

function stopHeroAutoplay() {
  window.clearInterval(heroSlideTimer);
  heroSlideTimer = null;
}

function startHeroAutoplay() {
  if (!heroAutoplayEnabled || heroSlideTimer || heroSlideshow.matches(':hover') || heroSlideshow.contains(document.activeElement) || document.hidden) return;
  heroSlideTimer = window.setInterval(() => showHeroSlide(activeHeroSlide + 1), 4000);
}

$('#hero-slide-prev').addEventListener('click', () => showHeroSlide(activeHeroSlide - 1, true));
$('#hero-slide-next').addEventListener('click', () => showHeroSlide(activeHeroSlide + 1, true));
heroSlideDots.forEach((dot) => dot.addEventListener('click', () => showHeroSlide(Number(dot.dataset.slideTo), true)));
heroSlideToggle.addEventListener('click', (event) => {
  const button = event.currentTarget;
  heroAutoplayEnabled = !heroAutoplayEnabled;
  button.textContent = heroAutoplayEnabled ? 'Pause' : 'Play';
  button.setAttribute('aria-label', heroAutoplayEnabled ? 'Pause automatic slideshow' : 'Play automatic slideshow');
  if (heroAutoplayEnabled) startHeroAutoplay();
  else stopHeroAutoplay();
});
heroSlideshow.addEventListener('mouseenter', stopHeroAutoplay);
heroSlideshow.addEventListener('mouseleave', startHeroAutoplay);
heroSlideshow.addEventListener('focusin', stopHeroAutoplay);
heroSlideshow.addEventListener('focusout', (event) => {
  if (!heroSlideshow.contains(event.relatedTarget)) startHeroAutoplay();
});
document.addEventListener('visibilitychange', () => document.hidden ? stopHeroAutoplay() : startHeroAutoplay());
startHeroAutoplay();

function escapeText(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function dateLabel(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
}

async function request(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  const isFormData = options.body instanceof FormData;
  if (isFormData) {
    for (const name of Object.keys(headers)) if (name.toLowerCase() === 'content-type') delete headers[name];
  } else if (!Object.keys(headers).some((name) => name.toLowerCase() === 'content-type')) {
    headers['Content-Type'] = 'application/json';
  }
  const response = await fetch(`${API}${url}`, {
    ...options,
    headers,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || 'Something went wrong. Please try again.');
  return data;
}

function setNotice(node, message = '', isError = false) {
  node.textContent = message;
  node.hidden = !message;
  node.classList.toggle('error', Boolean(message) && isError);
}

function renderItems(items) {
  if (!items.length) {
    grid.innerHTML = '<div class="empty-state"><strong>No reports found</strong>Try a different search or add a report to the board.</div>';
    return;
  }
  grid.innerHTML = items.map((item, index) => `
    <article class="item-card" data-index="${index}">
      <button type="button" class="item-card-main" aria-label="View ${escapeText(item.title)}">
      ${item.imageUrl ? `<img class="item-photo" src="${escapeText(item.imageUrl)}" alt="Photo of ${escapeText(item.title)}" loading="lazy">` : '<div class="item-photo item-photo-empty" aria-label="No photo available">No photo</div>'}
      <div class="card-top"><span class="tag tag-${item.kind}">${escapeText(item.kind)}</span><span class="card-date">${escapeText(dateLabel(item.occurredAt))}</span></div>
      <h3>${escapeText(item.title)}</h3><p>${escapeText(item.description)}</p>
      <div class="card-location"><span aria-hidden="true">âŒ–</span>${escapeText(item.location)} Â· ${escapeText(item.category)}</div>
      </button>
      ${item.kind === 'lost' ? '<button type="button" class="item-found-action">I found this</button>' : ''}
    </article>`).join('');
  for (const card of grid.querySelectorAll('.item-card')) {
    const item = items[Number(card.dataset.index)];
    card.querySelector('.item-card-main').addEventListener('click', () => openItem(item));
    card.querySelector('.item-found-action')?.addEventListener('click', () => openItem(item, { focusFoundForm: true }));
  }
}

async function loadBoard() {
  setNotice(boardNotice);
  grid.innerHTML = '<div class="empty-state">Loading the boardâ€¦</div>';
  const params = new URLSearchParams({ page: String(state.page), limit: String(PAGE_SIZE) });
  if (state.kind) params.set('kind', state.kind);
  if (state.q) params.set('q', state.q);
  try {
    const result = await request(`/board?${params}`);
    state.total = result.total;
    renderItems(result.items);
    $('#result-count').textContent = `${result.total} ${result.total === 1 ? 'report' : 'reports'}`;
    $('#page-label').textContent = `Page ${result.page}`;
    $('#previous-page').disabled = result.page <= 1;
    $('#next-page').disabled = result.page * result.limit >= result.total;
  } catch (error) {
    renderItems([]);
    setNotice(boardNotice, `${error.message} Check that the API is running.`, true);
  }
}

function openItem(item, { focusFoundForm = false } = {}) {
  const detail = $('#detail-content');
  detail.innerHTML = `<span class="tag tag-${item.kind}">${escapeText(item.kind)}</span><h2>${escapeText(item.title)}</h2><p class="detail-description">${escapeText(item.description)}</p><div class="detail-info"><span>âŒ– ${escapeText(item.location)}</span><span>${escapeText(item.category)}</span><span>${escapeText(dateLabel(item.occurredAt))}</span></div>`;
  if (item.imageUrl) detail.insertAdjacentHTML('afterbegin', `<img class="detail-photo" src="${escapeText(item.imageUrl)}" alt="Photo of ${escapeText(item.title)}">`);
  else detail.insertAdjacentHTML('afterbegin', '<div class="detail-photo detail-photo-empty" aria-label="No photo available">No photo available</div>');
  const form = $('#claim-form');
  form.reset();
  form.elements.itemId.value = item.id;
  form.hidden = item.kind !== 'found';
  $('#claim-status').textContent = '';
  const foundForm = $('#found-report-form');
  foundForm.reset();
  foundForm.elements.itemId.value = item.id;
  foundForm.hidden = item.kind !== 'lost';
  $('#found-report-status').textContent = '';
  $('#detail-dialog').showModal();
  if (focusFoundForm) foundForm.elements.finderName.focus();
}

function showView(name) {
  for (const view of document.querySelectorAll('.view')) {
    const active = view.id === `${name}-view`;
    view.hidden = !active;
    view.classList.toggle('active', active);
  }
  for (const button of document.querySelectorAll('.nav-button')) button.classList.toggle('active', button.dataset.view === name);
  $('#hero').hidden = name !== 'board';
  $('#report-hero').hidden = name !== 'report';
  $('#admin-hero').hidden = name !== 'admin';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

for (const button of document.querySelectorAll('[data-view]')) button.addEventListener('click', () => showView(button.dataset.view));
for (const button of document.querySelectorAll('[data-go]')) button.addEventListener('click', () => showView(button.dataset.go));
$('#filter-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  state.q = String(data.get('q') || '').trim();
  state.kind = String(data.get('kind') || '');
  state.page = 1;
  loadBoard();
});
$('#previous-page').addEventListener('click', () => { state.page = Math.max(1, state.page - 1); loadBoard(); });
$('#next-page').addEventListener('click', () => { if (state.page * PAGE_SIZE < state.total) state.page += 1; loadBoard(); });
$('#close-dialog').addEventListener('click', () => $('#detail-dialog').close());
$('#detail-dialog').addEventListener('click', (event) => { if (event.target === event.currentTarget) event.currentTarget.close(); });

const categoryChoice = $('#category-choice');
const categoryOtherLabel = $('#category-other-label');
const categoryOther = $('#category-other');
function syncOtherCategory() {
  const isOther = categoryChoice.value === 'other';
  categoryOtherLabel.hidden = !isOther;
  categoryOther.required = isOther;
  if (!isOther) categoryOther.value = '';
}
categoryChoice.addEventListener('change', syncOtherCategory);

$('#report-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const status = $('#report-status');
  const button = form.querySelector('[type="submit"]');
  const values = Object.fromEntries(new FormData(form));
  const category = values.categoryChoice === 'other' ? values.categoryOther.trim() : values.categoryChoice;
  const privateDetails = [values.privateDetails && `Identifying details: ${values.privateDetails}`].filter(Boolean).join('\n');
  const payload = new FormData(form);
  payload.delete('categoryChoice');
  payload.delete('categoryOther');
  payload.set('category', category);
  payload.set('privateDetails', privateDetails);
  status.textContent = 'Submittingâ€¦'; status.classList.remove('error'); button.disabled = true;
  try {
    await request('/items', { method: 'POST', body: payload });
    form.reset(); syncOtherCategory(); status.textContent = 'Report received. Thanks for helping the campus community.';
    state.page = 1; await loadBoard();
    window.setTimeout(() => { showView('board'); status.textContent = ''; }, 1600);
  } catch (error) { status.textContent = error.message; status.classList.add('error'); }
  finally { button.disabled = false; }
});

$('#claim-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const status = $('#claim-status');
  const button = form.querySelector('[type="submit"]');
  const values = Object.fromEntries(new FormData(form));
  status.textContent = 'Sendingâ€¦'; status.classList.remove('error'); button.disabled = true;
  try {
    await request('/claims', { method: 'POST', body: JSON.stringify(values) });
    status.textContent = 'Claim sent privately to staff for review.';
    window.setTimeout(() => { $('#detail-dialog').close(); loadBoard(); }, 1300);
  } catch (error) { status.textContent = error.message; status.classList.add('error'); }
  finally { button.disabled = false; }
});

$('#found-report-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const status = $('#found-report-status');
  const button = form.querySelector('[type="submit"]');
  const values = Object.fromEntries(new FormData(form));
  status.textContent = 'Sendingâ€¦'; status.classList.remove('error'); button.disabled = true;
  try {
    await request('/found-reports', { method: 'POST', body: JSON.stringify(values) });
    status.textContent = 'Sent privately to staff. They will review the possible match.';
    window.setTimeout(() => { $('#detail-dialog').close(); loadBoard(); }, 1500);
  } catch (error) { status.textContent = error.message; status.classList.add('error'); }
  finally { button.disabled = false; }
});

function renderClaims(claims) {
  const list = $('#claim-list');
  if (!claims.length) { list.innerHTML = '<div class="empty-state"><strong>All caught up</strong>There are no pending claims to review.</div>'; return; }
  list.innerHTML = claims.map((claim, index) => `<article class="claim-card" data-index="${index}"><h3>${escapeText(claim.claimantName)}</h3><span class="claim-meta">Item ${escapeText(claim.itemId)} Â· Submitted ${escapeText(dateLabel(claim.createdAt))}</span><p><strong>Contact:</strong> ${escapeText(claim.claimantContact)}</p><p><strong>Identifying details:</strong> ${escapeText(claim.message || 'No details provided')}</p><div class="claim-actions"><button class="button button-approve" data-decision="approved">Approve and return</button><button class="button button-reject" data-decision="rejected">Reject claim</button></div></article>`).join('');
  for (const card of list.querySelectorAll('.claim-card')) {
    const claim = claims[Number(card.dataset.index)];
    for (const button of card.querySelectorAll('[data-decision]')) button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        await request(`/admin/claims/${claim.id}`, { method: 'PATCH', headers: { Authorization: `Bearer ${state.adminToken}` }, body: JSON.stringify({ decision: button.dataset.decision }) });
        await loadClaims();
      } catch (error) { setNotice($('#admin-notice'), error.message, true); button.disabled = false; }
    });
  }
}

function renderFoundReports(reports) {
  const list = $('#found-report-list');
  if (!reports.length) { list.innerHTML = '<div class="empty-state"><strong>No found-item reports</strong>There are no possible matches waiting for review.</div>'; return; }
  list.innerHTML = reports.map((report, index) => `<article class="claim-card" data-index="${index}"><h3>${escapeText(report.finderName)} may have found a lost item</h3><span class="claim-meta">Item ${escapeText(report.itemId)} Â· Submitted ${escapeText(dateLabel(report.createdAt))}</span><p><strong>Contact:</strong> ${escapeText(report.finderContact)}</p><p><strong>Found at:</strong> ${escapeText(report.foundLocation)}</p><p><strong>Details:</strong> ${escapeText(report.message || 'No extra details')}</p><div class="claim-actions"><button class="button button-approve" data-decision="approved">Confirm returned</button><button class="button button-reject" data-decision="rejected">Reopen listing</button></div></article>`).join('');
  for (const card of list.querySelectorAll('.claim-card')) {
    const report = reports[Number(card.dataset.index)];
    for (const button of card.querySelectorAll('[data-decision]')) button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        await request(`/admin/found-reports/${report.id}`, { method: 'PATCH', headers: { Authorization: `Bearer ${state.adminToken}` }, body: JSON.stringify({ decision: button.dataset.decision }) });
        await loadClaims();
      } catch (error) { setNotice($('#admin-notice'), error.message, true); button.disabled = false; }
    });
  }
}

async function loadClaims() {
  setNotice($('#admin-notice'));
  $('#claim-list').innerHTML = '<div class="empty-state">Loading claimsâ€¦</div>';
  try {
    $('#found-report-list').innerHTML = '<div class="empty-state">Loading found-item reportsâ€¦</div>';
    const headers = { Authorization: `Bearer ${state.adminToken}` };
    const [claims, reports] = await Promise.all([
      request('/admin/claims?status=pending', { headers }),
      request('/admin/found-reports?status=pending', { headers }),
    ]);
    renderClaims(claims.claims);
    renderFoundReports(reports.foundReports);
  } catch (error) { $('#claim-list').innerHTML = ''; $('#found-report-list').innerHTML = ''; setNotice($('#admin-notice'), error.message, true); }
}

$('#admin-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  state.adminToken = new FormData(event.currentTarget).get('token');
  await loadClaims();
});

loadBoard();

