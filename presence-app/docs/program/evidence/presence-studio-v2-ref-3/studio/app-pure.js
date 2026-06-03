/* Presence Studio V2 — Pure JS (no Babel needed)
   All React components use createElement directly. */
const h = React.createElement;
const { useState, useRef, useCallback, useEffect, Fragment } = React;

/* ─── Lucide icon helper ─── */
function Lu(props) {
  const d = props.d, size = props.size || 14;
  return h('svg', { viewBox: '0 0 24 24', width: size, height: size,
    fill: 'none', stroke: 'currentColor', strokeWidth: 1.75,
    strokeLinecap: 'round', strokeLinejoin: 'round' },
    typeof d === 'string' ? h('path', { d: d }) : d
  );
}

/* ─── Floating toolbar ─── */
function FloatingTools(props) {
  var rect = props.rect, mode = props.mode, onAction = props.onAction;
  if (!rect) return null;
  var tools = [
    { id:'edit', icon: ICONS.edit, tip:'Edit' },
    { id:'move', icon: ICONS.move, tip:'Move' },
    { id:'copy', icon: ICONS.copy, tip:'Duplicate' },
    { id:'hide', icon: ICONS.eyeOff, tip:'Hide' },
  ];
  if (mode === 'wild') {
    tools.push({id:'s1'},{id:'resize',icon:ICONS.resize,tip:'Resize'},
      {id:'rotate',icon:ICONS.rotateCw,tip:'Rotate'},{id:'layer',icon:ICONS.layers,tip:'Layer'},
      {id:'pin',icon:ICONS.pin,tip:'Pin'},{id:'lock',icon:ICONS.lock,tip:'Lock'},
      {id:'group',icon:ICONS.group,tip:'Group'});
  }
  tools.push({id:'s2'},{id:'delete',icon:ICONS.trash,tip:'Delete',danger:true});
  return h('div', { className:'imm-float', style:{position:'fixed',
    left:rect.left+rect.width/2,top:rect.top-52,transform:'translateX(-50%)',zIndex:100} },
    tools.map(function(t,i){
      if(t.id.startsWith('s')) return h('div',{className:'imm-float-sep',key:i});
      return h('button',{className:'imm-float-btn'+(t.danger?' danger':''),key:t.id,
        title:t.tip,onClick:function(e){e.stopPropagation();onAction(t.id);}},
        h(Lu,{d:t.icon,size:14}));
    })
  );
}

/* ─── Wild handles ─── */
function WildHandles(props) {
  if (!props.visible) return null;
  var g = props.kitGlow;
  var s = {'--kit-glow': g};
  return h(Fragment, null,
    h('span',{className:'wild-handle tl',style:s}),
    h('span',{className:'wild-handle tr',style:s}),
    h('span',{className:'wild-handle bl',style:s}),
    h('span',{className:'wild-handle br',style:s}),
    h('span',{className:'wild-rotate',style:s}, h(Lu,{d:ICONS.rotateCw,size:11}))
  );
}

