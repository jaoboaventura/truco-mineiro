(() => {
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const ART = JSON.parse($('#art').textContent);
document.querySelectorAll('img.art').forEach(i => { i.src = ART[i.dataset.art]; });
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const SPEEDS = { calma: 1.35, normal: 1, ligeira: .68 };
let M = 1;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const wait = ms => sleep(ms * M);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁯﻿]/g, '').trim().slice(0, n);
const VS = '︎';
function load(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

/* ---------- Configurações e perfil local ---------- */
const CFG = Object.assign({ nick: '', char: 'ze', speed: 'normal', sfx: true, radio: true, rua: true, vol: 70, lvl: 1 }, load('truco-cfg') || {});
const STATS = Object.assign({ xp: 0, w: 0, l: 0 }, load('truco-stats') || {});
const saveCfg = () => store('truco-cfg', CFG);
const saveStats = () => store('truco-stats', STATS);
function applySpeed() { M = (RM ? .45 : 1) * (SPEEDS[CFG.speed] || 1); }
applySpeed();
const WEB = !!window.TB;
const nick = () => (SESSION && clean(SESSION.u, 16)) || clean(CFG.nick, 16) || 'Jogador';

/* ---------- Baralho (cartas como texto: valor + naipe c/h/s/d) ---------- */
const SUIT = { c: '♣', h: '♥', s: '♠', d: '♦' };
const SUIT_NAME = { c: 'paus', h: 'copas', s: 'espadas', d: 'ouros' };
const RANKS = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'];
const BASE = { '4': 1, '5': 2, '6': 3, '7': 4, 'Q': 5, 'J': 6, 'K': 7, 'A': 8, '2': 9, '3': 10 };
const MANI = { 14: 'Zap', 13: 'Copas', 12: 'Espadilha', 11: 'Pica-fumo' };
const rk = id => id.slice(0, -1), su = id => id.slice(-1);
function power(id) {
  if (id === '4c') return 14; if (id === '7h') return 13; if (id === 'As') return 12; if (id === '7d') return 11;
  return BASE[rk(id)];
}
const ALL = []; for (const s of 'chsd') for (const r of RANKS) ALL.push(r + s);
const validCard = id => typeof id === 'string' && ALL.includes(id);
function cardLabel(id) { const p = power(id); return `${rk(id)} de ${SUIT_NAME[su(id)]}${MANI[p] ? ', ' + MANI[p] : ''}`; }
const BACK = '<div class="card back"><span>Truco<br>Mineiro</span></div>';
function cardHTML(id, tag = true) {
  const red = su(id) === 'h' || su(id) === 'd', p = power(id), s = SUIT[su(id)] + VS, r = rk(id);
  const face = 'KJQ'.includes(r);
  const pip = face ? `<span class="pip face"><span>${r}<em>${s}</em></span></span>` : `<span class="pip">${s}</span>`;
  return `<div class="card face${red ? ' red' : ''}${MANI[p] ? ' mani' : ''}"><span class="idx">${r}<i>${s}</i></span>${pip}<span class="idx br">${r}<i>${s}</i></span></div>`;
}

/* ---------- Personagens e níveis ---------- */
const CHARS = {
  ze:    { name: 'Zé Mineiro', fem: false, pitch: .85, bluff: .05, aggr: 0,   bio: 'Nascido e criado em BH. Mineiro arretado e bom de prosa.' },
  cida:  { name: 'Dona Cida',  fem: true,  pitch: 1.3, bluff: .06, aggr: .6,  bio: 'Dona de casa esperta e competitiva. Ninguém passa a perna nela.' },
  jorge: { name: 'Seu Jorge',  fem: false, pitch: .7,  bluff: .03, aggr: .2,  bio: 'A experiência fala mais alto. Truqueiro raiz desde sempre.' },
  lucia: { name: 'Lúcia',      fem: true,  pitch: 1.4, bluff: .02, aggr: -.3, bio: 'Estudante e moderna para a época. Inteligente e observadora.' },
  beto:  { name: 'Beto',       fem: false, pitch: .95, bluff: .14, aggr: .45, bio: 'Bon vivant da cidade. Confiante, às vezes arrisca demais.' },
};
if (!CHARS[CFG.char]) CFG.char = 'ze';
const LEVELS = [
  { nm: 'Fácil',   sub: 'Para quem está começando. Os bots erram e quase não blefam.', face: 'lucia', rnd: .45, noise: 2.2, bluff: .02, call: -1.2, pts: 1 },
  { nm: 'Médio',   sub: 'Um desafio equilibrado. Jogam direitinho e às vezes trucam.', face: 'ze',    rnd: .14, noise: 1.1, bluff: .05, call: 0,    pts: 2 },
  { nm: 'Difícil', sub: 'Para jogadores experientes. Pensam cada vaza e blefam mais.', face: 'jorge', rnd: .03, noise: .5,  bluff: .08, call: .35,  pts: 3 },
  { nm: 'Mestre',  sub: 'Só para os brabos do truco! Contam as cartas que já saíram.', face: 'beto',  rnd: 0,   noise: .2,  bluff: .11, call: .6,   pts: 5 },
];
const NEXT = { 2: 4, 4: 8, 8: 10, 10: 12, 12: null };
const NAME = { 4: 'Truco', 8: 'Seis', 10: 'Nove', 12: 'Doze' };
const L = {
  call: { 4: ['Truco, sô!', 'TRUCO! Desce, uai!', 'Truco, marreco!'], 8: ['SEIS, uai!', 'Seis! Agora aguenta!'], 10: ['NOVE! Ocê vai chorar!', 'Nove, sô!'], 12: ['DOZE! É tudo ou nada!', 'Doze, pelo amor de Deus!'] },
  accept: ['Desce!', 'Pode vir, sô!', 'Bão, desce!', 'Desce que eu aguento.', 'Cê num assusta ninguém não, uai.'],
  run: ['Corro, uai.', 'Tô fora, sô.', 'Esse trem tá feio. Corro.', 'Vai, leva. Corro.'],
  win: ['Ê trem bão!', 'Toma!', 'Essa é nossa!', 'Ó procê!', 'Bão demais!'],
  zap: ['ZAP no lombo!', 'Zapão, minha gente!'],
  cover: ['Vai coberta.', 'Essa vai escondida.'],
};
const QS = ['Bão demais!', 'Uai, sô!', 'Ô trem bão!', 'Tá blefando, hein?', 'Vamo, parceiro!', 'Essa é nossa!', 'Desce logo!', 'Calma, gente!'];
const TIPS = ['O Zap ganha de tudo. Guarde pra hora certa.', 'Pediu truco com mão fraca? Cara de paisagem, sô.', 'Na mão de dez, olhe bem as cartas do parceiro.', 'Coberta salva carta boa pra próxima vaza.', 'Quem corre entrega o que já valia.'];

/* ---------- Estado ---------- */
// MODE: 'off' (contra bots) | 'host' (anfitrião online, roda o jogo) | 'client' (convidado online)
let MODE = 'off', ME = 0, SPECT = false, SEATS = [];
const team = s => s % 2;
const vs = s => (s - ME + 4) % 4;
const G = { sc: [0, 0], mao: 0, h: [[], [], [], []], pl: [], r: [], v: 2, lr: -1, nt: false, md: false, fe: false, bl: false, vz: 0, over: false, seen: [], ask: null, turn: -1, dez: null, lvl: 1, mid: '' };
function snap() { return { ser: G.ser, sc: G.sc, mao: G.mao, h: G.h, pl: G.pl, r: G.r, v: G.v, lr: G.lr, nt: G.nt, md: G.md, fe: G.fe, bl: G.bl, vz: G.vz, ask: G.ask, turn: G.turn, dez: G.dez, mid: G.mid, over: G.over }; }
function loadSnap(st) {
  if (!st || typeof st !== 'object') return;
  const arr = (x, n) => Array.isArray(x) ? x : n;
  G.sc = arr(st.sc, [0, 0]).map(Number); G.mao = +st.mao || 0;
  G.h = arr(st.h, [[], [], [], []]).map(h => arr(h, []).filter(validCard));
  G.pl = arr(st.pl, []).filter(p => p && validCard(p.c)).map(p => ({ s: +p.s, c: p.c, cv: !!p.cv }));
  G.r = arr(st.r, []); G.v = +st.v || 2; G.lr = +st.lr; G.nt = !!st.nt; G.md = !!st.md; G.fe = !!st.fe; G.bl = !!st.bl;
  G.ser = st.ser && Array.isArray(st.ser.w) ? { w: st.ser.w.map(Number), g: +st.ser.g || 1, hist: Array.isArray(st.ser.hist) ? st.ser.hist : [] } : null;
  G.vz = +st.vz || 0; G.ask = st.ask || null; G.turn = st.turn ?? -1; G.dez = st.dez || null; G.mid = String(st.mid || ''); G.over = !!st.over;
}
let RUN = { alive: false };
const ABORT = new Error('abort');

/* ---------- Tamanhos ---------- */
const CW = {
  hand: () => Math.max(46, Math.min(108, innerWidth * 0.2, innerHeight * 0.12)),
  slot: () => Math.max(36, Math.min(92, innerWidth * 0.12, innerHeight * 0.095)),
  fan: () => Math.max(20, Math.min(46, innerWidth * 0.065, innerHeight * 0.05)),
};
function setSizes() { const r = document.documentElement.style; r.setProperty('--cw-hand', CW.hand() + 'px'); r.setProperty('--cw-slot', CW.slot() + 'px'); r.setProperty('--cw-fan', CW.fan() + 'px'); r.setProperty('--av', Math.max(34, Math.min(56, innerHeight * 0.06, innerWidth * 0.11)) + 'px'); }
setSizes(); addEventListener('resize', () => { setSizes(); fitTable(); });
// Mesa sempre na mesma proporção: a largura acompanha a altura disponível
function fitTable() {
  if (SCREEN !== 'scrGame') return;
  const app = document.querySelector('#scrGame .app'), t = document.getElementById('table');
  const scr = document.getElementById('scrGame');
  scr.classList.toggle('online', MODE !== 'off');
  const chatBtn = () => { $('#btnChat').hidden = !(MODE !== 'off' && !scr.classList.contains('wide')); };
  if (innerWidth <= 760) { app.style.maxWidth = ''; scr.classList.remove('wide'); chatBtn(); return; }
  const h = t.getBoundingClientRect().height; if (!h) return;
  const W = Math.round(Math.max(680, Math.min(1180, h * 1.85)));
  app.style.maxWidth = W + 'px';
  const free = (scr.clientWidth - W - 32) / 2;
  const wide = free >= 180;
  scr.classList.toggle('wide', wide);
  if (wide) { scr.style.setProperty('--sw', Math.min(MODE !== 'off' ? 330 : 300, free) + 'px'); scr.style.setProperty('--aw', W + 'px'); }
  chatBtn(); if (wide) $('#gChat').classList.remove('open');
}
function centerRect(el, w) { const r = el.getBoundingClientRect(), h = w * 1.4; return { left: r.left + r.width / 2 - w / 2, top: r.top + r.height / 2 - h / 2, width: w, height: h }; }
const fanEl = s => $('#fan' + vs(s));
function seatTarget(s) { return (s === ME && !SPECT) ? centerRect($('#hand'), CW.hand()) : (vs(s) === 0 ? centerRect($('#seat0'), CW.fan()) : centerRect(fanEl(s), CW.fan())); }

/* ---------- Som ---------- */
const A = { ctx: null, master: null, fx: null, noise: null, brown: null, mute: false };
function ac() {
  if (!A.ctx) {
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
    A.ctx = new C(); A.master = A.ctx.createGain(); A.master.connect(A.ctx.destination);
    A.fx = A.ctx.createGain(); A.fx.connect(A.master); applyVol();
  }
  if (A.ctx.state === 'suspended') A.ctx.resume();
  return A.ctx;
}
function applyVol() { if (!A.master) return; A.master.gain.value = A.mute ? 0 : CFG.vol / 100; A.fx.gain.value = CFG.sfx ? 1 : 0; }
function noiseBuf() { if (A.noise) return A.noise; const c = A.ctx, b = c.createBuffer(1, c.sampleRate, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return (A.noise = b); }
function brownBuf() { if (A.brown) return A.brown; const c = A.ctx, b = c.createBuffer(1, c.sampleRate * 3, c.sampleRate), d = b.getChannelData(0); let last = 0; for (let i = 0; i < d.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; } return (A.brown = b); }
function noiseHit({ type = 'bandpass', f = 2000, q = 1, vol = .4, dur = .08, f2, dest }) {
  if (!A.ctx) return; const c = A.ctx, t = c.currentTime;
  const s = c.createBufferSource(); s.buffer = noiseBuf();
  const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
  if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl).connect(g).connect(dest || A.fx); s.start(t, Math.random() * .5); s.stop(t + dur + .05);
}
function tone(f, t, d, type = 'triangle', v = .15, dest) {
  const c = A.ctx, o = c.createOscillator(); o.type = type; o.frequency.value = f;
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g).connect(dest || A.fx); o.start(t); o.stop(t + d + .05);
}
const sfx = {
  snap(v = 1) { noiseHit({ f: rand(1700, 2600), q: .9, vol: .35 * v, dur: .07 }); },
  swish() { noiseHit({ f: 700, f2: 3200, q: .7, vol: .12, dur: .28 }); },
  click() {}, // o toque dos botões agora é o som de seleção (ver playSample)
  thump() {
    if (!A.ctx) return; const c = A.ctx, t = c.currentTime;
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + .3);
    const g = c.createGain(); g.gain.setValueAtTime(.9, t); g.gain.exponentialRampToValueAtTime(0.0001, t + .4);
    o.connect(g).connect(A.fx); o.start(t); o.stop(t + .45);
    noiseHit({ type: 'lowpass', f: 700, q: .5, vol: .5, dur: .14 });
  },
  clink(v = 1, dest) { if (!A.ctx) return; const t = A.ctx.currentTime, k = rand(.94, 1.08); tone(2350 * k, t, .7, 'sine', .07 * v, dest); tone(3140 * k, t + .012, .5, 'sine', .045 * v, dest); },
  win() { if (!A.ctx) return; const t = A.ctx.currentTime; [523, 659, 784, 1046].forEach((f, i) => tone(f, t + i * .1, .35, 'triangle', .13)); },
  lose() { if (!A.ctx) return; const t = A.ctx.currentTime; [392, 330, 262].forEach((f, i) => tone(f, t + i * .14, .4, 'sine', .12)); },
  fanfare() { if (!A.ctx) return; const t = A.ctx.currentTime; [523, 659, 784, 659, 784, 1046, 1318].forEach((f, i) => tone(f, t + i * .12, .4, 'square', .05)); },
  pop() { if (!A.ctx) return; const t = A.ctx.currentTime; tone(880, t, .12, 'sine', .08); tone(1320, t + .05, .12, 'sine', .06); },
};
/* Rádio e rua: gravações do jogo (músicas de época, boteco e rua de BH) */
const AMBDATA = JSON.parse(document.getElementById('ambdata').textContent), ABUF = {};
function abuf(name) {
  if (ABUF[name]) return ABUF[name];
  return (ABUF[name] = fetch(AMBDATA[name]).then(r => r.arrayBuffer()).then(b => new Promise((res, rej) => A.ctx.decodeAudioData(b, res, rej))));
}
// Toca uma lista de faixas em sequência, emendando cada uma na próxima com um cruzamento suave
function makeLooper(dest, names, xf, vol) {
  const c = A.ctx, L = { alive: true, i: 0, timer: null, g: c.createGain() };
  L.g.gain.setValueAtTime(0.0001, c.currentTime); L.g.gain.exponentialRampToValueAtTime(vol, c.currentTime + 2); L.g.connect(dest);
  async function next(at) {
    if (!L.alive) return;
    const name = names[L.i++ % names.length];
    let buf; try { buf = await abuf(name); } catch (e) { return; }
    if (!L.alive) return;
    const t0 = Math.max(at ?? c.currentTime + .05, c.currentTime + .02), end = t0 + buf.duration;
    const src = c.createBufferSource(), g = c.createGain(); src.buffer = buf; src.connect(g).connect(L.g);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(1, t0 + xf); g.gain.setValueAtTime(1, end - xf); g.gain.linearRampToValueAtTime(0, end);
    src.start(t0); src.stop(end + .05);
    const nx = end - xf; L.timer = setTimeout(() => next(nx), Math.max(0, (nx - c.currentTime - 1.5) * 1000));
  }
  next();
  L.stop = () => { if (!L.alive) return; L.alive = false; clearTimeout(L.timer); const t = c.currentTime; L.g.gain.cancelScheduledValues(t); L.g.gain.setTargetAtTime(0.0001, t, .5); setTimeout(() => { try { L.g.disconnect(); } catch (e) {} }, 3000); };
  return L;
}
const RADIO_VOL = .3;
function radioOn() {
  const c = ac(); if (!c || A.radio) return;
  // um toque leve de rádio antigo, sem estragar a gravação
  const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 110;
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 6500;
  const g = c.createGain(); g.gain.value = RADIO_VOL;
  hp.connect(lp).connect(g).connect(A.master);
  const order = SCREEN === 'scrGame' ? ['m_moda', 'm_guarania', 'm_chorinho'] : ['m_chorinho', 'm_moda', 'm_guarania'];
  A.radio = { g, loop: makeLooper(hp, order, 3, 1) };
}
function radioOff() {
  if (!A.radio) return; const r = A.radio; A.radio = null; r.loop.stop();
  setTimeout(() => { try { r.g.disconnect(); } catch (e) {} }, 3000);
}
function duckRadio(on) { if (!A.radio) return; const g = A.radio.g.gain, t = A.ctx.currentTime; g.cancelScheduledValues(t); g.setTargetAtTime(on ? RADIO_VOL * .35 : RADIO_VOL, t, on ? .08 : .6); }
// Rua: ambiente contínuo (boteco na partida, rua nos menus) + sons soltos sorteados
const STREET_SHOTS = {
  boteco: [['s_risada', 4], ['s_brinde', 4], ['s_bonde', 1], ['s_buzina', 1], ['s_carro', 1], ['s_vendedor', 1], ['s_sino', .5]],
  rua: [['s_carro', 3], ['s_buzina', 2], ['s_bonde', 3], ['s_vendedor', 2], ['s_sino', 1], ['s_risada', 1]],
};
function streetScene() { return SCREEN === 'scrGame' ? 'boteco' : 'rua'; }
function streetOn() {
  const c = ac(); if (!c || A.street) return;
  const g = c.createGain(); g.gain.value = 1; g.connect(A.master);
  A.street = { g, scene: null, loop: null, timer: null };
  setStreetScene(streetScene());
  const shot = async () => {
    const st = A.street; if (!st) return;
    const list = STREET_SHOTS[st.scene || 'rua'], tot = list.reduce((a, x) => a + x[1], 0);
    let r = Math.random() * tot, name = list[0][0]; for (const [n, w] of list) { if ((r -= w) <= 0) { name = n; break; } }
    try {
      const buf = await abuf(name); if (A.street !== st) return;
      const t = c.currentTime, src = c.createBufferSource(), gg = c.createGain(), pan = c.createStereoPanner ? c.createStereoPanner() : null;
      src.buffer = buf; gg.gain.value = rand(.22, .42) * (name === 's_sino' ? .7 : 1);
      if (pan) {
        if (name === 's_carro') { pan.pan.setValueAtTime(-.85, t); pan.pan.linearRampToValueAtTime(.85, t + buf.duration); }
        else pan.pan.value = rand(-.7, .7);
        src.connect(gg).connect(pan).connect(st.g);
      } else src.connect(gg).connect(st.g);
      src.start(t);
    } catch (e) {}
    st.timer = setTimeout(shot, rand(7000, 16000));
  };
  A.street.timer = setTimeout(shot, rand(3000, 6000));
}
function setStreetScene(scene) {
  const st = A.street; if (!st || st.scene === scene) return;
  if (st.loop) st.loop.stop();
  st.scene = scene; st.loop = makeLooper(st.g, [scene === 'boteco' ? 'a_boteco' : 'a_rua'], 1.6, scene === 'boteco' ? .5 : .55);
}
function streetOff() {
  if (!A.street) return; const st = A.street; A.street = null; clearTimeout(st.timer); if (st.loop) st.loop.stop();
  setTimeout(() => { try { st.g.disconnect(); } catch (e) {} }, 3000);
}
function syncAmbience() {
  if (!A.started) return;
  if (CFG.radio) radioOn(); else radioOff();
  if (CFG.rua) streetOn(); else streetOff();
  $('#btnRadio').setAttribute('aria-pressed', String(CFG.radio));
  $('#btnRua').setAttribute('aria-pressed', String(CFG.rua));
  $('#btnSfx').setAttribute('aria-pressed', String(CFG.sfx));
}
function startSound() { if (A.started || !ac()) return; A.started = true; setTimeout(syncAmbience, 60); Object.keys(SFXDATA).forEach(k => sample(k).catch(() => {})); }
/* Sons gravados do jogo */
const SFXDATA = JSON.parse(document.getElementById('sfxdata').textContent), SBUF = {};
function sample(name) {
  if (SBUF[name]) return SBUF[name];
  return (SBUF[name] = fetch(SFXDATA[name]).then(r => r.arrayBuffer()).then(b => new Promise((res, rej) => A.ctx.decodeAudioData(b, res, rej))));
}
async function playSample(name, vol = 1, duck = false) {
  const c = ac(); if (!c || !SFXDATA[name]) return;
  try {
    const buf = await sample(name), src = c.createBufferSource(), g = c.createGain();
    src.buffer = buf; g.gain.value = vol; src.connect(g).connect(A.fx); src.start();
    if (duck) { duckRadio(true); setTimeout(() => duckRadio(false), buf.duration * 1000); }
  } catch (e) {}
}
// toque de seleção em todos os botões (menos as cartas da mão, que têm o som de carta)
document.addEventListener('click', e => { const b = e.target.closest('button'); if (!b || b.disabled || b.closest('#hand')) return; playSample('sel', .6); }, true);
document.addEventListener('pointerdown', startSound, { once: true });
document.addEventListener('keydown', startSound, { once: true });

