/* Gallery Wall — Chamber motion (transform-based virtual scroll)
   - Wheel / drag / arrow keys → moves x
   - Spotlight follows cursor
   - Dust particles
   - Click work → focus overlay
   - Esc to close
   - Top + bottom rails sync to current centered work
*/
(() => {
  const wall    = document.getElementById('wall');
  const strip   = document.getElementById('wallStrip');
  const spot    = document.getElementById('wallSpot');
  const dust    = document.getElementById('wallDust');
  const railNum = document.getElementById('railNum');
  const miniBtns = [...document.querySelectorAll('.rail-mini-item')];
  const works   = [...document.querySelectorAll('.work')];
  const focusEl = document.getElementById('focus');
  const focusImg = document.getElementById('focusImg');
  const focusClose = document.getElementById('focusClose');
  const focusRoman = document.getElementById('focusRoman');
  const focusTitle = document.getElementById('focusTitle');
  const focusMedium = document.getElementById('focusMedium');
  const focusNote = document.getElementById('focusNote');

  const ROMANS = ['i','ii','iii','iv','v'];

  // ---------- Virtual scroll state ----------
  let x = 0;                          // current translateX (px, negative = scrolled right)
  let maxX = 0;                       // most negative allowed
  let currentIdx = 0;
  let tweening = false;

  function measure() {
    maxX = -(strip.scrollWidth - window.innerWidth);
    if (maxX > 0) maxX = 0;
  }
  function clamp(v){ return Math.max(maxX, Math.min(0, v)); }
  function applyX(snap=false){
    if (snap) strip.classList.add('no-tween'); else strip.classList.remove('no-tween');
    strip.style.transform = `translate3d(${x}px,0,0)`;
    updateActive();
  }
  function nudge(dx, snap=false){
    x = clamp(x - dx); // dx>0 means visually move forward (strip shifts left)
    applyX(snap);
  }
  function tweenTo(target){
    target = clamp(target);
    x = target;
    applyX(false);
  }
  function scrollToWork(idx){
    const w = works[idx];
    if (!w) return;
    const center = w.offsetLeft + w.offsetWidth/2;
    const target = -(center - window.innerWidth/2);
    tweenTo(target);
  }

  // ---------- Active work tracking ----------
  function updateActive(){
    const center = -x + window.innerWidth/2;
    let best = 0, bestDist = Infinity;
    works.forEach((w, i) => {
      const c = w.offsetLeft + w.offsetWidth/2;
      const d = Math.abs(c - center);
      if (d < bestDist){ bestDist = d; best = i; }
    });
    if (best !== currentIdx){
      currentIdx = best;
      if (railNum) railNum.textContent = ROMANS[best];
      miniBtns.forEach((b, i) => b.classList.toggle('is-active', i === best));
    }
  }

  // ---------- Wheel ----------
  wall.addEventListener('wheel', (e) => {
    // Both axes count; treat wheel as horizontal pan
    const dx = (Math.abs(e.deltaY) > Math.abs(e.deltaX)) ? e.deltaY : e.deltaX;
    e.preventDefault();
    nudge(dx * 1.4, true);
  }, { passive: false });

  // ---------- Drag ----------
  let dragging = false, startCX = 0, startX = 0;
  wall.addEventListener('mousedown', (e) => {
    if (e.target.closest('.work-frame, .rail-back, .rail-mini-item, .wall-end-link, .focus-close, .focus-meta-cta')) return;
    dragging = true;
    wall.classList.add('is-dragging');
    startCX = e.clientX;
    startX = x;
  });
  window.addEventListener('mouseup', () => { dragging = false; wall.classList.remove('is-dragging'); });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    x = clamp(startX + (e.clientX - startCX));
    applyX(true);
  });

  // Touch
  let tStartCX = 0, tStartX = 0;
  wall.addEventListener('touchstart', (e) => {
    tStartCX = e.touches[0].clientX;
    tStartX = x;
  }, { passive: true });
  wall.addEventListener('touchmove', (e) => {
    x = clamp(tStartX + (e.touches[0].clientX - tStartCX));
    applyX(true);
  }, { passive: true });

  // ---------- Keys ----------
  window.addEventListener('keydown', (e) => {
    if (focusEl.classList.contains('is-open')){
      if (e.key === 'Escape') closeFocus();
      if (e.key === 'ArrowLeft'){ const i = (currentIdx-1+works.length)%works.length; openFocus(works[i]); }
      if (e.key === 'ArrowRight'){ const i = (currentIdx+1)%works.length; openFocus(works[i]); }
      return;
    }
    if (e.key === 'ArrowRight') scrollToWork(Math.min(currentIdx+1, works.length-1));
    else if (e.key === 'ArrowLeft') scrollToWork(Math.max(currentIdx-1, 0));
    else if (e.key === 'Home') tweenTo(0);
    else if (e.key === 'End') tweenTo(maxX);
  });

  // ---------- Minimap ----------
  miniBtns.forEach((btn, i) => btn.addEventListener('click', () => scrollToWork(i)));

  // ---------- Spotlight ----------
  let spotX = window.innerWidth/2, spotY = window.innerHeight*0.42;
  let targetX = spotX, targetY = spotY;
  window.addEventListener('mousemove', (e) => { targetX = e.clientX; targetY = e.clientY; });
  function loopSpot(){
    spotX += (targetX - spotX) * 0.08;
    spotY += (targetY - spotY) * 0.08;
    if (spot){ spot.style.left = spotX + 'px'; spot.style.top = spotY + 'px'; }
    requestAnimationFrame(loopSpot);
  }
  loopSpot();

  // ---------- Dust ----------
  function setupDust(){
    if (!dust) return;
    const ctx = dust.getContext('2d');
    function resize(){ dust.width = window.innerWidth; dust.height = window.innerHeight; }
    resize();
    window.addEventListener('resize', () => { resize(); measure(); applyX(true); });

    const N = 60;
    const motes = [];
    for (let i = 0; i < N; i++){
      motes.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: 0.4 + Math.random() * 1.6,
        vx: -0.05 + Math.random() * 0.1,
        vy: -0.04 - Math.random() * 0.08,
        a: 0.15 + Math.random() * 0.4,
        ph: Math.random() * Math.PI * 2
      });
    }
    function frame(t){
      ctx.clearRect(0,0,dust.width,dust.height);
      for (const m of motes){
        m.x += m.vx + Math.sin(t * 0.0008 + m.ph) * 0.12;
        m.y += m.vy;
        if (m.y < -10){ m.y = window.innerHeight + 10; m.x = Math.random() * window.innerWidth; }
        if (m.x < -10) m.x = window.innerWidth + 10;
        if (m.x > window.innerWidth + 10) m.x = -10;
        const a = m.a * (0.6 + 0.4 * Math.sin(t * 0.001 + m.ph));
        ctx.beginPath();
        ctx.fillStyle = `rgba(214,178,122,${a})`;
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  setupDust();

  // ---------- Focus ----------
  function openFocus(workEl){
    const idx = parseInt(workEl.dataset.idx, 10);
    currentIdx = idx;
    const img = workEl.querySelector('.work-frame img');
    const title = workEl.querySelector('.work-plate-title').innerHTML;
    const medium = workEl.querySelector('.work-plate-meta').textContent;
    const note = workEl.querySelector('.work-plate-note').textContent;
    focusImg.src = img.src;
    focusImg.alt = workEl.querySelector('.work-plate-title').textContent;
    focusRoman.textContent = ROMANS[idx] + '.';
    focusTitle.innerHTML = title;
    focusMedium.textContent = medium;
    focusNote.textContent = note;
    focusEl.classList.add('is-open');
    if (railNum) railNum.textContent = ROMANS[idx];
    miniBtns.forEach((b, i) => b.classList.toggle('is-active', i === idx));
  }
  function closeFocus(){ focusEl.classList.remove('is-open'); }
  works.forEach((w) => {
    const frame = w.querySelector('.work-frame');
    frame.addEventListener('click', (e) => { e.stopPropagation(); openFocus(w); });
  });
  focusClose.addEventListener('click', closeFocus);
  focusEl.addEventListener('click', (e) => {
    if (e.target === focusEl || e.target.classList.contains('focus-stage')) closeFocus();
  });

  // ---------- Boot ----------
  // Wait for images to load enough to measure correctly
  function boot(){
    measure();
    applyX(true);
  }
  if (document.readyState === 'complete') boot();
  else window.addEventListener('load', boot);
  setTimeout(boot, 300);
  window.addEventListener('resize', () => { measure(); applyX(true); });
})();
