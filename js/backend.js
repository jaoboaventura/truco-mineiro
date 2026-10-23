/* Truco Mineiro · ponte com o Supabase
   Contas (Auth), ranking (Postgres) e salas online (Realtime).
   O jogo conversa com window.TB para contas e ranking, e com window.claude.use('room')
   para as salas, a mesma interface que ele usa quando roda dentro do Claude. */
(() => {
  const SB_URL = 'https://vowqejeshrdgijusoozj.supabase.co';
  const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvd3FlamVzaHJkZ2lqdXNvb3pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3ODIyNTYsImV4cCI6MjEwODM1ODI1Nn0.fTEFkzf93UCjNWAst6pqfE5oF26lmodYdwjL5tZZY0I';
  if (!window.supabase || !window.supabase.createClient) { console.warn('Supabase indisponível: o jogo segue só no modo local.'); return; }
  const sb = window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'truco-sb' } });

  let me = null;                 // { id, username, char }
  let recovering = false, recoveryCb = null;
  const authCbs = new Set();
  const err = (msg) => new Error(msg);

  sb.auth.onAuthStateChange((ev, session) => {
    if (ev === 'PASSWORD_RECOVERY') { recovering = true; if (recoveryCb) recoveryCb(); }
    const id = session && session.user ? session.user.id : null;
    if (!id) me = null;
    else if (!me || me.id !== id) me = { id, username: null, char: 'ze' };
    // o Realtime usa o token da sessão nos canais privados
    setTimeout(() => authCbs.forEach(f => { try { f(id); } catch (e) {} }), 0);
  });

  async function loadProfile(id) {
    const { data } = await sb.from('profiles').select('id, username, char').eq('id', id).maybeSingle();
    me = data ? { id: data.id, username: data.username, char: data.char } : { id, username: null, char: 'ze' };
    return me;
  }

  const TB = {
    uid: () => (me ? me.id : null),
    async restore() {
      const { data } = await sb.auth.getSession();
      const u = data && data.session && data.session.user;
      if (!u) return null;
      const p = await loadProfile(u.id);
      return p.username ? p : null;
    },
    onRecovery(cb) { recoveryCb = cb; if (recovering) cb(); },
    onAuth(cb) { authCbs.add(cb); return () => authCbs.delete(cb); },

    async nameTaken(u) {
      const { data, error } = await sb.rpc('username_available', { u });
      return error ? null : !data;
    },
    async mailTaken(e) {
      const { data, error } = await sb.rpc('email_available', { e });
      return error ? null : !data;
    },
    async signUp(username, email, password) {
      let res;
      try {
        res = await fetch(SB_URL + '/functions/v1/cadastro', {
          method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY },
          body: JSON.stringify({ username, email, password }),
        });
      } catch (e) { throw err('Sem conexão com o servidor. Confira sua internet e tente de novo.'); }
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.ok) throw err(body.msg || 'Não deu pra criar a conta agora. Tente de novo.');
      return TB.signIn(email, password);
    },
    async signIn(id, password) {
      let email = id;
      if (!id.includes('@')) {
        const { data, error } = await sb.rpc('login_email', { p_user: id, p_pw: password });
        if (error) throw err('Não deu pra conferir agora. Tente de novo em instantes.');
        if (!data) {
          const taken = await TB.nameTaken(id);
          throw err(taken ? 'Senha incorreta.' : 'Não encontramos uma conta com esse usuário ou e-mail.');
        }
        email = data;
      }
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) {
        if (/invalid login|credentials/i.test(error.message)) {
          const taken = await TB.mailTaken(email);
          throw err(taken ? 'Senha incorreta.' : 'Não encontramos uma conta com esse usuário ou e-mail.');
        }
        if (/rate|too many/i.test(error.message)) throw err('Muitas tentativas. Espere um pouco e tente de novo.');
        throw err('Não deu pra entrar agora. Tente de novo em instantes.');
      }
      const p = await loadProfile(data.user.id);
      return p.username || id;
    },
    async signOut() { me = null; try { await sb.auth.signOut(); } catch (e) {} },
    async sendReset(email) {
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
      if (error && /rate|too many|seconds/i.test(error.message)) throw err('Pedimos um link há pouco. Espere um minuto e tente de novo.');
      if (error) throw err('Não deu pra mandar o link agora. Tente de novo em instantes.');
    },
    async updatePassword(password) {
      const { data, error } = await sb.auth.updateUser({ password });
      if (error) throw err(/same|different/i.test(error.message) ? 'A senha nova precisa ser diferente da antiga.' : 'O link expirou ou já foi usado. Peça outro em "Esqueci minha senha".');
      recovering = false;
      try { history.replaceState(null, '', location.pathname); } catch (e) {}
      const p = await loadProfile(data.user.id);
      return p.username;
    },
    async setChar(c) {
      if (!me) return;
      me.char = c;
      await sb.from('profiles').update({ char: c }).eq('id', me.id);
    },

    async myRank() {
      if (!me) return null;
      const { data } = await sb.from('ranking').select('*').eq('id', me.id).maybeSingle();
      return data ? fromRow(data) : null;
    },
    async record(won, pts, xp) {
      const { data, error } = await sb.rpc('record_result', { p_won: !!won, p_pts: pts | 0, p_xp: xp | 0 });
      if (error) throw error;
      return fromRow(data);
    },
    async rank(tab, wk) {
      const cols = 'id, apelido, char, semana, pts, vit, jogos, sem_ant, pts_ant, vit_ant, jogos_ant';
      if (tab === 'now') {
        const { data, error } = await sb.from('ranking').select(cols).eq('semana', wk).gt('jogos', 0).order('pts', { ascending: false }).limit(200);
        if (error) throw error;
        return (data || []).map(fromRow);
      }
      const { data, error } = await sb.from('ranking').select(cols).or(`semana.eq.${wk},sem_ant.eq.${wk}`).limit(400);
      if (error) throw error;
      return (data || []).map(r => r.semana === wk ? fromRow(r) : { ...fromRow(r), pts: r.pts_ant, vit: r.vit_ant, jogos: r.jogos_ant });
    },
  };
  const fromRow = r => r && ({ id: r.id, apelido: r.apelido, char: r.char, semana: r.semana, pts: r.pts, vit: r.vit, jogos: r.jogos, xp: r.xp, semAnt: r.sem_ant });

  /* ---------- Salas: a interface de "room" do jogo, em cima do Realtime ----------
     Cada aba é um "peer". A presença do Supabase diz quem entrou e saiu; o estado de cada
     um (o objeto que o jogo passa em presence()) viaja por broadcast, sempre inteiro,
     com no máximo ~7 envios por segundo por aba. Quem chega recebe o estado de todos. */
  const PEER = 'p' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const SEND_GAP = 140;

  function mkRoom(name) {
    const topic = 'truco:' + name;
    let ch = null, closed = false, ready = false, retryT = null;
    let mine = {}, myAt = Date.now();
    const others = new Map();     // peer -> { presence, by, updatedAt }
    const hs = new Set();
    let cur = Object.freeze([]);
    let pend = null, flushT = null, sendT = null, lastSend = 0;

    const view = () => {
      const uid = TB.uid();
      const arr = [{ peer: PEER, by: uid, isMe: true, sameTab: true, kind: 'viewer', guest: false, presence: Object.freeze({ ...mine }), updatedAt: myAt }];
      for (const [p, o] of others) arr.push({ peer: p, by: o.by || null, isMe: !!(uid && o.by === uid), sameTab: false, kind: 'viewer', guest: false, presence: Object.freeze({ ...o.presence }), updatedAt: o.updatedAt });
      return Object.freeze(arr);
    };
    const peerObj = p => cur.find(x => x.peer === p) || { peer: p, presence: {} };
    function queue(kind, p, snap) {
      if (!pend) pend = { joined: new Map(), left: new Map(), updated: new Map() };
      if (kind === 'left') { pend.joined.delete(p); pend.updated.delete(p); pend.left.set(p, snap); }
      else if (kind === 'joined') { pend.left.delete(p); pend.joined.set(p, 1); }
      else if (!pend.joined.has(p)) pend.updated.set(p, 1);
      if (!flushT) flushT = setTimeout(flush, 0);
    }
    function flush() {
      flushT = null; const pd = pend; pend = null; cur = view();
      const ch2 = { peers: cur, joined: [...pd.joined.keys()].map(peerObj), left: [...pd.left.values()], updated: [...pd.updated.keys()].map(peerObj) };
      hs.forEach(h => { try { h(ch2); } catch (e) { console.error(e); } });
    }
    function sendNow() {
      clearTimeout(sendT); sendT = null; if (!ready || closed) return;
      lastSend = Date.now();
      ch.send({ type: 'broadcast', event: 'st', payload: { peer: PEER, by: TB.uid(), pr: mine } }).catch(() => {});
    }
    function scheduleSend() {
      if (sendT) return;
      const wait = Math.max(0, SEND_GAP - (Date.now() - lastSend));
      sendT = setTimeout(sendNow, wait);
    }
    function drop(p) {
      if (!others.has(p)) return;
      const snap = peerObj(p); others.delete(p); queue('left', p, snap);
    }
    let gen = 0, connecting = false, tries = 0, lastErr = '';
    const log = (...a) => { try { console.info('[truco salas]', topic, ...a); } catch (e) {} };
    const setStatus = () => queue('updated', PEER);
    async function connect() {
      if (closed || ch || connecting) return;
      if (!TB.uid()) return;   // canais privados: só com sessão
      connecting = true; const my = ++gen;
      try {
        // um canal antigo com o mesmo nome precisa sair de vez antes (o cliente reaproveitaria o canal quebrado)
        for (const old of sb.getChannels().filter(c => c.topic === 'realtime:' + topic)) { try { await sb.removeChannel(old); } catch (e) {} }
        await sb.realtime.setAuth();
      } catch (e) { log('auth', e && e.message); }
      connecting = false;
      if (closed || my !== gen || ch || !TB.uid()) return;
      const c = sb.channel(topic, { config: { private: true, broadcast: { self: false, ack: false }, presence: { key: PEER } } });
      ch = c;
      c.on('broadcast', { event: 'st' }, ({ payload }) => {
        if (ch !== c || !payload || payload.peer === PEER || typeof payload.pr !== 'object') return;
        const had = others.has(payload.peer);
        others.set(payload.peer, { presence: payload.pr || {}, by: payload.by || null, updatedAt: Date.now() });
        queue(had ? 'updated' : 'joined', payload.peer);
      });
      c.on('broadcast', { event: 'bye' }, ({ payload }) => { if (ch === c && payload && payload.peer !== PEER) drop(payload.peer); });
      c.on('presence', { event: 'join' }, ({ key }) => { if (ch === c && key !== PEER) scheduleSend(); });
      c.on('presence', { event: 'leave' }, ({ key }) => { if (ch === c && key !== PEER) drop(key); });
      c.subscribe(async (status, e) => {
        if (ch !== c) return;
        log(status, e ? (e.message || String(e)) : '');
        if (status === 'SUBSCRIBED') {
          ready = true; tries = 0; lastErr = ''; setStatus();
          try { await c.track({ peer: PEER }); } catch (x) { log('track', x && x.message); }
          sendNow();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          ready = false; ch = null; lastErr = status === 'TIMED_OUT' ? 'tempo esgotado' : (e && e.message) || status.toLowerCase(); setStatus();
          Promise.resolve().then(() => sb.removeChannel(c)).catch(() => {});
          if (closed) return;
          clearTimeout(retryT); retryT = setTimeout(connect, Math.min(10000, 1500 * ++tries));
        }
      });
    }
    function disconnect() {
      ready = false; clearTimeout(retryT); gen++;
      if (ch) { const old = ch; ch = null; try { old.send({ type: 'broadcast', event: 'bye', payload: { peer: PEER } }); } catch (e) {} setTimeout(() => { Promise.resolve().then(() => sb.removeChannel(old)).catch(() => {}); }, 150); }
      for (const p of [...others.keys()]) drop(p);
    }
    const offAuth = TB.onAuth(uid => { if (closed) return; if (uid) { if (!ch) connect(); else scheduleSend(); } else disconnect(); });
    connect();
    cur = view();

    return {
      name,
      async presence(patch) {
        if (closed) throw { code: 'invalid_argument', message: 'room closed' };
        const next = { ...mine };
        for (const k in patch) { if (patch[k] === null) delete next[k]; else next[k] = JSON.parse(JSON.stringify(patch[k])); }
        const size = new Blob([JSON.stringify(next)]).size;
        if (size > 16384) throw { code: 'invalid_argument', message: 'presence > 16KiB: ' + size };
        mine = next; myAt = Date.now();
        queue('updated', PEER); scheduleSend();
      },
      peers: () => cur,
      onPeers(h) { hs.add(h); setTimeout(() => { if (hs.has(h)) h({ peers: cur, joined: cur.slice(), left: [], updated: [] }); }, 0); return () => hs.delete(h); },
      emit: async () => {}, on: () => () => {},
      connected: () => ready,
      status: () => ({ ok: ready, err: lastErr, signed: !!TB.uid() }),
      onConnection(h) { setTimeout(() => h(ready), 0); return () => {}; },
      async leave() { if (closed) return; disconnect(); closed = true; offAuth(); hs.clear(); },
    };
  }

  const lobby = mkRoom('lobby');
  lobby.join = async n => mkRoom(String(n));
  const user = { id: async () => TB.uid(), name: async () => (me && me.username) || null, canEdit: async () => false, isOwner: async () => false, can: async () => false };
  window.TB = TB;
  window.claude = { use: n => Promise.resolve(n === 'room' ? lobby : n === 'user' ? user : null) };
})();
