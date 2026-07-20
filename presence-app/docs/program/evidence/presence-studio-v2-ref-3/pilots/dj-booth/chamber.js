/* DJ Booth — Chamber motion
   - Populate crate (mixes) and tracklist
   - Draw waveform canvas (procedural, persistent — not animated bars)
   - Play / pause toggles vinyl spin
   - Click crate item → load that mix
   - Esc stops
   - CRT noise
*/
(() => {

  const MIXES = [
    {num:'015', title:'TWELVE MOONS',  venue:'NTS Radio London',     date:'05.26', mins:62, bpm:128, tracks:18},
    {num:'014', title:'OFFLINE BPM',    venue:'HOR Berlin',           date:'03.26', mins:78, bpm:132, tracks:21, current:true},
    {num:'013', title:'NIGHT BUS',      venue:'Cómeme · Mexico City', date:'02.26', mins:54, bpm:124, tracks:16},
    {num:'012', title:'WATER WORK',     venue:'Trésor',               date:'12.25', mins:96, bpm:138, tracks:24},
    {num:'011', title:'AKARA',          venue:'Nyege Nyege · Jinja',  date:'09.25', mins:72, bpm:135, tracks:19},
    {num:'010', title:'LO-RES MORNING', venue:'home sessions',        date:'08.25', mins:48, bpm:118, tracks:12},
    {num:'009', title:'BANTUFUTURISM',  venue:'Boiler Room Lagos',    date:'06.25', mins:84, bpm:140, tracks:22},
    {num:'008', title:'THE WALK BACK',  venue:'Dekmantel',            date:'08.24', mins:67, bpm:130, tracks:18},
    {num:'007', title:'FLOOR COPY',     venue:'Panorama Bar',         date:'05.24', mins:88, bpm:134, tracks:23},
    {num:'006', title:'SOFT ROAR',      venue:'Sustain Release',      date:'09.23', mins:58, bpm:126, tracks:15},
    {num:'005', title:'BEDROOM TAPE 5', venue:'home sessions',        date:'04.23', mins:44, bpm:120, tracks:11},
    {num:'004', title:'BLUE SQUARE',    venue:'NTS Berlin',           date:'11.22', mins:60, bpm:128, tracks:16},
    {num:'003', title:'GRAVEYARD SHIFT',venue:'about blank',          date:'07.22', mins:104,bpm:142, tracks:27},
    {num:'002', title:'AMOEBA',         venue:'Rinse FM',             date:'02.22', mins:60, bpm:130, tracks:16},
    {num:'001', title:'FIRST PASS',     venue:'home sessions',        date:'10.21', mins:38, bpm:122, tracks:10}
  ];

  // Tracklist for the current mix (014)
  const TRACKS = [
    {n:'01', artist:'Asake', title:'Mr Money With The Vibe (T.AMP edit)',    t:'4:12', bpm:128, tag:'opener'},
    {n:'02', artist:'Niecy Blues', title:'Soundtrack to a Slow Walk',        t:'5:36', bpm:124, tag:''},
    {n:'03', artist:'KH', title:'Looking at Your Pager',                     t:'3:48', bpm:130, tag:''},
    {n:'04', artist:'DJ Lag', title:'Hayi',                                  t:'4:22', bpm:132, tag:''},
    {n:'05', artist:'Eartheater', title:'How To Fight',                      t:'5:02', bpm:128, tag:''},
    {n:'06', artist:'Kahn & Neek', title:'Caltrops',                         t:'4:18', bpm:134, tag:''},
    {n:'07', artist:'T.AMP', title:'Offline (unreleased)',                   t:'6:14', bpm:132, tag:'own'},
    {n:'08', artist:'Tirzah', title:'Send Me',                               t:'3:28', bpm:118, tag:''},
    {n:'09', artist:'Loraine James', title:'Glitch The System',              t:'4:52', bpm:136, tag:''},
    {n:'10', artist:'Pa Salieu', title:'Frontline',                          t:'3:14', bpm:128, tag:''},
    {n:'11', artist:'TSVI', title:'Pillars',                                 t:'5:08', bpm:135, tag:''},
    {n:'12', artist:'Klein', title:'Changed',                                t:'3:42', bpm:122, tag:''},
    {n:'13', artist:'Mssingno', title:'XE2',                                 t:'4:30', bpm:138, tag:''},
    {n:'14', artist:'Yves Tumor', title:'Gospel For A New Century',          t:'3:54', bpm:130, tag:''},
    {n:'15', artist:'T.AMP', title:'Water Cassava',                          t:'5:48', bpm:134, tag:'own'},
    {n:'16', artist:'Burna Boy', title:'Last Last (booth dub)',              t:'4:08', bpm:128, tag:'edit'},
    {n:'17', artist:'Tems', title:'Higher',                                  t:'3:36', bpm:124, tag:''},
    {n:'18', artist:'Skee Mask', title:'Pordoi',                             t:'5:14', bpm:132, tag:''},
    {n:'19', artist:'Beatrice Dillon', title:'Workaround One',               t:'4:46', bpm:130, tag:''},
    {n:'20', artist:'Equiknoxx', title:'Enter A Raffle',                     t:'4:20', bpm:135, tag:''},
    {n:'21', artist:'Kelela', title:'Contact (closing)',                     t:'3:58', bpm:120, tag:'close'}
  ];

  // ---------- Crate ----------
  const crateEl = document.getElementById('dCrate');
  function renderCrate() {
    crateEl.innerHTML = MIXES.map(m => `
      <div class="dj-crate-item ${m.current ? 'is-on':''}" data-num="${m.num}">
        <span class="dj-crate-num">№ ${m.num}</span>
        <span class="dj-crate-title">${m.title}</span>
        <span class="dj-crate-len">${m.mins}m</span>
      </div>
    `).join('');
    crateEl.querySelectorAll('.dj-crate-item').forEach(el => {
      el.addEventListener('click', () => loadMix(el.dataset.num));
    });
  }
  renderCrate();

  // ---------- Tracklist ----------
  const tracksEl = document.getElementById('dTracks');
  function renderTracks() {
    tracksEl.innerHTML = TRACKS.map((t, i) => `
      <li class="dj-track ${i === 6 ? 'is-on':''}">
        <span class="dj-trk-no">${t.n}</span>
        <span class="dj-trk-time">${t.t}</span>
        <span><span class="dj-trk-artist">${t.artist}</span> &nbsp;<span class="dj-trk-title">${t.title}</span></span>
        <span class="dj-trk-bpm">${t.bpm}b</span>
        <span class="dj-trk-tag">${t.tag}</span>
      </li>
    `).join('');
  }
  renderTracks();

  // ---------- Load mix ----------
  let currentMix = MIXES.find(x => x.current) || MIXES[1];
  function loadMix(num) {
    const m = MIXES.find(x => x.num === num);
    if (!m) return;
    currentMix = m;
    document.querySelectorAll('.dj-crate-item').forEach(el => {
      el.classList.toggle('is-on', el.dataset.num === num);
    });
    document.getElementById('dNum').textContent = m.num;
    document.getElementById('dTitle').textContent = m.title;
    document.getElementById('dSub').textContent = `live · ${m.venue} · ${m.date} · ${m.mins} min`;
    document.getElementById('dBpm').textContent = m.bpm;
    document.getElementById('dRailNow').textContent = `●  now: mix ${m.num}`;
    document.getElementById('dDiscSpec').textContent = `${m.num} / ${m.title}`;
    document.getElementById('dTrkCount').textContent = `${m.tracks} tracks · cued from end`;
    progress = 0.24;
    updateProgress();
  }

  // ---------- Waveform (persistent canvas) ----------
  const wave = document.getElementById('dWave');
  let waveDPR = Math.min(window.devicePixelRatio || 1, 2);
  function drawWaveform() {
    if (!wave) return;
    const rect = wave.getBoundingClientRect();
    wave.width  = Math.floor(rect.width  * waveDPR);
    wave.height = Math.floor(rect.height * waveDPR);
    const ctx = wave.getContext('2d');
    ctx.clearRect(0, 0, wave.width, wave.height);
    const W = wave.width, H = wave.height;
    const N = 220;
    const barW = W / N;
    // Deterministic but musical: layered sines + seed jitter
    const seed = (document.getElementById('dNum').textContent || '014').split('').reduce((a,c)=>a + c.charCodeAt(0), 0);
    function rand(i) {
      const x = Math.sin(seed * 7.91 + i * 13.37) * 43758.5453;
      return x - Math.floor(x);
    }
    for (let i = 0; i < N; i++) {
      const x = i / N;
      const a = Math.sin(x * 9.6 + seed * 0.13) * 0.5 + 0.5;
      const b = Math.sin(x * 28 + seed * 1.7) * 0.5 + 0.5;
      const c = Math.sin(x * 52 + seed * 0.9) * 0.5 + 0.5;
      const v = Math.max(0.06, a * 0.5 + b * 0.3 + c * 0.2 + (rand(i) - 0.5) * 0.18);
      const h = v * H * 0.84;
      const y = (H - h) / 2;
      ctx.fillStyle = i < N * progress
        ? 'rgba(216,255,20,0.85)'
        : 'rgba(255,255,255,0.32)';
      ctx.fillRect(i * barW, y, barW * 0.7, h);
    }
  }

  // ---------- Progress ----------
  let progress = 0.24; // 0..1 of mix
  const progEl = document.getElementById('dProg');
  const elapsedEl = document.getElementById('dElapsed');
  const remainEl  = document.getElementById('dRemain');
  function updateProgress() {
    progEl.style.width = (progress * 100) + '%';
    const totalSec = currentMix.mins * 60;
    const elapsedSec = Math.floor(progress * totalSec);
    const remainSec  = totalSec - elapsedSec;
    elapsedEl.textContent = fmt(elapsedSec);
    remainEl.textContent  = '−' + fmt(remainSec);
    drawWaveform();
  }
  function fmt(s) {
    const m = Math.floor(s / 60), x = s % 60;
    return String(m).padStart(2,'0') + ':' + String(x).padStart(2,'0');
  }

  // Click on wave to scrub
  document.querySelector('.dj-wavewrap').addEventListener('click', (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    progress = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    updateProgress();
  });

  // ---------- Play / pause ----------
  let playing = true;
  const vinyl = document.getElementById('dVinyl');
  const playBtn = document.getElementById('dPlay');
  function setPlay(state) {
    playing = state;
    vinyl.classList.toggle('is-paused', !playing);
    if (playBtn) {
      playBtn.innerHTML = playing
        ? '<svg viewBox="0 0 24 24" width="16" height="16"><rect x="6" y="5" width="4" height="14" fill="currentColor"/><rect x="14" y="5" width="4" height="14" fill="currentColor"/></svg> pause'
        : '<svg viewBox="0 0 24 24" width="18" height="18"><polygon points="6 4 20 12 6 20" fill="currentColor"/></svg> play';
    }
  }
  if (playBtn) playBtn.addEventListener('click', () => setPlay(!playing));
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setPlay(false);
    if (e.code === 'Space') { e.preventDefault(); setPlay(!playing); }
  });
  setPlay(true);

  // Slow auto-advance
  setInterval(() => {
    if (!playing) return;
    progress += 0.0005;
    if (progress > 1) progress = 0;
    updateProgress();
  }, 1000);

  // ---------- Noise ----------
  const noise = document.getElementById('djNoise');
  function setupNoise() {
    if (!noise) return;
    function resize(){ noise.width = Math.floor(innerWidth*0.5); noise.height = Math.floor(innerHeight*0.5); }
    resize(); window.addEventListener('resize', () => { resize(); drawWaveform(); });
    const ctx = noise.getContext('2d');
    let last = 0;
    function frame(t){
      if (t - last > 70){
        const img = ctx.createImageData(noise.width, noise.height);
        const d = img.data;
        for (let i = 0; i < d.length; i+=4){
          const v = (Math.random()*80)|0;
          d[i]=d[i+1]=d[i+2]=v; d[i+3]=28;
        }
        ctx.putImageData(img, 0, 0);
        last = t;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  setupNoise();

  // Initial paint
  setTimeout(() => { drawWaveform(); updateProgress(); }, 100);
})();