/* ---------- Ilustração de BH (desenhada em vetor, nítida em qualquer tela) ---------- */
function drawScene(cv) {
  const W = cv.clientWidth, H = cv.clientHeight; if (!W || !H) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0);
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const S = Math.max(.42, Math.min(1.7, H / 820, W / 620));
  const G = H * .8;                      // linha da calçada
  const ink = 'rgba(70,52,36,.55)';
  const P = (pts, fill, stroke) => { x.beginPath(); pts.forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); x.closePath(); x.fillStyle = fill; x.fill(); if (stroke) { x.strokeStyle = stroke; x.lineWidth = 1.2; x.stroke(); } };
  const R = (a, b, w, h, fill) => { x.fillStyle = fill; x.fillRect(a, b, w, h); };
  const arch = (cx, by, w, h, fill) => { x.beginPath(); x.moveTo(cx - w / 2, by); x.lineTo(cx - w / 2, by - h + w / 2); x.arc(cx, by - h + w / 2, w / 2, Math.PI, 0); x.lineTo(cx + w / 2, by); x.closePath(); x.fillStyle = fill; x.fill(); };
  // céu
  let g = x.createLinearGradient(0, 0, 0, G);
  g.addColorStop(0, '#7fa79b'); g.addColorStop(.55, '#b9cbb5'); g.addColorStop(1, '#efe2c4');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  g = x.createRadialGradient(W * .56, G * .78, 10, W * .56, G * .78, Math.max(W, H) * .6);
  g.addColorStop(0, 'rgba(255,236,196,.55)'); g.addColorStop(1, 'rgba(255,236,196,0)');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // nuvens
  for (let i = 0; i < 7; i++) {
    const cx = rnd() * W, cy = H * (.07 + rnd() * .3), k = (.6 + rnd() * .8) * S;
    x.fillStyle = 'rgba(250,243,226,.72)';
    x.beginPath();
    [[0, 0, 46], [-50, 12, 32], [52, 10, 36], [-92, 22, 22], [94, 22, 24], [20, -26, 34]].forEach(([dx, dy, r]) => { x.moveTo(cx + dx * k + r * k, cy + dy * k); x.arc(cx + dx * k, cy + dy * k, r * k, 0, Math.PI * 2); });
    x.fill();
    x.fillStyle = 'rgba(214,206,186,.35)'; x.fillRect(cx - 110 * k, cy + 22 * k, 220 * k, 12 * k);
  }
  // Serra do Curral
  const ridge = (base, amp, step, col) => { const pts = [[0, G]]; for (let a = 0; a <= W + step; a += step) pts.push([a, base - amp * (.5 + .5 * Math.sin(a / (190 * S) + 1.3)) - rnd() * amp * .25]); pts.push([W, G]); P(pts, col); };
  ridge(G - 250 * S, 70 * S, 46 * S, '#a7b79f');
  ridge(G - 190 * S, 50 * S, 38 * S, '#93a88f');
  // casario ao fundo
  for (let a = -20; a < W; ) {
    const w = (40 + rnd() * 70) * S, h = (70 + rnd() * 150) * S;
    R(a, G - h, w, h, rnd() < .5 ? '#cbbf9f' : '#bfb595');
    x.fillStyle = 'rgba(110,98,74,.35)';
    for (let yy = G - h + 10 * S; yy < G - 12 * S; yy += 16 * S) for (let xx = a + 7 * S; xx < a + w - 9 * S; xx += 13 * S) x.fillRect(xx, yy, 5 * S, 7 * S);
    a += w + 4 * S;
  }
  // torre art déco ao centro
  const tx = W * .5 - 40 * S, tw = 80 * S, tt = G - 440 * S;
  R(tx, tt + 60 * S, tw, G - tt - 60 * S, '#d9cba9'); R(tx + tw * .62, tt + 60 * S, tw * .38, G - tt - 60 * S, '#c3b38f');
  R(tx + 12 * S, tt + 26 * S, tw - 24 * S, 36 * S, '#d9cba9'); R(tx + 24 * S, tt, tw - 48 * S, 28 * S, '#d9cba9');
  R(tx + tw / 2 - 1.5 * S, tt - 46 * S, 3 * S, 48 * S, '#8a7a5c');
  x.fillStyle = 'rgba(90,82,64,.5)'; for (let i = 0; i < 4; i++) R(tx + (12 + i * 16) * S, tt + 74 * S, 6 * S, G - tt - 90 * S, 'rgba(90,82,64,.42)');
  // prédio curvo à direita (estilo Edifício Niemeyer)
  const bx = W - 400 * S, bt = G - 560 * S, br = W + 30, rad = 170 * S;
  x.save();
  x.beginPath(); x.moveTo(bx + rad, bt); x.lineTo(br, bt); x.lineTo(br, G); x.lineTo(bx, G); x.lineTo(bx, bt + rad * .55); x.quadraticCurveTo(bx, bt, bx + rad, bt); x.closePath();
  x.fillStyle = '#e8ddc2'; x.fill(); x.clip();
  for (let yy = bt + 22 * S; yy < G - 30 * S; yy += 38 * S) {
    g = x.createLinearGradient(bx, 0, br, 0); g.addColorStop(0, '#4c6a60'); g.addColorStop(.25, '#7d9a8f'); g.addColorStop(.6, '#3f5c53'); g.addColorStop(1, '#2f4740');
    x.fillStyle = g; x.fillRect(bx, yy, br - bx, 17 * S);
    x.fillStyle = 'rgba(255,255,255,.12)'; for (let xx = bx + 10 * S; xx < br; xx += 22 * S) x.fillRect(xx, yy, 1.4 * S, 17 * S);
  }
  g = x.createLinearGradient(bx, 0, br, 0); g.addColorStop(0, 'rgba(60,40,20,.18)'); g.addColorStop(.22, 'rgba(255,250,235,.12)'); g.addColorStop(.7, 'rgba(60,40,20,.12)'); g.addColorStop(1, 'rgba(40,25,10,.32)');
  x.fillStyle = g; x.fillRect(bx, bt, br - bx, G - bt);
  R(bx, G - 40 * S, br - bx, 40 * S, '#cdbf9f'); x.fillStyle = 'rgba(60,45,30,.45)'; for (let xx = bx + 14 * S; xx < br; xx += 34 * S) x.fillRect(xx, G - 34 * S, 18 * S, 34 * S);
  x.restore();
  x.strokeStyle = ink; x.lineWidth = 1.2; x.beginPath(); x.moveTo(bx + rad, bt); x.lineTo(br, bt); x.moveTo(bx, G); x.lineTo(bx, bt + rad * .55); x.quadraticCurveTo(bx, bt, bx + rad, bt); x.stroke();
  // igreja à esquerda
  const c0 = Math.min(W * .03, 30 * S) - 10 * S, cS = S * .84;
  const C = (v) => c0 + v * cS, Y = (v) => G - v * cS;
  const stone = '#ece0c3', shade = '#d2c19c', dark = '#7a6247';
  R(C(40), Y(300), 220 * cS, 300 * cS, stone);
  P([[C(40), Y(300)], [C(150), Y(390)], [C(260), Y(300)]], stone, ink);
  R(C(0), Y(380), 70 * cS, 380 * cS, stone); R(C(48), Y(380), 22 * cS, 380 * cS, shade);
  R(C(230), Y(380), 70 * cS, 380 * cS, stone); R(C(278), Y(380), 22 * cS, 380 * cS, shade);
  P([[C(-4), Y(380)], [C(35), Y(470)], [C(74), Y(380)]], stone, ink); P([[C(35), Y(470)], [C(74), Y(380)], [C(52), Y(380)]], shade);
  P([[C(226), Y(380)], [C(265), Y(470)], [C(304), Y(380)]], stone, ink); P([[C(265), Y(470)], [C(304), Y(380)], [C(282), Y(380)]], shade);
  R(C(118), Y(470), 64 * cS, 170 * cS, stone); R(C(160), Y(470), 22 * cS, 170 * cS, shade);
  P([[C(112), Y(470)], [C(150), Y(640)], [C(188), Y(470)]], stone, ink); P([[C(150), Y(640)], [C(188), Y(470)], [C(166), Y(470)]], shade);
  R(C(148.5), Y(672), 3 * cS, 34 * cS, dark); R(C(140), Y(660), 20 * cS, 3 * cS, dark);
  [[35, 492], [265, 492]].forEach(([a, b]) => { R(C(a - 1), Y(b), 2.5 * cS, 22 * cS, dark); R(C(a - 7), Y(b - 6), 14 * cS, 2.5 * cS, dark); });
  [[0, 380], [230, 380], [40, 300], [118, 470]].forEach(([a, b]) => { x.fillStyle = 'rgba(122,98,71,.5)'; x.fillRect(C(a), Y(b), (a === 40 ? 220 : a === 118 ? 64 : 70) * cS, 5 * cS); });
  arch(C(150), G, 54 * cS, 104 * cS, dark);
  arch(C(35), G, 30 * cS, 64 * cS, dark); arch(C(265), G, 30 * cS, 64 * cS, dark);
  [[35, 190], [35, 300], [265, 190], [265, 300]].forEach(([a, b]) => arch(C(a), Y(b), 20 * cS, 52 * cS, 'rgba(90,70,48,.8)'));
  arch(C(150), Y(400), 20 * cS, 56 * cS, 'rgba(90,70,48,.8)');
  x.beginPath(); x.arc(C(150), Y(220), 30 * cS, 0, Math.PI * 2); x.fillStyle = dark; x.fill();
  x.beginPath(); x.arc(C(150), Y(220), 22 * cS, 0, Math.PI * 2); x.fillStyle = '#a3463a'; x.fill();
  x.strokeStyle = 'rgba(236,224,195,.8)'; x.lineWidth = 2 * cS; x.beginPath(); for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4; x.moveTo(C(150), Y(220)); x.lineTo(C(150) + Math.cos(an) * 22 * cS, Y(220) + Math.sin(an) * 22 * cS); } x.stroke();
  [[86, 150], [214, 150]].forEach(([a, b]) => arch(C(a), Y(b), 24 * cS, 70 * cS, 'rgba(90,70,48,.75)'));
  // árvores
  const tree = (cx, k) => {
    R(cx - 7 * k, G - 110 * k, 14 * k, 110 * k, '#4a3a2a');
    [[0, -150, 70, '#24573f'], [-60, -120, 52, '#24573f'], [62, -118, 55, '#24573f'], [-28, -178, 50, '#2E6B4E'], [34, -170, 48, '#2E6B4E'], [-8, -128, 56, '#2E6B4E'], [-34, -190, 26, '#3f7d5c'], [20, -196, 22, '#3f7d5c'], [-66, -138, 20, '#3f7d5c']].forEach(([dx, dy, r, c]) => { x.beginPath(); x.arc(cx + dx * k, G + dy * k, r * k, 0, Math.PI * 2); x.fillStyle = c; x.fill(); });
  };
  tree(C(330), S * .95); tree(W * .43, S * .7); tree(bx - 30 * S, S * 1.05); tree(W - 60 * S, S * .9);
  // calçada e rua
  R(0, G, W, 14 * S, '#c7b896'); R(0, G + 14 * S, W, 4 * S, '#8f7f63');
  g = x.createLinearGradient(0, G + 18 * S, 0, H); g.addColorStop(0, '#7b7062'); g.addColorStop(1, '#4e463d');
  x.fillStyle = g; x.fillRect(0, G + 18 * S, W, H - G);
  const ly = G + 18 * S + (H - G - 18 * S) * .58;
  x.fillStyle = 'rgba(236,224,195,.55)'; for (let a = 10 * S; a < W; a += 70 * S) x.fillRect(a, ly, 38 * S, 4 * S);
  // postes
  [W * .36, W * .62].forEach(px => { R(px, G - 190 * S, 4 * S, 190 * S, '#3b2f25'); R(px - 16 * S, G - 190 * S, 20 * S, 4 * S, '#3b2f25'); x.beginPath(); x.arc(px - 16 * S, G - 182 * S, 7 * S, 0, Math.PI * 2); x.fillStyle = '#f1dda5'; x.fill(); });
  // pessoas
  [[W * .3, 1], [W * .34, .9], [W * .58, 1.05], [W * .9, .95]].forEach(([px, k]) => { const s = S * k; R(px - 5 * s, G - 44 * s, 10 * s, 30 * s, '#3b3229'); R(px - 4 * s, G - 14 * s, 3 * s, 14 * s, '#3b3229'); R(px + 1 * s, G - 14 * s, 3 * s, 14 * s, '#3b3229'); x.beginPath(); x.arc(px, G - 50 * s, 6 * s, 0, Math.PI * 2); x.fillStyle = '#3b3229'; x.fill(); R(px - 8 * s, G - 57 * s, 16 * s, 3 * s, '#3b3229'); });
  // ônibus amarelo
  const ub = G + 18 * S + (H - G - 18 * S) * .5, ux = Math.max(-60 * S, W * .04 - 40 * S), uw = 250 * S, uh = 112 * S;
  x.beginPath(); x.moveTo(ux, ub); x.lineTo(ux, ub - uh + 20 * S); x.quadraticCurveTo(ux, ub - uh, ux + 24 * S, ub - uh); x.lineTo(ux + uw - 30 * S, ub - uh); x.quadraticCurveTo(ux + uw, ub - uh, ux + uw, ub - uh + 34 * S); x.lineTo(ux + uw, ub); x.closePath();
  x.fillStyle = '#d9a441'; x.fill(); x.strokeStyle = ink; x.lineWidth = 1.2; x.stroke();
  R(ux, ub - 34 * S, uw, 14 * S, '#b8862f'); R(ux, ub - uh + 6 * S, uw - 20 * S, 8 * S, '#e6bd62');
  for (let i = 0; i < 5; i++) { R(ux + 12 * S + i * 42 * S, ub - uh + 22 * S, 34 * S, 38 * S, '#3d4c46'); R(ux + 14 * S + i * 42 * S, ub - uh + 24 * S, 10 * S, 34 * S, 'rgba(255,255,255,.15)'); }
  R(ux + uw - 30 * S, ub - uh + 26 * S, 22 * S, 44 * S, '#3d4c46');
  [ux + 52 * S, ux + uw - 56 * S].forEach(wx => { x.beginPath(); x.arc(wx, ub, 20 * S, 0, Math.PI * 2); x.fillStyle = '#2a221c'; x.fill(); x.beginPath(); x.arc(wx, ub, 8 * S, 0, Math.PI * 2); x.fillStyle = '#9c917f'; x.fill(); });
  // carro verde
  const cx0 = W * .66, cb = G + 18 * S + (H - G - 18 * S) * .78, cw2 = 150 * S;
  x.beginPath(); x.moveTo(cx0, cb - 12 * S); x.quadraticCurveTo(cx0, cb - 40 * S, cx0 + 28 * S, cb - 42 * S); x.quadraticCurveTo(cx0 + 50 * S, cb - 78 * S, cx0 + 82 * S, cb - 76 * S); x.quadraticCurveTo(cx0 + 112 * S, cb - 74 * S, cx0 + 124 * S, cb - 42 * S); x.quadraticCurveTo(cx0 + cw2, cb - 40 * S, cx0 + cw2, cb - 12 * S); x.closePath();
  x.fillStyle = '#5f8f84'; x.fill(); x.strokeStyle = ink; x.stroke();
  P([[cx0 + 44 * S, cb - 44 * S], [cx0 + 60 * S, cb - 68 * S], [cx0 + 80 * S, cb - 68 * S], [cx0 + 80 * S, cb - 44 * S]], '#cfe0d6');
  P([[cx0 + 86 * S, cb - 44 * S], [cx0 + 86 * S, cb - 68 * S], [cx0 + 104 * S, cb - 66 * S], [cx0 + 116 * S, cb - 44 * S]], '#cfe0d6');
  R(cx0 - 2 * S, cb - 16 * S, cw2 + 4 * S, 5 * S, '#d8d2c2');
  [cx0 + 32 * S, cx0 + cw2 - 30 * S].forEach(wx => { x.beginPath(); x.arc(wx, cb - 6 * S, 15 * S, 0, Math.PI * 2); x.fillStyle = '#2a221c'; x.fill(); x.beginPath(); x.arc(wx, cb - 6 * S, 6 * S, 0, Math.PI * 2); x.fillStyle = '#d8d2c2'; x.fill(); });
  // textura de papel e vinheta
  if (!drawScene.grain) { const n = document.createElement('canvas'); n.width = n.height = 160; const nx = n.getContext('2d'), id = nx.createImageData(160, 160); for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 18; } nx.putImageData(id, 0, 0); drawScene.grain = n; }
  x.fillStyle = x.createPattern(drawScene.grain, 'repeat'); x.fillRect(0, 0, W, H);
  g = x.createRadialGradient(W / 2, H * .45, Math.min(W, H) * .35, W / 2, H * .45, Math.max(W, H) * .8);
  g.addColorStop(0, 'rgba(40,25,10,0)'); g.addColorStop(1, 'rgba(40,25,10,.38)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
}
function paintScenes() { document.querySelectorAll('canvas.scene').forEach(c => { if (c.offsetParent) drawScene(c); }); }
let sceneT; addEventListener('resize', () => { clearTimeout(sceneT); sceneT = setTimeout(paintScenes, 120); });

/* ---------- Navegação ---------- */
let SCREEN = 'scrMenu';
function show(id) {
  SCREEN = id;
  $$('.screen').forEach(s => { s.hidden = s.id !== id; });
  const pb = document.querySelector('#' + id + ' .pbody'); if (pb) pb.scrollTop = 0;
  if (id === 'scrMenu') renderMenu();
  if (A.street) setStreetScene(streetScene());
  requestAnimationFrame(paintScenes);
  if (id === 'scrOnline') { if (!$('#salaNome').value) $('#salaNome').value = `Mesa do ${nick()}`.slice(0, 24); $('#salaLvl').value = ''; renderSalaLvl(); renderOnline(); }
  const h = $('#' + id + ' h2'); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
}
const BACK_TO = { scrBots: 'scrSolo', scrSolo: 'scrMode', scrOnline: 'scrMode', scrTour: 'scrSolo' };
$$('.back').forEach(b => b.addEventListener('click', () => { sfx.click(); const to = BACK_TO[b.closest('.screen').id] || 'scrMenu'; if (to === 'scrSolo') openSolo(); else show(to); }));
let PREV_MODE = false;
function snack(t) { const s = $('#snack'); s.textContent = t; s.classList.add('show'); clearTimeout(snack.t); snack.t = setTimeout(() => s.classList.remove('show'), 2400); }
function message(title, text, btns) {
  $('#msgTitle').textContent = title; $('#msgText').textContent = text;
  const box = $('#msgBtns'); box.innerHTML = '';
  btns.forEach((b, i) => { const el = document.createElement('button'); el.className = 'btn' + (b.kind ? ' ' + b.kind : ''); el.textContent = b.label; el.onclick = () => { $('#msgScreen').hidden = true; b.fn && b.fn(); }; box.appendChild(el); if (!i) setTimeout(() => el.focus(), 30); });
  $('#msgScreen').hidden = false;
}