/* ─── Social Traces ─── */
function SocialTraces(props) {
  var kit = props.kit;
  if (!props.showTraces) return null;
  var t = kit.traces || {}, tc = kit.tokens.text, accent = kit.tokens.accent;
  var isDark = kit.tokens.bg.charAt(1)==='0';
  var ds = isDark ? '0 0 8px -1px '+accent : '0 0 6px -1px '+accent+'60';
  var borderC = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
  var bgC = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)';
  return h('div',{style:{marginTop:12,paddingBottom:8}},
    h('div',{className:'trace-strip',style:{color:tc}},
      h('span',{className:'t-item'},h(Lu,{d:ICONS.footprints,size:12}),h('span',null,(t.entries||0)+' entered')),
      h('span',{className:'t-item'},h(Lu,{d:ICONS.star,size:12}),h('span',null,(t.seeds||0)+' seeds')),
      h('span',{className:'t-item'},h(Lu,{d:ICONS.book,size:12}),h('span',null,(t.guestbook||0)+' signed'))
    ),
    (t.guestbook||0)>0 && h('div',{className:'trace-guestbook',style:{color:tc,margin:'8px 18px',padding:'16px 18px',
      background:bgC,borderRadius:10,border:'1px solid '+borderC}},
      h('p',{className:'gb-title',style:{marginBottom:12,display:'flex',alignItems:'center',gap:6}},
        h(Lu,{d:ICONS.book,size:10}),'Guestbook'),
      h('div',{className:'trace-gb-entry'},
        h('span',{className:'gb-dot',style:{background:accent,boxShadow:ds}}),
        h('span',{className:'gb-text'},'\u201CThis space moved me. Coming back.\u201D')),
      h('div',{className:'trace-gb-entry'},
        h('span',{className:'gb-dot',style:{background:accent,opacity:0.4,boxShadow:ds}}),
        h('span',{className:'gb-text'},'\u201CFound exactly what I needed.\u201D'))
    ),
    h('div',{className:'trace-portal',style:{color:tc,'--kit-glow':accent}},
      h('span',{className:'trace-portal-icon',style:{background:accent+'15',color:accent}},
        h(Lu,{d:ICONS.doorOpen,size:13})),
      h('span',null,
        h('span',{className:'trace-portal-text'},'Portal \u2192 '),
        h('span',{className:'trace-portal-name'},'The Listening Room'))
    ),
    h('div',{style:{margin:'8px 18px',padding:'10px 14px',display:'flex',alignItems:'center',gap:10,
      borderRadius:8,border:'1px solid '+borderC,background:isDark?'rgba(255,255,255,0.015)':'rgba(0,0,0,0.01)'}},
      h('span',{style:{width:8,height:8,borderRadius:'50%',background:accent,boxShadow:ds,
        animation:'dot-glow 2s ease-in-out infinite',flexShrink:0}}),
      h('span',{style:{fontFamily:'var(--p-f-mono)',fontSize:9,letterSpacing:'0.1em',
        textTransform:'uppercase',opacity:0.25}},'Event beacon \u00b7 active'))
  );
}

/* ─── Room Renderer ─── */
function RoomRenderer(props) {
  var kit=props.kit, selectedId=props.selectedId, onSelect=props.onSelect, mode=props.mode,
    skin=props.skinOverrides, showTraces=props.showTraces, ot=props.objectTransforms;
  var wc = 'room-world-'+kit.id;
  var tc = skin.texture && skin.texture!=='none' ? 'room-texture-'+skin.texture : '';
  var ss = {};
  if(skin.bg) ss.background=skin.bg;
  if(skin.displayFont) ss.fontFamily='"'+skin.displayFont+'", serif';

  return h('div',{className:'room-inner '+wc+' '+tc, style:ss},
    h('div',{className:'room-header'},
      h('div',{className:'rh-eyebrow'},kit.surface),
      h('div',{className:'rh-name',style:skin.headingWeight?{fontWeight:skin.headingWeight}:undefined},kit.persona.name),
      h('div',{className:'rh-tagline'},kit.persona.tagline)),
    kit.chambers.map(function(ch){
      return h('div',{className:'room-chamber',key:ch.id},
        h('div',{className:'room-chamber-label'},ch.label),
        h('div',{className:'room-objects'},
          ch.objects.map(function(obj){
            var sel = selectedId===obj.id;
            var tf = ot[obj.id];
            var os = {'--kit-glow':kit.tokens.glow};
            if(tf&&mode==='wild'){
              os.transform='translate('+(tf.x||0)+'px,'+(tf.y||0)+'px) rotate('+(tf.r||0)+'deg)';
              if(tf.s) os.transform+=' scale('+tf.s+')';
              os.zIndex=tf.z||'auto';
            }
            if(skin.objectRadius!==undefined) os.borderRadius=skin.objectRadius+'px';
            return h('div',{key:obj.id,className:'room-obj'+(sel?' selected':''),'data-role':obj.role,
              style:os,onClick:function(e){e.stopPropagation();onSelect(obj.id,e.currentTarget);}},
              obj.img && h('img',{className:'obj-image',src:obj.img,alt:obj.title,loading:'lazy',draggable:false}),
              h('div',{className:'obj-title'},obj.title),
              h('div',{className:'obj-meta'},obj.meta),
              obj.detail && h('div',{className:'obj-detail'},obj.detail),
              sel&&mode==='wild'&&h(WildHandles,{visible:true,kitGlow:kit.tokens.glow})
            );
          })
        )
      );
    }),
    h(SocialTraces,{kit:kit,showTraces:showTraces}),
    h('div',{className:'mobile-cta-dock',style:{
      background:'color-mix(in oklab, '+kit.tokens.bg+' 88%, transparent)',
      borderColor:kit.tokens.text+'08'}},
      h('button',{className:'dock-btn dock-primary',style:{
        background:skin.accent||kit.tokens.accent, color:kit.tokens.bg,
        borderRadius:(skin.objectRadius!==undefined?skin.objectRadius:kit.tokens.radius)+'px',
        boxShadow:'0 4px 16px -6px '+(skin.accent||kit.tokens.accent)+'50'}},kit.cta.text))
  );
}

