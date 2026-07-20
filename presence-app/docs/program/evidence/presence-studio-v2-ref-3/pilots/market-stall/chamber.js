/* Market Stall — Chamber
   - Inject inventory pieces (each with sketch svg, wood color, status)
   - Filter by category and sort by various keys
   - Paper texture
*/
(() => {

  const PIECES = [
    {id:1,  name:'Quartersawn Oak Bench',     cat:'furniture', wood:'White oak',    color:'#caa170', dims:'120×38×44', price:2400, status:'bench',  date:'in progress'},
    {id:2,  name:'Three-Legged Stool',         cat:'furniture', wood:'Black cherry', color:'#a8794a', dims:'40×40×46',  price:480,  status:'avail',   date:'may 2026'},
    {id:3,  name:'Reading Bowl',               cat:'vessels',   wood:'Black walnut', color:'#5d3d24', dims:'28 ⌀ × 9',  price:320,  status:'avail',   date:'may 2026'},
    {id:4,  name:'Cherry Side Table',          cat:'furniture', wood:'Cherry',       color:'#a8794a', dims:'46×46×58',  price:1100, status:'avail',   date:'apr 2026'},
    {id:5,  name:'Long Spoon, hand-carved',    cat:'small',     wood:'Hard maple',   color:'#e8d8b3', dims:'30 × 5',    price:65,   status:'avail',   date:'apr 2026'},
    {id:6,  name:'Library Reading Table',      cat:'furniture', wood:'Black walnut', color:'#5d3d24', dims:'244×96×76', price:8600, status:'comm',    date:'oct 2026'},
    {id:7,  name:'Salt Cellar, pair',          cat:'small',     wood:'Ash',          color:'#d6c69a', dims:'8 × 8 × 6', price:140,  status:'avail',   date:'apr 2026'},
    {id:8,  name:'Linseed-Oil Cutting Board',  cat:'small',     wood:'Hard maple',   color:'#e8d8b3', dims:'52 × 30',   price:185,  status:'avail',   date:'mar 2026'},
    {id:9,  name:'Trestle Dining Table',       cat:'furniture', wood:'White oak',    color:'#caa170', dims:'200×90×74', price:5800, status:'comm',    date:'sep 2026'},
    {id:10, name:'Salad Bowl, large',          cat:'vessels',   wood:'Cherry',       color:'#a8794a', dims:'36 ⌀ × 12', price:420,  status:'avail',   date:'mar 2026'},
    {id:11, name:'Writing Chair',              cat:'furniture', wood:'Black cherry', color:'#a8794a', dims:'52×48×84',  price:1900, status:'sold',    date:'feb 2026'},
    {id:12, name:'Soup Bowl, set of two',      cat:'vessels',   wood:'Ash',          color:'#d6c69a', dims:'18 ⌀ × 7',  price:240,  status:'avail',   date:'feb 2026'},
    {id:13, name:'Coat Rack',                  cat:'furniture', wood:'Ash',          color:'#d6c69a', dims:'46×46×178', price:780,  status:'sold',    date:'jan 2026'},
    {id:14, name:'Workbench, custom',          cat:'furniture', wood:'White oak',    color:'#caa170', dims:'180×60×92', price:3400, status:'comm',    date:'aug 2026'},
    {id:15, name:'Box, dovetailed',            cat:'small',     wood:'Black walnut', color:'#5d3d24', dims:'24 × 14 × 8',price:280, status:'avail',   date:'jan 2026'},
    {id:16, name:'Pillar Candle Bowls (4)',    cat:'vessels',   wood:'Cherry',       color:'#a8794a', dims:'12 ⌀ × 4',  price:160,  status:'sold',    date:'dec 2025'},
    {id:17, name:'Side Stool',                 cat:'furniture', wood:'Black cherry', color:'#a8794a', dims:'34×34×42',  price:380,  status:'comm',    date:'jul 2026'}
  ];

  // SVG silhouettes by category
  const SVG = {
    furniture: (name) => {
      // pick by name hash for variety
      const n = name.toLowerCase();
      if (n.includes('bench') || n.includes('bench')) return `
        <svg viewBox="0 0 200 100"><g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <rect x="10" y="20" width="180" height="14" rx="2"/>
          <line x1="22" y1="34" x2="18" y2="90"/><line x1="34" y1="34" x2="38" y2="90"/>
          <line x1="162" y1="34" x2="166" y2="90"/><line x1="174" y1="34" x2="170" y2="90"/>
          <line x1="38" y1="60" x2="162" y2="60"/><line x1="10" y1="90" x2="190" y2="90" stroke-dasharray="2 3"/>
        </g></svg>`;
      if (n.includes('stool')) return `
        <svg viewBox="0 0 200 100"><g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <ellipse cx="100" cy="30" rx="44" ry="8"/>
          <line x1="68" y1="30" x2="50" y2="88"/><line x1="100" y1="34" x2="100" y2="88"/><line x1="132" y1="30" x2="150" y2="88"/>
          <line x1="50" y1="88" x2="150" y2="88" stroke-dasharray="2 3"/>
        </g></svg>`;
      if (n.includes('table') || n.includes('writing chair') || n.includes('coat')) return `
        <svg viewBox="0 0 200 100"><g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <rect x="14" y="26" width="172" height="10" rx="2"/>
          <line x1="26" y1="36" x2="22" y2="90"/><line x1="38" y1="36" x2="42" y2="90"/>
          <line x1="158" y1="36" x2="162" y2="90"/><line x1="170" y1="36" x2="166" y2="90"/>
          <line x1="14" y1="90" x2="186" y2="90" stroke-dasharray="2 3"/>
        </g></svg>`;
      return `<svg viewBox="0 0 200 100"><g fill="none" stroke="currentColor" stroke-width="1.4">
        <rect x="20" y="20" width="160" height="60" rx="3"/></g></svg>`;
    },
    vessels: () => `
      <svg viewBox="0 0 200 100"><g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
        <path d="M40 38 Q40 90 100 90 Q160 90 160 38 Z"/>
        <ellipse cx="100" cy="38" rx="60" ry="10"/>
        <ellipse cx="100" cy="42" rx="48" ry="6" opacity="0.5"/>
      </g></svg>`,
    small: (name) => {
      const n = name.toLowerCase();
      if (n.includes('spoon')) return `
        <svg viewBox="0 0 200 100"><g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <ellipse cx="160" cy="46" rx="22" ry="14"/>
          <path d="M138 46 Q90 48 30 58"/>
        </g></svg>`;
      if (n.includes('cellar') || n.includes('box')) return `
        <svg viewBox="0 0 200 100"><g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <rect x="50" y="30" width="100" height="55" rx="2"/>
          <line x1="50" y1="46" x2="150" y2="46"/>
          <line x1="60" y1="46" x2="60" y2="85"/><line x1="140" y1="46" x2="140" y2="85"/>
        </g></svg>`;
      return `
        <svg viewBox="0 0 200 100"><g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <rect x="30" y="40" width="140" height="34" rx="2"/>
          <line x1="50" y1="40" x2="50" y2="74"/><line x1="100" y1="40" x2="100" y2="74"/><line x1="150" y1="40" x2="150" y2="74"/>
        </g></svg>`;
    }
  };

  const STATUS_LABEL = { avail:'available', comm:'commission', sold:'sold', bench:'on the bench' };

  let state = { filter:'all', sort:'recent' };

  function fmtPrice(n) {
    return '$' + n.toLocaleString();
  }

  function render() {
    let items = PIECES.slice();
    if (state.filter !== 'all') items = items.filter(p => p.cat === state.filter);
    if (state.sort === 'price') items.sort((a,b) => a.price - b.price);
    else if (state.sort === 'wood') items.sort((a,b) => a.wood.localeCompare(b.wood));
    else if (state.sort === 'status') {
      const ord = { bench:0, avail:1, comm:2, sold:3 };
      items.sort((a,b) => ord[a.status] - ord[b.status]);
    }
    // "recent" preserves original order (already by date desc)

    document.getElementById('msCount').textContent =
      `${items.length} pieces · sorted by ${state.sort}`;

    const el = document.getElementById('msPieces');
    el.innerHTML = items.map(p => {
      const svg = (SVG[p.cat] || SVG.furniture)(p.name);
      const tagClass = `ms-piece-tag--${p.status}`;
      const tagLabel = STATUS_LABEL[p.status];
      return `
        <article class="ms-piece" data-id="${p.id}">
          <div class="ms-piece-img" style="--piece-wood:${p.color}">
            <span class="ms-piece-tag ${tagClass}">${tagLabel}</span>
            <span class="ms-piece-stamp">№ ${String(p.id).padStart(3,'0')}</span>
            ${svg}
          </div>
          <div class="ms-piece-body">
            <div class="ms-piece-name">${p.name}</div>
            <div class="ms-piece-spec">${p.wood} · ${p.dims} cm · ${p.date}</div>
            <div class="ms-piece-price">
              <span class="ms-piece-price-num">${fmtPrice(p.price)}${p.status==='comm' ? ' <em>est.</em>' : ''}</span>
              <span class="ms-piece-price-cta">${p.status === 'sold' ? 'archive' : (p.status === 'comm' ? 'enquire' : 'enquire')}</span>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  document.querySelectorAll('.ms-side-list[data-filter], .ms-side-block ul li[data-filter]').forEach(() => {});
  document.querySelectorAll('.ms-side-block ul li[data-filter]').forEach(li => {
    li.addEventListener('click', () => {
      const filter = li.getAttribute('data-filter');
      state.filter = filter;
      document.querySelectorAll('.ms-side-block ul li[data-filter]').forEach(x => {
        x.classList.toggle('is-on', x === li);
      });
      render();
    });
  });
  document.querySelectorAll('.ms-grid-sort button').forEach(btn => {
    btn.addEventListener('click', () => {
      state.sort = btn.getAttribute('data-sort');
      document.querySelectorAll('.ms-grid-sort button').forEach(b => b.classList.toggle('is-on', b === btn));
      render();
    });
  });

  render();

  // ---------- Paper texture (same as threshold) ----------
  const paper = document.getElementById('msPaper');
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
      for (let i = 0; i < 800; i++) {
        const x = Math.random() * W, y = Math.random() * H;
        const len = 4 + Math.random() * 14;
        const a = Math.random() * Math.PI * 2;
        ctx.strokeStyle = `rgba(${100 + Math.random()*60|0},${80+Math.random()*50|0},${40+Math.random()*40|0},${0.05 + Math.random()*0.1})`;
        ctx.lineWidth = 0.5 + Math.random() * 0.6;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a)*len, y + Math.sin(a)*len);
        ctx.stroke();
      }
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = `rgba(80,50,15,${0.06 + Math.random()*0.10})`;
        ctx.beginPath();
        ctx.arc(Math.random()*W, Math.random()*H, 1 + Math.random()*3, 0, Math.PI*2);
        ctx.fill();
      }
    }
    resize();
    window.addEventListener('resize', resize);
  }
  paintPaper();
})();