/* ---------- Semana e nível ---------- */
const brt = (t = Date.now()) => new Date(t - 3 * 3600e3); // horário de Brasília (UTC-3)
function weekId(d = brt()) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = (t.getUTCDay() + 6) % 7; t.setUTCDate(t.getUTCDate() - day + 3);
  const y = t.getUTCFullYear(), j4 = new Date(Date.UTC(y, 0, 4));
  const wk = 1 + Math.round(((t - j4) / 864e5 - 3 + ((j4.getUTCDay() + 6) % 7)) / 7);
  return y + '-W' + String(wk).padStart(2, '0');
}
const prevWeekId = () => weekId(brt(Date.now() - 7 * 864e5));
function weekLeft() { const d = brt(), day = (d.getUTCDay() + 6) % 7; return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day + 7) - d.getTime(); }
function fmtLeft(ms) { const h = Math.floor(ms / 3600e3), dd = Math.floor(h / 24); return dd ? `${dd}d ${h % 24}h` : `${h}h ${Math.floor(ms / 60e3) % 60}min`; }
function weekRange(id) {
  const [y, w] = id.split('-W').map(Number), j4 = new Date(Date.UTC(y, 0, 4));
  const mon = new Date(j4.getTime() - ((j4.getUTCDay() + 6) % 7) * 864e5 + (w - 1) * 7 * 864e5), sun = new Date(mon.getTime() + 6 * 864e5);
  const f = d => `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  return `${f(mon)} a ${f(sun)}`;
}
function lvlOf(xp) { let n = 1, need = 200; xp = Math.max(0, xp | 0); while (xp >= need) { xp -= need; n++; need = 200 + (n - 1) * 100; } return { n, cur: xp, need }; }

/* ---------- Capacidades da página (online, ranking, identidade) ---------- */
let ROOM = null, DB = null, USER = null, UID = null, MYDOC = null;
const cap = n => (window.claude && window.claude.use) ? window.claude.use(n).catch(() => null) : Promise.resolve(null);
(async () => {
  [USER, DB, ROOM] = await Promise.all([cap('user'), cap('db'), cap('room')]);
  if (USER) {
    try { UID = await USER.id(); } catch (e) {}
  }
  if (WEB) {
    const me = await TB.restore();
    if (me) { UID = me.id; SESSION = { u: me.username, uid: me.id, t: Date.now() }; store('truco-sessao', SESSION); MYDOC = await TB.myRank(); }
    else if (SESSION) { logout(); }
    TB.onRecovery(() => { show('scrAuth'); authTab('reset'); resetMode('novo'); });
  }
  if (!WEB && DB && UID) { try { const s = await DB.doc('ranking/' + UID).get(); if (s.exists) MYDOC = s.data(); } catch (e) {} }
  if (ROOM) {
    ROOM.onPeers(() => { if (SCREEN === 'scrMenu') renderOnChip(); if (SCREEN === 'scrOnline') renderOnline(); }, () => { ROOM = null; renderOnChip(); });
    lobbyPresence();
  }
  // a sessão salva neste navegador só vale pro mesmo acesso
  if (!WEB && SESSION && UID && SESSION.uid && SESSION.uid !== UID) { logout(); return; }
  if (!WEB && SESSION && UID && !SESSION.uid) { SESSION.uid = UID; store('truco-sessao', SESSION); }
  renderMenu();
})();
function lobbyPresence() {
  if (!ROOM) return;
  const pr = { on: 1, nm: nick(), sala: null };
  if (CODE && IS_HOST) pr.sala = LOB.priv ? { id: SALA_ID, lock: 1, nm: LOB.nm, n: LOB.seats.filter(Boolean).length, st: LOB.st } : { c: CODE, nm: LOB.nm, n: LOB.seats.filter(Boolean).length, st: LOB.st };
  ROOM.presence(pr).catch(() => {});
}
const myLobbyPeer = () => (ROOM && ROOM.peers().find(p => p.sameTab) || {}).peer;

/* ---------- Menu ---------- */
function myXp() { return Math.max(STATS.xp, (MYDOC && +MYDOC.xp) || 0); }
function renderMenu() {
  $('#mAv').src = ART[CFG.char]; $('#mNick').textContent = nick();
  const L = lvlOf(myXp());
  $('#mLvl').textContent = 'Nível ' + L.n; $('#mXpTxt').textContent = `${L.cur} / ${L.need}`;
  requestAnimationFrame(() => { $('#mXp').style.width = (L.cur / L.need * 100) + '%'; });
  $('#mWeekLeft').textContent = 'Termina em ' + fmtLeft(weekLeft());
  renderOnChip();
}
function renderOnChip() {
  const chip = $('#mOnChip');
  if (!ROOM) { chip.classList.remove('on'); $('#mOnTxt').textContent = 'Modo offline'; return; }
  const n = ROOM.peers().filter(p => p.kind === 'viewer').length;
  chip.classList.add('on'); $('#mOnTxt').textContent = n <= 1 ? 'Só você online' : `${n} online agora`;
}
setInterval(() => { if (SCREEN === 'scrMenu') $('#mWeekLeft').textContent = 'Termina em ' + fmtLeft(weekLeft()); }, 60000);
$('#mPlay').onclick = () => { sfx.click(); $('#onBadge').hidden = !!ROOM; $('#pickOnline').setAttribute('aria-disabled', String(!ROOM)); show('scrMode'); };
$('#mRank').onclick = $('#mWeek').onclick = () => { sfx.click(); openRank('now'); };
$('#mCfg').onclick = $('#mCfg2').onclick = $('#pchip').onclick = () => { sfx.click(); openCfg(); };
$('#mRules').onclick = $('#btnRules').onclick = $('#cfgRules').onclick = () => { $('#rulesScreen').hidden = false; $('#btnCloseRules').focus(); };
$('#btnCloseRules').onclick = () => { $('#rulesScreen').hidden = true; };
$('#pickOnline').onclick = () => { if (!ROOM) { snack('O online não está disponível nesta visualização.'); return; } sfx.click(); show('scrOnline'); };
$('#pickBots').onclick = () => { sfx.click(); openSolo(); };

/* ---------- Bots ---------- */
let LVL_SEL = null;
function openBots() {
  $('#lvlList').innerHTML = LEVELS.map((l, i) => `<button class="card-opt" role="radio" aria-checked="${i === LVL_SEL}" data-i="${i}"><img src="${ART[l.face]}" alt=""><div><b>${l.nm}</b><span>${l.sub}</span><div class="pips">${[0, 1, 2, 3].map(k => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</div></div></button>`).join('');
  $('#btnBotStart').disabled = LVL_SEL === null;
  if (LVL_SEL === null) { $('#botsNote').innerHTML = `Escolha um nível acima pra liberar a partida. Você joga como <b>${esc(nick())}</b>, com o personagem <b>${esc(CHARS[CFG.char].name)}</b>, em melhor de 3.`; show('scrBots'); return; }
  $('#botsNote').innerHTML = `Você joga como <b>${esc(nick())}</b>, com o personagem <b>${esc(CHARS[CFG.char].name)}</b>. A disputa é em melhor de 3, e vencer no ${LEVELS[CFG.lvl].nm} vale <b>${LEVELS[CFG.lvl].pts} ${LEVELS[CFG.lvl].pts > 1 ? 'pontos' : 'ponto'}</b> no ranking da semana.`;
  show('scrBots');
}
$('#lvlList').addEventListener('click', e => { const b = e.target.closest('.card-opt'); if (!b) return; sfx.click(); LVL_SEL = CFG.lvl = +b.dataset.i; saveCfg(); openBots(); $('#lvlList [aria-checked="true"]').focus(); });
$('#btnBotStart').onclick = () => { if (LVL_SEL === null) return; sfx.click(); startOffline(); };

/* ---------- Configurações ---------- */
function openCfg() {
  $('#cfgUser').textContent = nick();
  $('#cfgPicks').innerHTML = Object.entries(CHARS).map(([k, c]) => `<button class="pick" role="radio" aria-checked="${k === CFG.char}" data-k="${k}"><img src="${ART[k]}" alt=""><b>${c.name}</b></button>`).join('');
  $('#cfgBio').innerHTML = `<b>${esc(CHARS[CFG.char].name)}.</b> ${esc(CHARS[CFG.char].bio)}`;
  $$('#cfgSpeed button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === CFG.speed)));
  $('#cfgVol').value = CFG.vol; $('#cfgSfx').checked = CFG.sfx; $('#cfgRadio').checked = CFG.radio; $('#cfgRua').checked = CFG.rua;
  show('scrCfg');
}
$('#cfgLogout').onclick = () => message('Sair da conta?', 'Você volta pra tela de entrada. Seu nível e seus pontos continuam salvos.', [{ label: 'Ficar' }, { label: 'Sair', kind: 'redb', fn: logout }]);
$('#cfgPicks').addEventListener('click', e => { const b = e.target.closest('.pick'); if (!b) return; sfx.click(); CFG.char = b.dataset.k; saveCfg(); if (WEB && UID) TB.setChar(CFG.char); openCfg(); $('#cfgPicks [aria-checked="true"]').focus(); });
$('#cfgSpeed').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; CFG.speed = b.dataset.v; saveCfg(); applySpeed(); $$('#cfgSpeed button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); });
$('#cfgVol').addEventListener('input', e => { CFG.vol = +e.target.value; saveCfg(); applyVol(); });
$('#cfgSfx').onchange = e => { CFG.sfx = e.target.checked; saveCfg(); applyVol(); $('#btnSfx').setAttribute('aria-pressed', String(CFG.sfx)); sfx.click(); };
$('#cfgRadio').onchange = e => { CFG.radio = e.target.checked; saveCfg(); startSound(); syncAmbience(); };
$('#cfgRua').onchange = e => { CFG.rua = e.target.checked; saveCfg(); startSound(); syncAmbience(); };
$('#cfgDone').onclick = () => { sfx.click(); if (CODE) syncMyRoomPresence(); show('scrMenu'); snack('Configurações salvas'); };
$('#btnSfx').onclick = e => { CFG.sfx = !CFG.sfx; saveCfg(); e.currentTarget.setAttribute('aria-pressed', String(CFG.sfx)); $('#cfgSfx').checked = CFG.sfx; startSound(); applyVol(); if (CFG.sfx) sfx.click(); };
$('#btnRadio').onclick = () => { CFG.radio = !CFG.radio; saveCfg(); startSound(); syncAmbience(); };
$('#btnRua').onclick = () => { CFG.rua = !CFG.rua; saveCfg(); startSound(); syncAmbience(); };
[['#btnRadio','radio'],['#btnRua','rua'],['#btnSfx','sfx']].forEach(([id, k]) => $(id).setAttribute('aria-pressed', String(!!CFG[k])));

/* ---------- Ranking ---------- */
let RANK_TAB = 'now';
async function openRank(tab) {
  RANK_TAB = tab; show('scrRank');
  $('#tabNow').setAttribute('aria-selected', String(tab === 'now')); $('#tabPrev').setAttribute('aria-selected', String(tab === 'prev'));
  const wk = tab === 'now' ? weekId() : prevWeekId();
  $('#rankWk').textContent = tab === 'now' ? `Semana de ${weekRange(wk)} · zera em ${fmtLeft(weekLeft())}` : `Semana de ${weekRange(wk)} · resultado final`;
  const body = $('#rankBody');
  if (WEB ? !UID : (!DB || !UID)) { body.innerHTML = `<div class="empty">O ranking precisa da sua conta conectada ao jogo, e ela não está disponível nesta visualização. Suas partidas continuam valendo pro seu nível (agora no nível ${lvlOf(myXp()).n}).</div>`; return; }
  body.innerHTML = '<div class="empty">Carregando o placar da semana…</div>';
  let rows = [];
  try {
    if (WEB) rows = await TB.rank(tab, wk);
    else { const col = DB.collection('ranking');
    if (tab === 'now') {
      const q = await col.where('semana', '==', wk).orderBy('pts', 'desc').limit(200).get();
      rows = q.docs.map(d => ({ id: d.id, ...d.data() }));
    } else {
      const [a, b] = await Promise.all([col.where('semana', '==', wk).limit(300).get(), col.where('semAnt', '==', wk).limit(300).get()]);
      rows = a.docs.map(d => ({ id: d.id, ...d.data() })).concat(b.docs.map(d => { const x = d.data(); return { id: d.id, ...x, pts: x.ptsAnt, vit: x.vitAnt, jogos: x.jogosAnt }; }));
    } }
  } catch (e) { body.innerHTML = '<div class="empty">Não consegui carregar o ranking agora. Tente de novo em instantes.</div>'; return; }
  if (RANK_TAB !== tab) return;
  rows = rows.filter(r => (+r.jogos || 0) > 0).sort((x, y) => (+y.pts || 0) - (+x.pts || 0) || (+y.vit || 0) - (+x.vit || 0));
  if (!rows.length) { body.innerHTML = `<div class="empty">${tab === 'now' ? 'Ninguém pontuou ainda nesta semana. Jogue uma partida e abra o placar.' : 'Ninguém jogou na semana passada.'}</div>`; return; }
  const av = r => ART[CHARS[r.char] ? r.char : 'ze'];
  const nm = r => esc(clean(r.apelido, 16) || 'Jogador');
  const top = rows.slice(0, 3);
  const order = [1, 0, 2].filter(i => top[i]);
  let html = `<div class="podium">${order.map(i => `<div class="pod p${i + 1}"><img src="${av(top[i])}" alt=""><b>${nm(top[i])}</b><small>${+top[i].pts || 0} pts</small><div class="stand">${i + 1}º</div></div>`).join('')}</div>`;
  const myIdx = rows.findIndex(r => r.id === UID);
  const show20 = rows.slice(0, 20);
  const tr = (r, i) => `<tr class="${r.id === UID ? 'me' : ''}"><td>${i + 1}</td><td class="pl"><div><img src="${av(r)}" alt=""><span>${nm(r)}${r.id === UID ? ' (você)' : ''}</span></div></td><td class="pts">${+r.pts || 0}</td><td>${+r.vit || 0}</td><td>${+r.jogos || 0}</td></tr>`;
  html += `<div class="rtable-wrap"><table class="rtable"><thead><tr><th>#</th><th>Jogador</th><th>Pontos</th><th>Vitórias</th><th>Partidas</th></tr></thead><tbody>${show20.map(tr).join('')}${myIdx >= 20 ? `<tr class="gap"><td colspan="5">…</td></tr>${tr(rows[myIdx], myIdx)}` : ''}</tbody></table></div>`;
  body.innerHTML = html;
}
$('#tabNow').onclick = () => openRank('now');
$('#tabPrev').onclick = () => openRank('prev');
async function recordResult(won, online, bonus = 0) {
  const pts = (online ? (won ? 6 : 1) : (won ? LEVELS[G.lvl].pts : 0)) + bonus;
  const xp = pts * 25 + 15;
  STATS.xp += xp; STATS[won ? 'w' : 'l']++; saveStats();
  if (WEB && UID) { try { MYDOC = await TB.record(won, pts, xp); } catch (e) {} }
  else if (DB && UID) {
    try {
      const ref = DB.doc('ranking/' + UID), s = await ref.get(), d = s.exists ? { ...s.data() } : {};
      const wk = weekId();
      if (d.semana !== wk) { if (d.semana) { d.semAnt = d.semana; d.ptsAnt = +d.pts || 0; d.vitAnt = +d.vit || 0; d.jogosAnt = +d.jogos || 0; } d.semana = wk; d.pts = 0; d.vit = 0; d.jogos = 0; }
      d.pts = (+d.pts || 0) + pts; d.vit = (+d.vit || 0) + (won ? 1 : 0); d.jogos = (+d.jogos || 0) + 1;
      d.xp = (+d.xp || 0) + xp; d.apelido = nick(); d.conta = SESSION ? normUser(SESSION.u) : null; d.char = CFG.char; d.at = Date.now();
      await ref.set(d); MYDOC = d;
    } catch (e) {}
  }
  return { pts, xp };
}

/* ---------- Render da mesa ---------- */
let LT = null;          // decisão local em andamento: { kind, res }
let lastRect = null;
let coverMode = false;
function seatName(s) { const x = SEATS[s]; if (!x) return ''; return s === ME && !SPECT ? x.n : x.n; }
function seatRole(s) {
  const x = SEATS[s]; if (!x) return '';
  const bot = x.k === 'bot' && MODE !== 'off' ? ' · bot' : '';
  if (SPECT) return (team(s) === 0 ? 'Dupla 1' : 'Dupla 2') + bot;
  if (s === ME) return 'Você';
  const fem = CHARS[x.c]?.fem;
  return (team(s) === team(ME) ? (fem ? 'Parceira' : 'Parceiro') : (fem ? 'Adversária' : 'Adversário')) + bot;
}
function renderSeatsInfo() {
  for (let s = 0; s < 4; s++) {
    const v = vs(s), x = SEATS[s]; if (!x) continue;
    $('#av' + v).src = ART[x.c] || ART.ze;
    $('#nm' + v).textContent = seatName(s);
    $('#rl' + v).textContent = seatRole(s);
  }
  const my = team(ME);
  [[0, ME], [2, (ME + 2) % 4], [1, (ME + 1) % 4], [3, (ME + 3) % 4]].forEach(([i, s]) => { $('#pf' + i).src = ART[SEATS[s]?.c] || ART.ze; });
  $('#ef0').src = $('#pf0').src; $('#ef2').src = $('#pf2').src; $('#ef1').src = $('#pf1').src; $('#ef3').src = $('#pf3').src;
  ['0', '1', '2', '3'].forEach(i => { $('#sf' + i).src = $('#pf' + i).src; });
  const nm = s => SPECT ? SEATS[s].n : s === ME ? 'Você' : SEATS[s].n;
  $('#sn0').textContent = `${nm(ME)} e ${nm((ME + 2) % 4)}`; $('#sn1').textContent = `${nm((ME + 1) % 4)} e ${nm((ME + 3) % 4)}`;
}
function renderHand() {
  const box = $('#hand');
  if (SPECT) { box.innerHTML = '<div class="watch">Você está assistindo esta partida.</div>'; return; }
  const on = !!(LT && LT.kind === 'play');
  box.innerHTML = (G.h[ME] || []).map((c, i) =>
    `<button class="hc${on && coverMode ? ' covering' : ''}" data-id="${c}" aria-label="${G.bl ? 'Carta fechada ' + (i + 1) : cardLabel(c)}"${on ? '' : ' disabled'}>${G.bl ? BACK : cardHTML(c)}</button>`).join('');
}
function renderSeat(s, count) {
  if (s === ME && !SPECT) return renderHand();
  const f = vs(s) === 0 ? null : fanEl(s); if (!f) return;
  const reveal = G.dez && G.dez.show === s && G.dez.to === ME && !SPECT;
  const cards = G.h[s] || [];
  const n = count ?? cards.length;
  f.classList.toggle('reveal', !!reveal);
  f.innerHTML = reveal ? cards.map(c => cardHTML(c, false)).join('') : BACK.repeat(n);
}
function renderSlots() {
  for (let v = 0; v < 4; v++) { const sl = $('#slot' + v); sl.innerHTML = ''; sl.classList.remove('win'); }
  G.pl.forEach(p => { $('#slot' + vs(p.s)).innerHTML = p.cv ? BACK : cardHTML(p.c); });
}
function renderScore(bump) {
  const my = team(ME);
  $('#pts0').textContent = G.sc[my]; $('#pts1').textContent = G.sc[1 - my];
  [my, 1 - my].forEach((t, i) => {
    const n = Math.min(12, G.sc[t]), box = $('#st' + i);
    if (box.children.length !== 12) box.innerHTML = '<i></i>'.repeat(12);
    [...box.children].forEach((el, k) => { const on = k < n; if (on && !el.classList.contains('on')) { el.classList.add('on', 'lit'); setTimeout(() => el.classList.remove('lit'), 950); } if (!on) el.classList.remove('on', 'lit'); });
    $('#ss' + i).textContent = G.sc[t];
    const w = G.ser ? G.ser.w[t] : 0; $('#sg' + i).innerHTML = `<i class="${w >= 1 ? 'on' : ''}"></i><i class="${w >= 2 ? 'on' : ''}"></i>`;
  });
  if (bump !== undefined) { const i = bump === my ? 0 : 1; ['#pts' + i, '#ss' + i].forEach(sel => { const el = $(sel); el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }); }
}
function renderStatus() {
  const v = $('#value'); let txt = `Vale ${G.v}`;
  if (G.fe) txt = `Mão de ferro${G.bl ? ' · fechada' : ''}`;
  else if (G.md) txt = `Mão de dez · vale ${G.v}`;
  else if (G.v > 2) txt = `${NAME[G.v]} · vale ${G.v}`;
  v.textContent = txt; v.classList.toggle('hot', G.v > 2 && !G.fe);
  const se = $('#serie');
  if (G.ser && G.ser.g) { const mt = team(ME); se.innerHTML = `Jogo ${Math.min(G.ser.g, 3)} de 3 · <i>${G.ser.w[mt]}</i> × <em>${G.ser.w[1 - mt]}</em>`; } else se.textContent = '';
  const my = team(ME), lab = { 0: 'nós', 1: 'eles', t: 'cangou' };
  $('#dots').innerHTML = [0, 1, 2].map(i => {
    const r = G.r[i]; let cls = '', who;
    if (r === 't') { cls = ' dt'; who = 't'; } else if (r === 0 || r === 1) { who = r === my ? 0 : 1; cls = ' d' + who; }
    return `<span class="dot${cls}" title="Vaza ${i + 1}${who !== undefined ? ': ' + lab[who] : ''}"></span>`;
  }).join('');
  for (let s = 0; s < 4; s++) { const n = $('#rl' + vs(s)); const old = n.querySelector('.mao'); if (old) old.remove(); if (s === G.mao && RUN.alive) n.insertAdjacentHTML('beforeend', '<span class="mao">mão</span>'); }
}
function activeSeat() { return G.ask ? G.ask.s : G.turn; }
function setActive() {
  const a = G.over ? -1 : activeSeat();
  for (let s = 0; s < 4; s++) $('#seat' + vs(s)).classList.toggle('active', s === a);
  let hint = '';
  if (LT && LT.kind === 'play') hint = G.bl ? 'Mão fechada. Escolha uma carta no escuro.' : G.vz >= 1 ? 'Sua vez. Escolha uma carta, ou jogue coberta.' : 'Sua vez. Escolha uma carta.';
  else if (a >= 0 && a !== ME && SEATS[a]) hint = `Vez de ${SEATS[a].n}…`;
  else if (a === ME && SPECT && SEATS[a]) hint = `Vez de ${SEATS[a].n}…`;
  $('#hint').textContent = hint;
}
function canCall(t) { return !G.nt && !G.over && !!NEXT[G.v] && G.lr !== t; }
function updateActions() {
  const mine = !!(LT && LT.kind === 'play');
  const bt = $('#btnTruco'); bt.disabled = !(mine && canCall(team(ME))); bt.textContent = NAME[NEXT[G.v]] || 'Truco';
  const bc = $('#btnCover'); bc.disabled = !(mine && G.vz >= 1 && !G.bl); bc.setAttribute('aria-pressed', String(mine && coverMode));
  $('#btnQs').hidden = SPECT;
}
function renderAll() { for (let s = 0; s < 4; s++) renderSeat(s); renderSlots(); renderScore(); renderStatus(); setActive(); updateActions(); updateSigBar(); }

const bubbleTimers = {};
function say(s, text, ms = 1800) {
  const b = $('#bub' + vs(s)); if (!b) return; b.textContent = text; b.classList.add('show');
  clearTimeout(bubbleTimers[s]); bubbleTimers[s] = setTimeout(() => b.classList.remove('show'), ms * Math.max(M, .7));
}
let toastTimer;
function toast(big, small = '', ms = 1500) { const t = $('#toast'); t.querySelector('strong').textContent = big; t.querySelector('span').textContent = small; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), ms * Math.max(M, .7)); }
function stamp(word) { const b = $('#stamp b'); b.textContent = word; b.classList.remove('go'); void b.offsetWidth; b.classList.add('go'); }
function shake() { if (RM) return; $('#table').animate([{ transform: 'translate(0,0)' }, { transform: 'translate(-6px,2px)' }, { transform: 'translate(5px,-3px)' }, { transform: 'translate(-3px,1px)' }, { transform: 'translate(0,0)' }], { duration: 320, easing: 'ease-out' }); }
function fly(html, from, to, { dur = 400, rotFrom = 0, rotTo = 0, fadeOut = false } = {}) {
  const el = document.createElement('div'); el.className = 'flyer'; el.innerHTML = html;
  el.style.left = to.left + 'px'; el.style.top = to.top + 'px'; el.style.width = to.width + 'px'; el.style.setProperty('--cw', to.width + 'px');
  $('#fly').appendChild(el);
  const dx = from.left + from.width / 2 - (to.left + to.width / 2), dy = from.top + from.height / 2 - (to.top + to.height / 2), s = from.width / to.width;
  const an = el.animate([{ transform: `translate(${dx}px,${dy}px) scale(${s}) rotate(${rotFrom}deg)`, opacity: 1 }, { transform: `translate(0,0) scale(1) rotate(${rotTo}deg)`, opacity: fadeOut ? 0 : 1 }], { duration: dur * M, easing: 'cubic-bezier(.2,.8,.25,1)', fill: 'forwards' });
  return an.finished.then(() => el.remove(), () => el.remove());
}
let promptCb = null;
function showPrompt(title, text, options, cb) {
  const p = $('#prompt'); p.querySelector('h3').textContent = title; p.querySelector('p').textContent = text;
  const box = p.querySelector('.opts'); box.innerHTML = ''; delete box.dataset.lock; box.classList.remove('chosen'); promptCb = cb;
  options.forEach((o, i) => {
    const b = document.createElement('button'); b.className = 'btn' + (o.kind ? ' ' + o.kind : '') + (o.sub ? ' optcard' : '');
    if (o.sub) { b.innerHTML = `<b></b><small></small>`; b.querySelector('b').textContent = o.label; b.querySelector('small').textContent = o.sub; } else b.textContent = o.label;
    b.onclick = () => {
      const f = promptCb; if (!f || box.dataset.lock) return; box.dataset.lock = '1';
      b.setAttribute('aria-checked', 'true'); box.classList.add('chosen');
      setTimeout(() => { if (promptCb === f) promptHide(); f(o.value); }, 320);
    };
    box.appendChild(b); if (i === 0) setTimeout(() => b.focus({ preventScroll: true }), 30);
  });
  p.hidden = false;
}
function promptHide() { $('#prompt').hidden = true; $('#promptAdv').hidden = true; promptCb = null; }
function setPromptAdv(s, txt) {
  const el = $('#promptAdv'), x = SEATS[s]; if (!x || $('#prompt').hidden) return;
  el.querySelector('img').src = ART[x.c] || ART.ze; el.querySelector('small').textContent = `${x.n} diz`; el.querySelector('b').textContent = txt; el.hidden = false;
}
// O que o parceiro bot fala da própria mão quando pedem truco
function adviceFor(s) {
  const h = G.h[s] || [], pws = h.map(power).sort((a, b) => b - a);
  if (!h.length) { const b = bestPlay(); return b && !b.tie && b.seat === s ? 'Minha carta tá matando essa!' : 'Já joguei tudo, é com você.'; }
  const man = pws.filter(p => p >= 11).length;
  if (man >= 2) return pick(['Garanto duas!', 'Tenho duas manilhas, pode descer!']);
  if (pws[0] >= 13) return pick(['Garanto uma.', 'Garanto uma, e das grandes!']);
  if (pws[0] >= 9) return pick(['Eu consigo apertar.', 'Dá pra apertar, sô.']);
  if (pws[0] >= 6) return pick(['Tô mais ou menos.', 'Tenho carta média.']);
  return pick(['Não faço nada.', 'Tô sem nada, parceiro.']);
}
/* Sinais entre parceiros de verdade (online) */
const SIGS = ['Garanto uma', 'Consigo apertar', 'Tô mais ou menos', 'Não faço nada'];
let LAST_SIG = null, sigSent = -1;
$('#sigBar .sigs').innerHTML = SIGS.map(t => `<button>${esc(t)}</button>`).join('');
$('#sigBar .sigs').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || !G.ask || !GR) return;
  sigSent = G.ask.id; $('#sigBar').hidden = true; sfx.pop();
  say(ME, b.textContent, 3000);
  GR.presence({ sig: { t: Date.now(), x: b.textContent, to: G.ask.s, ask: G.ask.id } }).catch(() => {});
});
function updateSigBar() {
  const a = G.ask, show = MODE !== 'off' && !SPECT && a && a.k === 'resp' && a.s === (ME + 2) % 4 && SEATS[a.s] && SEATS[a.s].k !== 'bot' && sigSent !== a.id && SCREEN === 'scrGame';
  $('#sigBar').hidden = !show;
}
function onSig(peer, sig) {
  if (!sig || typeof sig.x !== 'string' || sig.to !== ME || SPECT) return;
  const s = SEATS.findIndex(x => x && x.p === peer); if (s < 0 || team(s) !== team(ME)) return;
  const x = clean(sig.x, 30); if (!SIGS.includes(x)) return;
  LAST_SIG = { x, ask: sig.ask }; say(s, x, 4200); sfx.pop();
  if (LT && LT.kind === 'resp') setPromptAdv(s, x);
}

