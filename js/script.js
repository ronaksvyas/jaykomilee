(() => {
  document.documentElement.classList.add('scroll-locked');

  const c = window.WEDDING_CONFIG;
  const $ = (id) => document.getElementById(id);
  const setText = (id, value) => {
    const el = $(id);
    if (el) el.textContent = value;
  };

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[ch]));
  }

  document.documentElement.style.setProperty('--ivory', c.theme.ivory);
  document.documentElement.style.setProperty('--plum', c.theme.plum);
  document.documentElement.style.setProperty('--plum-dark', c.theme.plumDark);
  document.documentElement.style.setProperty('--gold', c.theme.gold);
  document.documentElement.style.setProperty('--sage', c.theme.sage);
  document.documentElement.style.setProperty('--blush', c.theme.blush);

  ['groomHero', 'footerGroom'].forEach((id) => setText(id, c.groom));
  ['brideHero', 'footerBride'].forEach((id) => setText(id, c.bride));
  setText('venueName', c.venue.name);
  setText('venueAddress', c.venue.address);
  const mapLink = $('mapLink');
  if (mapLink) mapLink.href = c.venue.mapsUrl;

  const families = $('blessingFamilies');
  if (families) {
    families.innerHTML = `
      <article class="family-line">
        <p class="family-of">Son of ${escapeHtml(c.families.groomParents)}</p>
      </article>
      <span class="family-sep" aria-hidden="true">✦</span>
      <article class="family-line">
        <p class="family-of">Daughter of ${escapeHtml(c.families.brideParents)}</p>
      </article>`;
  }

  const dayOne = c.events.filter((e) => e.date.startsWith('19') && e.name !== 'Sangeet');
  const dayOneEvents = $('dayOneEvents');
  if (dayOneEvents) {
    dayOneEvents.innerHTML = dayOne.map((e) => {
      const icon = e.icon
        ? `<img class="event-icon" src="${escapeHtml(e.icon)}" alt="" loading="lazy" width="816" height="816">`
        : `<span class="event-mark" aria-hidden="true">${e.symbol || ''}</span>`;
      return `
      <article class="event-block reveal">
        ${icon}
        <h3>${escapeHtml(e.name)}</h3>
        <p class="datetime datetime-event">${escapeHtml(e.time)}</p>
        <p>${escapeHtml(e.note)}</p>
      </article>`;
    }).join('');
  }

  const contacts = $('contactList');
  if (contacts) {
    contacts.innerHTML = c.contacts.map((person) => `
      <article class="contact-block">
        <strong>${escapeHtml(person.name)}</strong>
      </article>`).join('');
  }

  const target = new Date(c.weddingStart).getTime();
  function updateCountdown() {
    let diff = Math.max(0, target - Date.now());
    const d = Math.floor(diff / 86400000);
    diff %= 86400000;
    const h = Math.floor(diff / 3600000);
    diff %= 3600000;
    const m = Math.floor(diff / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    setText('days', String(d).padStart(2, '0'));
    setText('hours', String(h).padStart(2, '0'));
    setText('minutes', String(m).padStart(2, '0'));
    setText('seconds', String(s).padStart(2, '0'));
  }
  updateCountdown();
  setInterval(updateCountdown, 1000);

  const audio = $('bgMusic');
  if (audio && c.music.enabled) {
    audio.src = c.music.file;
    audio.volume = 0.75;
  }

  let musicStarted = false;
  let welcomeReached = false;

  function startMusic() {
    if (musicStarted || !audio || !c.music.enabled) return;
    musicStarted = true;
    audio.play().catch(() => {});
  }

  // Browsers require audio.play() to be called directly inside a user gesture
  // (click, touchend, keydown). Scroll events are not enough on their own.
  // Strategy: track when welcome section is reached, then play on the very next gesture.
  function onGesture() {
    if (welcomeReached && !musicStarted) {
      startMusic();
    }
  }

  document.addEventListener('click',    onGesture, { capture: true });
  document.addEventListener('touchend', onGesture, { capture: true });
  document.addEventListener('keydown',  onGesture, { capture: true });

  const welcomeSection = $('welcome');

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal, .event-block').forEach((el) => revealObserver.observe(el));

  const progress = $('progressBar');
  const envelope = $('envelopeOpen');
  const hint = $('scrollCue');
  let envelopeOpened = false;

  const teaserHashtag = $('teaserHashtag');

  const teaserSection = document.querySelector('.teaser-section');

  function openEnvelope() {
    if (!envelope || envelopeOpened) return;
    envelopeOpened = true;
    document.documentElement.classList.remove('scroll-locked');
    envelope.classList.add('is-open');
    document.body.classList.add('envelope-open');
    if (teaserHashtag) teaserHashtag.classList.add('is-visible');
    if (hint) hint.textContent = 'Scroll to continue';
    startMusic();
    window.setTimeout(() => {
      if (teaserSection) teaserSection.classList.add('is-zooming');
    }, 1400);
    window.setTimeout(() => {
      const welcome = $('welcome');
      if (welcome) welcome.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 2300);
    window.setTimeout(() => {
      if (teaserSection) teaserSection.classList.remove('is-zooming');
    }, 3600);
  }

  if (envelope) {
    envelope.addEventListener('click', openEnvelope);
    envelope.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openEnvelope();
      }
    });
  }

  function onScroll() {
    const max = document.documentElement.scrollHeight - innerHeight;
    if (progress) {
      progress.style.width = `${max > 0 ? (scrollY / max) * 100 : 0}%`;
    }
    if (!welcomeReached && welcomeSection) {
      const rect = welcomeSection.getBoundingClientRect();
      if (rect.top < innerHeight * 0.9) {
        welcomeReached = true;
        startMusic(); // works on Chrome (relaxed policy) and after envelope click
      }
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
