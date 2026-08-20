/* ---- are.na ---- */
/* spade violence · club labour · heart desire · diam money */
const SUITS = { spade:{g:"\u2660"}, club:{g:"\u2663"}, heart:{g:"\u2665"}, diam:{g:"\u2666"}, joker:{g:"\u2605"} };


const SLOTS = [
  [.1200,.250],[.3733,.250],[.6267,.250],[.8800,.250],
  [.2467,.500],[.5000,.500],[.7533,.500],
  [.1200,.750],[.3733,.750],[.6267,.750],[.8800,.750],
];
const W0 = 98, H0 = 136;
const SPREAD = 1240;                 // max spread
function band(){
  const W = innerWidth, w = Math.min(W, SPREAD);
  return { x0: (W - w)/2, w: w };
}

const tile = document.getElementById('tile');
const spiral = document.getElementById('spiral');



/* helix, seen from the side */
(function(){
  const turns = 22, rx = 160, ry = 46, pitch = 58, steps = 36, pad = 2;
  const cx = rx + pad;
  const W = rx*2 + pad*2;
  const H = pitch*turns + ry*2 + pad*2;
  let d = '';
  const total = turns * steps;
  for(let i = 0; i <= total; i++){
    const t = i / steps * Math.PI * 2;
    const x = cx + rx * Math.sin(t);
    const y = pad + ry + (pitch * t) / (Math.PI*2) - ry * Math.cos(t);
    d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
  }
  spiral.innerHTML =
    '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet">' +
      '<path d="' + d.trim() + '"/></svg>';
})();

const ascii = document.getElementById('ascii');
const annex = document.getElementById('annex');
const wire = document.getElementById('wirePath');
const wireSvg = document.getElementById('wire');
const topLine = document.getElementById('top');
const EDITS = [
  ['eRate','sRate', function(d){ return d.rate; }],
  ['eFeel','sFeel', function(d){ return d.feel; }]
].map(function(e){
  return { wrap: document.getElementById(e[0]),
           slot: document.getElementById(e[1]),
           read: e[2] };
});

/* narrow: cycle the last word */
const NARROW = window.matchMedia
  ? window.matchMedia('(max-width:820px)')
  : { matches:false, addEventListener:function(){}, addListener:function(){} };
const CYCLE  = ['good'].concat(P.filter(function(c){ return c.feel; })
                                .map(function(c){ return c.feel; }));
let cycleTimer = null, cycleAt = 0;
function runCycle(on){
  clearInterval(cycleTimer); cycleTimer = null;
  if(!on){ sFeel.textContent = 'good'; return; }
  cycleAt = 0;
  cycleTimer = setInterval(function(){
    cycleAt = (cycleAt + 1) % CYCLE.length;
    sFeel.textContent = CYCLE[cycleAt];
  }, 1500);
}
runCycle(NARROW.matches);
const onNarrow = function(e){ runCycle(e.matches); };
if(NARROW.addEventListener) NARROW.addEventListener('change', onNarrow);
else if(NARROW.addListener) NARROW.addListener(onNarrow);   // older safari

/* only the marks change */
let saidRate = '';
function sayRate(d){
  if(NARROW.matches) return;            // narrow runs its own
  const on = !!(d && d.rate);
  const said = on ? d.rate : '';
  if(said === saidRate) return;
  saidRate = said;
  EDITS.forEach(function(e){
    if(on) e.slot.textContent = e.read(d);
    e.wrap.classList.toggle('filled', on);
  });
}

const botLine = document.getElementById('bottom');
let asciiTimer = null;
let frozen = false;   // edit mode holds it open
let frameTimers = [];