/* ---------- Animações dos eventos (iguais pra quem roda e pra quem assiste) ---------- */
async function applyEv(e) {
  if (!e || typeof e !== 'object') return;
  const s = +e.s;
  switch (e.k) {
    case 'reset': promptHide(); renderAll(); break;
    case 'deal': {
      for (let i = 0; i < 4; i++) { if (i === ME && !SPECT) $('#hand').innerHTML = ''; else renderSeat(i, 0); }
      renderSlots(); renderStatus();
      const deckEl = $('#deck'); deckEl.hidden = false; await wait(250);
      const dr = centerRect(deckEl, CW.slot()), cnt = [0, 0, 0, 0], ps = [];
      for (let k = 0; k < 3; k++) for (let i = 0; i < 4; i++) {
        const t = (G.mao + i) % 4; sfx.snap(.55);
        ps.push(fly(BACK, dr, seatTarget(t), { dur: 320, rotFrom: rand(-25, 25) }).then(() => { cnt[t]++; if (t === ME && !SPECT) { if (cnt[t] === 3) renderHand(); } else renderSeat(t, cnt[t]); }));
        await wait(80);
      }
      await Promise.all(ps); deckEl.hidden = true; break;
    }
    case 'play': {
      let from = seatTarget(s);
      if (s === ME && !SPECT) { if (lastRect) from = lastRect; lastRect = null; }
      renderSeat(s);
      const slot = $('#slot' + vs(s)), html = e.cv ? BACK : cardHTML(e.c);
      sfx.snap(1);
      await fly(G.bl ? BACK : html, from, centerRect(slot, CW.slot()), { dur: 380, rotFrom: s === ME ? 0 : rand(-35, 35) });
      slot.innerHTML = html;
      if (G.bl && slot.firstElementChild) { slot.firstElementChild.classList.add('flipin'); sfx.snap(.6); }
      if (e.say) say(s, e.say);
      break;
    }
    case 'turn': setActive(); break;
    case 'shout': {
      const word = NAME[e.val].toUpperCase() + '!';
      say(s, e.txt || word, 1900); stamp(word); sfx.thump(); shake();
      renderStatus(); await wait(1150); break;
    }
    case 'resp': {
      say(s, e.txt); if (e.a !== 'run') sfx.clink(.8);
      renderStatus(); await wait(800); break;
    }
    case 'say': if (e.to === undefined || (e.to === ME && !SPECT)) say(s, e.txt, e.ms || 2200); if (e.wait) await wait(e.wait); break;
    case 'toast': toast(e.a, e.b || '', e.ms || 1500); if (e.ms) await wait(e.ms); break;
    case 'status': renderStatus(); break;
    case 'vaza': {
      renderStatus();
      if (e.res !== 't') { $('#slot' + vs(e.next)).classList.add('win'); sfx.clink(); if (e.say) say(e.next, e.say); }
      else toast('Cangou!', 'Empate nessa vaza', 1100);
      await wait(1050);
      const dest = e.res === 't' ? centerRect($('#center'), CW.slot()) : seatTarget(e.next), ps = [];
      for (let v = 0; v < 4; v++) {
        const sl = $('#slot' + v); if (!sl.innerHTML) continue;
        const html = sl.innerHTML, from = centerRect(sl, CW.slot()); sl.innerHTML = ''; sl.classList.remove('win');
        ps.push(fly(html, from, dest, { dur: 420, fadeOut: true, rotTo: rand(-20, 20) }));
      }
      sfx.swish(); await Promise.all(ps); break;
    }
    case 'award': {
      renderScore(e.t); const mine = e.t === team(ME) && !SPECT;
      toast(SPECT ? `Dupla ${e.t + 1} levou ${e.pts}` : `${mine ? 'Nós levamos' : 'Eles levaram'} ${e.pts}`, e.why || '');
      if (mine || (SPECT && e.t === 0)) sfx.win(); else sfx.lose();
      await wait(1700); break;
    }
    case 'end': await showEnd(); break;
    case 'gameend': await showGameEnd(e.t); break;
  }
}

/* ---------- Motor do jogo (roda no modo offline e no anfitrião) ---------- */
let SEQ = 0;
function deck() { return shuffle(ALL.slice()); }
function bestPlay() {
  if (!G.pl.length) return null;
  const pw = p => p.cv ? -1 : power(p.c);
  const max = Math.max(...G.pl.map(pw)), top = G.pl.filter(p => pw(p) === max);
  return { pw: max, seat: top[0].s, tie: new Set(top.map(p => team(p.s))).size > 1 || max < 0 };
}
function winnerOf(r) {
  if (r.length < 2) return undefined;
  const [a, b, c] = r;
  if (a !== 't') { if (b === a || b === 't') return a; if (r.length < 3) return undefined; return c === 't' ? a : c; }
  if (b !== 't') return b;
  if (r.length < 3) return undefined;
  return c === 't' ? 'none' : c;
}
const isHuman = s => SEATS[s] && SEATS[s].k !== 'bot';
function lineFor(s, cat, val) { if (isHuman(s)) return cat === 'call' ? NAME[val].toUpperCase() + '!' : cat === 'run' ? 'Corro.' : 'Desce!'; return cat === 'call' ? pick(L.call[val]) : pick(L[cat]); }
function responder(rt, caller) {
  const cands = [(caller + 1) % 4, (caller + 3) % 4].filter(x => team(x) === rt);
  const h = cands.find(isHuman); if (h !== undefined) return h;
  return seatW(cands[0]) >= seatW(cands[1]) ? cands[0] : cands[1];
}
const TURN_MS = 40000;
let ASKN = 0, pending = null, askDL = 0, askDLid = -1;

// Cada partida ganha seu próprio motor; parar a partida derruba só ele.
function startEngine() {
  stopMatch();
  const run = { alive: true };
  run.stopP = new Promise((_, rej) => { run.stop = () => rej(ABORT); }); run.stopP.catch(() => {});
  RUN = run;
  const chk = () => { if (!run.alive) throw ABORT; };
  const W = async ms => { await wait(ms); chk(); };
  async function E(e) { chk(); if (MODE === 'host') pub(e); await applyEv(e); chk(); renderAll(); }
  async function award(t, pts, why) {
    if (MEMO.pending) { MEMO.n++; if (MEMO.pending.w < 2.4) MEMO.bl++; MEMO.pending = null; }
    G.sc[t] += pts; G.over = true; G.ask = null; G.turn = -1; G.h = [[], [], [], []]; G.pl = []; G.dez = null;
    await E({ k: 'award', t, pts, why });
  }
  async function decide(s, kind, ctx = {}) {
    chk();
    const k = SEATS[s].k;
    if (k === 'bot') { await W(kind === 'play' ? rand(550, 950) : rand(700, 1150)); return botPick(s, kind, ctx); }
    if (MODE === 'off') { const v = await Promise.race([localDecide(kind, ctx), run.stopP]); chk(); return v; }
    // online: vale o relógio de 40 s, pra você e pros convidados
    const id = ++ASKN;
    G.ask = { s, k: kind, id, ms: TURN_MS, next: ctx.next || 0, by: ctx.by ?? -1, adv: ctx.adv || null };
    askDL = Date.now() + TURN_MS; askDLid = id;
    pub(null); renderAll();
    const v = await Promise.race([new Promise(res => {
      const timer = setTimeout(() => finish(botPick(s, kind, ctx), true), TURN_MS);
      function finish(val, timedOut) { if (!pending || pending.id !== id) return; clearTimeout(timer); pending = null; if (timedOut && s === ME) { cancelLocal(); snack('Seu tempo acabou. O bot jogou por você.'); } res(val); }
      pending = { id, s, kind, finish };
      if (k === 'me') localDecide(kind, ctx).then(val => finish(val, false));
    }), run.stopP]);
    G.ask = null; askDL = 0;
    chk();
    return v;
  }
  async function playHand() {
    Object.assign(G, { blf: {}, v: 2, lr: -1, r: [], pl: [], over: false, md: false, nt: false, vz: 0, fe: false, bl: false, seen: [], ask: null, dez: null, turn: -1, h: [[], [], [], []] });
    await E({ k: 'reset' });
    const at = [G.sc[0] === 10, G.sc[1] === 10];
    if (at[0] && at[1]) {
      G.nt = true; G.fe = true;
      const chooser = MODE === 'off' ? 0 : ME;
      await E({ k: 'say', s: (chooser + 2) % 4, txt: 'Mão de ferro, sô!' });
      const mode = await decide(chooser, 'ferro');
      G.bl = mode === 'blind';
      await E({ k: 'toast', a: G.bl ? 'Mão fechada' : 'Mão de ferro aberta', b: G.bl ? 'Seja o que Deus quiser!' : 'Sem truco. Quem fizer, leva.', ms: 1600 });
    }
    const d = deck(); for (let k = 0; k < 3; k++) for (let i = 0; i < 4; i++) G.h[(G.mao + i) % 4].push(d.pop());
    if (!G.bl) G.h.forEach(h => h.sort((a, b) => power(a) - power(b)));
    await E({ k: 'deal' });
    if (!G.fe && (at[0] || at[1])) {
      G.nt = true; G.md = true; const t = at[0] ? 0 : 1;
      const dec = [t, t + 2].find(isHuman) ?? t, partner = (dec + 2) % 4;
      G.dez = { to: dec, show: partner };
      await E({ k: 'say', s: partner, txt: 'Ó minhas cartas, parceiro.', ms: 2600 });
      const go = await decide(dec, 'dez');
      G.dez = null;
      if (!go) { await E({ k: 'say', s: dec, txt: isHuman(dec) ? 'Corremo.' : 'Essa num dá. Corremo.', wait: 900 }); await award(1 - t, 2, 'Correram na mão de dez'); return; }
      G.v = 4; await E({ k: 'say', s: dec, txt: 'Vamo jogar essa!', wait: 900 });
    }
    let leader = G.mao;
    for (let v = 0; v < 3; v++) {
      G.vz = v; G.pl = [];
      for (let i = 0; i < 4; i++) { await turn((leader + i) % 4); if (G.over) return; }
      G.turn = -1;
      const b = bestPlay(), res = b.tie ? 't' : team(b.seat);
      G.r.push(res);
      const winSay = res !== 't' && SEATS[b.seat].k === 'bot' && Math.random() < .45 ? pick(L.win) : null;
      G.pl = [];
      await E({ k: 'vaza', res, next: b.seat, say: winSay });
      leader = b.seat;
      const w = winnerOf(G.r);
      if (w !== undefined) {
        if (w === 'none') { G.over = true; G.h = [[], [], [], []]; await E({ k: 'toast', a: 'Cangou tudo!', b: 'Ninguém pontua nessa mão', ms: 1800 }); }
        else await award(w, G.v, MODE === 'off' ? (w === 0 ? 'As vazas são nossas' : 'Eles fizeram as vazas') : `Dupla de ${SEATS[w].n} e ${SEATS[w + 2].n}`);
        return;
      }
    }
  }
  async function turn(s) {
    G.turn = s;
    await E({ k: 'turn', s });
    for (let guard = 0; guard < 6; guard++) {
      let d = await decide(s, 'play');
      if (d && d.truco) {
        if (canCall(team(s))) { await trucoSequence(s); if (G.over) return; G.turn = s; await E({ k: 'turn', s }); }
        continue;
      }
      if (!d || !G.h[s].includes(d.c)) d = botChoose(s);
      const cv = !!d.cv && G.vz >= 1 && !G.bl;
      G.h[s] = G.h[s].filter(x => x !== d.c);
      G.pl.push({ s, c: d.c, cv });
      if (!cv) G.seen.push(d.c);
      let line = null;
      if (SEATS[s].k === 'bot') { if (!cv && !G.bl && power(d.c) === 14 && Math.random() < .75) line = pick(L.zap); else if (cv) line = pick(L.cover); }
      await E({ k: 'play', s, c: d.c, cv, say: line });
      return;
    }
    const d = botChoose(s); G.h[s] = G.h[s].filter(x => x !== d.c); G.pl.push({ s, c: d.c, cv: false }); await E({ k: 'play', s, c: d.c, cv: false });
  }
  async function trucoSequence(caller) {
    let ct = team(caller), next = NEXT[G.v], seat = caller;
    if (isHuman(caller)) MEMO.pending = { w: seatW(caller) };
    await E({ k: 'shout', s: seat, val: next, txt: lineFor(seat, 'call', next) });
    while (true) {
      const rt = 1 - ct, rs = responder(rt, seat);
      let adv = null;
      const pa = (rs + 2) % 4;
      if (isHuman(rs) && SEATS[pa].k === 'bot') { adv = adviceFor(pa); await E({ k: 'say', s: pa, txt: adv, to: rs, ms: 4200 }); }
      let resp = await decide(rs, 'resp', { next, by: seat, adv });
      if (!['accept', 'run', 'raise'].includes(resp)) resp = 'accept';
      if (resp === 'raise' && !NEXT[next]) resp = 'accept';
      if (resp === 'raise' && isHuman(rs)) MEMO.pending = { w: seatW(rs) };
      if (resp === 'run') { MEMO.pending = null; await E({ k: 'resp', s: rs, a: 'run', txt: lineFor(rs, 'run') }); await award(ct, G.v, 'A outra dupla correu'); return; }
      if (resp === 'accept') { G.v = next; G.lr = ct; await E({ k: 'resp', s: rs, a: 'accept', txt: lineFor(rs, 'accept') }); return; }
      G.v = next; next = NEXT[next]; ct = rt; seat = rs;
      await E({ k: 'shout', s: seat, val: next, txt: lineFor(seat, 'call', next) });
    }
  }
  (async () => {
    try {
      G.mid = Math.random().toString(36).slice(2, 9);
      G.ser = { w: [0, 0], g: 0, hist: [] };
      let mao = Math.floor(Math.random() * 4);
      // melhor de 3: quem ganhar dois jogos leva a disputa
      while (G.ser.w[0] < 2 && G.ser.w[1] < 2) {
        G.ser.g++;
        G.sc = [0, 0]; G.mao = mao; G.over = false; G.r = []; G.pl = []; G.h = [[], [], [], []]; G.v = 2; G.ask = null; G.turn = -1;
        await E({ k: 'reset' });
        const partner = (ME + 2) % 4;
        if (G.ser.g === 1 && MODE === 'off') await E({ k: 'say', s: partner, txt: 'Bora, parceiro! Embaralha esse trem.', wait: 900 });
        await E({ k: 'toast', a: `Jogo ${G.ser.g}`, b: G.ser.g === 3 ? 'Negra! Quem ganhar leva tudo.' : 'Melhor de 3 · até 12 pontos', ms: 1500 });
        while (true) {
          await playHand();
          if (G.sc[0] >= 12 || G.sc[1] >= 12) break;
          G.mao = (G.mao + 1) % 4; await W(500);
        }
        const gw = G.sc[0] >= 12 ? 0 : 1;
        G.ser.w[gw]++; G.ser.hist.push(G.sc.slice());
        mao = (G.mao + 1) % 4;
        G.over = true; G.turn = -1; G.ask = null;
        if (G.ser.w[0] < 2 && G.ser.w[1] < 2) await E({ k: 'gameend', t: gw });
      }
      await E({ k: 'end' });
    } catch (err) { if (err !== ABORT) console.error(err); }
    finally { run.alive = false; }
  })();
}