/* ─── Skin Lab ─── */
function SkinControl(props) {
  var ctrl=props.ctrl, kit=props.kit, value=props.value, onChange=props.onChange;
  if(ctrl.type==='slider'){
    var min=ctrl.min||0,max=ctrl.max||100,step=ctrl.step||1;
    var val=value!==undefined?value:Math.round((min+max)/2);
    var pct=((val-min)/(max-min))*100;
    return h('div',{className:'skin-row'},
      h('span',{className:'skin-label'},ctrl.label),
      h('div',{className:'skin-track',onClick:function(e){
        var r=e.currentTarget.getBoundingClientRect();
        var raw=min+((e.clientX-r.left)/r.width)*(max-min);
        onChange(Math.round(raw/step)*step);}},
        h('div',{className:'skin-fill',style:{width:pct+'%',background:kit.tokens.accent,
          boxShadow:'0 0 10px -2px '+kit.tokens.accent}}),
        h('div',{className:'skin-thumb',style:{left:pct+'%'}})),
      h('span',{className:'skin-val'},val));
  }
  if(ctrl.type==='choice'){
    var sel=value||ctrl.options[0];
    return h('div',{className:'skin-row',style:{flexWrap:'wrap'}},
      h('span',{className:'skin-label'},ctrl.label),
      h('div',{className:'skin-choices'},
        ctrl.options.map(function(o){
          return h('button',{key:o,className:'skin-choice'+(sel===o?' active':''),
            onClick:function(){onChange(o);}},o);
        })));
  }
  if(ctrl.type==='swatch'){
    var swatches=ctrl.id==='accent'
      ?[kit.tokens.accent,'#8f6f3f','#ff6b9d','#a855f7','#567d55','#c4622a','#8f3a2f','#2f6df0']
      :[kit.tokens.bg,kit.tokens.surface,kit.tokens.text,'#0a0a0a','#f7f3ea','#e8efe2','#f2e6d4','#ffffff'];
    var s2=value||swatches[0];
    return h('div',{className:'skin-row'},
      h('span',{className:'skin-label'},ctrl.label),
      h('div',{className:'skin-swatches'},
        swatches.map(function(s,i){
          return h('button',{key:ctrl.id+'-'+i,className:'skin-swatch'+(s2===s?' active':''),
            style:{background:s},onClick:function(){onChange(s);}});
        })));
  }
  return null;
}