function startFrames(){
  stopFrames();
  // one timer per node
  [].slice.call(annex.querySelectorAll('.media.frames:not(.off)')).forEach(function(wrap){
    const imgs = [].slice.call(wrap.querySelectorAll('img'));
    if(imgs.length < 2) return;
    let i = 0;
    frameTimers.push(setInterval(function(){
      imgs[i].classList.add('off');
      i = (i + 1) % imgs.length;
      imgs[i].classList.remove('off');
    }, +wrap.dataset.every || 2200));
  });
}
function stopFrames(){
  frameTimers.forEach(clearInterval); frameTimers = [];
  [].slice.call(annex.querySelectorAll('.media.frames')).forEach(function(w){
    [].slice.call(w.querySelectorAll('img')).forEach(function(f,k){ f.classList.toggle('off', k > 0); });
  });
}

function sizeWire(){ wireSvg.setAttribute('viewBox','0 0 '+innerWidth+' '+innerHeight); }
sizeWire();

/* ray exit point */
function exit(r, tx, ty, pad){
  const cx = r.left + r.width/2, cy = r.top + r.height/2;
  let dx = tx - cx, dy = ty - cy;
  const len = Math.hypot(dx,dy) || 1; dx/=len; dy/=len;
  const t = Math.min(Math.abs(dx) < 1e-4 ? 1e9 : (r.width/2)/Math.abs(dx),
                     Math.abs(dy) < 1e-4 ? 1e9 : (r.height/2)/Math.abs(dy));
  return [cx + dx*(t+pad), cy + dy*(t+pad)];
}

function leg(from, to, padA, padB){
  const fc = [from.left+from.width/2, from.top+from.height/2];
  const tc = [to.left+to.width/2,     to.top+to.height/2];
  const s = exit(from, tc[0], tc[1], padA);
  const e = exit(to,   fc[0], fc[1], padB);
  return 'M'+s[0].toFixed(1)+' '+s[1].toFixed(1)+'L'+e[0].toFixed(1)+' '+e[1].toFixed(1);
}

function drawWires(el, item){
  const R = { card: el.querySelector('.face').getBoundingClientRect() };
  [].slice.call(annex.querySelectorAll('.media:not(.off)')).forEach(function(m,i){
    R['m'+i] = m.getBoundingClientRect();
    if(i === 0) R.img = R.m0;
  });
  [].slice.call(annex.querySelectorAll('.box:not(.off)')).forEach(function(b,i){ R['n'+i] = b.getBoundingClientRect(); });

  const shots = item.liveShots || [];
  const notes = item.liveNotes || [];
  const edges = [];

  if(item.nowires){ wire.setAttribute('d',''); return; }

  if(item.pole !== 'neither')
    edges.push(['card', item.pole === 'good' ? topLine : botLine, 11]);
  shots.forEach(function(m,i){ if(R['m'+i]) edges.push([m.from || 'card', 'm'+i, 5]); });
  notes.forEach(function(n,i){ if(R['n'+i]) edges.push([n.from || 'card', 'n'+i, 5]); });

  let d = '';
  edges.forEach(function(e){
    const a = R[e[0]];
    const b = typeof e[1] === 'string' ? R[e[1]] : e[1].getBoundingClientRect();
    if(a && b) d += leg(a, b, 7, e[2]);
  });
  wire.setAttribute('d', d);
}


