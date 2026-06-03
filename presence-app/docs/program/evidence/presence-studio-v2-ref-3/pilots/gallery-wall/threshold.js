/* Gallery Wall — Threshold motion
   - Crossfade paintings every ~7.5s
   - Sync the museum plate + index highlight
   - Drift the title mark subtly on each change
   - Render film grain to the grain canvas
   - Veil out on enter
*/
(() => {
  const slides   = [...document.querySelectorAll('.paint-slide')];
  const indexEl  = document.querySelectorAll('.t-index-item');
  const plateRoman = document.querySelector('.t-plate-roman');
  const plateTitle = document.querySelector('.t-plate-title');
  const plateMeta  = document.querySelector('.t-plate-meta');
  const mark     = document.querySelector('.t-mark');
  const enter    = document.querySelector('.t-enter');
  const grain    = document.querySelector('.paint-grain');

  const works = [
    { roman: 'i.',   title: 'Willow on the South Lawn',           medium: 'Watercolour & ink on Arches', size: '76 × 56 cm', year: '2024' },
    { roman: 'ii.',  title: 'The Forest in Late Winter',          medium: 'Watercolour on cotton',       size: '64 × 48 cm', year: '2023' },
    { roman: 'iii.', title: 'Bridle Road, October',               medium: 'Gouache &amp; pencil',        size: '72 × 30 cm', year: '2023' },
    { roman: 'iv.',  title: 'Hedgerow, Gothic',                   medium: 'Watercolour on Saunders',     size: '110 × 48 cm', year: '2022' },
    { roman: 'v.',   title: 'Burgundy Peaches in a Cut-Glass Bowl', medium: 'Oil on prepared linen',    size: '40 × 60 cm', year: '2021' }
  ];

  const markPositions = [
    { top:'30vh', left:'7vw',  rotate:'-1deg' },
    { top:'24vh', left:'9vw',  rotate:'0.5deg' },
    { top:'34vh', left:'6vw',  rotate:'-1.5deg' },
    { top:'28vh', left:'8vw',  rotate:'1deg' },
    { top:'32vh', left:'7.5vw', rotate:'-0.5deg' }
  ];

  let current = 0;
  let timer;
  const DUR = 7500;

  function show(i) {
    current = (i + slides.length) % slides.length;
    slides.forEach((el, idx) => el.classList.toggle('is-active', idx === current));
    indexEl.forEach((el, idx) => el.classList.toggle('is-active', idx === current));

    const w = works[current];
    if (plateTitle) plateTitle.textContent = w.title;
    if (plateRoman) plateRoman.textContent = w.roman;
    if (plateMeta) {
      plateMeta.innerHTML =
        `<span>${w.medium}</span><span>·</span><span>${w.size}</span><span>·</span><span>${w.year}</span>`;
    }

    // Drift the title mark
    if (mark) {
      const pos = markPositions[current];
      mark.style.transition = 'top 1.5s ease, left 1.5s ease, transform 1.5s ease';
      mark.style.top = pos.top;
      mark.style.left = pos.left;
      mark.style.transform = `rotate(${pos.rotate})`;
    }
  }

  function tick() {
    show(current + 1);
  }

  function restart() {
    clearInterval(timer);
    timer = setInterval(tick, DUR);
  }

  indexEl.forEach((el, idx) => {
    el.addEventListener('click', () => { show(idx); restart(); });
    el.addEventListener('mouseenter', () => { show(idx); restart(); });
  });

  // ---------- Grain ----------
  function paintGrain() {
    if (!grain) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    grain.width  = Math.floor(window.innerWidth  * 0.5);
    grain.height = Math.floor(window.innerHeight * 0.5);
    const g = grain.getContext('2d');
    const W = grain.width, H = grain.height;
    function frame() {
      const img = g.createImageData(W, H);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = (Math.random() * 64) | 0;
        d[i] = d[i+1] = d[i+2] = v;
        d[i+3] = 28; // alpha
      }
      g.putImageData(img, 0, 0);
    }
    let last = 0;
    function loop(t) {
      if (t - last > 90) { frame(); last = t; } // ~11fps – feels analog, saves cpu
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }
  window.addEventListener('resize', () => { if (grain) { grain.width = Math.floor(window.innerWidth*0.5); grain.height = Math.floor(window.innerHeight*0.5); }});

  // ---------- Enter transition ----------
  if (enter) {
    enter.addEventListener('click', (e) => {
      e.preventDefault();
      document.body.classList.add('is-leaving');
      setTimeout(() => { window.location.href = enter.getAttribute('href'); }, 700);
    });
  }

  show(0);
  restart();
  paintGrain();
})();
