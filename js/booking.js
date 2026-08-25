/* ============================================================
   Black Plum — booking flow (front-end mock-up)
   Data, pricing and the calendar itself live in calendar.js.
   ============================================================ */

const { STUDIOS, MIN_NIGHTS, iso, parse, startOfDay, nightsBetween,
        fmtLong, fmtFull, money, rangeIsFree, studioFor, quote } = window.BP;

const state = {
  studio: 'shed',
  checkin: null,
  checkout: null,
  guests: 2,
  pet: false,
  step: 1,
  details: {},
  ref: null
};

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

let calendar = null;

/* ---------- read the URL ---------- */
function readParams(search) {
  const p = new URLSearchParams(search);
  const s = p.get('studio');
  if (s === 'shed' || s === 'creek') state.studio = s;
  else if (s === 'any') state.studio = 'shed';

  const g = parseInt(p.get('guests'), 10);
  if (g === 1 || g === 2) state.guests = g;
  if (p.get('pet') === '1') state.pet = true;

  const ci = p.get('checkin'), co = p.get('checkout');
  const today = iso(startOfDay(new Date()));
  if (ci && co && ci >= today && co > ci && nightsBetween(ci, co) >= MIN_NIGHTS) {
    // "either studio" resolves to whichever one can actually take the stay
    const resolved = studioFor(s === 'any' ? 'any' : state.studio, ci, co);
    if (resolved) {
      state.studio = resolved;
      state.checkin = ci;
      state.checkout = co;
    }
  }
}
readParams(location.search);

/* ============================================================
   Rendering
   ============================================================ */
function renderPicker() {
  $('#picker').innerHTML = Object.values(STUDIOS).map(s => `
    <label class="pick">
      <input type="radio" name="studio" value="${s.id}" ${state.studio === s.id ? 'checked' : ''}>
      <span class="tick">&#10003;</span>
      <img src="${s.photo}" alt="">
      <span>
        <b>${s.name}</b>
        <small>${s.kind}</small>
        <span class="rate">from ${money(s.base)} / night &nbsp;·&nbsp; &#9733; ${s.rating}</span>
      </span>
    </label>`).join('');

  $$('#picker input').forEach(r => r.addEventListener('change', () => {
    state.studio = r.value;
    calendar.setStudio(r.value);
    renderSummary();
  }));
}

function renderSummary() {
  const s = STUDIOS[state.studio];
  $('#sum-photo').src = s.photo;
  $('#sum-name').textContent = s.name;
  $('#sum-kind').textContent = s.kind;

  const q = quote(state);
  const body = $('#sum-detail');

  if (!q) {
    body.innerHTML = `<p class="sum-empty">Choose your arrival and departure to see the full price. Nothing is charged until you confirm — and this is a mock-up, so nothing is charged at all.</p>`;
    $('#to-details').disabled = true;
    return;
  }
  $('#to-details').disabled = false;

  body.innerHTML = `
    <div class="sum-dates">
      <div><div class="lbl">Arrive</div><div class="val">${fmtLong(state.checkin)}</div></div>
      <div class="arr">&#8594;</div>
      <div><div class="lbl">Leave</div><div class="val">${fmtLong(state.checkout)}</div></div>
    </div>
    <div class="sum-lines">
      <div><span>${money(Math.round(q.avg))} avg &times; ${q.nights} night${q.nights > 1 ? 's' : ''}</span><span class="u"></span><span>${money(q.accom)}</span></div>
      ${q.discount ? `<div class="discount"><span>${q.discountLabel}</span><span class="u"></span><span>&minus;${money(q.discount)}</span></div>` : ''}
      <div><span>Cleaning fee</span><span class="u"></span><span>${money(q.cleaning)}</span></div>
      ${q.pet ? `<div><span>Dog</span><span class="u"></span><span>${money(q.pet)}</span></div>` : ''}
      <div><span>Service fee</span><span class="u"></span><span>${money(q.service)}</span></div>
    </div>
    <div class="sum-total"><span>Total (AUD)</span><b>${money(q.total)}</b></div>
    <p style="font-size:.74rem;color:var(--ink-faint);margin-top:.9rem;text-align:center">
      ${state.guests} guest${state.guests > 1 ? 's' : ''} · check in 2pm · check out 10am
    </p>`;
}

function renderDateLabels() {
  const nights = state.checkin && state.checkout ? nightsBetween(state.checkin, state.checkout) : 0;
  $('#cal-readout').innerHTML = nights
    ? `<b>${nights} night${nights > 1 ? 's' : ''}</b> · ${fmtLong(state.checkin)} &rarr; ${fmtLong(state.checkout)}`
    : 'Select your arrival date';
  $('#clear-dates').hidden = !state.checkin;
}

function renderGuests() {
  $('#guest-out').value = state.guests + (state.guests > 1 ? ' guests' : ' guest');
  $('#g-minus').disabled = state.guests <= 1;
  $('#g-plus').disabled = state.guests >= 2;
}