/* built once, then shown or hidden */
function buildNodes(d){
  d.shotSpec = (d.tile || d.ascii || d.spiral) ? (d.media || [])
             : d.media || (d.src ? [{ src:d.src, big:d.big, from:d.imgFrom }] : [{ src:ORCHID }]);
  d.noteSpec = (d.s ? [{ text:d.s, kind:d.sKind || '', at:d.sAt, from:d.sFrom }] : [])
                 .concat(d.extra || []);
  d.els = [];

  d.shotSpec.forEach(function(m){
    if(m.frames){
      const wrap = document.createElement('div');
      wrap.className = 'media frames off';
      m.frames.forEach(function(src, k){
        const f = document.createElement('img');
        f.alt = ''; f.decoding = 'async'; f.src = src;
        if(k) f.className = 'off';
        wrap.appendChild(f);
      });
      if(m.crop){ wrap.dataset.crop = '1'; wrap.style.setProperty('--crop', m.crop); }
      if(m.at) wrap.dataset.at = m.at.join(',');
      wrap.dataset.every = m.every || 2200;
      if(m.caption){
        wrap.classList.add('shot');
        const cap = document.createElement('div');
        cap.className = 'k';
        cap.textContent = m.caption;
        wrap.appendChild(cap);
      }
      annex.appendChild(wrap); d.els.push(wrap);
      return;
    }
    if(m.caption){
      const fig = document.createElement('div');
      fig.className = 'media shot off';
      if(m.at) fig.dataset.at = m.at.join(',');
      const pic = document.createElement('img');
      pic.alt = ''; pic.decoding = 'async';
      pic.onerror = function(){ pic.onerror = null; pic.src = ORCHID; };
      pic.src = m.src || ORCHID;
      const cap = document.createElement('div');
      cap.className = 'k';
      cap.textContent = m.caption;
      fig.appendChild(pic); fig.appendChild(cap);
      if(m.big > 1) fig.dataset.big = '1';
      annex.appendChild(fig); d.els.push(fig);
      return;
    }
    const im = document.createElement('img');
    im.className = 'media off';
    im.alt = ''; im.decoding = 'async';
    im.onerror = function(){ im.onerror = null; im.src = ORCHID; };
    im.src = m.src || ORCHID;
    if(m.at) im.dataset.at = m.at.join(',');
    if(m.at !== undefined){ im.dataset.at = m.at; im.classList.add('over'); }
    if(m.nudge) im.dataset.nudge = m.nudge.join(',');
    if(m.z) im.dataset.z = m.z;
    annex.appendChild(im); d.els.push(im);
  });
  d.noteSpec.forEach(function(n){
    const b = document.createElement('div');
    b.className = 'box off ' + (n.kind || '');
    if(n.at) b.dataset.at = n.at.join(',');
    b.innerHTML = n.text;
    annex.appendChild(b); d.els.push(b);
  });
}
P.forEach(buildNodes);