function SkinLabSheet(props) {
  var kit=props.kit, open=props.open, onClose=props.onClose, skin=props.skinOverrides, setSkin=props.setSkinOverride;
  var cats={ground:'Ground',atmosphere:'Atmosphere',type:'Typography',objects:'Object Shape',action:'Actions'};
  var grouped={};
  SKIN_CONTROLS.forEach(function(c){(grouped[c.cat]=grouped[c.cat]||[]).push(c);});
  return h('div',{className:'imm-sheet'+(open?' open':''),style:{'--kit-glow':kit.tokens.glow}},
    h('div',{className:'imm-sheet-handle'}),
    h('div',{className:'imm-sheet-head'},
      h('span',{className:'imm-sheet-title'},'Room Skin Lab'),
      h('button',{className:'imm-sheet-close',onClick:onClose},h(Lu,{d:ICONS.x,size:14}))),
    h('div',{style:{marginBottom:24,padding:'18px',position:'relative',overflow:'hidden',
      background:'rgba(239,233,218,0.02)',borderRadius:12,border:'1px solid rgba(239,233,218,0.03)'}},
      h('div',{style:{position:'absolute',inset:0,pointerEvents:'none',
        background:'radial-gradient(ellipse 80% 60% at 20% 30%, '+kit.tokens.accent+'08, transparent 60%)'}}),
      h('p',{style:{fontFamily:'"Instrument Serif", serif',fontSize:20,color:'rgba(239,233,218,0.7)',
        lineHeight:1.25,marginBottom:5,position:'relative'}},
        'Mix the ',h('em',{style:{color:kit.tokens.accent}},'atmosphere'),'.'),
      h('p',{style:{fontSize:11,color:'rgba(239,233,218,0.22)',lineHeight:1.6,position:'relative'}},
        'Shape the room\u2019s weather, material, and mood. Every change is live.')),
    h('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 28px'}},
      Object.entries(grouped).map(function(entry){
        var cat=entry[0],ctrls=entry[1];
        return h('div',{className:'skin-section',key:cat},
          h('p',{className:'skin-section-label'},cats[cat]||cat),
          ctrls.map(function(ctrl){
            return h(SkinControl,{key:ctrl.id,ctrl:ctrl,kit:kit,value:skin[ctrl.id],
              onChange:function(v){setSkin(ctrl.id,v);}});
          }));
      }))
  );
}

/* ─── World Switcher ─── */
function WorldSwitcher(props) {
  var kits=props.kits,activeIdx=props.activeIdx,onSelect=props.onSelect,open=props.open,onClose=props.onClose;
  if(!open) return null;
  return h('div',{className:'imm-worlds-overlay'+(open?' open':''),onClick:onClose},
    h('div',{onClick:function(e){e.stopPropagation();},style:{maxWidth:900,width:'95%'}},
      h('div',{style:{textAlign:'center',marginBottom:28,padding:'0 32px'}},
        h('p',{style:{fontFamily:'"Instrument Serif", serif',fontSize:26,color:'var(--p-on-stage)',
          lineHeight:1.15,marginBottom:6,letterSpacing:'-0.02em'}},
          'Choose a room ',h('em',{style:{color:'var(--p-copper)'}},'world')),
        h('p',{style:{fontSize:12,color:'var(--p-on-stage-dim)',lineHeight:1.5,maxWidth:360,margin:'0 auto'}},
          'Each world changes how space behaves \u2014 surfaces, density, movement, feeling.')),
      h('div',{className:'imm-worlds-grid'},
        kits.map(function(kit,i){
          return h('div',{key:kit.id,className:'imm-world-card'+(i===activeIdx?' active':''),
            style:{background:'linear-gradient(180deg, color-mix(in oklab, '+kit.tokens.bg+' 10%, rgba(14,13,11,0.92)), color-mix(in oklab, '+kit.tokens.bg+' 5%, rgba(10,9,7,0.96)))',
              '--kit-glow':kit.tokens.glow},
            onClick:function(){onSelect(i);onClose();}},
            h('div',{className:'wc-name'},kit.name),
            h('div',{className:'wc-surface'},kit.surface),
            h('div',{className:'wc-feel'},kit.verb),
            h('div',{className:'wc-swatch',style:{
              background:'linear-gradient(90deg, '+kit.tokens.bg+', '+kit.tokens.accent+', '+kit.tokens.glow+')',
              boxShadow:'0 0 16px -4px '+kit.tokens.glow+'40'}}));
        }))
    )
  );
}