/* ---------- steps ---------- */
function goStep(n) {
  state.step = n;
  $$('.pane').forEach(p => p.classList.toggle('active', +p.dataset.pane === n));
  $$('.step').forEach(el => {
    const i = +el.dataset.step;
    el.classList.toggle('on', i === n);
    el.classList.toggle('done', i < n);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

const esc = t => String(t || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function renderReview() {
  const s = STUDIOS[state.studio];
  const q = quote(state);
  const d = state.details;
  $('#review-rows').innerHTML = `
    <div><span class="k">Studio</span><span class="v">${s.name}</span></div>
    <div><span class="k">Arrive</span><span class="v">${fmtFull(state.checkin)}, after 2pm</span></div>
    <div><span class="k">Leave</span><span class="v">${fmtFull(state.checkout)}, by 10am</span></div>
    <div><span class="k">Nights</span><span class="v">${q.nights}</span></div>
    <div><span class="k">Guests</span><span class="v">${state.guests}${state.pet ? ' + one dog' : ''}</span></div>
    <div><span class="k">Booked by</span><span class="v">${esc(d.name)}</span></div>
    <div><span class="k">Email</span><span class="v">${esc(d.email)}</span></div>
    ${d.phone ? `<div><span class="k">Phone</span><span class="v">${esc(d.phone)}</span></div>` : ''}
    <div><span class="k">Arriving</span><span class="v">${esc(d.arrival)}</span></div>
    ${d.note ? `<div><span class="k">Note to James</span><span class="v" style="max-width:34ch">${esc(d.note)}</span></div>` : ''}
    <div><span class="k">Total</span><span class="v"><b>${money(q.total)} AUD</b></span></div>`;
}

function makeRef() {
  const n = Math.floor(1000 + Math.random() * 8999);
  const l = 'ACDEFHJKLMNPRTVWXY';
  return `BP-${n}-${l[Math.floor(Math.random() * l.length)]}${l[Math.floor(Math.random() * l.length)]}`;
}

function renderConfirm() {
  const s = STUDIOS[state.studio];
  const q = quote(state);
  state.ref = state.ref || makeRef();
  $('#ref').textContent = state.ref;
  $('#confirm-name').textContent = (state.details.name || '').split(' ')[0] || 'there';
  $('#confirm-studio').textContent = s.name;
  $('#itin').innerHTML = `
    <div><div class="k">Studio</div><div class="v">${s.name}</div></div>
    <div><div class="k">Guests</div><div class="v">${state.guests}${state.pet ? ' + dog' : ''}</div></div>
    <div><div class="k">Check in</div><div class="v">${fmtFull(state.checkin)}<br><small style="font-family:var(--sans);font-size:.8rem;color:var(--ink-faint)">any time after 2pm</small></div></div>
    <div><div class="k">Check out</div><div class="v">${fmtFull(state.checkout)}<br><small style="font-family:var(--sans);font-size:.8rem;color:var(--ink-faint)">by 10am</small></div></div>
    <div><div class="k">Nights</div><div class="v">${q.nights}</div></div>
    <div><div class="k">Total</div><div class="v">${money(q.total)} AUD</div></div>`;
}

/* ============================================================
   Wiring
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  calendar = window.BP.createRangeCalendar({
    mount: $('#cals'),
    studio: state.studio,
    onChange: (ci, co) => {
      state.checkin = ci;
      state.checkout = co;
      renderDateLabels();
      renderSummary();
    },
    onMessage: t => {
      const m = $('#cal-msg');
      m.textContent = t;
      m.classList.toggle('show', !!t);
    }
  });

  if (state.checkin && state.checkout) calendar.setRange(state.checkin, state.checkout);

  $('#pet').checked = state.pet;
  renderPicker();
  renderDateLabels();
  renderSummary();
  renderGuests();

  $('#g-minus').addEventListener('click', () => { state.guests = Math.max(1, state.guests - 1); renderGuests(); renderSummary(); });
  $('#g-plus').addEventListener('click', () => { state.guests = Math.min(2, state.guests + 1); renderGuests(); renderSummary(); });
  $('#pet').addEventListener('change', e => { state.pet = e.target.checked; renderSummary(); });
  $('#clear-dates').addEventListener('click', () => calendar.clear());

  $('#to-details').addEventListener('click', () => goStep(2));
  $('#back-1').addEventListener('click', () => goStep(1));
  $('#back-2').addEventListener('click', () => goStep(2));

  /* step 2 → 3, with validation */
  $('#details-form').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target;
    let ok = true;

    const need = [['name', v => v.trim().length > 1],
                  ['email', v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())]];
    need.forEach(([id, test]) => {
      const el = f.elements[id];
      const good = test(el.value);
      el.classList.toggle('err', !good);
      el.closest('.field').querySelector('.hint.error')?.classList.toggle('show', !good);
      if (!good) ok = false;
    });
    if (!ok) { f.querySelector('.err')?.focus(); return; }

    state.details = {
      name: f.elements.name.value.trim(),
      email: f.elements.email.value.trim(),
      phone: f.elements.phone.value.trim(),
      arrival: f.elements.arrival.value,
      note: f.elements.note.value.trim()
    };
    renderReview();
    goStep(3);
  });

  $$('#details-form input').forEach(el => el.addEventListener('input', () => {
    el.classList.remove('err');
    el.closest('.field')?.querySelector('.hint.error')?.classList.remove('show');
  }));

  $('#agree').addEventListener('change', e => { $('#confirm-btn').disabled = !e.target.checked; });

  $('#confirm-btn').addEventListener('click', () => {
    const btn = $('#confirm-btn');
    btn.textContent = 'Sending your request…';
    btn.disabled = true;
    setTimeout(() => {
      renderConfirm();
      goStep(4);
      btn.textContent = 'Request this stay';
    }, 900);
  });

  $('#print-btn')?.addEventListener('click', () => window.print());
});

/* ---- hooks used by the single-file build's router ---- */
window.BPapplyStudio = function (id) {
  if (!STUDIOS[id]) return;
  state.studio = id;
  calendar?.setStudio(id);
  renderPicker();
  renderSummary();
};
window.BPapplyQuery = function (search) {
  readParams(search);
  if (!calendar) return;
  calendar.setStudio(state.studio);
  if (state.checkin && state.checkout) calendar.setRange(state.checkin, state.checkout);
  $('#pet').checked = state.pet;
  renderPicker();
  renderGuests();
  renderDateLabels();
  renderSummary();
};
window.BPgoStep = n => goStep(n);