/* ---------- Decisões: bot, você aqui, ou um jogador online ---------- */
function validAnswer(s, kind, v) {
  if (kind === 'play') { if (v && v.truco) return { truco: 1 }; if (v && validCard(v.c) && G.h[s].includes(v.c)) return { c: v.c, cv: !!v.cv }; return null; }
  if (kind === 'resp') return ['accept', 'run', 'raise'].includes(v) ? v : null;
  if (kind === 'dez') return typeof v === 'boolean' ? v : null;
  if (kind === 'ferro') return v === 'open' || v === 'blind' ? v : null;
  return null;
}
function localDecide(kind, ctx = {}) {
  cancelLocal();
  return new Promise(res => {
    const done = v => { if (!LT || LT.res !== done) return; LT = null; coverMode = false; promptHide(); renderHand(); updateActions(); setActive(); res(v); };
    LT = { kind, res: done };
    if (kind === 'play') { coverMode = false; renderHand(); updateActions(); setActive(); return; }
    if (kind === 'resp') {
      const opts = [{ label: 'Desce', value: 'accept' }, { label: 'Corro', value: 'run', kind: 'redb' }];
      if (NEXT[ctx.next]) opts.push({ label: NAME[NEXT[ctx.next]], value: 'raise', kind: 'gold' });
      const by = SEATS[ctx.by]?.n || 'Alguém';
      setTimeout(() => { if (ctx.adv) setPromptAdv((ME + 2) % 4, ctx.adv); else if (LAST_SIG && LAST_SIG.ask === G.ask?.id) setPromptAdv((ME + 2) % 4, LAST_SIG.x); }, 0);
      showPrompt(`${by} pediu ${NAME[ctx.next].toLowerCase()}!`, `Aceitando, a mão vale ${ctx.next}. Se correr, a outra dupla leva ${G.v}.`, opts, done);
    } else if (kind === 'dez') {
      renderAll();
      const p = SEATS[(ME + 2) % 4]?.n || 'seu parceiro';
      showPrompt('Mão de dez!', `Sua dupla está com 10. Olhe as cartas de ${p}: jogando, a mão vale 4. Correndo, a outra dupla leva 2.`, [{ label: 'Jogar', value: true }, { label: 'Correr', value: false, kind: 'redb' }], done);
    } else if (kind === 'ferro') {
      showPrompt('Mão de ferro!', 'As duas duplas estão com 10 e quem fizer essa mão leva a partida. Sem truco. Jogar aberto, ou fechado, com as cartas viradas e ninguém sabendo o que tem?', [{ label: 'Aberto', sub: 'Cada um vê a própria mão', value: 'open' }, { label: 'Fechado', sub: 'Cartas viradas, no escuro', value: 'blind' }], done);
    }
  });
}
function cancelLocal() { if (!LT) return; LT = null; coverMode = false; promptHide(); renderHand(); updateActions(); setActive(); }
$('#hand').addEventListener('click', e => {
  const b = e.target.closest('.hc'); if (!b || b.disabled || !LT || LT.kind !== 'play') return;
  lastRect = b.getBoundingClientRect(); b.classList.add('picked');
  $$('#hand .hc').forEach(x => { x.disabled = true; });
  LT.res({ c: b.dataset.id, cv: coverMode && G.vz >= 1 && !G.bl });
});
$('#btnTruco').onclick = () => { if (LT && LT.kind === 'play' && canCall(team(ME))) LT.res({ truco: 1 }); };
$('#btnCover').onclick = () => { if (!LT || LT.kind !== 'play' || G.vz < 1 || G.bl) return; coverMode = !coverMode; renderHand(); updateActions(); };
document.addEventListener('keydown', e => {
  if (SCREEN !== 'scrGame' || e.target.closest('input,textarea,select')) return;
  if (['1', '2', '3'].includes(e.key)) { const b = $$('#hand .hc')[+e.key - 1]; if (b) b.click(); }
  else if (e.key === 't' || e.key === 'T') $('#btnTruco').click();
  else if (e.key === 'c' || e.key === 'C') $('#btnCover').click();
});
// relógio da jogada online
setInterval(() => {
  for (let v = 0; v < 4; v++) $('#tm' + v).hidden = true;
  if (MODE === 'off' || !G.ask || !askDL || SCREEN !== 'scrGame') return;
  const left = Math.max(0, askDL - Date.now()), el = $('#tm' + vs(G.ask.s));
  el.hidden = false; el.querySelector('span').textContent = Math.ceil(left / 1000); el.style.setProperty('--p', (left / TURN_MS * 100) + '%');
}, 250);

/* ---------- Cabeça dos bots ---------- */
const LV = () => LEVELS[G.lvl] || LEVELS[1];
function cardW(p) { return p >= 11 ? 3 + (p - 11) * .3 : p >= 9 ? 1.5 + (p - 9) * .5 : p >= 6 ? .7 : p >= 0 ? .25 : 0; }
function seatW(s) { const h = G.h[s]; if (!h || !h.length) return 0; return h.reduce((a, c) => a + cardW(power(c)), 0) / h.length * 3; }
function unseenStronger(s, pw) { return ALL.filter(c => power(c) > pw && !G.seen.includes(c) && !G.h[s].includes(c)).length; }
function teamOutlook(t, s) {
  const w = [t, t + 2].map(seatW).sort((a, b) => b - a);
  let o = w[0] + .4 * w[1];
  for (let i = 0; i < 2; i++) { if (G.r[i] === t) o += 2.2; else if (G.r[i] === 1 - t) o -= 2.6; }
  const b = bestPlay(); if (b && !b.tie) o += team(b.seat) === t ? b.pw / 5 : -b.pw / 6;
  if (LV().nm === 'Mestre' && s !== undefined && G.h[s].length) { const top = Math.max(...G.h[s].map(power)); if (unseenStronger(s, top) === 0) o += 2.5; }
  return o + rand(-LV().noise, LV().noise);
}
// Chance estimada de a dupla levar a mão (0 a 1)
function winProb(t, s) { return 1 / (1 + Math.exp(-(teamOutlook(t, s) - 5.4) / 1.25)); }
// O que os bots aprendem do jeito de trucar das pessoas (só nas mãos jogadas até o fim, quando as cartas aparecem)
const MEMO = { n: 0, bl: 0, pending: null };
const humanBluffRate = () => (MEMO.bl + 1) / (MEMO.n + 4);
function botStyle(s) { const ch = CHARS[SEATS[s].c] || CHARS.ze, L = LV(); return { bluff: (ch.bluff + L.bluff) * .8, aggr: ch.aggr, skill: 1 - L.rnd * 2 }; }
// > 0: a dupla precisa arriscar (atrás e o outro lado perto de fechar) · < 0: melhor segurar (na frente e perto de fechar)
function pressure(t) {
  const me = G.sc[t], op = G.sc[1 - t]; let p = 0;
  if (op >= 8 && op - me >= 4) p += .5 + (op - 8) * .12;
  else if (op - me >= 6) p += .3;
  if (me >= 8 && me - op >= 4) p -= .35;
  return p;
}
const bluffing = s => !!(G.blf && (G.blf[s] || G.blf[(s + 2) % 4]));
function botWantsTruco(s) {
  const t = team(s), st = botStyle(s), p = winProb(t, s), pr = pressure(t), next = NEXT[G.v], b = bestPlay();
  const myBest = Math.max(...G.h[s].map(power));
  if (G.pl.length === 3 && b && myBest > b.pw && winnerOf([...G.r, t]) === t) return Math.random() < .85;
  const opWins = G.sc[1 - t] + next >= 12, meWins = G.sc[t] + next >= 12;
  // jogo de verdade: quanto melhor a mão, mais vontade de trucar
  let val = p > .72 ? .5 + (p - .72) * 1.6 : p > .6 ? .15 + (p - .6) * 2.5 : 0;
  if (p > .85 && G.vz === 0 && Math.random() < .35 * st.skill) val = 0;   // segura a mão boa pra pegar o outro depois
  if (meWins) val *= 1.2;
  val *= 1 + st.aggr * .25 - Math.min(0, pr) * .3;
  // blefe: mão fraca ou média, mais quando precisa arriscar e quando a mesa ajuda a parecer verdade
  let bl = 0;
  if (p < .6) {
    bl = st.bluff * (p < .45 ? 1 : .55) * (1 + Math.max(0, pr) * 1.6) * (1 + st.aggr * .4);
    if (G.vz >= 1 && G.r[0] === t) bl *= 1.6;
    if (G.vz === 2) bl *= 1.3;
    if (b && team(b.seat) !== t && b.pw >= 11) bl *= .4;
    if (opWins) bl *= .35;
    if (pr < 0) bl *= .5;
  }
  const roll = Math.random();
  if (roll < val) return true;
  if (roll < val + bl) { G.blf = G.blf || {}; G.blf[s] = true; return true; }
  return false;
}
function botRespond(s, ctx) {
  const t = team(s), st = botStyle(s), L = LV(), cur = G.v, next = ctx.next, pr = pressure(t);
  const raw = winProb(t, s);
  // quem trucou costuma ter jogo, a não ser que goste de blefar
  const br = ctx.by >= 0 && isHuman(ctx.by) ? humanBluffRate() : .22;
  const p = raw * (1 - .3 * (1 - br) * (L.nm === 'Fácil' ? .5 : 1));
  // foi blefe nosso e o outro lado aumentou: quase sempre corre, às vezes banca o blefe
  if (bluffing(s) && raw < .5) {
    const hold = .08 + Math.max(0, st.aggr) * .12 + Math.max(0, pr) * .2;
    if (Math.random() < hold) return NEXT[next] && Math.random() < .4 ? 'raise' : 'accept';
    return 'run';
  }
  // conta da aposta: correr entrega o valor atual; aceitar arrisca o próximo
  let need = (next - cur) / (2 * next) + .08 - st.aggr * .06;
  if (G.sc[1 - t] + next >= 12 && G.sc[1 - t] + cur < 12) need += .1;
  if (G.sc[t] + next >= 12) need -= .06;
  need -= pr * .12;
  need += rand(-L.noise, L.noise) * .04;
  let res = p > need ? 'accept' : 'run';
  if (NEXT[next] && p > .7 + rand(0, .1) && Math.random() < .5 + st.aggr * .2) res = 'raise';
  if (res === 'accept' && NEXT[next] && raw < .4 && Math.random() < st.bluff * .5 * (1 + Math.max(0, pr))) { res = 'raise'; G.blf = G.blf || {}; G.blf[s] = true; }
  if (Math.random() < L.rnd * .5) res = Math.random() < .5 ? 'accept' : 'run';
  return res;
}
function botChoose(s) {
  if (G.bl || Math.random() < LV().rnd) return { c: pick(G.h[s]) };
  const hand = [...G.h[s]].sort((a, b) => power(a) - power(b));
  const t = team(s), v = G.vz, low = hand[0], high = hand[hand.length - 1];
  const coverLow = () => v >= 1 && power(low) <= 4 && Math.random() < .5;
  const best = bestPlay(), after = 3 - G.pl.length;
  if (!best) {
    if (v === 0) { if (hand.length === 3 && power(high) >= 11 && power(hand[1]) >= 9) return { c: hand[0] }; return { c: hand[Math.min(1, hand.length - 1)] }; }
    if (G.r[0] === t) return power(high) >= 8 ? { c: high } : { c: low, cv: coverLow() };
    return { c: high };
  }
  if (team(best.seat) === t && !best.tie) return { c: low, cv: coverLow() };
  const winners = hand.filter(c => power(c) > best.pw);
  if (winners.length) { if (after === 0 || winners.length === 1) return { c: winners[0] }; return { c: power(winners[0]) < 8 ? winners[1] : winners[0] }; }
  const ties = hand.filter(c => power(c) === best.pw);
  if (ties.length && best.pw < 11 && (v === 0 || G.r[0] === t)) return { c: ties[0] };
  return { c: low, cv: coverLow() };
}
function botPick(s, kind, ctx = {}) {
  if (kind === 'play') { if (canCall(team(s)) && SEATS[s].k === 'bot' && botWantsTruco(s)) return { truco: 1 }; return botChoose(s); }
  if (kind === 'resp') return botRespond(s, ctx);
  if (kind === 'dez') { const t = team(s); return winProb(t, s) > .3 + (G.sc[1 - t] + 4 >= 12 ? .12 : 0) - pressure(t) * .1 + rand(-LV().noise, LV().noise) * .03; }
  if (kind === 'ferro') return 'open';
}

/* ---------- Início das partidas ---------- */
function botSeat(c) { return { k: 'bot', n: CHARS[c].name, c }; }
async function loadingScreen(ms = 1100) {
  show('scrLoad'); $('#loadTip').textContent = pick(TIPS);
  const bar = $('#loadBar'); bar.style.transition = 'none'; bar.style.width = '0'; void bar.offsetWidth;
  bar.style.transition = `width ${ms}ms cubic-bezier(.3,.7,.4,1)`; bar.style.width = '100%';
  await sleep(RM ? 300 : ms);
}
async function startOffline() {
  stopMatch();
  MODE = 'off'; ME = 0; SPECT = false; G.lvl = CFG.lvl; TOUR_PLAY = false;
  const others = shuffle(Object.keys(CHARS).filter(k => k !== CFG.char));
  SEATS = [{ k: 'me', n: nick(), c: CFG.char }, botSeat(others[0]), botSeat(others[1]), botSeat(others[2])];
  await loadingScreen();
  enterGameView(`Contra bots · ${LEVELS[G.lvl].nm}`);
  startEngine();
}
function enterGameView(label) {
  if (MODE !== 'off') { sysChat('A partida começou. Boa sorte, sô!'); UNREAD = 0; $('#chatBadge').hidden = true; $('#gChat').classList.remove('open'); setTimeout(updateChatWho, 50); }
  $('#gMode').textContent = label;
  $('#endScreen').hidden = true; promptHide();
  G.sc = [0, 0]; G.h = [[], [], [], []]; G.pl = []; G.r = []; G.v = 2; G.ask = null; G.turn = -1; G.over = false; G.ser = null;
  renderSeatsInfo(); show('scrGame'); renderAll(); fitTable();
}
function stopMatch() { RUN.alive = false; if (RUN.stop) RUN.stop(); if (SER_CLOSE) SER_CLOSE(); $('#serScreen').hidden = true; cancelLocal(); pending = null; G.ask = null; askDL = 0; $$('.bubble').forEach(b => b.classList.remove('show')); }
$('#gExit').onclick = () => {
  const online = MODE !== 'off';
  const txt = MODE === 'host' ? 'A partida acaba pra todo mundo da sala e vocês voltam pra sala.' : MODE === 'client' ? 'Um bot assume o seu lugar e você sai da sala.' : TOUR_PLAY ? 'Você volta pra chave do torneio. A partida recomeça do zero quando você voltar a jogar.' : 'A partida em andamento não conta pro ranking.';
  message('Sair da partida?', txt, [{ label: 'Continuar jogando' }, { label: 'Sair', kind: 'redb', fn: () => {
    if (MODE === 'host') { stopMatch(); LOB.st = 'lobby'; hostPub(); show('scrSala'); renderSala(); }
    else if (MODE === 'client') { stopMatch(); leaveSala(); show('scrOnline'); }
    else if (TOUR_PLAY) { stopMatch(); TOUR_PLAY = false; openTour(); }
    else { stopMatch(); show('scrMenu'); }
  } }]);
};

/* ---------- Intervalo entre jogos da série ---------- */
let SER_CLOSE = null;
function serHistHTML() {
  const mt = team(ME);
  return (G.ser?.hist || []).map((h, i) => `<span>Jogo ${i + 1}: <b>${h[mt]} × ${h[1 - mt]}</b></span>`).join('');
}
function showGameEnd(t) {
  return new Promise(res => {
    const mt = team(ME), we = t === mt && !SPECT, w = G.ser.w;
    $('#serTag').textContent = `Melhor de 3 · jogo ${G.ser.g} encerrado`;
    $('#serTitle').textContent = SPECT ? `Dupla ${t + 1} venceu o jogo ${G.ser.g}` : we ? `Jogo ${G.ser.g} é nosso!` : `Perdemos o jogo ${G.ser.g}`;
    const last = w[0] === 1 && w[1] === 1;
    $('#serScript').textContent = last ? 'Vai pra negra! Quem ganhar leva.' : we ? 'Mais um e a disputa é nossa.' : 'Calma, sô. Ainda dá pra virar.';
    $('#serA').textContent = w[mt]; $('#serB').textContent = w[1 - mt];
    const el = $(we ? '#serA' : '#serB'); el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
    $('#serHist').innerHTML = serHistHTML();
    if (we) sfx.win(); else playSample('perdeu', .9);
    let left = 6;
    const nx = $('#serNext'), box = $('#serBtns'); box.innerHTML = '';
    const tick = () => { nx.textContent = `O jogo ${G.ser.g + 1} começa em ${left}…`; };
    tick();
    const iv = setInterval(() => { left--; if (left <= 0) close(); else tick(); }, 1000 * Math.max(M, .6));
    function close() { clearInterval(iv); SER_CLOSE = null; $('#serScreen').hidden = true; res(); }
    SER_CLOSE = close;
    if (MODE !== 'client') { const b = document.createElement('button'); b.className = 'btn redb'; b.textContent = `Começar o jogo ${G.ser.g + 1}`; b.onclick = close; box.appendChild(b); setTimeout(() => b.focus(), 30); }
    $('#serScreen').hidden = false;
  });
}

/* ---------- Fim de partida ---------- */
let RECORDED = '';
async function showEnd() {
  const my = team(ME), SW = G.ser ? G.ser.w : [G.sc[0] >= 12 ? 1 : 0, G.sc[1] >= 12 ? 1 : 0], weWon = SW[my] > SW[1 - my];
  if (SPECT) {
    $('#endTitle').textContent = `Dupla ${SW[0] > SW[1] ? 1 : 2} venceu`; $('#endScript').textContent = 'Que disputa, sô!';
  } else {
    $('#endTitle').textContent = weWon ? 'Vitória!' : 'Não foi dessa vez';
    $('#endScript').textContent = weWon ? 'Boa jogada, sô!' : 'Faz parte, uai.';
  }
  $('#es0').textContent = SW[my]; $('#es1').textContent = SW[1 - my];
  $('#endHist').innerHTML = serHistHTML();
  const p = SEATS[(ME + 2) % 4], o1 = SEATS[(ME + 1) % 4], o2 = SEATS[(ME + 3) % 4];
  $('#endText').textContent = SPECT ? '' : weWon ? `Você e ${p.n} levaram a melhor de 3. A saideira é por conta deles.` : `${o1.n} e ${o2.n} levaram a melhor de 3. Embaralha de novo e mostra quem manda nessa mesa.`;
  $('#endReward').innerHTML = '';
  let tourNow = null;
  if (MODE === 'off' && TOUR_PLAY && TOUR && TOUR.st === 'play') {
    const cur = TOUR.cur, rr = TOUR_ROUNDS[cur], mm0 = myMatch(), oppT = TOUR.teams[mm0.a === TOUR.me ? mm0.b : mm0.a];
    if (RECORDED !== G.mid) tourResult(weWon, SW[my], SW[1 - my]);
    tourNow = { cur, champ: TOUR.st === 'champ' };
    $('#endTitle').textContent = tourNow.champ ? 'Campeões!' : weWon ? 'Vitória!' : 'Fim da linha';
    $('#endScript').textContent = tourNow.champ ? 'A taça da Pampulha é de vocês, sô!' : weWon ? 'Bora pra próxima fase!' : 'O torneio acabou pra vocês.';
    $('#endText').textContent = tourNow.champ ? `Você e ${p.n} venceram a final e levaram o Torneio da Pampulha.` : weWon ? `Vocês venceram ${rr.a} contra ${oppT.n} e avançaram pra ${TOUR_ROUNDS[cur + 1].a.replace(/^as? /, '')}.` : `${oppT.n} venceu vocês ${rr.em}.`;
  }
  if (tourNow && tourNow.champ) playSample('torneio', 1, true);
  else if (weWon || SPECT) playSample('partida', 1, true);
  else playSample('perdeu', 1, true);
  if (!SPECT && RECORDED !== G.mid) {
    RECORDED = G.mid;
    const bonus = tourNow && tourNow.champ ? TOUR_BONUS : 0;
    recordResult(weWon, MODE !== 'off', bonus).then(r => { $('#endReward').innerHTML = `<span>+${r.pts} ${r.pts === 1 ? 'ponto' : 'pontos'} na semana</span><span>+${r.xp} XP</span>${bonus ? `<span>Inclui +${bonus} de campeão</span>` : ''}`; });
  }
  const box = $('#endBtns'); box.innerHTML = '';
  const add = (label, kind, fn) => { const b = document.createElement('button'); b.className = 'btn' + (kind ? ' ' + kind : ''); b.textContent = label; b.onclick = fn; box.appendChild(b); return b; };
  if (MODE === 'off' && tourNow) {
    add('Ver a chave', '', () => { $('#endScreen').hidden = true; TOUR_PLAY = false; openTour(); }).focus();
    add('Menu', 'ghost', () => { $('#endScreen').hidden = true; TOUR_PLAY = false; show('scrMenu'); });
  } else if (MODE === 'off') {
    add('Jogar novamente', '', () => { $('#endScreen').hidden = true; startOffline(); }).focus();
    add('Menu', 'ghost', () => { $('#endScreen').hidden = true; show('scrMenu'); });
  } else if (MODE === 'host') {
    add('Nova partida', '', () => { $('#endScreen').hidden = true; hostStart(); }).focus();
    add('Voltar à sala', 'ghost', () => { $('#endScreen').hidden = true; LOB.st = 'lobby'; hostPub(); show('scrSala'); renderSala(); });
  } else {
    const w = document.createElement('p'); w.textContent = 'Aguardando o anfitrião decidir a próxima…'; w.style.width = '100%'; w.style.margin = '0'; box.appendChild(w);
    add('Sair da sala', 'ghost', () => { $('#endScreen').hidden = true; leaveSala(); show('scrOnline'); });
  }
  $('#endScreen').hidden = false;
}