/* ─── Moodboard ─── */
function MoodboardSheet(props) {
  var kit=props.kit, open=props.open, onClose=props.onClose;
  var refs=[
    {type:'image',label:'Workshop light, late afternoon',dot:'#c9a84c'},
    {type:'room',label:'The Listening Room \u00b7 Byron',dot:kit.tokens.accent},
    {type:'song',label:'Nils Frahm \u2014 Says',dot:'#6366f1'},
    {type:'quote',label:'\u201CI paint what remains after memory has finished.\u201D',dot:'#8f6f3f'},
    {type:'material',label:'Linen, raw cotton, pigment',dot:'#a0856c'},
    {type:'place',label:'Bangalow, Northern Rivers NSW',dot:'#567d55'},
  ];
  return h('div',{className:'imm-sheet'+(open?' open':''),style:{'--kit-glow':kit.tokens.glow}},
    h('div',{className:'imm-sheet-handle'}),
    h('div',{className:'imm-sheet-head'},
      h('span',{className:'imm-sheet-title'},'Moodboard \u00b7 Influences'),
      h('button',{className:'imm-sheet-close',onClick:onClose},h(Lu,{d:ICONS.x,size:14}))),
    h('div',{style:{marginBottom:20,padding:'18px',position:'relative',overflow:'hidden',
      background:'rgba(239,233,218,0.02)',borderRadius:12,border:'1px solid rgba(239,233,218,0.03)'}},
      h('p',{style:{fontFamily:'"Instrument Serif", serif',fontSize:20,color:'rgba(239,233,218,0.7)',
        lineHeight:1.25,marginBottom:5}},
        'What ',h('em',{style:{color:kit.tokens.accent}},'shaped'),' this room?'),
      h('p',{style:{fontSize:11,color:'rgba(239,233,218,0.22)',lineHeight:1.6}},
        'Add references \u2014 images, songs, places, quotes, other Rooms.')),
    h('p',{className:'skin-section-label'},'Add Reference'),
    h('div',{className:'mood-grid'},
      MOODBOARD_TYPES.map(function(m){
        return h('div',{className:'mood-item',key:m.id},
          h(Lu,{d:ICONS[m.icon]||ICONS.star,size:18}),
          h('p',{className:'mood-item-label'},m.label));
      })),
    h('p',{className:'skin-section-label',style:{marginTop:8}},'Current References'),
    h('div',{className:'mood-refs'},
      refs.map(function(r,i){
        return h('div',{className:'mood-ref',key:i},
          h('span',{className:'mood-ref-dot',style:{background:r.dot,boxShadow:'0 0 12px -3px '+r.dot+'60'}}),
          h('div',null,
            h('p',{className:'mood-ref-text'},r.label),
            h('p',{className:'mood-ref-type'},r.type)));
      }))
  );
}

/* ─── Top Bar ─── */
function TopBar(props) {
  var kit=props.kit,status=props.status,panel=props.panel,setPanel=props.setPanel;
  return h('nav',{className:'imm-topbar'},
    h('div',{className:'imm-brand'},
      h('span',{className:'imm-brand-glyph'},'P'),
      h('span',{className:'imm-brand-name'},'Studio')),
    h('div',{className:'imm-sep'}),
    h('span',{className:'imm-status '+status},
      h('span',{className:'dot'}),
      status==='draft'?'Private draft':'Live'),
    h('div',{className:'imm-sep'}),
    h('span',{className:'imm-room-name'},kit.persona.name),
    h('div',{className:'imm-topbar-right'},
      h('button',{className:'imm-btn'+(panel==='mood'?' active':''),
        onClick:function(){setPanel(panel==='mood'?null:'mood');}},
        h(Lu,{d:ICONS.image,size:13}),h('span',null,'Moodboard')),
      h('div',{className:'imm-sep'}),
      h('button',{className:'imm-btn',style:{opacity:0.5}},
        h(Lu,{d:ICONS.eye,size:13}),h('span',null,'Preview')),
      h('button',{className:'imm-btn-publish'},'Publish'))
  );
}

