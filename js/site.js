/* Black Plum — shared site behaviour */

/* ---- sticky nav ---- */
(function () {
  const nav = document.querySelector('.nav');
  if (!nav || nav.classList.contains('on-paper')) return;
  const onScroll = () => nav.classList.toggle('solid', window.scrollY > 60);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('load', onScroll);
  requestAnimationFrame(onScroll);
})();

/* ---- mobile menu ---- */
(function () {
  const burger = document.querySelector('.burger');
  const menu = document.querySelector('.mobile-menu');
  if (!burger || !menu) return;
  burger.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    document.body.style.overflow = open ? 'hidden' : '';
  });
  menu.querySelectorAll('a').forEach(a =>
    a.addEventListener('click', () => {
      menu.classList.remove('open');
      document.body.style.overflow = '';
    })
  );
})();

/* ---- scroll reveal ---- */
(function () {
  const els = document.querySelectorAll('.rv');
  if (!els.length) return;
  if (!('IntersectionObserver' in window)) {
    els.forEach(e => e.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (!entry.isIntersecting) return;
      const delay = parseFloat(entry.target.dataset.delay || 0);
      setTimeout(() => entry.target.classList.add('in'), delay * 1000);
      io.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  els.forEach(e => io.observe(e));

  // safety net: nothing should ever be left invisible
  setTimeout(() => els.forEach(e => e.classList.add('in')), 2500);
})();

/* ---- tickers: duplicate each track so the loop is seamless ---- */
(function () {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.strip-track').forEach(track => {
    track.innerHTML += track.innerHTML;
  });
  // the review rows translate by -50%, so they need exactly two copies
  if (!reduced) {
    document.querySelectorAll('.quote-row').forEach(row => {
      const clone = row.cloneNode(true);
      clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
      clone.setAttribute('aria-hidden', 'true');
      [...clone.children].forEach(c => row.appendChild(c));
    });
  }
})();

/* ---- lightbox (gallery scoped to its own container) ---- */
(function () {
  if (!document.querySelector('[data-lightbox]')) return;

  const box = document.createElement('div');
  box.className = 'lightbox';
  box.innerHTML = `
    <button class="lb-close" aria-label="Close">&#10005;</button>
    <button class="lb-prev" aria-label="Previous">&#8249;</button>
    <button class="lb-next" aria-label="Next">&#8250;</button>
    <img alt="">
    <span class="lb-count"></span>`;
  document.body.appendChild(box);

  const img = box.querySelector('img');
  const count = box.querySelector('.lb-count');
  let group = [];
  let i = 0;

  const show = (n) => {
    i = (n + group.length) % group.length;
    img.src = group[i].dataset.lightbox;
    img.alt = group[i].querySelector('img')?.alt || '';
    count.textContent = `${i + 1} / ${group.length}`;
  };
  const close = () => {
    box.classList.remove('open');
    document.body.style.overflow = '';
  };

  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-lightbox]');
    if (!link) return;
    e.preventDefault();
    const scope = link.closest('.mosaic') || document;
    group = [...scope.querySelectorAll('[data-lightbox]')];
    show(group.indexOf(link));
    box.classList.add('open');
    document.body.style.overflow = 'hidden';
  });

  box.querySelector('.lb-close').addEventListener('click', close);
  box.querySelector('.lb-prev').addEventListener('click', (e) => { e.stopPropagation(); show(i - 1); });
  box.querySelector('.lb-next').addEventListener('click', (e) => { e.stopPropagation(); show(i + 1); });
  box.addEventListener('click', (e) => { if (e.target === box || e.target === img) close(); });
  document.addEventListener('keydown', (e) => {
    if (!box.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(i - 1);
    if (e.key === 'ArrowRight') show(i + 1);
  });
})();

/* ============================================================
   Hero search bar — Airbnb-style date and guest popovers
   ============================================================ */