/* ---------- Frases rápidas ---------- */
$('#qsPop').innerHTML = QS.map(q => `<button>${esc(q)}</button>`).join('');
$('#btnQs').onclick = () => { const p = $('#qsPop'); p.hidden = !p.hidden; $('#btnQs').setAttribute('aria-expanded', String(!p.hidden)); if (!p.hidden) p.querySelector('button').focus(); };
$('#qsPop').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  $('#qsPop').hidden = true; $('#btnQs').setAttribute('aria-expanded', 'false');
  say(ME, b.textContent, 2200); sfx.pop();
  if (GR) GR.presence({ qs: { t: Date.now(), x: b.textContent } }).catch(() => {});
});

/* =====================================================================
   ONLINE: salas com código. Tudo trafega pela "presença" de cada um na
   sala: o anfitrião publica a mesa e o estado do jogo, os convidados
   publicam o lugar que querem e as respostas das jogadas.
   ===================================================================== */
let GR = null, GRunsub = null, CODE = null, IS_HOST = false, MYPEER = null;
let SALA_ID = '';
let LOB = { nm: '', priv: false, bots: true, lvl: 1, seats: [null, null, null, null], st: 'lobby', game: null, mid: '' };
let hostSeen = false, hostGoneT = null, lastHostLob = '', chatSeen = {}, qsSeen = {}, sigSeen = {};
const CODE_ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const genCode = () => Array.from({ length: 5 }, () => CODE_ABC[Math.floor(Math.random() * CODE_ABC.length)]).join('');
const roomName = c => 'sala-' + c.toLowerCase();

function renderOnline() {
  $('#onUnavailable').hidden = !!ROOM; $('#onBody').hidden = !ROOM;
  if (!ROOM) return;
  const peers = ROOM.peers();
  const okSala = s => s && (s.lock ? typeof s.id === 'string' && /^[a-z0-9]{3,12}$/.test(s.id) : typeof s.c === 'string' && /^[A-Z2-9]{5}$/.test(s.c));
  const salas = peers.filter(p => !p.sameTab && p.presence && okSala(p.presence.sala));
  const list = $('#salaList');
  if (ASK && !salas.some(p => p.presence.sala.lock && p.presence.sala.id === ASK.id)) ASK = null;
  let html;
  if (!salas.length) html = '<div class="empty">Nenhuma sala no momento. Crie uma e chame a turma.</div>';
  else html = salas.map(p => {
    const s = p.presence.sala, n = Math.max(0, Math.min(4, +s.n || 0)), jog = s.st === 'game';
    const info = `${n}/4 jogadores · ${jog ? 'em jogo' : n >= 4 ? 'cheia' : `falta${4 - n > 1 ? 'm' : ''} ${4 - n}`}`;
    const verb = jog || n >= 4 ? 'Assistir' : 'Entrar';
    if (!s.lock) return `<div class="sala-row"><div><b>${esc(clean(s.nm, 24) || 'Mesa')}</b><small>Aberta · código ${esc(s.c)} · ${info}</small></div><button class="btn gold" data-c="${esc(s.c)}">${verb}</button></div>`;
    const open = ASK && ASK.id === s.id;
    return `<div class="sala-row locked${open ? ' asking' : ''}" data-id="${s.id}"><div><b><svg class="i lk" aria-hidden="true"><use href="#i-lock"/></svg>${esc(clean(s.nm, 24) || 'Mesa')}</b><small>Fechada · ${info}</small></div>` +
      (open ? `<form class="ask-code" data-id="${s.id}"><input class="inp code" maxlength="5" autocomplete="off" spellcheck="false" placeholder="CÓDIGO" aria-label="Código da sala ${esc(clean(s.nm, 24))}" value="${esc(ASK.v)}"><button class="btn gold" type="submit">${verb}</button><button class="lnk" type="button" data-cancel>Cancelar</button></form>`
        : `<button class="btn ghost" data-lock="${s.id}"><svg class="i" aria-hidden="true"><use href="#i-lock"/></svg> ${verb}</button>`) + `</div>`;
  }).join('');
  if (html !== list.dataset.html) {
    const hadFocus = document.activeElement && document.activeElement.closest('.ask-code');
    list.innerHTML = html; list.dataset.html = html;
    if (hadFocus) { const i = list.querySelector('.ask-code input'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
  }
  const on = peers.filter(p => p.kind === 'viewer').length;
  const st = ROOM.status ? ROOM.status() : null;
  if (st && !st.ok) $('#onCount').innerHTML = !st.signed ? 'Entre na sua conta pra ver e criar salas.' : st.err ? `Sem conexão com as salas agora (${esc(st.err)}). Tentando de novo…` : 'Conectando às salas…';
  else $('#onCount').innerHTML = `<b>${on}</b> ${on === 1 ? 'pessoa' : 'pessoas'} com o jogo aberto agora. Seus amigos precisam abrir este mesmo Truco Mineiro pelo link que você compartilhar.`;
}
let ASK = null; // sala fechada pedindo o código: { id, v }
$('#salaList').addEventListener('click', e => {
  const b = e.target.closest('button[data-c]'); if (b) return joinSala(b.dataset.c);
  const l = e.target.closest('button[data-lock]');
  if (l) { sfx.click(); ASK = { id: l.dataset.lock, v: '' }; $('#joinErr').textContent = ''; renderOnline(); const i = $('#salaList .ask-code input'); if (i) i.focus(); return; }
  if (e.target.closest('[data-cancel]')) { ASK = null; renderOnline(); }
});
$('#salaList').addEventListener('input', e => { const i = e.target.closest('.ask-code input'); if (!i) return; i.value = i.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5); if (ASK) ASK.v = i.value; $('#joinErr').textContent = ''; });
$('#salaList').addEventListener('submit', e => {
  const f = e.target.closest('.ask-code'); if (!f) return; e.preventDefault();
  const c = f.querySelector('input').value.trim();
  if (!/^[A-Z2-9]{5}$/.test(c)) { $('#joinErr').textContent = 'O código tem 5 letras e números, como BH7K2.'; f.querySelector('input').focus(); return; }
  ASK = null; joinSala(c);
});
$('#joinCode').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5); $('#joinErr').textContent = ''; });
$('#joinForm').addEventListener('submit', e => { e.preventDefault(); const c = $('#joinCode').value.trim(); if (!/^[A-Z2-9]{5}$/.test(c)) { $('#joinErr').textContent = 'O código tem 5 letras e números, como BH7K2.'; return; } joinSala(c); });
$('#createForm').addEventListener('submit', e => { e.preventDefault(); if ($('#salaLvl').value === '') return; createSala(); });
function renderSalaLvl() {
  const v = $('#salaLvl').value;
  $('#salaLvlPick').innerHTML = LEVELS.map((l, i) => `<button type="button" class="lchip" role="radio" aria-checked="${String(i) === v}" data-i="${i}"><img src="${ART[l.face]}" alt=""><b>${l.nm}</b></button>`).join('');
  $('#btnCreate').disabled = v === '';
}
$('#salaLvlPick').addEventListener('click', e => { const b = e.target.closest('.lchip'); if (!b) return; sfx.click(); $('#salaLvl').value = b.dataset.i; renderSalaLvl(); $('#salaLvlPick [aria-checked="true"]').focus(); });

async function openGameRoom(code) {
  GR = await ROOM.join(roomName(code));
  chatSeen = {}; qsSeen = {}; lastHostLob = ''; latest = null; CLIENT_MID = ''; $('#chatLog').innerHTML = ''; $('#gChatLog').innerHTML = '';
  GRunsub = GR.onPeers(onGamePeers, () => {});
  await syncMyRoomPresence();
}
function syncMyRoomPresence() {
  if (!GR) return Promise.resolve();
  return GR.presence({ n: nick(), c: CFG.char, h: IS_HOST ? 1 : null, code: CODE }).catch(() => {});
}
async function createSala() {
  if (!ROOM) return; sfx.click();
  await leaveSala();
  CODE = genCode(); IS_HOST = true; SALA_ID = 'f' + Math.random().toString(36).slice(2, 10);
  CFG.lvl = +$('#salaLvl').value; saveCfg();
  LOB = { nm: clean($('#salaNome').value, 24) || `Mesa do ${nick()}`, priv: $('#salaPriv').checked, bots: true, lvl: CFG.lvl, seats: [null, null, null, null], st: 'lobby', game: null, mid: '' };
  try { await openGameRoom(CODE); } catch (e) { CODE = null; IS_HOST = false; snack('Não deu pra abrir a sala agora. Tente de novo.'); return; }
  MYPEER = myLobbyPeer() || (GR.peers().find(p => p.sameTab) || {}).peer || null;
  LOB.seats[0] = { p: MYPEER || 'me', n: nick(), c: CFG.char };
  hostPub(); lobbyPresence();
  sysChat(`Sala ${CODE} criada. Passe o código pra turma.`);
  show('scrSala'); renderSala();
}
async function joinSala(code) {
  if (!ROOM) return; sfx.click();
  $('#joinErr').textContent = 'Procurando a sala…';
  await leaveSala();
  CODE = code; IS_HOST = false; hostSeen = false; LOB = { ...LOB, seats: [null, null, null, null], st: 'lobby' };
  try { await openGameRoom(code); } catch (e) { CODE = null; $('#joinErr').textContent = 'Não deu pra conectar agora. Tente de novo em instantes.'; return; }
  const t0 = Date.now();
  while (!hostSeen && Date.now() - t0 < 7000 && CODE === code) await sleep(200);
  if (CODE !== code) return;
  if (!hostSeen) { await leaveSala(); $('#joinErr').textContent = `Não achei a sala ${code}. Confira o código, ou peça pro anfitrião abrir a sala de novo.`; return; }
  $('#joinErr').textContent = ''; $('#joinCode').value = '';
  sysChat('Você entrou na sala.');
  if (LOB.st !== 'game') { show('scrSala'); renderSala(); }
}
async function leaveSala() {
  clearTimeout(hostGoneT);
  if (MODE !== 'off') { stopMatch(); MODE = 'off'; }
  const g = GR; GR = null; if (GRunsub) { GRunsub(); GRunsub = null; }
  CODE = null; IS_HOST = false; hostSeen = false; lobbyPresence();
  if (g) { try { await g.leave(); } catch (e) {} }
}
$('#salaLeave').onclick = () => {
  if (IS_HOST && LOB.seats.filter(Boolean).length > 1) message('Fechar a sala?', 'Você é o anfitrião. Saindo, a sala fecha pra todo mundo.', [{ label: 'Ficar' }, { label: 'Fechar sala', kind: 'redb', fn: async () => { await leaveSala(); show('scrOnline'); } }]);
  else { leaveSala(); show('scrOnline'); }
};
addEventListener('pagehide', () => { if (GR) { try { GR.leave(); } catch (e) {} } });

/* Mesa da sala */
function renderSala() {
  if (!CODE) return;
  $('#salaTitle').textContent = clean(LOB.nm, 24) || 'Sala de jogo';
  $('#salaCode').textContent = CODE;
  const n = LOB.seats.filter(Boolean).length, falta = 4 - n;
  $('#salaCount').innerHTML = `${n}/4 jogadores · ${falta ? `<em>falta${falta > 1 ? 'm' : ''} ${falta}</em>` : '<em>mesa completa</em>'}`;
  const me = mySeatIdx();
  const tbl = $('#lobbyTable'); tbl.querySelectorAll('.lseat').forEach(x => x.remove());
  for (let i = 0; i < 4; i++) {
    const s = LOB.seats[i], b = document.createElement('button');
    b.className = `lseat ls${i} t${i % 2}${s ? '' : ' empty'}${i === me ? ' me' : ''}`;
    if (s) {
      b.innerHTML = `<span class="ph"><img src="${ART[CHARS[s.c] ? s.c : 'ze']}" alt=""></span><span class="nm"></span><small>${i === me ? 'Você' : i === 0 && IS_HOST_SEAT(i) ? 'Anfitrião' : ''}</small>`;
      b.querySelector('.nm').textContent = clean(s.n, 16) || 'Jogador';
      if (IS_HOST_SEAT(i) && i !== me) b.querySelector('small').textContent = 'Anfitrião';
      b.setAttribute('aria-label', `${clean(s.n, 16) || 'Jogador'}, lugar ${i + 1}`);
      b.disabled = true; b.style.cursor = 'default';
    } else {
      b.innerHTML = `<span class="ph"><svg class="i"><use href="#i-user"/></svg></span><span class="nm">Aguardando</span><small>${LOB.bots ? 'Bot entra aqui' : 'Vaga livre'}</small>`;
      b.setAttribute('aria-label', `Lugar ${i + 1} livre. Sentar aqui.`);
      b.onclick = () => wantSeat(i);
    }
    tbl.appendChild(b);
  }
  $('#hostCtl').hidden = !IS_HOST; $('#guestCtl').hidden = IS_HOST;
  if (IS_HOST) {
    $('#salaBots').checked = LOB.bots;
    $('#botLvlTxt').textContent = LOB.bots ? `As vagas vazias viram bots no nível ${LEVELS[LOB.lvl].nm}.` : 'Sem bots: precisa de 4 jogadores.';
    const ok = LOB.bots ? n >= 1 : n === 4;
    $('#salaStart').disabled = !ok;
    $('#salaStart').textContent = ok ? (n < 4 ? `Começar com ${falta} bot${falta > 1 ? 's' : ''}` : 'Começar jogo') : `Faltam ${falta} jogador${falta > 1 ? 'es' : ''}`;
  } else {
    $('#guestCtl').textContent = LOB.st === 'game' ? 'Partida em andamento. A mesa está cheia, então você vai assistir.' : 'Aguardando o anfitrião começar a partida… Toque num lugar vazio pra trocar de lugar.';
  }
}
function IS_HOST_SEAT(i) { const s = LOB.seats[i]; if (!s || !GR) return false; const hp = GR.peers().find(p => p.presence && p.presence.h === 1); return hp ? hp.peer === s.p : false; }
function mySeatIdx() { return LOB.seats.findIndex(s => s && (s.p === MYPEER || (IS_HOST && s.p === 'me'))); }
function wantSeat(i) {
  sfx.click();
  if (IS_HOST) { const cur = mySeatIdx(); if (LOB.seats[i] || cur < 0) return; LOB.seats[i] = LOB.seats[cur]; LOB.seats[cur] = null; hostPub(); renderSala(); return; }
  if (GR) GR.presence({ want: i }).catch(() => {});
}
$('#salaBots').onchange = e => { LOB.bots = e.target.checked; hostPub(); renderSala(); };
$('#salaStart').onclick = () => { sfx.click(); hostStart(); };
$('#copyCode').onclick = () => {
  const txt = `Bora um truco? Abre o Truco Mineiro, toca em Jogar online e entra na sala ${CODE}.`;
  const ok = () => snack('Convite copiado');
  try { navigator.clipboard.writeText(txt).then(ok, () => fallbackCopy(txt)); } catch (e) { fallbackCopy(txt); }
};
function fallbackCopy(txt) { const r = document.createRange(); r.selectNodeContents($('#salaCode')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); snack(`Copie o código ${CODE}`); }

/* Conversa */
let UNREAD = 0;
function trimLog(el) { while (el.children.length > 80) el.firstChild.remove(); el.scrollTop = 1e9; }
function sysChat(t) {
  [['#chatLog', 'sys'], ['#gChatLog', 'sys']].forEach(([sel, cls]) => { const d = document.createElement('div'); d.className = cls; d.textContent = t; $(sel).appendChild(d); trimLog($(sel)); });
}
function chatVisible() { const scr = $('#scrGame'); return SCREEN === 'scrSala' || (SCREEN === 'scrGame' && (scr.classList.contains('wide') || $('#gChat').classList.contains('open'))); }
function addChat(name, text, o = {}) {
  // sala de espera: linha simples
  const d = document.createElement('div'), b = document.createElement('b'); b.textContent = name + ': '; d.appendChild(b); d.appendChild(document.createTextNode(text)); $('#chatLog').appendChild(d); trimLog($('#chatLog'));
  // mesa: com foto, cor da dupla e hora
  const m = document.createElement('div'); m.className = 'gm' + (o.mine ? ' mine' : '') + (o.team === 'a' ? ' ta' : o.team === 'b' ? ' tb' : '');
  const im = document.createElement('img'); im.alt = ''; im.src = ART[CHARS[o.c] ? o.c : 'ze'];
  const bx = document.createElement('div'); bx.className = 'bx';
  const hd = document.createElement('b'); const nmS = document.createElement('span'); nmS.textContent = name; const tm = document.createElement('time');
  const now = new Date(); tm.textContent = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0'); hd.append(nmS, tm);
  const tx = document.createElement('p'); tx.textContent = text; bx.append(hd, tx); m.append(im, bx); $('#gChatLog').appendChild(m); trimLog($('#gChatLog'));
  if (!o.mine && !chatVisible()) { UNREAD++; const bd = $('#chatBadge'); bd.textContent = UNREAD > 9 ? '9+' : UNREAD; bd.hidden = false; }
}
function sendChat(x) { x = clean(x, 140); if (!x || !GR) return; GR.presence({ msg: { t: Date.now(), x } }).catch(() => {}); }
$('#chatForm').addEventListener('submit', e => { e.preventDefault(); sendChat($('#chatIn').value); $('#chatIn').value = ''; });
$('#gChatForm').addEventListener('submit', e => { e.preventDefault(); sendChat($('#gChatIn').value); $('#gChatIn').value = ''; });
$('#gcQuick').innerHTML = QS.map(q => `<button type="button">${esc(q)}</button>`).join('');
$('#gcQuick').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { sendChat(b.textContent); sfx.pop(); } });
$('#btnChat').onclick = () => { const c = $('#gChat'); c.classList.toggle('open'); if (c.classList.contains('open')) { UNREAD = 0; $('#chatBadge').hidden = true; $('#gChatLog').scrollTop = 1e9; setTimeout(() => $('#gChatIn').focus(), 30); } };
$('#gcClose').onclick = () => { $('#gChat').classList.remove('open'); $('#btnChat').focus(); };
function updateChatWho() { if (!GR) return; const n = GR.peers().filter(p => p.kind === 'viewer').length; $('#gcWho').textContent = `${n} ${n === 1 ? 'pessoa' : 'pessoas'} na sala · ${CODE || ''}`; }

