/* Market Stall — Threshold
   - Paper texture canvas (fibers, not noise — slower, warmer)
   - Veil on Step Inside */
(() => {
  const paper = document.getElementById('msPaper');
  const cta = document.querySelector('.ms-tease-link');

  // ---------- Paper fibers ----------
  function paintPaper() {
    if (!paper) return;
    function resize() {
      paper.width  = Math.floor(window.innerWidth);
      paper.height = Math.floor(window.innerHeight);
      draw();
    }
    function draw() {
      const ctx = paper.getContext('2d');
      const W = paper.width, H = paper.height;
      ctx.clearRect(0,0,W,H);
      // Big warm wash first
      const grad = ctx.createRadialGradient(W*0.5, H*0.3, 0, W*0.5, H*0.5, Math.max(W,H));
      grad.addColorStop(0, 'rgba(255,240,210,0.0)');
      grad.addColorStop(1, 'rgba(120,90,40,0.10)');
      ctx.fillStyle = grad;
      ctx.fillRect(0,0,W,H);
      // Tiny fibers
      for (let i = 0; i < 1100; i++) {
        const x = Math.random() * W;
        const y = Math.random() * H;
        const len = 4 + Math.random() * 16;
        const a = Math.random() * Math.PI * 2;
        ctx.strokeStyle = `rgba(${100 + Math.random()*60|0},${80+Math.random()*50|0},${40+Math.random()*40|0},${0.06 + Math.random()*0.12})`;
        ctx.lineWidth = 0.6 + Math.random() * 0.6;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a)*len, y + Math.sin(a)*len);
        ctx.stroke();
      }
      // Tiny spots / age marks
      for (let i = 0; i < 60; i++) {
        const x = Math.random() * W;
        const y = Math.random() * H;
        const r = 1 + Math.random() * 4;
        ctx.fillStyle = `rgba(80,50,15,${0.08 + Math.random()*0.12})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI*2);
        ctx.fill();
      }
    }
    resize();
    window.addEventListener('resize', resize);
  }
  paintPaper();

  if (cta) {
    cta.addEventListener('click', (e) => {
      e.preventDefault();
      document.body.classList.add('is-leaving');
      setTimeout(() => { window.location.href = cta.getAttribute('href'); }, 480);
    });
  }
})();