const plates = P.map(function(d){
  const s = SUITS[d.suit];
  const el = document.createElement('div');
  el.className = 'plate' + (d.suit === 'joker' ? ' always' : '') + (d.smallGlyph ? ' smallpip' : '');
  // gif on hover only
  const mark = d.glyph ? '<img alt="" class="anim" src="' + d.glyph + '">' : '';
  el.innerHTML =
    '<div class="face">' +
      '<span class="corner">' + s.g + '</span>' +
      '<span class="pip"><span class="rest">' + s.g + '</span>' + mark + '</span>' +
      '<span class="corner br">' + s.g + '</span>' +
    '</div>' +
    '<div class="cap">' + d.t + '</div>';

  function open(){
    plates.forEach(function(p){ p.classList.remove('on'); });
    el.classList.add('on');

    const r = el.getBoundingClientRect();
    el.classList.toggle('up', r.top > innerHeight * .55);   // title above, near the floor

    clearInterval(asciiTimer);
    ascii.className = '';
    tile.className = '';
    spiral.className = '';   // clean ground
    if(d.ascii){
      tile.className = '';
      ascii.className = 'on';
      const blank = d.ascii[0].replace(/./g, ' ');
      ascii.innerHTML = '<b></b>';
      const face = ascii.firstChild;
      let n = 0;
      const paint = function(){
        const rows = d.ascii.map(function(row,i){ return i < n ? row : blank; });
        face.textContent = rows.join('\n');
        if(++n > d.ascii.length) n = 0;          // round again
      };
      paint();
      asciiTimer = setInterval(paint, 42);
    }else if(d.spiral){
      tile.className = ''; spiral.className = 'on';
    }else if(d.tile){
      tile.style.backgroundImage  = 'url(' + (d.src || ORCHID) + ')';
      tile.style.backgroundSize   = d.tile === 'cover' ? 'cover' : d.tile + 'px auto';
      tile.style.backgroundRepeat = d.tile === 'cover' ? 'no-repeat' : 'repeat';
      tile.className = 'on';
    }else{
      tile.className = '';
    }

    let shots = d.shotSpec, notes = d.noteSpec;
    d.els.forEach(function(e){ e.classList.remove('off'); });


    d.liveShots = shots; d.liveNotes = notes;


    // hand-placed: [x%, y%, width%]
    let auto = 0;
    [].slice.call(annex.children).forEach(function(n){
      if(n.classList.contains('off')) return;
      const a = n.dataset.at ? n.dataset.at.split(',').map(Number)
                             : [4 + (auto%3)*32, 6 + Math.floor(auto/3)*46, 26];
      if(!n.dataset.at) auto++;
      n.style.left  = a[0] + '%';
      n.style.top   = a[1] + '%';
      n.style.width = (a[2] || 26) + '%';
    });



    document.body.classList.add('focus');
    sayRate(d);
    document.body.classList.toggle('focus-good',  d.pole === 'good');
    document.body.classList.toggle('focus-study', d.pole === 'study');
    document.body.classList.toggle('focus-none',  d.pole === 'neither');
    document.body.classList.toggle('focus-dark',  !!d.dark);

    startFrames();
    drawWires(el, d);
  }

  function shut(){
    el.classList.remove('on');
    clearInterval(asciiTimer);
    stopFrames();
    tile.className = ''; ascii.className = ''; spiral.className = '';
    d.els.forEach(function(e){
      e.classList.add('off');
      e.style.zIndex = e.style.transform = '';
    });
    sayRate(null);
    document.body.classList.remove('focus','focus-good','focus-study','focus-none','focus-dark');
  }

  if(d.link){
    el.classList.add('linked');
    el.addEventListener('click', function(e){
      if(e.pointerType === 'touch' && !el.classList.contains('on')) return;  // first tap opens
      window.open(d.link, '_blank', 'noopener');
    });
  }
  el.addEventListener('pointerenter', function(e){ if(!frozen && e.pointerType !== 'touch') open(); });
  el.addEventListener('pointerleave', function(e){ if(!frozen && e.pointerType !== 'touch') shut(); });
  el.addEventListener('pointerdown', function(e){
    if(e.pointerType !== 'touch') return;
    el.classList.contains('on') ? shut() : open();
  });
  el.shut = shut;

  document.body.appendChild(el);
  return el;
});

/* ---- dealing ---- */
let order = plates.map(function(_,i){ return i; });
function lay(){
  const H = innerHeight, B = band();
  order.forEach(function(slot,i){
    plates[i].style.transitionDelay = ((plates.length-1-i) * 8) + 'ms';
    const fx = SLOTS[slot][0], fy = SLOTS[slot][1];
    plates[i].style.zIndex = 10;
    plates[i].style.transform =
      'translate(' + Math.round(B.x0 + fx*B.w - W0/2) + 'px,' + Math.round(fy*H - H0/2) + 'px) rotate(0deg)';
  });
}
/* one scroll = one action */
let riffling = false, busy = false;
const veil = document.getElementById('veil');