/* ─── Command Dock ─── */
function CommandDock(props) {
  var mode=props.mode,setMode=props.setMode,vp=props.viewport,setVp=props.setViewport,
    panel=props.panel,setPanel=props.setPanel,kit=props.kit;
  return h('div',{className:'imm-dock',style:{'--kit-glow':kit.tokens.glow}},
    h('div',{className:'imm-mode'},
      h('button',{className:'imm-mode-btn'+(mode==='guided'?' active':''),onClick:function(){setMode('guided');}},'Guided'),
      h('button',{className:'imm-mode-btn wild'+(mode==='wild'?' active':''),onClick:function(){setMode('wild');}},'Wild')),
    h('div',{className:'imm-dock-sep'}),
    h('div',{className:'imm-vp'},
      h('button',{className:'imm-vp-btn'+(vp==='immersive'?' active':''),title:'Immersive',
        onClick:function(){setVp('immersive');}},h(Lu,{d:ICONS.maximize,size:14})),
      h('button',{className:'imm-vp-btn'+(vp==='mobile'?' active':''),title:'Mobile',
        onClick:function(){setVp('mobile');}},h(Lu,{d:ICONS.phone,size:14})),
      h('button',{className:'imm-vp-btn'+(vp==='desktop'?' active':''),title:'Desktop',
        onClick:function(){setVp('desktop');}},h(Lu,{d:ICONS.monitor,size:14}))),
    h('div',{className:'imm-dock-sep'}),
    h('button',{className:'imm-dock-btn'+(panel==='skin'?' active':''),
      onClick:function(){setPanel(panel==='skin'?null:'skin');}},
      h(Lu,{d:ICONS.sliders,size:14}),'Skin Lab'),
    h('button',{className:'imm-dock-btn'+(panel==='worlds'?' active':''),
      onClick:function(){setPanel(panel==='worlds'?null:'worlds');}},
      h(Lu,{d:ICONS.globe,size:14}),'Worlds'),
    h('button',{className:'imm-dock-btn',onClick:function(){}},
      h(Lu,{d:ICONS.plus,size:14}),'Add')
  );
}

/* ─── Mode Badge ─── */
function ModeBadge(props) {
  if(props.mode==='guided')
    return h('div',{className:'imm-mode-badge',style:{color:'var(--p-moss)'}},
      h(Lu,{d:ICONS.shield,size:12}),'Guided \u00b7 layout and mobile view kept safe');
  return h('div',{className:'imm-mode-badge',style:{color:props.kit.tokens.accent}},
    h(Lu,{d:ICONS.wand,size:12}),'Wild Mode \u00b7 freeform canvas');
}

/* ─── Mobile Recovery ─── */
function MobileRecovery(props) {
  if(!props.visible) return null;
  return h('div',{style:{position:'fixed',inset:0,zIndex:100,display:'flex',alignItems:'center',
    justifyContent:'center',background:'rgba(0,0,0,0.7)',backdropFilter:'blur(8px)'},onClick:props.onClose},
    h('div',{onClick:function(e){e.stopPropagation();},style:{background:'#0e0d0b',borderRadius:14,
      padding:28,maxWidth:400,width:'90%',border:'1px solid rgba(239,233,218,0.06)',
      boxShadow:'0 40px 80px -20px rgba(0,0,0,0.6)'}},
      h('p',{style:{fontFamily:'var(--p-f-mono)',fontSize:9,letterSpacing:'0.18em',
        textTransform:'uppercase',color:'rgba(239,233,218,0.25)',marginBottom:12}},'Safe Mobile Recovery'),
      h('p',{style:{fontFamily:'"Instrument Serif", serif',fontSize:22,color:'#efe9da',
        lineHeight:1.25,marginBottom:8}},'Your wild layout will be simplified for mobile.'),
      h('p',{style:{fontSize:13,color:'rgba(239,233,218,0.4)',lineHeight:1.55,marginBottom:20}},
        'Objects stack vertically. Rotations and overlaps removed. CTA dock stays reachable.'),
      h('div',{style:{display:'flex',gap:8}},
        h('button',{onClick:props.onClose,style:{flex:1,padding:'11px 16px',border:'none',borderRadius:6,
          background:'rgba(239,233,218,0.06)',color:'#efe9da',fontSize:13,fontWeight:500,
          cursor:'pointer',fontFamily:'"Inter", sans-serif'}},'Keep wild layout'),
        h('button',{onClick:props.onClose,style:{flex:1,padding:'11px 16px',border:'none',borderRadius:6,
          background:'#efe9da',color:'#0e0d0b',fontSize:13,fontWeight:600,
          cursor:'pointer',fontFamily:'"Inter", sans-serif'}},'Apply safe recovery')))
  );
}