(function () {
  const bar = document.querySelector('[data-searchbar]');
  if (!bar || !window.BP) return;

  const { fmtLong, nightsBetween, studioFor, STUDIOS } = window.BP;

  const ciBtn = bar.querySelector('[data-role="ci"]');
  const coBtn = bar.querySelector('[data-role="co"]');
  const guestBtn = bar.querySelector('[data-role="guests"]');
  const studioSel = bar.querySelector('[name="studio"]');
  const hidCi = bar.querySelector('[name="checkin"]');
  const hidCo = bar.querySelector('[name="checkout"]');
  const hidGuests = bar.querySelector('[name="guests"]');
  const hidPet = bar.querySelector('[name="pet"]');

  const datePop = bar.querySelector('[data-pop="dates"]');
  const guestPop = bar.querySelector('[data-pop="guests"]');
  const readout = datePop.querySelector('.pop-readout');
  const msg = datePop.querySelector('.pop-msg');

  let guests = 2;
  let pet = false;
  let openPop = null;

  const scrim = document.createElement('div');
  scrim.className = 'sb-scrim';
  document.body.appendChild(scrim);
  scrim.addEventListener('click', () => close());

  const calendar = window.BP.createRangeCalendar({
    mount: datePop.querySelector('.pop-cal'),
    studio: studioSel ? studioSel.value : 'any',
    onChange: (ci, co) => {
      hidCi.value = ci || '';
      hidCo.value = co || '';
      ciBtn.textContent = ci ? fmtLong(ci) : 'Add dates';
      coBtn.textContent = co ? fmtLong(co) : 'Add dates';
      ciBtn.classList.toggle('set', !!ci);
      coBtn.classList.toggle('set', !!co);

      const nights = ci && co ? nightsBetween(ci, co) : 0;
      readout.innerHTML = nights
        ? `<b>${nights} night${nights > 1 ? 's' : ''}</b> in Eerwah Vale`
        : (ci ? 'Now choose the day you leave' : 'Choose the day you arrive');
      datePop.querySelector('.pop-clear').hidden = !ci;

      // first click sets arrival, so slide focus to the departure field
      if (ci && !co) focusField(coBtn);
      if (ci && co) setTimeout(() => close(), 260);
    },
    onMessage: t => { msg.textContent = t; msg.classList.toggle('show', !!t); }
  });

  /* ---------- popover plumbing ---------- */
  function focusField(btn) {
    bar.querySelectorAll('.sb-field').forEach(f => f.classList.remove('focused'));
    btn.closest('.sb-field').classList.add('focused');
  }

  /* the bar sits low in the hero, so the panel often has to open upward */
  function place(pop) {
    pop.classList.remove('up');
    const anchor = bar.getBoundingClientRect();
    const h = pop.offsetHeight;
    const below = window.innerHeight - anchor.bottom - 16;
    const above = anchor.top - 16;
    if (below < h && above > below) pop.classList.add('up');
  }

  function open(pop, btn) {
    if (openPop && openPop !== pop) openPop.classList.remove('open');
    place(pop);
    pop.classList.add('open');
    openPop = pop;
    bar.classList.add('has-pop');
    scrim.classList.add('on');
    focusField(btn);
  }

  function close() {
    if (openPop) openPop.classList.remove('open');
    openPop = null;
    bar.classList.remove('has-pop');
    scrim.classList.remove('on');
    bar.querySelectorAll('.sb-field').forEach(f => f.classList.remove('focused'));
  }

  function toggle(pop, btn) {
    if (openPop === pop) close();
    else open(pop, btn);
  }

  ciBtn.addEventListener('click', e => {
    e.stopPropagation();
    if (openPop !== datePop) open(datePop, ciBtn); else focusField(ciBtn);
    if (calendar.checkin && calendar.checkout) calendar.clear();
  });

  coBtn.addEventListener('click', e => {
    e.stopPropagation();
    if (openPop !== datePop) open(datePop, coBtn); else focusField(coBtn);
  });

  guestBtn.addEventListener('click', e => { e.stopPropagation(); toggle(guestPop, guestBtn); });

  [datePop, guestPop].forEach(p => p.addEventListener('click', e => e.stopPropagation()));
  document.addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  window.addEventListener('resize', () => { if (openPop) place(openPop); }, { passive: true });

  datePop.querySelector('.pop-clear').addEventListener('click', () => calendar.clear());
  datePop.querySelector('.pop-done').addEventListener('click', close);

  /* ---------- studio changes the availability shown ---------- */
  if (studioSel) {
    studioSel.addEventListener('change', () => calendar.setStudio(studioSel.value));
  }

  /* ---------- guests ---------- */
  function renderGuests() {
    hidGuests.value = guests;
    hidPet.value = pet ? '1' : '0';
    const bits = [`${guests} guest${guests > 1 ? 's' : ''}`];
    if (pet) bits.push('a dog');
    guestBtn.textContent = bits.join(', ');
    guestBtn.classList.add('set');
    guestPop.querySelector('output').value = guests;
    guestPop.querySelector('.g-minus').disabled = guests <= 1;
    guestPop.querySelector('.g-plus').disabled = guests >= 2;
  }
  guestPop.querySelector('.g-minus').addEventListener('click', () => { guests = Math.max(1, guests - 1); renderGuests(); });
  guestPop.querySelector('.g-plus').addEventListener('click', () => { guests = Math.min(2, guests + 1); renderGuests(); });
  guestPop.querySelector('.g-pet').addEventListener('change', e => { pet = e.target.checked; renderGuests(); });
  renderGuests();

  /* ---------- submit ---------- */
  bar.addEventListener('submit', e => {
    e.preventDefault();

    if (!hidCi.value || !hidCo.value) {
      open(datePop, ciBtn);
      msg.textContent = 'Pick your nights first — two minimum.';
      msg.classList.add('show');
      return;
    }

    // "either studio" resolves to whichever one is actually free
    const wanted = studioSel ? studioSel.value : 'any';
    const resolved = studioFor(wanted, hidCi.value, hidCo.value);
    if (!resolved) {
      open(datePop, ciBtn);
      msg.textContent = 'Neither studio is free for that whole stretch. Try another window.';
      msg.classList.add('show');
      return;
    }

    const q = new URLSearchParams({
      studio: resolved,
      checkin: hidCi.value,
      checkout: hidCo.value,
      guests: String(guests),
      pet: pet ? '1' : '0'
    });
    window.location.href = 'book.html?' + q.toString();
  });
})();

