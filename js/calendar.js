/* ============================================================
   Black Plum — shared booking data, pricing and range calendar.
   Loaded by every page so the hero search bar and the booking
   page always agree on what's free and what it costs.
   ============================================================ */

window.BP = (function () {

  const STUDIOS = {
    shed: {
      id: 'shed',
      name: 'Black Plum Art Shed',
      short: 'Art Shed',
      kind: 'Entire guesthouse · 2 guests',
      photo: 'photos/shed/shed-01.jpg',
      base: 235,
      rating: 4.89,
      reviews: 251,
      seed: 7331
    },
    creek: {
      id: 'creek',
      name: 'Art Studio by the Creek',
      short: 'Creek Studio',
      kind: 'Entire cabin · 2 guests',
      photo: 'photos/creek/creek-06.jpg',
      base: 245,
      rating: 4.96,
      reviews: 113,
      seed: 9127
    }
  };

  const CLEANING_FEE = 80;
  const SERVICE_RATE = 0.12;
  const PET_FEE = 25;
  const MIN_NIGHTS = 2;
  const WEEKLY_DISCOUNT = 0.10;    // 7 nights or more
  const MONTHLY_DISCOUNT = 0.20;   // 28 nights or more

  /* ---------- dates (local, no timezone drift) ---------- */
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const nightsBetween = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const fmtShort = s => { const d = parse(s); return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`; };
  const fmtLong = s => { const d = parse(s); return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`; };
  const fmtFull = s => { const d = parse(s); return `${DAYS[d.getDay()].slice(0, 3)} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
  const money = n => '$' + n.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  /* ---------- deterministic availability ---------- */
  function mulberry(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* Walk forward from today dropping realistic 2–6 night bookings in. */
  function buildBookedSet(studio) {
    const rnd = mulberry(studio.seed);
    const set = new Set();
    let cursor = startOfDay(new Date());
    const end = addDays(cursor, 400);
    while (cursor < end) {
      if (rnd() < 0.42) {
        const len = 2 + Math.floor(rnd() * 5);
        for (let i = 0; i < len; i++) set.add(iso(addDays(cursor, i)));
        cursor = addDays(cursor, len + 1 + Math.floor(rnd() * 6));
      } else {
        cursor = addDays(cursor, 1 + Math.floor(rnd() * 4));
      }
    }
    return set;
  }

  const BOOKED = {
    shed: buildBookedSet(STUDIOS.shed),
    creek: buildBookedSet(STUDIOS.creek)
  };

  /* "any" means either studio will do, so a night is only unavailable
     when both are taken — and a whole range only works if one studio
     can honour all of it. */
  function isBooked(studioId, dateStr) {
    if (studioId === 'any') return BOOKED.shed.has(dateStr) && BOOKED.creek.has(dateStr);
    return BOOKED[studioId].has(dateStr);
  }

  function rangeIsFree(studioId, ci, co) {
    if (studioId === 'any') return rangeIsFree('shed', ci, co) || rangeIsFree('creek', ci, co);
    const booked = BOOKED[studioId];
    let d = parse(ci);
    const end = parse(co);
    while (d < end) {
      if (booked.has(iso(d))) return false;
      d = addDays(d, 1);
    }
    return true;
  }

  /* Which studio can actually take this range (used when "either" is picked). */
  function studioFor(studioId, ci, co) {
    if (studioId !== 'any') return studioId;
    if (rangeIsFree('shed', ci, co)) return 'shed';
    if (rangeIsFree('creek', ci, co)) return 'creek';
    return null;
  }

  /* ---------- pricing ---------- */
  function nightlyRate(studio, dateStr) {
    const d = parse(dateStr);
    let rate = studio.base;
    const dow = d.getDay();
    if (dow === 5 || dow === 6) rate += 30;                 // Fri & Sat
    const m = d.getMonth();
    if (m === 11 || m === 0) rate += 45;                    // Dec & Jan peak
    else if (m === 3 || m === 6 || m === 8) rate += 15;     // school holidays
    return rate;
  }

  function quote({ studio, checkin, checkout, pet }) {
    if (!checkin || !checkout) return null;
    const s = STUDIOS[studio];
    if (!s) return null;
    const nights = nightsBetween(checkin, checkout);

    let accom = 0;
    let d = parse(checkin);
    for (let i = 0; i < nights; i++) { accom += nightlyRate(s, iso(d)); d = addDays(d, 1); }

    const avg = accom / nights;
    let discount = 0, discountLabel = '';
    if (nights >= 28) { discount = Math.round(accom * MONTHLY_DISCOUNT); discountLabel = 'Monthly stay discount (20%)'; }
    else if (nights >= 7) { discount = Math.round(accom * WEEKLY_DISCOUNT); discountLabel = 'Weekly stay discount (10%)'; }

    const petFee = pet ? PET_FEE : 0;
    const sub = accom - discount + CLEANING_FEE + petFee;
    const service = Math.round(sub * SERVICE_RATE);

    return { nights, accom, avg, discount, discountLabel, cleaning: CLEANING_FEE,
             pet: petFee, service, total: sub + service };
  }

  /* ============================================================
     Range calendar — two months, click in then out, hover preview.
     ============================================================ */
  function createRangeCalendar({ mount, studio = 'shed', months = 2, onChange, onMessage }) {
    const cal = {
      studio,
      checkin: null,
      checkout: null,
      hover: null,
      cursor: (() => { const d = startOfDay(new Date()); d.setDate(1); return d; })()
    };

    mount.classList.add('calx');
    mount.innerHTML = `
      <button type="button" class="cal-arrow prev" aria-label="Previous month">&#8249;</button>
      <button type="button" class="cal-arrow next" aria-label="Next month">&#8250;</button>
      <div class="cals"></div>`;

    const cals = mount.querySelector('.cals');
    const prev = mount.querySelector('.prev');
    const next = mount.querySelector('.next');

    const say = t => onMessage && onMessage(t);
    const clearSay = () => onMessage && onMessage('');

    function monthGrid(offset) {
      const first = new Date(cal.cursor.getFullYear(), cal.cursor.getMonth() + offset, 1);
      const year = first.getFullYear(), month = first.getMonth();
      const daysIn = new Date(year, month + 1, 0).getDate();
      const lead = first.getDay();
      const today = startOfDay(new Date());
      const todayStr = iso(today);

      let cells = '';
      for (let i = 0; i < lead; i++) cells += '<span class="day blank"></span>';

      for (let n = 1; n <= daysIn; n++) {
        const d = new Date(year, month, n);
        const s = iso(d);
        const cls = ['day'];
        let disabled = false;

        if (d < today) { cls.push('past'); disabled = true; }
        else if (isBooked(cal.studio, s)) { cls.push('off'); disabled = true; }
        if (s === todayStr) cls.push('today');

        cells += `<button type="button" class="${cls.join(' ')}" data-d="${s}"
                    aria-label="${fmtFull(s)}${disabled ? ', unavailable' : ''}"
                    ${disabled ? 'disabled' : ''}><span>${n}</span></button>`;
      }

      return `<div class="cal">
        <h4>${MONTHS[month]} ${year}</h4>
        <div class="dow"><span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span></div>
        <div class="days">${cells}</div>
      </div>`;
    }

    function paintRange() {
      const ci = cal.checkin;
      const co = cal.checkout || cal.hover;
      cals.querySelectorAll('.day[data-d]').forEach(b => {
        const s = b.dataset.d;
        const start = !!ci && s === ci;
        const end = !!ci && !!co && s === co && co > ci;
        b.classList.toggle('edge-start', start);
        b.classList.toggle('edge-end', end);
        b.classList.toggle('in-range', !!ci && !!co && s > ci && s < co);
        b.classList.toggle('provisional', !cal.checkout && (start || end || (!!ci && !!co && s > ci && s < co)));
      });
    }

    function render() {
      let html = '';
      for (let i = 0; i < months; i++) html += monthGrid(i);
      cals.innerHTML = html;

      const today = startOfDay(new Date());
      prev.disabled = cal.cursor.getFullYear() === today.getFullYear() && cal.cursor.getMonth() === today.getMonth();

      cals.querySelectorAll('.day[data-d]:not([disabled])').forEach(btn => {
        btn.addEventListener('click', () => pick(btn.dataset.d));
        btn.addEventListener('mouseenter', () => {
          if (cal.checkin && !cal.checkout && btn.dataset.d > cal.checkin) {
            cal.hover = btn.dataset.d;
            paintRange();
          }
        });
      });
      paintRange();
    }

    function pick(s) {
      clearSay();

      // no start yet, or starting over
      if (!cal.checkin || cal.checkout || s <= cal.checkin) {
        cal.checkin = s; cal.checkout = null; cal.hover = null;
        paintRange();
        onChange && onChange(cal.checkin, cal.checkout);
        return;
      }

      if (nightsBetween(cal.checkin, s) < MIN_NIGHTS) {
        say(`We ask for a minimum of ${MIN_NIGHTS} nights — try one more day.`);
        return;
      }
      if (!rangeIsFree(cal.studio, cal.checkin, s)) {
        say('There is a booked night inside that stretch. Choose an unbroken run of free nights.');
        cal.checkin = s; cal.checkout = null; cal.hover = null;
        paintRange();
        onChange && onChange(cal.checkin, cal.checkout);
        return;
      }

      cal.checkout = s; cal.hover = null;
      paintRange();
      onChange && onChange(cal.checkin, cal.checkout);
    }

    function shift(n) {
      cal.cursor = new Date(cal.cursor.getFullYear(), cal.cursor.getMonth() + n, 1);
      render();
    }

    prev.addEventListener('click', () => shift(-1));
    next.addEventListener('click', () => shift(1));
    cals.addEventListener('mouseleave', () => { cal.hover = null; paintRange(); });

    render();

    return {
      get checkin() { return cal.checkin; },
      get checkout() { return cal.checkout; },
      get studio() { return cal.studio; },
      setStudio(id) {
        cal.studio = id;
        if (cal.checkin && cal.checkout && !rangeIsFree(id, cal.checkin, cal.checkout)) {
          cal.checkin = cal.checkout = null;
          onChange && onChange(null, null);
          say(`Those dates are taken at the ${STUDIOS[id] ? STUDIOS[id].name : 'other studio'}. Pick another window.`);
        }
        render();
      },
      setRange(ci, co) {
        cal.checkin = ci; cal.checkout = co; cal.hover = null;
        if (ci) { cal.cursor = startOfDay(parse(ci)); cal.cursor.setDate(1); }
        render();
        onChange && onChange(cal.checkin, cal.checkout);
      },
      clear() {
        cal.checkin = cal.checkout = cal.hover = null;
        clearSay();
        paintRange();
        onChange && onChange(null, null);
      },
      jumpTo(dateStr) {
        cal.cursor = startOfDay(parse(dateStr));
        cal.cursor.setDate(1);
        render();
      },
      render
    };
  }

  return {
    STUDIOS, CLEANING_FEE, SERVICE_RATE, PET_FEE, MIN_NIGHTS,
    MONTHS, DAYS,
    iso, parse, addDays, startOfDay, nightsBetween,
    fmtShort, fmtLong, fmtFull, money,
    BOOKED, isBooked, rangeIsFree, studioFor, nightlyRate, quote,
    createRangeCalendar
  };
})();
