/* DJ Booth — Threshold motion
   - Generate waveform bars + animate them like a live EQ
   - Countdown clock until 23:00
   - CRT noise
   - Slight horizontal jitter every few seconds (TV signal break)
   - Enter veil transition
*/
(() => {
  const wave = document.getElementById('djWave');
  const noise = document.getElementById('djNoise');
  const count = document.getElementById('djCount');
  const enter = document.querySelector('.dj-enter');

  // ---------- Waveform bars ----------
  const N = 56;
  const bars = [];
  if (wave) {
    for (let i = 0; i < N; i++) {
      const b = document.createElement('span');
      b.className = 'dj-wave-bar';
      wave.appendChild(b);
      bars.push(b);
    }
    function tickWave(t) {
      const base = t * 0.0022;
      for (let i = 0; i < N; i++) {
        // Layered sines + noise so it feels musical
        const x = i / N;
        const a = Math.sin(base + x * 6.5) * 0.5 + 0.5;
        const b = Math.sin(base * 1.7 + x * 14 + 1.2) * 0.5 + 0.5;
        const c = Math.sin(base * 0.6 + x * 24 + 3.0) * 0.4 + 0.4;
        const v = Math.max(0.05, a * 0.45 + b * 0.35 + c * 0.25 + (Math.random() - 0.5) * 0.05);
        bars[i].style.height = (v * 100) + '%';
        // Hot color near peaks
        if (v > 0.82) bars[i].style.background = 'linear-gradient(180deg, #fff, #d8ff14)';
        else if (v > 0.55) bars[i].style.background = 'linear-gradient(180deg, #d8ff14, #5bf0ff)';
        else bars[i].style.background = 'linear-gradient(180deg, rgba(216,255,20,0.85), rgba(91,240,255,0.5))';
      }
      requestAnimationFrame(tickWave);
    }
    requestAnimationFrame(tickWave);
  }

  // ---------- Countdown to 23:00 tonight ----------
  function tickCounter() {
    if (!count) return;
    const now = new Date();
    const target = new Date(now);
    target.setHours(23, 0, 0, 0);
    if (target < now) target.setDate(target.getDate() + 1);
    let diff = Math.max(0, Math.floor((target - now) / 1000));
    const h = String(Math.floor(diff / 3600)).padStart(2, '0');
    const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
    const s = String(diff % 60).padStart(2, '0');
    count.textContent = `${h}:${m}:${s}`;
  }
  tickCounter();
  setInterval(tickCounter, 1000);

  // ---------- Noise ----------
  function setupNoise() {
    if (!noise) return;
    function resize() {
      noise.width  = Math.floor(window.innerWidth * 0.5);
      noise.height = Math.floor(window.innerHeight * 0.5);
    }
    resize();
    window.addEventListener('resize', resize);
    const ctx = noise.getContext('2d');
    let last = 0;
    function frame(t) {
      if (t - last > 70) {
        const img = ctx.createImageData(noise.width, noise.height);
        const d = img.data;
        for (let i = 0; i < d.length; i += 4) {
          const v = (Math.random() * 90) | 0;
          d[i] = d[i+1] = d[i+2] = v;
          d[i+3] = 32;
        }
        ctx.putImageData(img, 0, 0);
        last = t;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  setupNoise();

  // ---------- Occasional jitter ----------
  const stage = document.querySelector('.dj-stage');
  function jitter() {
    if (stage && Math.random() < 0.5) {
      stage.style.transform = `translateX(${(Math.random()-0.5)*3}px)`;
      setTimeout(() => { stage.style.transform = ''; }, 70 + Math.random()*120);
    }
    setTimeout(jitter, 1500 + Math.random() * 3500);
  }
  jitter();

  // ---------- Enter ----------
  if (enter) {
    enter.addEventListener('click', (e) => {
      e.preventDefault();
      document.body.classList.add('is-leaving');
      setTimeout(() => { window.location.href = enter.getAttribute('href'); }, 460);
    });
  }
})();