/* Anfitrião: publica a mesa e o jogo */
function hostPub() {
  if (!GR || !IS_HOST) return;
  const lob = { nm: LOB.nm, priv: LOB.priv, bots: LOB.bots, lvl: LOB.lvl, seats: LOB.seats, st: LOB.st, game: LOB.game, mid: LOB.mid };
  const j = JSON.stringify(lob); if (j !== lastHostLob) { lastHostLob = j; GR.presence({ lob }).catch(() => {}); }
  lobbyPresence();
}
function pub(e) {
  if (!GR || MODE !== 'host') return;
  SEQ++;
  GR.presence({ g: { q: SEQ, e: e || null, st: snap() } }).catch(() => {});
}
function hostStart() {
  if (!IS_HOST) return;
  const used = LOB.seats.filter(Boolean).map(s => s.c);
  const pool = shuffle(Object.keys(CHARS).filter(k => !used.includes(k))).concat(shuffle(Object.keys(CHARS)));
  SEATS = LOB.seats.map(s => s ? { k: (s.p === MYPEER || s.p === 'me') ? 'me' : 'net', p: s.p, n: clean(s.n, 16) || 'Jogador', c: CHARS[s.c] ? s.c : 'ze' } : botSeat(pool.shift()));
  if (SEATS.some(s => s.k === 'bot') && !LOB.bots) return;
  ME = SEATS.findIndex(s => s.k === 'me'); SPECT = ME < 0; if (ME < 0) ME = 0;
  MODE = 'host'; G.lvl = LOB.lvl; stopMatch();
  LOB.game = SEATS.map(s => ({ k: s.k === 'bot' ? 'b' : 'h', p: s.p || null, n: s.n, c: s.c }));
  LOB.st = 'game'; LOB.mid = Math.random().toString(36).slice(2, 9);
  hostPub();
  enterGameView(`Sala ${CODE} · anfitrião`);
  setTimeout(() => { if (MODE === 'host' && LOB.st === 'game') startEngine(); }, 600);
}
function onGamePeers(ch) {
  if (!GR) return;
  const ps = ch.peers;
  const me = ps.find(p => p.sameTab); if (me) MYPEER = me.peer;
  if (IS_HOST && LOB.seats[0] && LOB.seats[0].p === 'me' && MYPEER) { LOB.seats.forEach(s => { if (s && s.p === 'me') s.p = MYPEER; }); }
  // conversa e frases rápidas de todo mundo
  ps.forEach(p => {
    const pr = p.presence || {}, nm = clean(pr.n, 16) || 'Jogador';
    if (pr.msg && typeof pr.msg.x === 'string' && chatSeen[p.peer] !== pr.msg.t) { const first = chatSeen[p.peer] === undefined && !p.sameTab && Date.now() - (+pr.msg.t || 0) > 20000; chatSeen[p.peer] = pr.msg.t; if (!first) {
      const x = clean(pr.msg.x, 140), s = SEATS.findIndex(q => q && q.p === p.peer), inGame = SCREEN === 'scrGame' && MODE !== 'off';
      const tm = inGame && s >= 0 ? (team(s) === team(ME) && !SPECT ? 'a' : SPECT ? (team(s) === 0 ? 'a' : 'b') : 'b') : '';
      addChat(p.sameTab ? 'Você' : nm, x, { mine: p.sameTab, c: pr.c, team: tm });
      if (inGame && s >= 0) say(s, x.length > 60 ? x.slice(0, 58) + '…' : x, 3200);
      if (!p.sameTab) sfx.pop();
    } }
    if (pr.sig && sigSeen[p.peer] !== pr.sig.t) { const old = sigSeen[p.peer] === undefined && Date.now() - (+pr.sig.t || 0) > 15000; sigSeen[p.peer] = pr.sig.t; if (!old && !p.sameTab && SCREEN === 'scrGame') onSig(p.peer, pr.sig); }
    if (pr.qs && typeof pr.qs.x === 'string' && qsSeen[p.peer] !== pr.qs.t) { const old = qsSeen[p.peer] === undefined && Date.now() - (+pr.qs.t || 0) > 15000; qsSeen[p.peer] = pr.qs.t; if (!old && !p.sameTab && SCREEN === 'scrGame') { const s = SEATS.findIndex(x => x && x.p === p.peer); if (s >= 0) { say(s, clean(pr.qs.x, 30), 2200); sfx.pop(); addChat(nm, clean(pr.qs.x, 30), { c: pr.c, team: team(s) === team(ME) && !SPECT ? 'a' : 'b' }); } } }
  });
  ch.joined.forEach(p => { if (!p.sameTab && p.presence && p.presence.n && (hostSeen || IS_HOST)) sysChat(`${clean(p.presence.n, 16)} entrou.`); });
  updateChatWho();
  ch.left.forEach(p => { if (!p.sameTab && p.presence && p.presence.n) sysChat(`${clean(p.presence.n, 16)} saiu.`); });
  if (IS_HOST) hostOnPeers(ps, ch); else clientOnPeers(ps);
}
function hostOnPeers(ps, ch) {
  const present = ps.filter(p => !p.sameTab && p.kind === 'viewer' && p.presence && typeof p.presence.n === 'string' && p.presence.code === CODE && p.presence.h !== 1);
  const ids = new Set(present.map(p => p.peer));
  if (LOB.st === 'lobby') {
    LOB.seats = LOB.seats.map(s => (s && s.p !== MYPEER && s.p !== 'me' && !ids.has(s.p)) ? null : s);
    present.forEach(p => {
      const pr = p.presence, i = LOB.seats.findIndex(s => s && s.p === p.peer), want = Number.isInteger(pr.want) && pr.want >= 0 && pr.want < 4 ? pr.want : -1;
      const info = { p: p.peer, n: clean(pr.n, 16) || 'Jogador', c: CHARS[pr.c] ? pr.c : 'ze' };
      if (i < 0) { const t = want >= 0 && !LOB.seats[want] ? want : LOB.seats.findIndex(s => !s); if (t >= 0) LOB.seats[t] = info; }
      else { LOB.seats[i] = info; if (want >= 0 && want !== i && !LOB.seats[want]) { LOB.seats[want] = info; LOB.seats[i] = null; } }
    });
    hostPub(); if (SCREEN === 'scrSala') renderSala();
  } else {
    // em jogo: quem saiu vira bot
    SEATS.forEach((s, i) => {
      if (s.k === 'net' && !ids.has(s.p)) {
        const nm = s.n; SEATS[i] = { k: 'bot', n: nm + ' (bot)', c: s.c };
        LOB.game[i] = { k: 'b', p: null, n: SEATS[i].n, c: s.c }; LOB.seats[i] = null;
        hostPub(); renderSeatsInfo(); if (RUN.alive) { say(i, 'Fui! O bot assume.', 2400); toast(`${nm} saiu`, 'Um bot assume o lugar', 1600); }
        if (pending && pending.s === i) pending.finish(botPick(i, pending.kind, { next: G.ask?.next, by: G.ask?.by }), false);
      }
    });
    // respostas das jogadas
    if (pending && SEATS[pending.s] && SEATS[pending.s].k === 'net') {
      const p = present.find(x => x.peer === SEATS[pending.s].p), a = p && p.presence.ans;
      if (a && a.id === pending.id) { const v = validAnswer(pending.s, pending.kind, a.v); if (v !== null) pending.finish(v, false); }
    }
  }
}
function clientOnPeers(ps) {
  const host = ps.find(p => !p.sameTab && p.presence && p.presence.h === 1 && p.presence.code === CODE);
  if (!host) {
    if (hostSeen && !hostGoneT) hostGoneT = setTimeout(() => { hostGoneT = null; if (!GR) return; const still = GR.peers().find(p => p.presence && p.presence.h === 1); if (!still) { leaveSala(); show('scrOnline'); $('#endScreen').hidden = true; message('O anfitrião saiu', 'A sala fechou porque o anfitrião saiu da mesa. Dá pra criar uma sala nova ou entrar em outra.', [{ label: 'Entendi' }]); } }, 5000);
    return;
  }
  clearTimeout(hostGoneT); hostGoneT = null; hostSeen = true;
  const lob = host.presence.lob;
  if (lob && typeof lob === 'object') {
    LOB = { nm: clean(lob.nm, 24), priv: !!lob.priv, bots: !!lob.bots, lvl: Math.max(0, Math.min(3, +lob.lvl || 0)), seats: (Array.isArray(lob.seats) ? lob.seats : []).slice(0, 4).map(s => s && typeof s === 'object' ? { p: String(s.p), n: clean(s.n, 16), c: CHARS[s.c] ? s.c : 'ze' } : null), st: lob.st === 'game' ? 'game' : 'lobby', game: Array.isArray(lob.game) ? lob.game.slice(0, 4) : null, mid: String(lob.mid || '') };
    while (LOB.seats.length < 4) LOB.seats.push(null);
  }
  if (LOB.st === 'game' && LOB.game && LOB.mid && LOB.mid !== CLIENT_MID) enterClientGame();
  else if (LOB.st === 'lobby' && MODE === 'client') { MODE = 'off'; CLIENT_MID = ''; stopMatch(); $('#endScreen').hidden = true; show('scrSala'); }
  if (SCREEN === 'scrSala') renderSala();
  if (MODE === 'client' && host.presence.g) onHostState(host.presence.g);
}

/* Convidado: segue o estado que o anfitrião publica */
let CLIENT_MID = '', applied = 0, latest = null, pumping = false, shownAsk = -1;
function enterClientGame() {
  CLIENT_MID = LOB.mid; MODE = 'client'; stopMatch(); RUN = { alive: true };
  SEATS = LOB.game.map(s => ({ k: s.k === 'b' ? 'bot' : (s.p === MYPEER ? 'me' : 'net'), p: s.p, n: clean(s.n, 16) || 'Jogador', c: CHARS[s.c] ? s.c : 'ze' }));
  ME = SEATS.findIndex(s => s.k === 'me'); SPECT = ME < 0; if (ME < 0) ME = 0;
  applied = latest ? latest.q : 0; shownAsk = -1;
  enterGameView(`Sala ${CODE}${SPECT ? ' · assistindo' : ''}`);
}
function onHostState(g) {
  if (SER_CLOSE && g && +g.q > applied + 1) SER_CLOSE();
  if (!g || typeof g !== 'object' || !Number.isFinite(+g.q)) return;
  if (latest && +g.q === latest.q) return;
  latest = { q: +g.q, e: g.e, st: g.st };
  pump();
}
async function pump() {
  if (pumping) return; pumping = true;
  try {
    while (latest && latest.q > applied && MODE === 'client') {
      const g = latest, anim = g.q === applied + 1 && g.e;
      applied = g.q;
      loadSnap(g.st);
      if (anim) { try { await applyEv(g.e); } catch (e) {} }
      else if (g.e && g.e.k === 'end') { await showEnd(); }
      renderAll();
      handleAsk();
    }
  } finally { pumping = false; }
}
function handleAsk() {
  const a = G.ask;
  if (!a) { if (LT) cancelLocal(); askDL = 0; return; }
  if (a.id !== askDLid) { askDLid = a.id; askDL = Date.now() + Math.max(0, (+a.ms || TURN_MS) - 400); }
  if (SPECT || a.s !== ME) { if (LT) cancelLocal(); return; }
  if (a.id === shownAsk) return;
  shownAsk = a.id;
  const id = a.id;
  localDecide(a.k, { next: +a.next || 0, by: +a.by, adv: typeof a.adv === 'string' ? clean(a.adv, 40) : null }).then(v => { if (GR && MODE === 'client') GR.presence({ ans: { id, v } }).catch(() => {}); });
}

/* =====================================================================
   CONTAS: cadastro com usuário, e-mail e senha.
   - Nomes e e-mails ficam num registro compartilhado só pra garantir que
     são únicos (o e-mail vai como resumo criptográfico, nunca em texto).
   - Senha, sal e e-mail ficam na área privada de cada jogador, que
     ninguém mais lê. A senha é guardada com PBKDF2, nunca em texto.
   ===================================================================== */
let SESSION = load('truco-sessao');
const PW_RULES = [
  ['len', 'Pelo menos 8 caracteres', p => p.length >= 8],
  ['up', 'Uma letra maiúscula', p => /[A-ZÀ-Ý]/.test(p)],
  ['low', 'Uma letra minúscula', p => /[a-zß-ÿ]/.test(p)],
  ['num', 'Um número', p => /\d/.test(p)],
  ['sym', 'Um caractere especial (!@#$…)', p => /[^A-Za-zÀ-ÿ0-9\s]/.test(p)],
];
const USER_RE = /^[a-z0-9][a-z0-9_.]{2,15}$/i;
const MAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const normUser = u => u.trim().toLowerCase();
const normMail = m => m.trim().toLowerCase();
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function sha256hex(t) { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join(''); }
const PBK_IT = 150000;
async function hashPw(pw, saltB64) {
  const salt = saltB64 ? unb64(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: PBK_IT, hash: 'SHA-256' }, key, 256);
  return { salt: b64(salt), hash: b64(bits), it: PBK_IT };
}
const useDb = () => !!(DB && UID);
// Modo sem conta conectada: contas guardadas só neste navegador
const localAccts = () => load('truco-contas') || {};
const saveLocalAccts = a => store('truco-contas', a);

async function nameTaken(u) {
  if (WEB) return TB.nameTaken(u.trim());
  const k = normUser(u);
  if (useDb()) { try { const s = await DB.doc('nomes/' + k).get(); return !!(s.exists && s.data().uid); } catch (e) { return null; } }
  return !!localAccts()[k];
}
async function mailTaken(m) {
  if (WEB) return TB.mailTaken(normMail(m));
  const k = normMail(m);
  if (useDb()) { try { const s = await DB.doc('emails/' + await sha256hex(k)).get(); return !!(s.exists && s.data().uid); } catch (e) { return null; } }
  return Object.values(localAccts()).some(a => a.email === k);
}
async function myAccount() {
  if (!useDb()) return null;
  try { const s = await DB.doc(`data/users/${UID}/conta`).get(); return s.exists ? s.data() : null; } catch (e) { return null; }
}
async function claim(ref) {
  const l = await ref.acquire({ holder: UID, ttlMs: 8000 });
  if (!l.acquired) return false;
  const s = await ref.get();
  return !(s.exists && s.data() && s.data().uid);
}
async function createAccount(user, mail, pw) {
  const u = user.trim(), uk = normUser(u), mk = normMail(mail);
  if (WEB) { const n = await TB.signUp(u, mk, pw); UID = TB.uid(); return n; }
  const cred = await hashPw(pw);
  if (useDb()) {
    const mine = await myAccount();
    if (mine) throw new Error(`Você já tem uma conta neste acesso: ${mine.user}. Entre com ela.`);
    const nref = DB.doc('nomes/' + uk), eref = DB.doc('emails/' + await sha256hex(mk));
    if (!(await claim(nref))) throw new Error('Esse nome de usuário acabou de ser escolhido. Tente outro.');
    if (!(await claim(eref))) throw new Error('Já existe uma conta com esse e-mail.');
    const now = Date.now();
    await DB.doc(`data/users/${UID}/conta`).set({ user: u, email: mk, ...cred, criado: now });
    await nref.set({ uid: UID, user: u, criado: now });
    await eref.set({ uid: UID, criado: now });
  } else {
    const a = localAccts();
    if (a[uk]) throw new Error('Já existe alguém com esse nome de usuário.');
    if (Object.values(a).some(x => x.email === mk)) throw new Error('Já existe uma conta com esse e-mail.');
    a[uk] = { user: u, email: mk, ...cred, criado: Date.now() }; saveLocalAccts(a);
  }
  return u;
}
let FAILS = 0, LOCK_UNTIL = 0;
async function login(id, pw) {
  if (Date.now() < LOCK_UNTIL) throw new Error(`Muitas tentativas. Espere ${Math.ceil((LOCK_UNTIL - Date.now()) / 1000)} segundos.`);
  const raw = id.trim(); if (!raw || !pw) throw new Error('Preencha usuário (ou e-mail) e senha.');
  if (WEB) { const n = await TB.signIn(raw.includes('@') ? normMail(raw) : raw, pw); UID = TB.uid(); MYDOC = await TB.myRank(); return n; }
  let acct;
  if (useDb()) {
    const ref = raw.includes('@') ? DB.doc('emails/' + await sha256hex(normMail(raw))) : DB.doc('nomes/' + normUser(raw));
    let s; try { s = await ref.get(); } catch (e) { throw new Error('Não deu pra conferir agora. Tente de novo em instantes.'); }
    if (!s.exists || !s.data().uid) throw new Error('Não encontramos uma conta com esse usuário ou e-mail.');
    if (s.data().uid !== UID) throw new Error('Essa conta foi criada com outro acesso ao Truco Mineiro. Entre pelo mesmo acesso usado no cadastro.');
    acct = await myAccount();
    if (!acct) throw new Error('Não encontramos os dados dessa conta. Tente de novo em instantes.');
  } else {
    const a = localAccts();
    acct = raw.includes('@') ? Object.values(a).find(x => x.email === normMail(raw)) : a[normUser(raw)];
    if (!acct) throw new Error('Não encontramos uma conta com esse usuário ou e-mail.');
  }
  const h = await hashPw(pw, acct.salt);
  if (h.hash !== acct.hash) {
    FAILS++; if (FAILS >= 5) { LOCK_UNTIL = Date.now() + 30000; FAILS = 0; throw new Error('Senha incorreta. Por segurança, espere 30 segundos pra tentar de novo.'); }
    throw new Error('Senha incorreta.');
  }
  FAILS = 0;
  return acct.user;
}
async function resetPassword(mail, pw) {
  const mk = normMail(mail), cred = await hashPw(pw);
  if (useDb()) {
    const acct = await myAccount();
    if (!acct || acct.email !== mk) throw new Error('Esse e-mail não confere com a conta deste acesso.');
    await DB.doc(`data/users/${UID}/conta`).set({ ...acct, ...cred, alterado: Date.now() });
    return acct.user;
  }
  const a = localAccts(), k = Object.keys(a).find(k => a[k].email === mk);
  if (!k) throw new Error('Não encontramos uma conta com esse e-mail.');
  a[k] = { ...a[k], ...cred }; saveLocalAccts(a); return a[k].user;
}
function startSession(user) {
  SESSION = { u: user, uid: UID || null, t: Date.now() }; store('truco-sessao', SESSION);
  if (WEB && UID) TB.setChar(CFG.char);
  if (GR) syncMyRoomPresence(); lobbyPresence();
  show('scrMenu'); snack(`Bem-vindo, ${user}!`);
}
function logout() {
  SESSION = null; try { localStorage.removeItem('truco-sessao'); } catch (e) {}
  if (CODE) leaveSala();
  if (WEB) { TB.signOut(); UID = null; MYDOC = null; }
  authTab('login'); show('scrAuth');
}

/* Tela */
const EYE_OPEN = '<svg viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_SHUT = '<svg viewBox="0 0 24 24"><path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.8 9.8 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
$$('.eye').forEach(b => { b.innerHTML = EYE_OPEN; b.onclick = () => { const i = $('#' + b.dataset.for), show = i.type === 'password'; i.type = show ? 'text' : 'password'; b.innerHTML = show ? EYE_SHUT : EYE_OPEN; b.setAttribute('aria-label', show ? 'Esconder senha' : 'Mostrar senha'); }; });
['sgReqs', 'rsReqs'].forEach(id => { $('#' + id).innerHTML = PW_RULES.map(([k, t]) => `<li data-k="${k}"><i aria-hidden="true"></i><span>${t}</span></li>`).join(''); });
function pwState(listId, meterId, pw) {
  let n = 0;
  PW_RULES.forEach(([k, t, f]) => { const ok = f(pw), li = $(`#${listId} [data-k="${k}"]`); li.classList.toggle('ok', ok); li.setAttribute('aria-label', `${t}: ${ok ? 'atendido' : 'pendente'}`); if (ok) n++; });
  $('#' + meterId).dataset.n = pw ? n : 0;
  return n === PW_RULES.length;
}
function setChk(id, cls, text) { const el = $('#' + id); el.className = 'chk' + (cls ? ' ' + cls : ''); el.textContent = text; }
function authTab(t) {
  $('#scrAuth .auth').classList.toggle('signing', t !== 'login');
  $('#fLogin').hidden = t !== 'login'; $('#fSign').hidden = t !== 'sign'; $('#fReset').hidden = t !== 'reset';
  $('#tabLogin').setAttribute('aria-selected', String(t !== 'sign')); $('#tabSign').setAttribute('aria-selected', String(t === 'sign'));
  $('.atabs').hidden = t === 'reset';
  ['lgErr', 'sgErr', 'rsErr'].forEach(i => { $('#' + i).textContent = ''; $('#' + i).className = 'aerr'; });
  if (t === 'reset') resetMode(WEB ? 'link' : '');
  const f = { login: '#lgId', sign: '#sgUser', reset: '#rsMail' }[t]; setTimeout(() => $(f).focus(), 30);
}
// '' = troca direta (artifact) · 'link' = pede o link por e-mail · 'novo' = voltou pelo link e escolhe a senha
let RS_MODE = '';
function resetMode(m) {
  RS_MODE = m; const f = $('#fReset'); f.classList.toggle('link', m === 'link'); f.classList.toggle('novo', m === 'novo');
  $('#rsSub').textContent = m === 'link' ? 'Digite o e-mail da sua conta. Vamos mandar um link pra você escolher uma senha nova.' : m === 'novo' ? 'Pronto, agora é só escolher a senha nova.' : 'Confirme o e-mail da sua conta e escolha uma senha nova.';
  $('#rsBtn').textContent = m === 'link' ? 'Enviar link' : 'Salvar nova senha';
  rsRefresh(); if (m === 'novo') setTimeout(() => $('#rsPw').focus(), 30);
}
$('#tabLogin').onclick = $('#goLogin').onclick = $('#rsBack').onclick = () => authTab('login');
$('#tabSign').onclick = $('#goSign').onclick = () => authTab('sign');
$('#goReset').onclick = () => authTab('reset');