function riffle(){
  if(riffling || busy) return;
  riffling = true; busy = true;

  // handled, not re-dealt
  const openCard = document.querySelector('.plate.on');
  if(openCard) openCard.shut();
  frozen = true;                       // frozen while out
  // collapse, then deal back
  const W = innerWidth, H = innerHeight, n = plates.length;
  const R = Math.max(H * 1.15, 760);
  const cx = W/2, cy = H + R - H*0.34;
  const spread = 78;
  const centres = [];
  order.forEach(function(slot,i){
    const t = (slot/(n-1) - 0.5) * spread;
    const rad = t * Math.PI/180;
    const x = Math.round(cx + Math.sin(rad)*R - W0/2);
    const y = Math.round(cy - Math.cos(rad)*R - H0/2);
    // rotation origin sits below the card
    centres.push([slot,
      x + W0/2 + H0*Math.sin(rad),
      y + 1.5*H0 - H0*Math.cos(rad),
      t]);
    plates[i].style.willChange = 'transform';
    plates[i].style.transitionDelay = (slot * 8) + 'ms';
    plates[i].style.zIndex = 12 + slot;
    plates[i].style.transform =
      'translate(' + x + 'px,' + y + 'px) rotate(' + t.toFixed(2) + 'deg)';
  });
  centres.sort(function(a,b){ return a[1] - b[1]; });   // by x on screen
  const drawBio = function(){
    veil.className = 'on';
    // one leg per card
    const svg  = document.getElementById('bioWire');
    const path = document.getElementById('bioPath');
    svg.setAttribute('viewBox', '0 0 ' + innerWidth + ' ' + innerHeight);
    svg.setAttribute('width',  innerWidth);
    svg.setAttribute('height', innerHeight);
    const a = veil.getBoundingClientRect();
    let d = '';
    const targets = centres.map(function(c){ return [c[1], c[2], c[3]]; });

    // land on the card outline, in its own frame
    const PAD = 7;                                   // clear of the face

    targets.forEach(function(t, i){
      const fx = a.left + a.width * (i + 0.5)/targets.length;
      const fy = a.bottom + 6;

      const th = (t[2] || 0) * Math.PI/180, c = Math.cos(th), s = Math.sin(th);
      const dx = fx - t[0], dy = fy - t[1];
      const lx =  dx*c + dy*s;                       // card frame
      const ly = -dx*s + dy*c;
      const k  = Math.min(
        (W0/2 + PAD) / (Math.abs(lx) || 1e-6),
        (H0/2 + PAD) / (Math.abs(ly) || 1e-6)
      );
      const ex = t[0] + (lx*k)*c - (ly*k)*s;         // back to the page
      const ey = t[1] + (lx*k)*s + (ly*k)*c;

      d += 'M' + fx.toFixed(1) + ' ' + fy.toFixed(1) +
           'L' + ex.toFixed(1) + ' ' + ey.toFixed(1) + ' ';
    });
    path.setAttribute('d', d);
    svg.setAttribute('class', 'on');
  };

  // settle triggers it; timer is a net
  let drawn = false;
  const once = function(){ if(!drawn){ drawn = true; drawBio(); } };
  const last = plates[plates.length-1];
  last.addEventListener('transitionend', once, { once:true });
  setTimeout(once, 720);
  setTimeout(function(){ busy = false; }, 760);   // no undo mid-flight
}

function unveil(){
  if(!riffling || busy) return;
  busy = true;
  veil.className = '';
  document.getElementById('bioWire').setAttribute('class', '');
  setTimeout(lay, 90);                 // text first, then the deal
  frozen = false;
  setTimeout(function(){
    riffling = false; busy = false;
    plates.forEach(function(p){ p.style.willChange = ''; });
  }, 760);
}
veil.addEventListener('click', function(){ if(!busy) unveil(); });
addEventListener('keydown', function(e){ if(e.key === 'Escape' && !busy) unveil(); });

lay();

/* one swipe, not dozens of events */
let lastWheel = 0;
function stir(){
  const now = Date.now();
  const sameGesture = now - lastWheel < 300;
  lastWheel = now;
  if(sameGesture || busy) return;
  riffling ? unveil() : riffle();
}
addEventListener('wheel', function(e){ e.preventDefault(); stir(); }, {passive:false});

let ty = 0, swiping = false;
addEventListener('touchstart', function(e){ ty = e.touches[0].clientY; swiping = false; }, {passive:true});
addEventListener('touchmove', function(e){
  if(!swiping && Math.abs(e.touches[0].clientY - ty) > 40){ swiping = true; stir(); }
}, {passive:true});
addEventListener('touchend', function(){ swiping = false; }, {passive:true});