/* ─── Wild drag hook ─── */
function useWildDrag(mode, ot, setOt) {
  var dragging = useRef(null);
  var onDragStart = useCallback(function(objId, e) {
    if(mode!=='wild') return;
    e.preventDefault(); e.stopPropagation();
    var sx=e.clientX||(e.touches&&e.touches[0].clientX);
    var sy=e.clientY||(e.touches&&e.touches[0].clientY);
    var tf=ot[objId]||{x:0,y:0,r:0,s:1,z:10};
    dragging.current={objId:objId,sx:sx,sy:sy,ox:tf.x||0,oy:tf.y||0};
    function onMove(ev){
      if(!dragging.current) return;
      var cx=ev.clientX||(ev.touches&&ev.touches[0].clientX);
      var cy=ev.clientY||(ev.touches&&ev.touches[0].clientY);
      setOt(function(prev){
        var o=Object.assign({},prev);
        o[dragging.current.objId]=Object.assign({},o[dragging.current.objId]||{},
          {x:dragging.current.ox+(cx-dragging.current.sx),y:dragging.current.oy+(cy-dragging.current.sy),z:20});
        return o;
      });
    }
    function onUp(){
      dragging.current=null;
      window.removeEventListener('mousemove',onMove);
      window.removeEventListener('mouseup',onUp);
      window.removeEventListener('touchmove',onMove);
      window.removeEventListener('touchend',onUp);
    }
    window.addEventListener('mousemove',onMove);
    window.addEventListener('mouseup',onUp);
    window.addEventListener('touchmove',onMove,{passive:false});
    window.addEventListener('touchend',onUp);
  },[mode,ot,setOt]);
  return onDragStart;
}