// cadastro com retorno ao vivo
const SG = { user: false, mail: false, pw: false, pw2: false };
let userT, mailT, userQ = 0, mailQ = 0;
function sgRefresh() { $('#sgBtn').disabled = !(SG.user && SG.mail && SG.pw && SG.pw2); }
$('#sgUser').addEventListener('input', e => {
  const v = e.target.value.trim(); SG.user = false; sgRefresh(); clearTimeout(userT);
  if (!v) return setChk('sgUserChk', '', '');
  if (v.length < 3) return setChk('sgUserChk', 'bad', 'Use pelo menos 3 caracteres.');
  if (!USER_RE.test(v)) return setChk('sgUserChk', 'bad', 'Use só letras, números, ponto e sublinhado, começando por letra ou número.');
  setChk('sgUserChk', '', 'Conferindo se está livre…');
  const q = ++userQ;
  userT = setTimeout(async () => {
    const taken = await nameTaken(v); if (q !== userQ) return;
    if (taken === null) return setChk('sgUserChk', 'bad', 'Não deu pra conferir agora. Tente de novo.');
    SG.user = !taken; setChk('sgUserChk', taken ? 'bad' : 'ok', taken ? `Já existe alguém chamado ${v}.` : `✓ ${v} está livre.`); sgRefresh();
  }, 450);
});
$('#sgMail').addEventListener('input', e => {
  const v = e.target.value.trim(); SG.mail = false; sgRefresh(); clearTimeout(mailT);
  if (!v) return setChk('sgMailChk', '', '');
  if (!MAIL_RE.test(v)) return setChk('sgMailChk', 'bad', 'Digite um e-mail válido, como voce@exemplo.com.');
  setChk('sgMailChk', '', 'Conferindo…');
  const q = ++mailQ;
  mailT = setTimeout(async () => {
    const taken = await mailTaken(v); if (q !== mailQ) return;
    if (taken === null) return setChk('sgMailChk', 'bad', 'Não deu pra conferir agora. Tente de novo.');
    SG.mail = !taken; setChk('sgMailChk', taken ? 'bad' : 'ok', taken ? 'Já existe uma conta com esse e-mail.' : '✓ E-mail disponível.'); sgRefresh();
  }, 450);
});
function pw2Check(a, b, chkId) {
  if (!b) { setChk(chkId, '', ''); return false; }
  const ok = a === b; setChk(chkId, ok ? 'ok' : 'bad', ok ? '✓ As senhas conferem.' : 'As senhas não conferem.'); return ok;
}
['sgPw', 'sgPw2'].forEach(id => $('#' + id).addEventListener('input', () => {
  SG.pw = pwState('sgReqs', 'sgMeter', $('#sgPw').value); SG.pw2 = pw2Check($('#sgPw').value, $('#sgPw2').value, 'sgPw2Chk'); sgRefresh();
}));
async function busy(btn, fn) { btn.classList.add('busy'); const t = btn.textContent; btn.textContent = 'Aguarde…'; try { return await fn(); } finally { btn.classList.remove('busy'); btn.textContent = t; } }
$('#fSign').addEventListener('submit', async e => {
  e.preventDefault(); if ($('#sgBtn').disabled) return;
  const err = $('#sgErr'); err.className = 'aerr'; err.textContent = '';
  try {
    const u = await busy($('#sgBtn'), () => createAccount($('#sgUser').value, $('#sgMail').value, $('#sgPw').value));
    ['sgUser', 'sgMail', 'sgPw', 'sgPw2'].forEach(i => { $('#' + i).value = ''; }); ['sgUserChk', 'sgMailChk', 'sgPw2Chk'].forEach(i => setChk(i, '', ''));
    Object.keys(SG).forEach(k => { SG[k] = false; }); pwState('sgReqs', 'sgMeter', ''); sgRefresh();
    startSession(u);
  } catch (x) { err.textContent = x.message || 'Não deu pra criar a conta agora. Tente de novo.'; }
});
$('#fLogin').addEventListener('submit', async e => {
  e.preventDefault();
  const err = $('#lgErr'); err.className = 'aerr'; err.textContent = '';
  try { const u = await busy($('#lgBtn'), () => login($('#lgId').value, $('#lgPw').value)); $('#lgPw').value = ''; startSession(u); }
  catch (x) { err.textContent = x.message || 'Não deu pra entrar agora.'; $('#lgPw').select(); }
});
// nova senha
const RS = { mail: false, pw: false, pw2: false };
const rsRefresh = () => { $('#rsBtn').disabled = RS_MODE === 'link' ? !RS.mail : RS_MODE === 'novo' ? !(RS.pw && RS.pw2) : !(RS.mail && RS.pw && RS.pw2); };
$('#rsMail').addEventListener('input', e => { RS.mail = MAIL_RE.test(e.target.value.trim()); rsRefresh(); });
['rsPw', 'rsPw2'].forEach(id => $('#' + id).addEventListener('input', () => { RS.pw = pwState('rsReqs', 'rsMeter', $('#rsPw').value); RS.pw2 = pw2Check($('#rsPw').value, $('#rsPw2').value, 'rsPw2Chk'); rsRefresh(); }));
$('#fReset').addEventListener('submit', async e => {
  e.preventDefault(); if ($('#rsBtn').disabled) return;
  const err = $('#rsErr'); err.className = 'aerr'; err.textContent = '';
  if (RS_MODE === 'link') {
    try { await busy($('#rsBtn'), () => TB.sendReset(normMail($('#rsMail').value))); err.className = 'aerr ok'; err.textContent = 'Se existir uma conta com esse e-mail, o link chega em alguns minutos. Confira também o spam.'; }
    catch (x) { err.textContent = x.message || 'Não deu pra mandar o link agora.'; }
    return;
  }
  if (RS_MODE === 'novo') {
    try { const u = await busy($('#rsBtn'), () => TB.updatePassword($('#rsPw').value)); ['rsPw', 'rsPw2'].forEach(i => { $('#' + i).value = ''; }); RS.pw = RS.pw2 = false; resetMode(''); UID = TB.uid(); startSession(u); }
    catch (x) { err.textContent = x.message || 'Não deu pra trocar a senha agora.'; }
    return;
  }
  try {
    const u = await busy($('#rsBtn'), () => resetPassword($('#rsMail').value, $('#rsPw').value));
    ['rsMail', 'rsPw', 'rsPw2'].forEach(i => { $('#' + i).value = ''; }); RS.mail = RS.pw = RS.pw2 = false; pwState('rsReqs', 'rsMeter', ''); setChk('rsPw2Chk', '', ''); rsRefresh();
    authTab('login'); $('#lgId').value = u; const ok = $('#lgErr'); ok.className = 'aerr ok'; ok.textContent = 'Senha alterada. Agora é só entrar.'; $('#lgPw').focus();
  } catch (x) { err.textContent = x.message || 'Não deu pra trocar a senha agora.'; }
});

/* =====================================================================
   TORNEIO DA PAMPULHA (offline): 8 duplas, quartas, semi e final.
   Nível dos bots sobe a cada fase. Progresso salvo neste navegador.
   ===================================================================== */
const TOUR_ROUNDS = [{ nm: 'Quartas de final', lv: 1, a: 'as quartas de final', em: 'nas quartas de final' }, { nm: 'Semifinal', lv: 2, a: 'a semifinal', em: 'na semifinal' }, { nm: 'Final', lv: 3, a: 'a final', em: 'na final' }];
const TOUR_TEAMS = ['Os da Lagoinha', 'Turma do Barro Preto', 'Dupla da Savassi', 'Bar do Lucas', 'Os do Santa Tereza', 'Floresta Truco Clube', 'Turma do Mercado Central', 'Os da Afonso Pena', 'Dupla do Calafate', 'Boteco do Padre Eustáquio'];
const TOUR_BONUS = 5;
let TOUR = load('truco-torneio'), TOUR_PLAY = false, TOUR_FRESH = [];
const saveTour = () => store('truco-torneio', TOUR);
function newTour() {
  const keys = Object.keys(CHARS), partner = pick(keys.filter(k => k !== CFG.char));
  const names = shuffle(TOUR_TEAMS.slice()).slice(0, 7);
  const pool = keys.filter(k => k !== CFG.char && k !== partner);
  const teams = names.map(n => { const c = shuffle(pool.slice()).slice(0, 2); return { n, c, s: rand(.75, 1.25) }; });
  teams.push({ n: '', c: [CFG.char, partner], s: 1, me: true });
  shuffle(teams);
  const me = teams.findIndex(t => t.me);
  TOUR = { id: Math.random().toString(36).slice(2, 8), me, teams, cur: 0, st: 'play', r: [[0, 1, 2, 3].map(i => ({ a: i * 2, b: i * 2 + 1, w: null })), [0, 1].map(() => ({ a: null, b: null, w: null })), [{ a: null, b: null, w: null }]] };
  saveTour();
}
const teamName = t => t.me ? `Você e ${CHARS[t.c[1]].name}` : t.n;
const myMatch = () => TOUR && TOUR.st === 'play' ? TOUR.r[TOUR.cur].find(m => m.a === TOUR.me || m.b === TOUR.me) : null;
function simMatch(m) {
  const A = TOUR.teams[m.a], B = TOUR.teams[m.b], pa = A.s / (A.s + B.s);
  const aWins = Math.random() < pa, lose = Math.random() < .5 ? 0 : 1;
  m.w = aWins ? m.a : m.b; m.sa = aWins ? 2 : lose; m.sb = aWins ? lose : 2;
}
function advance(round) {
  if (round >= 2) return;
  TOUR.r[round + 1].forEach((m, i) => { m.a = TOUR.r[round][i * 2].w; m.b = TOUR.r[round][i * 2 + 1].w; });
}
function tourResult(won, myScore, oppScore) {
  const m = myMatch(); if (!m) return;
  const meA = m.a === TOUR.me;
  m.w = won ? TOUR.me : (meA ? m.b : m.a);
  m.sa = meA ? myScore : oppScore; m.sb = meA ? oppScore : myScore;
  TOUR_FRESH = []; TOUR_FRESH_LINES = [];
  const cur = TOUR.cur;
  TOUR.r[cur].forEach((x, i) => { if (x !== m) { simMatch(x); } TOUR_FRESH.push(`${cur}-${i}`); });
  advance(cur);
  if (!won) {
    TOUR.st = 'out'; TOUR.outAt = cur;
    for (let r = cur + 1; r < 3; r++) { TOUR.r[r].forEach((x, i) => { simMatch(x); TOUR_FRESH.push(`${r}-${i}`); }); advance(r); }
  } else if (cur === 2) TOUR.st = 'champ';
  else TOUR.cur = cur + 1;
  TOUR_FRESH_LINES = TOUR_FRESH.slice();
  saveTour();
}
const TROPHY = `<svg class="trophy" viewBox="0 0 160 170" aria-hidden="true"><defs><linearGradient id="gold" x1="0" x2="1"><stop offset="0" stop-color="#9c6f2c"/><stop offset=".35" stop-color="#f3d38a"/><stop offset=".6" stop-color="#d9a441"/><stop offset="1" stop-color="#8a5f22"/></linearGradient></defs>
<path d="M46 26c-22 0-26 30 2 44M114 26c22 0 26 30-2 44" fill="none" stroke="url(#gold)" stroke-width="8" stroke-linecap="round"/>
<path d="M42 14h76v34c0 30-17 52-38 52S42 78 42 48z" fill="url(#gold)" stroke="#3b2a1e" stroke-width="3"/>
<path d="M55 24c0 22 4 40 14 52" stroke="#fff3cf" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/>
<text x="80" y="62" text-anchor="middle" font-family="Bebas Neue, Impact, sans-serif" font-size="30" fill="#3b2a1e" opacity=".75">♣</text>
<path d="M72 100h16v16H72z" fill="#a87c40" stroke="#3b2a1e" stroke-width="2"/>
<path d="M58 116h44l4 12H54z" fill="url(#gold)" stroke="#3b2a1e" stroke-width="3"/>
<rect x="46" y="128" width="68" height="22" rx="3" fill="#3b2a1e"/><rect x="50" y="132" width="60" height="14" rx="2" fill="url(#gold)"/>
<text x="80" y="143" text-anchor="middle" font-family="Bebas Neue, Impact, sans-serif" font-size="11" letter-spacing="1.5" fill="#3b2a1e">PAMPULHA</text></svg>`;
// Igrejinha da Pampulha: as abóbadas em parábola
const PAMP = `<svg class="pamp" viewBox="0 0 300 90" aria-hidden="true" fill="currentColor"><path d="M0 90 C 30 -10, 90 -10, 120 90 Z"/><path d="M112 90 C 130 25, 170 25, 188 90 Z"/><path d="M180 90 C 195 40, 225 40, 240 90 Z"/><path d="M232 90 C 245 52, 270 52, 283 90 Z"/><rect x="286" y="6" width="9" height="84"/></svg>`;
const lvPips = lv => `<small>${[0, 1, 2, 3].map(k => `<i class="${k <= lv ? 'on' : ''}"></i>`).join('')}</small>`;
function openSolo() { $('#tourBadge').hidden = !(TOUR && TOUR.st === 'play'); show('scrSolo'); }
function openTour() {
  if (!TOUR) newTour();
  show('scrTour'); renderTour();
}
const done = m => m && m.w !== null && m.w !== undefined;
function plate(ti, m, side, ri, mi, opts = {}) {
  const id = `p${ri}${mi}${side}`, pos = opts.pos || '', r = opts.right ? ' r' : '';
  if (ti === null || ti === undefined) return `<div class="tp tbd${r}" id="${id}" style="${pos}"><span class="tn">A definir</span></div>`;
  const t = TOUR.teams[ti], d = done(m), sc = d ? (side === 'a' ? m.sa : m.sb) : '', mm = myMatch();
  const fresh = TOUR_FRESH.includes(`${ri}-${mi}`);
  const cls = ['tp', r.trim(), t.me ? 'me' : '', d ? (m.w === ti ? 'win' : 'lose') : '', m === mm ? ('next' + (t.me ? '' : ' opp')) : '', fresh ? 'fresh' : ''].filter(Boolean).join(' ');
  const delay = fresh ? `animation-delay:${TOUR_FRESH.indexOf(`${ri}-${mi}`) * 140 + (side === 'b' ? 70 : 0)}ms;` : '';
  return `<div class="${cls}" id="${id}" data-team="${ti}" style="${pos}${delay}">${t.me ? '<i class="you">Vocês</i>' : ''}<span class="fc"><img src="${ART[t.c[0]]}" alt=""><img src="${ART[t.c[1]]}" alt=""></span><span class="tn">${esc(teamName(t))}</span><em class="sc">${sc}</em></div>`;
}
function renderTour() {
  const T = TOUR, mm = myMatch(), R = T.r, fin = R[2][0], champ = done(fin) ? T.teams[fin.w] : null;
  const br = $('#bracket'), narrow = matchMedia('(max-width:760px)').matches;
  br.className = 'br' + (narrow ? ' list' : '');
  const champBox = `<div class="champ2"><span class="rib"><small>${champ ? 'Campeões' : 'A taça espera'}</small><b>${champ ? esc(teamName(champ)) : 'Quem vai levar?'}</b></span><span class="hint">${champ ? 'Torneio da Pampulha' : `Campeão ganha +${TOUR_BONUS} pontos no ranking`}</span></div>`;
  if (narrow) {
    const phase = (ri) => `<div class="phase"><div class="rl"><b>${TOUR_ROUNDS[ri].nm}</b>${lvPips(TOUR_ROUNDS[ri].lv)}</div><div class="pairs">${R[ri].map((m, i) => `<div class="pair">${plate(m.a, m, 'a', ri, i)}${plate(m.b, m, 'b', ri, i)}</div>`).join('')}</div></div>`;
    br.innerHTML = phase(0) + phase(1) + phase(2) + `<div class="champ-row">${TROPHY}${champBox}</div>`;
  } else {
    const at = (c, r) => `grid-column:${c};grid-row:${r + 1};`;
    let h = '';
    [[1, 0], [2, 1], [3, 2], [4, 1], [5, 0]].forEach(([c, ri]) => { h += `<div class="rl" style="grid-column:${c};grid-row:1"><b>${c === 3 ? 'Final' : TOUR_ROUNDS[ri].nm}</b>${lvPips(TOUR_ROUNDS[ri].lv)}</div>`; });
    // quartas: esquerda (jogos 0 e 1), direita (jogos 2 e 3)
    [[0, 1], [1, 1], [2, 5], [3, 5]].forEach(([mi, c]) => { const m = R[0][mi], base = mi % 2 ? 5 : 1; h += plate(m.a, m, 'a', 0, mi, { pos: at(c, base), right: c === 5 }) + plate(m.b, m, 'b', 0, mi, { pos: at(c, base + 2), right: c === 5 }); });
    // semis
    [[0, 2], [1, 4]].forEach(([mi, c]) => { const m = R[1][mi]; h += plate(m.a, m, 'a', 1, mi, { pos: at(c, 2), right: c === 4 }) + plate(m.b, m, 'b', 1, mi, { pos: at(c, 6), right: c === 4 }); });
    // final no centro
    h += `<div class="cup${champ ? ' won' : ''}">${PAMP}${TROPHY}</div>`;
    h += plate(fin.a, fin, 'a', 2, 0, { pos: at(3, 3) });
    h += `<div class="vs"><b>×</b>Mestre</div>`;
    h += plate(fin.b, fin, 'b', 2, 0, { pos: at(3, 5), right: true });
    h += champBox;
    br.innerHTML = h + '<svg class="lines"></svg>';
    requestAnimationFrame(drawLines);
  }
  const cta = $('#tourCta');
  if (T.st === 'play') {
    const r = TOUR_ROUNDS[T.cur], opp = T.teams[mm.a === T.me ? mm.b : mm.a], partner = CHARS[T.teams[T.me].c[1]].name;
    cta.innerHTML = `<p>Próximo jogo, <b>${r.nm.toLowerCase()}</b>: você e ${esc(partner)} contra <b>${esc(opp.n)}</b> (${esc(CHARS[opp.c[0]].name)} e ${esc(CHARS[opp.c[1]].name)}). Bots no nível <b>${LEVELS[r.lv].nm}</b>.</p><div class="row"><button class="btn ghost" id="tourQuit">Abandonar</button><button class="btn big redb" id="tourPlay">Jogar ${r.nm.toLowerCase()}</button></div>`;
    $('#tourPlay').onclick = () => { sfx.click(); startTourMatch(); };
    $('#tourQuit').onclick = () => message('Abandonar o torneio?', 'A chave atual é descartada e você começa do zero na próxima vez.', [{ label: 'Continuar no torneio' }, { label: 'Abandonar', kind: 'redb', fn: () => { TOUR = null; try { localStorage.removeItem('truco-torneio'); } catch (e) {} openSolo(); } }]);
  } else {
    const msg = T.st === 'champ' ? `<p><b>Vocês são os campeões do Torneio da Pampulha!</b> A taça é de vocês, sô.</p>` : `<p>Vocês caíram <b>${TOUR_ROUNDS[T.outAt].em}</b>. O título ficou com <b>${esc(champ ? teamName(champ) : '')}</b>.</p>`;
    cta.innerHTML = `${msg}<div class="row"><button class="btn ghost" id="tourMenu">Menu</button><button class="btn big redb" id="tourNew">Novo torneio</button></div>`;
    $('#tourNew').onclick = () => { sfx.click(); TOUR_FRESH = []; newTour(); renderTour(); };
    $('#tourMenu').onclick = () => show('scrMenu');
  }
  setTimeout(() => { TOUR_FRESH = []; }, 50);
}
// Linhas da chave: cada placa liga na placa da fase seguinte
function drawLines() {
  const br = $('#bracket'), svg = br && br.querySelector('svg.lines'); if (!svg) return;
  const B = br.getBoundingClientRect(), R = TOUR.r;
  const box = id => { const el = document.getElementById(id); if (!el) return null; const r = el.getBoundingClientRect(); return { l: r.left - B.left, r: r.right - B.left, y: r.top - B.top + r.height / 2 }; };
  const links = [];
  R[0].forEach((m, mi) => ['a', 'b'].forEach(sd => links.push({ from: `p0${mi}${sd}`, to: `p1${Math.floor(mi / 2)}${mi % 2 ? 'b' : 'a'}`, team: sd === 'a' ? m.a : m.b, won: done(m) && m.w === (sd === 'a' ? m.a : m.b), right: mi >= 2, ri: 0, mi })));
  R[1].forEach((m, mi) => ['a', 'b'].forEach(sd => links.push({ from: `p1${mi}${sd}`, to: `p20${mi ? 'b' : 'a'}`, team: sd === 'a' ? m.a : m.b, won: done(m) && m.w === (sd === 'a' ? m.a : m.b), right: mi === 1, ri: 1, mi })));
  let html = '';
  links.forEach(k => {
    const a = box(k.from), b = box(k.to); if (!a || !b) return;
    const x1 = k.right ? a.l : a.r, x2 = k.right ? b.r : b.l, xm = (x1 + x2) / 2;
    const d = `M${x1} ${a.y} H${xm} V${b.y} H${x2}`, len = Math.abs(x2 - x1) + Math.abs(b.y - a.y);
    const fresh = k.won && TOUR_FRESH_LINES.includes(`${k.ri}-${k.mi}`);
    html += `<path d="${d}" class="${k.won ? 'on' : ''}${fresh ? ' draw' : ''}" style="--len:${len};${fresh ? `stroke-dasharray:${len};animation-delay:${300 + TOUR_FRESH_LINES.indexOf(`${k.ri}-${k.mi}`) * 140}ms` : ''}"/>`;
  });
  svg.innerHTML = html;
  TOUR_FRESH_LINES = [];
}
let TOUR_FRESH_LINES = [];
addEventListener('resize', () => { if (SCREEN === 'scrTour' && TOUR) { clearTimeout(drawLines.t); drawLines.t = setTimeout(renderTour, 120); } });

async function startTourMatch() {
  const mm = myMatch(); if (!mm) return;
  stopMatch();
  const r = TOUR_ROUNDS[TOUR.cur], me = TOUR.teams[TOUR.me], opp = TOUR.teams[mm.a === TOUR.me ? mm.b : mm.a];
  MODE = 'off'; ME = 0; SPECT = false; G.lvl = r.lv; TOUR_PLAY = true;
  SEATS = [{ k: 'me', n: nick(), c: CFG.char }, botSeat(opp.c[0]), botSeat(me.c[1]), botSeat(opp.c[1])];
  await loadingScreen();
  enterGameView(`Torneio · ${r.nm} · ${LEVELS[r.lv].nm}`);
  startEngine();
}
$('#pickSingle').onclick = () => { sfx.click(); LVL_SEL = null; openBots(); };
$('#pickTour').onclick = () => { sfx.click(); openTour(); };

/* Regras: cartas das manilhas */
$('#miniManilhas').innerHTML = ['4c', '7h', 'As', '7d'].map(c => `<figure>${cardHTML(c, false)}<figcaption>${MANI[power(c)]}</figcaption></figure>`).join('');
if (SESSION) show('scrMenu'); else { show('scrAuth'); authTab('login'); }
})();