addEventListener('resize', function(){ sizeWire(); lay(); });

/* edit mode: hold D */
(function(){
  const hud = document.getElementById('editHUD');
  let on = false, card = null;

  function nodes(){
    return [].slice.call(annex.children).filter(function(n){ return !n.classList.contains('off'); });
  }
  function report(){
    if(!card) return;
    const A = annex.getBoundingClientRect();
    const rows = nodes().map(function(n){
      // measuring adds borders
      const r = n.getBoundingClientRect();
      const num = function(v, fallback){
        const f = parseFloat(v);
        return isNaN(f) ? +fallback.toFixed(2) : +f.toFixed(2);
      };
      const x = num(n.style.left,  (r.left - A.left)/A.width*100);
      const y = num(n.style.top,   (r.top  - A.top )/A.height*100);
      const w = num(n.style.width, r.width/A.width*100);
      return (n.classList.contains('box') ? 'box' : 'img') + '  [' + x + ', ' + y + ', ' + w + ']';
    });
    const text = card + '\n' + rows.join('\n');
    hud.classList.add('has');
    if(navigator.clipboard && window.isSecureContext){
      navigator.clipboard.writeText(text)
        .then(function(){ hud.textContent = text + '\n\n(copied to clipboard)'; })
        .catch(function(){ hud.textContent = text + '\n\n(select and copy)'; });
    }else{
      hud.textContent = text + '\n\n(select and copy)';
    }
  }

  function enter(){
    if(on) return;
    const open = document.querySelector('.plate.on');
    if(!open){ hud.textContent = 'hover a card first, then press D'; return; }
    card = open.querySelector('.cap').textContent.replace(/\s+/g,' ');
    on = true; frozen = true;               // stays open while you work
    document.body.classList.add('editing');
    nodes().forEach(function(n){
      if(n.tagName === 'IMG' || n.querySelector('.grip')) return;   // images can't
      const g = document.createElement('span');
      g.className = 'grip';
      n.appendChild(g);
    });
    report();
  }
  function leave(){
    on = false; frozen = false;
    document.body.classList.remove('editing');   // readout stays
  }

  // D locks, D releases
  addEventListener('keydown', function(e){
    if(e.key !== 'd' && e.key !== 'D') return;
    if(e.target && /input|textarea/i.test(e.target.tagName)) return;
    on ? leave() : enter();
  });

  annex.addEventListener('dragstart', function(e){ if(on) e.preventDefault(); });
  annex.addEventListener('pointerdown', function(e){
    if(!on) return;
    const node = e.target.closest ? e.target.closest('#annex > *') : null;
    if(!node) return;
    e.preventDefault();
    const A = annex.getBoundingClientRect();
    const r = node.getBoundingClientRect();
    // corner scales, else moves
    const grip = (e.target.closest && e.target.closest('.grip')) ||
                 (e.clientX > r.right - 18 && e.clientY > r.bottom - 18);
    const x0 = e.clientX, y0 = e.clientY;
    const left0 = (r.left - A.left)/A.width*100;
    const top0  = (r.top  - A.top )/A.height*100;
    const w0    = r.width/A.width*100;

    function move(ev){
      const dx = (ev.clientX - x0)/A.width*100;
      const dy = (ev.clientY - y0)/A.height*100;
      if(grip){
        node.style.width = Math.max(3, +(w0 + dx).toFixed(2)) + '%';
      }else{
        node.style.left = (+(left0 + dx).toFixed(2)) + '%';
        node.style.top  = (+(top0  + dy).toFixed(2)) + '%';
      }
      drawWires(document.querySelector('.plate.on'), P.find(function(x){ return x.t.replace(/<br>/g,'') === card; }) || {});
    }
    function up(){
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', up);
      report();
    }
    addEventListener('pointermove', move);
    addEventListener('pointerup', up);
  });
})();
