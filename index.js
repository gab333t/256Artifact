(function () {
  "use strict";

  const ENTRIES = [
    { src: 'img/1.webp',  title: 'Sun', about: '', date: '09-02-26', time: '14:45:32', coords: '40.8246131453,-73.9585282656' },
    { src: 'img/2.webp',  title: 'Corks', about: '', date: '09-02-26', time: '14:45:32', coords: '40.8246131453,-73.9585282656' },
    { src: 'img/3.webp',  title: 'Vendor', about: '', date: '09-02-26', time: '14:45:32', coords: '40.8246131453,-73.9585282656' },
    { src: 'img/4.webp',  title: 'Ceremonial', about: '', date: '09-02-26', time: '14:45:32', coords: '40.8246131453,-73.9585282656' },
    { src: 'img/5.webp',  title: 'Sombrero', about: '', date: '09-02-26', time: '14:45:32', coords: '40.8246131453,-73.9585282656' },
    { src: 'img/6.webp',  title: 'Toro', about: '', date: '09-02-26', time: '14:45:32', coords: '40.8246131453,-73.9585282656' },
    { src: 'img/7.webp',  title: 'Tennis', about: '', date: '09-02-26', time: '14:45:32', coords: '40.8246131453,-73.9585282656' },
    { src: 'img/8.webp',  title: 'Binoculars', about: '', date: '09-02-26', time: '14:45:32', coords: '40.8246131453,-73.9585282656' },
    { src: 'img/9.webp',  title: 'Masks', about: '', date: '09-02-26', time: '14:45:32', coords: '40.8246131453,-73.9585282656' },
    { src: 'img/10.webp', title: 'Liquor', about: '', date: '09-02-26', time: '14:45:32', coords: '40.8246131453,-73.9585282656' },
    { src: 'img/11.webp', title: 'Dino', about: '', date: '09-02-26', time: '14:45:32', coords: '40.8246131453,-73.9585282656' },
    { src: 'img/12.webp', title: 'Bunny', about: '', date: '09-02-26', time: '14:45:32', coords: '40.8246131453,-73.9585282656' },
    { src: 'img/13.webp', title: 'Bird', about: '', date: '09-02-26', time: '14:45:32', coords: '40.8246131453,-73.9585282656' },
    { src: 'img/14.webp', title: 'Carousel', about: '', date: '09-02-26', time: '14:45:32', coords: '40.8246131453,-73.9585282656' }
  ];

  const root = document.documentElement;
  const track = document.getElementById('scroll-track');
  const strip = document.getElementById('strip');
  const plaqueCaption = document.getElementById('plaque-caption');
  const plaqueNumber = document.getElementById('plaque-number');
  const plaqueName = document.getElementById('plaque-name');
  const detail = document.getElementById('detail');
  const detailImg = document.getElementById('detail-img');
  const detailDate = document.getElementById('detail-date');
  const detailTime = document.getElementById('detail-time');
  const detailCoords = document.getElementById('detail-coords');
  const detailAbout = document.getElementById('detail-about');

  const cards = [];
  let config = readConfig();
  let current = 0;
  let lastRendered = NaN;
  let focusIndex = -1;
  let detailCard = null;
  let settleTimer = null;

  plaqueNumber.textContent = '000';
  plaqueName.textContent = '\u201C \u201D';

  function readConfig() {
    const cs = getComputedStyle(root);
    const num = (name) => parseFloat(cs.getPropertyValue(name)) || 0;
    return {
      cardW: num('--card-w'),
      gap: num('--stack-gap'),
      stackStep: num('--stack-step'),
      lift: num('--lift'),
      centerZ: num('--center-z'),
      focusTilt: num('--focus-tilt'),
      step: num('--step'),
      smooth: Math.min(1, Math.max(0.01, num('--smooth'))),
      settleMs: num('--settle-ms'),
      shadowOffset: num('--shadow-offset'),
      shadowStack: num('--shadow-stack'),
      shadowFocus: num('--shadow-focus'),
      shadowGrow: num('--shadow-grow')
    };
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  function buildCard(img, entry, entryNumber) {
    const shadow = document.createElement('div');
    shadow.className = 'card-shadow';
    strip.appendChild(shadow);

    const el = document.createElement('div');
    el.className = 'card';
    img.className = 'card-img';
    img.alt = entry.title;
    img.draggable = false;
    el.appendChild(img);
    strip.appendChild(el);

    const card = {
      el,
      shadow,
      img,
      index: cards.length,
      aspect: img.naturalHeight / img.naturalWidth,
      entryNumber,
      title: entry.title || 'Untitled',
      about: entry.about || '',
      date: entry.date || '',
      time: entry.time || '',
      coords: entry.coords || ''
    };

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      onCardClick(card);
    });

    cards.push(card);
  }

  function sizeCards() {
    cards.forEach((c) => {
      c.el.style.height = config.cardW * c.aspect + 'px';
    });
  }

  function sizeTrack() {
    track.style.height = `calc(${(cards.length - 1) * config.step}px + 100vh)`;
  }

  function layout(s) {
    for (const c of cards) {
      const d = c.index - s;
      const dist = Math.abs(d);
      const e = easeInOutCubic(Math.min(1, dist));
      const pos = Math.sign(d) * (config.gap * e + config.stackStep * Math.max(0, dist - 1));
      const lift = config.lift * (1 - e);
      const angle = -90 + config.focusTilt * (1 - e);
      c.el.style.transform = `translate3d(0px, ${pos}px, ${lift}px) rotateX(${angle}deg)`;

      const shadowScale = 1 + config.shadowGrow * (1 - e);
      const shadowAlpha = config.shadowStack + (config.shadowFocus - config.shadowStack) * (1 - e);
      c.shadow.style.transform = `translate3d(0px, ${pos + config.shadowOffset}px, -1px) scale(${shadowScale})`;
      c.shadow.style.opacity = shadowAlpha.toFixed(3);
    }

    strip.style.transform = `translate3d(0px, 0px, ${-(config.lift + config.centerZ)}px)`;
  }

  function targetPosition() {
    return Math.min(cards.length - 1, Math.max(0, window.scrollY / config.step));
  }

  function settle() {
    if (detailCard || !cards.length) return;
    const top = Math.round(targetPosition()) * config.step;
    if (Math.abs(top - window.scrollY) > 1) {
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }

  window.addEventListener('scroll', () => {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(settle, config.settleMs);
  }, { passive: true });

  function tick() {
    const target = targetPosition();
    current += (target - current) * config.smooth;
    if (Math.abs(target - current) < 0.0005) current = target;

    if (current !== lastRendered) {
      layout(current);
      lastRendered = current;
    }

    const fi = Math.round(current);
    if (fi !== focusIndex) {
      focusIndex = fi;
      if (!detailCard) renderCaption(cards[fi]);
    }

    requestAnimationFrame(tick);
  }

  function renderCaption(card) {
    if (card) {
      plaqueNumber.textContent = String(card.entryNumber).padStart(3, '0');
      plaqueName.textContent = '\u201C' + card.title + '\u201D';
      plaqueCaption.classList.add('visible');
    } else {
      plaqueCaption.classList.remove('visible');
    }
  }

  function openDetail(card) {
    detailCard = card;
    detailImg.src = card.img.src;
    detailImg.alt = card.title;
    detailDate.textContent = card.date;
    detailTime.textContent = card.time;
    detailCoords.textContent = card.coords;
    detailAbout.textContent = card.about;
    detail.classList.add('open');
    document.body.classList.add('is-detail');
    renderCaption(card);
  }

  function closeDetail() {
    if (!detailCard) return;
    detailCard = null;
    detail.classList.remove('open');
    document.body.classList.remove('is-detail');
    renderCaption(cards[focusIndex]);
  }

  function onCardClick(card) {
    if (detailCard) {
      closeDetail();
      return;
    }
    if (card.index === focusIndex) {
      openDetail(card);
    } else {
      window.scrollTo({ top: card.index * config.step, behavior: 'smooth' });
    }
  }

  document.addEventListener('click', () => {
    if (detailCard) closeDetail();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && detailCard) closeDetail();
  });

  window.addEventListener('resize', () => {
    if (!cards.length) return;
    config = readConfig();
    sizeCards();
    sizeTrack();
    lastRendered = NaN;
  });

  Promise.all(ENTRIES.map((entry) => loadImage(entry.src))).then((imgs) => {
    imgs.forEach((img, i) => {
      if (img) buildCard(img, ENTRIES[i], i + 1);
    });
    if (!cards.length) return;
    sizeCards();
    sizeTrack();
    current = targetPosition();
    requestAnimationFrame(tick);
  });
})();