/* ---- Shanika leans into frame when her photo is on screen ---- */
(function () {
  const frames = [...document.querySelectorAll('[data-peek]')];
  if (!frames.length) return;

  // if the cut-out is missing, quietly drop the whole gag rather than
  // leaving a broken image over the photo
  frames.forEach(frame => {
    const critter = frame.querySelector('.peek-critter');
    if (!critter) return;
    critter.addEventListener('error', () => {
      critter.remove();
      frame.querySelector('figcaption')?.remove();
    });
  });

  if (!('IntersectionObserver' in window)) {
    frames.forEach(f => f.classList.add('peeking'));
    return;
  }

  const io = new IntersectionObserver(
    entries => entries.forEach(e => e.target.classList.toggle('peeking', e.isIntersecting)),
    { threshold: 0.45 }
  );
  frames.forEach(f => io.observe(f));
})();

/* ---- "Ask James" — a mock-up, like the booking form ---- */
(function () {
  const form = document.querySelector('#ask-form');
  const done = document.querySelector('#ask-done');
  if (!form || !done) return;

  const email = form.elements.email;
  const hint = form.querySelector('.hint.error');

  email.addEventListener('input', () => {
    email.classList.remove('err');
    hint.classList.remove('show');
  });

  form.addEventListener('submit', e => {
    e.preventDefault();

    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim());
    email.classList.toggle('err', !ok);
    hint.classList.toggle('show', !ok);
    if (!ok) { email.focus(); return; }

    const picked = [...form.querySelectorAll('[name=want]:checked')]
      .map(c => c.value.replace(/&amp;/g, '&').toLowerCase());

    let what;
    if (!picked.length) what = 'his general list';
    else if (picked.length === 1) what = picked[0];
    else what = picked.slice(0, -1).join(', ') + ' and ' + picked[picked.length - 1];

    document.querySelector('#ask-summary').textContent =
      `James will put together ${what} and send it to ${email.value.trim()} before you arrive. ` +
      `Nothing was actually sent — this is a demonstration.`;

    form.hidden = true;
    done.hidden = false;
    done.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });

  document.querySelector('#ask-again').addEventListener('click', () => {
    form.reset();
    done.hidden = true;
    form.hidden = false;
  });
})();

/* ---- year ---- */
document.querySelectorAll('[data-year]').forEach(el => {
  el.textContent = new Date().getFullYear();
});