/* ═══ MAIN APP ═══ */
function StudioApp() {
  var kits=window.STUDIO_KITS;
  var s=useState, kitState=s(0),kitIdx=kitState[0],setKitIdx=kitState[1];
  var modeState=s('guided'),mode=modeState[0],setMode=modeState[1];
  var vpState=s('immersive'),vp=vpState[0],setVp=vpState[1];
  var panelState=s(null),panel=panelState[0],setPanel=panelState[1];
  var selState=s(null),selectedId=selState[0],setSelectedId=selState[1];
  var rectState=s(null),selectedRect=rectState[0],setSelectedRect=rectState[1];
  var statusState=s('draft'),status=statusState[0];
  var recState=s(false),showRec=recState[0],setShowRec=recState[1];
  var skinState=s({}),skinOv=skinState[0],setSkinOv=skinState[1];
  var otState=s({}),ot=otState[0],setOt=otState[1];
  var trState=s(true),showTraces=trState[0],setShowTraces=trState[1];
  var stageRef=useRef(null);
  var kit=kits[kitIdx];

  /* Tweaks */
  var tweakResult=useTweaks({showTraces:true,skinTexture:'none'});
  var tweaks=tweakResult[0],setTweak=tweakResult[1];
  useEffect(function(){setShowTraces(tweaks.showTraces);},[tweaks.showTraces]);
  useEffect(function(){
    if(tweaks.skinTexture&&tweaks.skinTexture!=='none')
      setSkinOv(function(p){return Object.assign({},p,{texture:tweaks.skinTexture});});
  },[tweaks.skinTexture]);

  useEffect(function(){setSelectedId(null);setSelectedRect(null);setSkinOv({});setOt({});},[kitIdx]);
  useEffect(function(){if(mode==='wild'&&vp==='mobile')setShowRec(true);},[mode,vp]);
  useEffect(function(){setSelectedId(null);setSelectedRect(null);},[mode]);

  var handleSelect=useCallback(function(id,el){
    if(selectedId===id){setSelectedId(null);setSelectedRect(null);return;}
    setSelectedId(id); if(el)setSelectedRect(el.getBoundingClientRect());
  },[selectedId]);
  var handleDeselect=useCallback(function(){setSelectedId(null);setSelectedRect(null);},[]);
  var handleFloat=useCallback(function(a){
    if(a==='delete'){setSelectedId(null);setSelectedRect(null);}
  },[]);
  var setSkinOverride=useCallback(function(k,v){
    setSkinOv(function(p){var o=Object.assign({},p);o[k]=v;return o;});
  },[]);
  var onDrag=useWildDrag(mode,ot,setOt);

  var roomProps={kit:kit,selectedId:selectedId,onSelect:handleSelect,mode:mode,
    skinOverrides:skinOv,showTraces:showTraces,objectTransforms:ot};
  var auroraC=[kit.tokens.glow,kit.tokens.accent,kit.tokens.glow];

  function makeStage(ref,inner){
    return h('div',Object.assign({className:'imm-stage',ref:ref,
      style:{'--kit-glow':kit.tokens.glow},onClick:handleDeselect,
      onMouseDown:function(e){
        if(mode==='wild'&&selectedId&&e.target.closest('.room-obj.selected'))onDrag(selectedId,e);
      }},inner?{}:{}), h('div',{className:'room-scroll'},
        h('div',{style:{paddingTop:44,paddingBottom:80}},h(RoomRenderer,roomProps))));
  }

  return h(Fragment,null,
    h('div',{className:'imm-aurora',style:{opacity:vp==='immersive'?0.08:0.18}},
      auroraC.map(function(c,i){return h('div',{className:'blob',key:i,style:{background:c}});})),
    vp==='immersive'&&makeStage(stageRef),
    vp==='mobile'&&h('div',{className:'imm-phone-wrap',onClick:handleDeselect},
      h('div',{className:'imm-phone',style:{'--kit-glow':kit.tokens.glow},onClick:function(e){e.stopPropagation();},
        onMouseDown:function(e){if(mode==='wild'&&selectedId&&e.target.closest('.room-obj.selected'))onDrag(selectedId,e);}},
        h('div',{className:'room-scroll',style:{paddingTop:28}},h(RoomRenderer,roomProps)))),
    vp==='desktop'&&h('div',{className:'imm-desktop-wrap',onClick:handleDeselect},
      h('div',{className:'imm-desktop',style:{'--kit-glow':kit.tokens.glow},onClick:function(e){e.stopPropagation();},
        onMouseDown:function(e){if(mode==='wild'&&selectedId&&e.target.closest('.room-obj.selected'))onDrag(selectedId,e);}},
        h('div',{className:'room-scroll'},h(RoomRenderer,roomProps)))),
    selectedId&&selectedRect&&h(FloatingTools,{rect:selectedRect,mode:mode,onAction:handleFloat}),
    h(ModeBadge,{mode:mode,kit:kit}),
    h(TopBar,{kit:kit,status:status,panel:panel,setPanel:setPanel}),
    h(CommandDock,{mode:mode,setMode:setMode,viewport:vp,setViewport:setVp,panel:panel,setPanel:setPanel,kit:kit}),
    h(SkinLabSheet,{kit:kit,open:panel==='skin',onClose:function(){setPanel(null);},
      skinOverrides:skinOv,setSkinOverride:setSkinOverride}),
    h(MoodboardSheet,{kit:kit,open:panel==='mood',onClose:function(){setPanel(null);}}),
    h(WorldSwitcher,{kits:kits,activeIdx:kitIdx,onSelect:setKitIdx,
      open:panel==='worlds',onClose:function(){setPanel(null);}}),
    h(MobileRecovery,{kit:kit,visible:showRec,onClose:function(){setShowRec(false);}}),
    h(TweaksPanel,null,
      h(TweakSection,{label:'Social'}),
      h(TweakToggle,{label:'Social traces',value:tweaks.showTraces,
        onChange:function(v){setTweak('showTraces',v);}}),
      h(TweakSection,{label:'Skin Lab'}),
      h(TweakRadio,{label:'Texture',value:tweaks.skinTexture,
        options:['none','grain','paper','concrete','cloth'],
        onChange:function(v){setTweak('skinTexture',v);}}))
  );
}

/* Mount — wait for Babel to finish transpiling tweaks-panel.jsx */
function tryMount() {
  if (typeof useTweaks === 'undefined' || typeof TweaksPanel === 'undefined') {
    setTimeout(tryMount, 50);
    return;
  }
  var root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(h(StudioApp));
}
tryMount();
