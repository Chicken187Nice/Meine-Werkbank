// Jellyfin in der Werkbank. Der Browser spricht nur mit der Werkbank, nie direkt mit Jellyfin:
// - Jeder Nutzer meldet sich einmal mit seinem eigenen Jellyfin-Konto an. Gespeichert wird nur das Zugangs-Token,
//   auf dem Server, außerhalb der Nutzerdaten. Es wird nie an den Browser geschickt. Das Passwort wird nicht gespeichert.
// - Erreichbar sind nur die hier aufgezählten Funktionen zum Stöbern und Abspielen, keine Jellyfin-Verwaltung.
// - Antworten werden auf ausgewählte Felder gekürzt (keine Dateipfade).
// - Videos laufen über kurzlebige Abspiel-Tickets, die an die Werkbank-Sitzung gebunden sind.
'use strict';
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

module.exports = ({ on, send, err, json, SEC, DATA, log, ipOf, viaProxy, lockLeft, recordFail, clearFails, slow, findUser }) => {
  const BASE = (process.env.WB_JELLYFIN_URL || '').replace(/\/+$/, '');
  const FILE = path.join(DATA, 'jellyfin.json');
  let links = {}; try { links = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch {}
  const save = () => { const t = FILE + '.tmp'; fs.writeFileSync(t, JSON.stringify(links), { mode: 0o600 }); fs.renameSync(t, FILE); };

  class JfError extends Error { constructor(status, msg, extra) { super(msg); this.status = status; this.extra = extra; } }
  const authHeader = (device, token) => `MediaBrowser Client="Werkbank", Device="Werkbank", DeviceId="${device}", Version="1.0"${token ? `, Token="${token}"` : ''}`;

  async function raw(pathname, { method = 'GET', query, body, device = 'werkbank', token, timeout = 15000 } = {}) {
    if (!BASE) throw new JfError(503, 'Jellyfin ist nicht eingerichtet (WB_JELLYFIN_URL fehlt)');
    const u = new URL(BASE + pathname);
    for (const [k, v] of Object.entries(query || {})) if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, String(v));
    try {
      return await fetch(u, { method, redirect: 'error', signal: AbortSignal.timeout(timeout),
        headers: { Authorization: authHeader(device, token), Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    } catch { throw new JfError(502, 'Jellyfin ist gerade nicht erreichbar'); }
  }
  // Anfrage im Namen des Werkbank-Nutzers
  async function call(uid, pathname, opt = {}) {
    const l = links[uid]; if (!l) throw new JfError(409, 'Noch nicht mit Jellyfin verbunden', { relogin: true });
    const r = await raw(pathname, { ...opt, device: l.device, token: l.token });
    // Kein 401 an den Browser weitergeben: das hieße „nicht in der Werkbank angemeldet“
    if (r.status === 401) { delete links[uid]; save(); throw new JfError(409, 'Jellyfin-Anmeldung abgelaufen, bitte neu verbinden', { relogin: true }); }
    if (r.status === 403) throw new JfError(403, 'Dein Jellyfin-Konto darf das nicht');
    if (r.status === 404) throw new JfError(404, 'In Jellyfin nicht gefunden');
    if (!r.ok) throw new JfError(502, 'Jellyfin antwortet mit Fehler ' + r.status);
    if (r.status === 204) return null;
    const t = await r.text(); try { return t ? JSON.parse(t) : null; } catch { throw new JfError(502, 'Unverständliche Antwort von Jellyfin'); }
  }

  // ---------- Felder auswählen ----------
  const ID = /^[a-f0-9]{32}$/;
  const id = v => { const s = String(v || '').replace(/-/g, '').toLowerCase(); return ID.test(s) ? s : ''; };
  const need = v => { const s = id(v); if (!s) throw new JfError(400, 'Ungültige Kennung'); return s; };
  const sec = t => t ? Math.round(t / 1e7) : 0;
  const str = (v, n = 300) => v == null ? '' : String(v).slice(0, n);
  const tag = v => /^[A-Za-z0-9]{1,64}$/.test(v || '') ? v : '';
  function item(x) {
    const u = x.UserData || {};
    const o = { id: id(x.Id), name: str(x.Name), type: str(x.Type, 30), media: str(x.MediaType, 20), year: x.ProductionYear || 0, runtime: sec(x.RunTimeTicks),
      played: !!u.Played, pos: sec(u.PlaybackPositionTicks), pct: Math.round(u.PlayedPercentage || 0), unplayed: u.UnplayedItemCount || 0, fav: !!u.IsFavorite,
      img: tag(x.ImageTags && x.ImageTags.Primary), thumb: tag(x.ImageTags && x.ImageTags.Thumb), backdrop: tag((x.BackdropImageTags || [])[0]),
      parentBackdrop: x.ParentBackdropItemId ? id(x.ParentBackdropItemId) : '', seriesId: x.SeriesId ? id(x.SeriesId) : '', series: str(x.SeriesName),
      seriesImg: tag(x.SeriesPrimaryImageTag), seasonId: x.SeasonId ? id(x.SeasonId) : '', season: x.ParentIndexNumber ?? null, episode: x.IndexNumber ?? null,
      folder: !!x.IsFolder, kind: str(x.CollectionType, 30) };
    return o;
  }
  const detail = x => ({ ...item(x), overview: str(x.Overview, 4000), genres: (x.Genres || []).slice(0, 8).map(g => str(g, 60)), rating: x.CommunityRating ? Math.round(x.CommunityRating * 10) / 10 : 0, age: str(x.OfficialRating, 20),
    tagline: str((x.Taglines || [])[0]), people: (x.People || []).slice(0, 12).map(p => ({ name: str(p.Name, 80), role: str(p.Role || p.Type, 80) })), children: x.ChildCount || 0,
    versions: (x.MediaSources || []).slice(0, 5).map(s => ({ id: id(s.Id), name: str(s.Name, 120) })) });
  const items = r => ((r && (r.Items || r)) || []).filter(x => x && id(x.Id)).map(item);

  // ---------- Abspiel-Tickets ----------
  const tickets = new Map(); // ticket -> { uid, sess, item, source, play, method, path, subs, used, open: Set(res) }
  function drop(key) {
    const t = tickets.get(key); if (!t) return; tickets.delete(key);
    for (const res of t.open) res.destroy();
    if (t.method === 'transcode' && links[t.uid]) call(t.uid, '/Videos/ActiveEncodings', { method: 'DELETE', query: { deviceId: links[t.uid].device, playSessionId: t.play } }).catch(() => {});
  }
  setInterval(() => { for (const [k, t] of tickets) if (!t.open.size && Date.now() - t.used > 6 * 3600e3) drop(k); }, 15 * 60e3);
  const ticketOf = (q, key) => { const t = tickets.get(key); if (!t || t.uid !== q.u.id || t.sess !== q.sess.key) throw new JfError(403, 'Abspiel-Link ungültig oder abgelaufen'); t.used = Date.now(); return t; };

  // Alle Routen: nur mit Zugriff auf die Kachel, Fehler einheitlich melden
  const route = (method, re, fn) => on(method, re, async (q, res, m) => {
    try { await fn(q, res, m); }
    catch (e) { if (!(e instanceof JfError)) throw e; if (!res.headersSent) send(res, e.status, { error: e.message, ...e.extra }); }
  }, { app: 'jellyfin' });

  // ---------- Verbinden ----------
  route('GET', /^\/api\/jf\/status$/, async (q, res) => {
    let server = null;
    if (BASE) try { const r = await raw('/System/Info/Public', { timeout: 5000 }); if (r.ok) { const j = await r.json(); server = { name: str(j.ServerName, 80), version: str(j.Version, 30) }; } } catch {}
    const l = links[q.u.id];
    send(res, 200, { configured: !!BASE, reachable: !!server, server, connected: !!l, user: l ? l.user : '', remote: viaProxy(q.req) });
  });
  route('POST', /^\/api\/jf\/login$/, async (q, res) => {
    const b = await json(q.req), name = String(b.user || '').trim(), pw = String(b.pass || '');
    if (!name || name.length > 100 || pw.length > 200) return err(res, 400, 'Bitte Jellyfin-Name und Passwort eingeben');
    const ip = ipOf(q.req), keys = ['jf:' + q.u.id, 'jf:ip-' + ip]; const wait = lockLeft(keys);
    if (wait) { await slow(); return err(res, 429, `Zu viele Fehlversuche. Bitte in ${wait} Min. erneut versuchen.`); }
    const device = 'werkbank-' + q.u.id;
    const r = await raw('/Users/AuthenticateByName', { method: 'POST', body: { Username: name, Pw: pw }, device });
    if (r.status === 401 || r.status === 400 || r.status === 403) { recordFail('jf', q.u.id); recordFail('jf', 'ip-' + ip); log('jellyfin-fehler', q.u.name, ip); await slow(); return err(res, 400, 'Jellyfin lehnt Name oder Passwort ab'); }
    if (!r.ok) return err(res, 502, 'Jellyfin antwortet mit Fehler ' + r.status);
    const j = await r.json(); if (!j.AccessToken || !/^[A-Za-z0-9]+$/.test(j.AccessToken) || !id(j.User && j.User.Id)) return err(res, 502, 'Unverständliche Antwort von Jellyfin');
    links[q.u.id] = { token: j.AccessToken, userId: id(j.User.Id), user: str(j.User.Name, 80), device, since: new Date().toISOString() }; save();
    clearFails(...keys); log('jellyfin-verbunden', q.u.name, ip, links[q.u.id].user);
    send(res, 200, { ok: true, user: links[q.u.id].user });
  });
  async function forget(uid) {
    for (const [k, t] of tickets) if (t.uid === uid) drop(k);
    if (!links[uid]) return;
    try { await call(uid, '/Sessions/Logout', { method: 'POST' }); } catch {}
    delete links[uid]; save();
  }
  route('POST', /^\/api\/jf\/logout$/, async (q, res) => { await forget(q.u.id); log('jellyfin-getrennt', q.u.name, ipOf(q.req)); send(res, 200, { ok: true }); });

  // ---------- Stöbern ----------
  const uid = q => links[q.u.id] ? links[q.u.id].userId : '';
  const FIELDS = 'PrimaryImageAspectRatio';
  route('GET', /^\/api\/jf\/home$/, async (q, res) => {
    const views = items(await call(q.u.id, '/UserViews', { query: { userId: uid(q) } }));
    const base = { userId: uid(q), fields: FIELDS, enableImageTypes: 'Primary,Backdrop,Thumb' };
    const [resume, next, favs, latest] = await Promise.all([
      call(q.u.id, '/UserItems/Resume', { query: { ...base, limit: 16, mediaTypes: 'Video,Audio' } }),
      call(q.u.id, '/Shows/NextUp', { query: { ...base, limit: 16 } }),
      call(q.u.id, '/Items', { query: { ...base, recursive: true, filters: 'IsFavorite', includeItemTypes: 'Movie,Series,Episode,Video', limit: 16, sortBy: 'SortName' } }),
      Promise.all(views.slice(0, 8).map(async v => ({ view: v, items: items(await call(q.u.id, '/Items/Latest', { query: { ...base, parentId: v.id, limit: 16 } }).catch(() => [])) })))
    ]);
    send(res, 200, { views, resume: items(resume), next: items(next), favorites: items(favs), latest });
  });
  const SORT = { name: ['SortName', 'Ascending'], neu: ['DateCreated,SortName', 'Descending'], jahr: ['ProductionYear,SortName', 'Descending'], wertung: ['CommunityRating,SortName', 'Descending'] };
  const TYPES = { movies: 'Movie', tvshows: 'Series', music: 'MusicAlbum', boxsets: 'BoxSet', musicvideos: 'MusicVideo' };
  route('GET', /^\/api\/jf\/items$/, async (q, res) => {
    const p = q.url.searchParams, search = String(p.get('search') || '').slice(0, 100), parent = p.get('parent') ? need(p.get('parent')) : '';
    const kind = String(p.get('kind') || ''), [sortBy, sortOrder] = SORT[p.get('sort')] || SORT.name, limit = 60;
    const start = Math.max(0, Math.min(100000, parseInt(p.get('start'), 10) || 0));
    const query = { userId: uid(q), fields: FIELDS, startIndex: start, limit, enableImageTypes: 'Primary,Backdrop,Thumb' };
    if (search) Object.assign(query, { searchTerm: search, recursive: true, includeItemTypes: 'Movie,Series,Episode,Video,BoxSet,MusicAlbum,Audio' });
    else if (!parent) throw new JfError(400, 'Bibliothek fehlt');
    else { Object.assign(query, { parentId: parent, sortBy, sortOrder }); if (Object.hasOwn(TYPES, kind)) Object.assign(query, { includeItemTypes: TYPES[kind], recursive: true }); }
    const r = await call(q.u.id, '/Items', { query });
    send(res, 200, { items: items(r), total: r.TotalRecordCount || 0, start, limit });
  });
  route('GET', /^\/api\/jf\/item\/([a-f0-9]{32})$/, async (q, res, m) => {
    const x = await call(q.u.id, '/Items/' + m[1], { query: { userId: uid(q) } }), out = { item: detail(x) };
    const base = { userId: uid(q), fields: 'Overview', enableImageTypes: 'Primary,Backdrop,Thumb' };
    if (x.Type === 'Series') {
      out.seasons = items(await call(q.u.id, `/Shows/${m[1]}/Seasons`, { query: base }));
      out.next = items(await call(q.u.id, '/Shows/NextUp', { query: { ...base, seriesId: m[1], limit: 1 } }).catch(() => []))[0] || null;
    } else if (x.Type === 'Season' && id(x.SeriesId)) {
      const r = await call(q.u.id, `/Shows/${id(x.SeriesId)}/Episodes`, { query: { ...base, seasonId: m[1] } });
      out.children = (r.Items || []).map(e => ({ ...item(e), overview: str(e.Overview, 600) }));
    } else if (x.IsFolder) out.children = items(await call(q.u.id, '/Items', { query: { ...base, parentId: m[1], sortBy: 'IndexNumber,SortName', limit: 500 } }));
    else if (x.Type === 'Episode' && id(x.SeriesId)) {
      const r = await call(q.u.id, `/Shows/${id(x.SeriesId)}/Episodes`, { query: { userId: uid(q), startItemId: m[1], limit: 2 } });
      out.after = items(r)[1] || null;
    }
    send(res, 200, out);
  });
  route('POST', /^\/api\/jf\/(played|favorite)\/([a-f0-9]{32})$/, async (q, res, m) => {
    const b = await json(q.req);
    await call(q.u.id, `/${m[1] === 'played' ? 'UserPlayedItems' : 'UserFavoriteItems'}/${m[2]}`, { method: b.value ? 'POST' : 'DELETE', query: { userId: uid(q) } });
    send(res, 200, { ok: true });
  });

  // Weiterleitung eines Datenstroms von Jellyfin an den Browser
  function pipe(q, res, upstream, { cache = 'no-store', types, ticket } = {}) {
    const l = links[q.u.id]; if (!l) throw new JfError(409, 'Noch nicht mit Jellyfin verbunden', { relogin: true });
    const u = new URL(upstream, BASE + '/'); const lib = u.protocol === 'https:' ? https : http;
    const headers = { Authorization: authHeader(l.device, l.token) };
    if (ticket && /^bytes=\d*-\d*$/.test(q.req.headers.range || '')) headers.Range = q.req.headers.range;
    const up = lib.get(u, { headers }, r => {
      const type = String(r.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
      if (r.statusCode !== 200 && r.statusCode !== 206) { r.resume(); return err(res, r.statusCode === 404 ? 404 : 502, 'Jellyfin liefert die Datei nicht'); }
      if (!types.test(type)) { r.resume(); return err(res, 502, 'Unerwarteter Dateityp von Jellyfin'); }
      const h = { ...SEC, 'Content-Type': type, 'Cache-Control': cache };
      for (const k of ['content-length', 'content-range', 'accept-ranges']) if (r.headers[k]) h[k] = r.headers[k];
      res.writeHead(r.statusCode, h); r.pipe(res);
      r.on('error', () => res.destroy());
    });
    up.setTimeout(60000, () => up.destroy());
    up.on('error', () => { if (!res.headersSent) err(res, 502, 'Jellyfin ist gerade nicht erreichbar'); else res.destroy(); });
    res.on('close', () => { up.destroy(); ticket?.open.delete(res); });
    ticket?.open.add(res);
  }
  route('GET', /^\/api\/jf\/img\/([a-f0-9]{32})\/(Primary|Backdrop|Thumb)$/, (q, res, m) => {
    const w = Math.max(40, Math.min(1920, parseInt(q.url.searchParams.get('w'), 10) || 400));
    const t = tag(q.url.searchParams.get('tag'));
    pipe(q, res, `${BASE}/Items/${m[1]}/Images/${m[2]}?maxWidth=${w}&quality=90${t ? '&tag=' + t : ''}`, { cache: 'private, max-age=86400', types: /^image\/(jpeg|png|webp|gif)$/ });
  });

  // ---------- Abspielen ----------
  const QUALITY = { max: 120e6, hoch: 10e6, mittel: 4e6, niedrig: 1.5e6 };
  function profile(caps, bitrate) {
    const v = ['h264', ...(caps.hevc ? ['hevc'] : []), ...(caps.vp9 ? ['vp9'] : []), ...(caps.av1 ? ['av1'] : [])].join(',');
    const a = 'aac,mp3,opus,flac';
    return { MaxStreamingBitrate: bitrate, MaxStaticBitrate: bitrate,
      DirectPlayProfiles: [{ Type: 'Video', Container: 'mp4,m4v,mov', VideoCodec: v, AudioCodec: a }, { Type: 'Video', Container: 'webm', VideoCodec: 'vp8,vp9,av1', AudioCodec: 'opus,vorbis' },
        ...(caps.mkv ? [{ Type: 'Video', Container: 'mkv', VideoCodec: v, AudioCodec: a }] : []), { Type: 'Audio', Container: 'mp3,aac,m4a,flac,ogg,opus,wav,webm' }],
      TranscodingProfiles: [{ Type: 'Video', Context: 'Streaming', Protocol: 'http', Container: 'mp4', VideoCodec: 'h264', AudioCodec: 'aac', MaxAudioChannels: '2' },
        { Type: 'Audio', Context: 'Streaming', Protocol: 'http', Container: 'mp3', AudioCodec: 'mp3' }],
      SubtitleProfiles: [{ Format: 'vtt', Method: 'External' }, { Format: 'srt', Method: 'External' }, { Format: 'ass', Method: 'External' }], CodecProfiles: [], ContainerProfiles: [] };
  }
  route('POST', /^\/api\/jf\/play\/([a-f0-9]{32})$/, async (q, res, m) => {
    const b = await json(q.req), caps = b.caps || {}, bitrate = QUALITY[b.quality] || QUALITY.max;
    const start = Math.max(0, Math.min(200000, +b.start || 0));
    const audio = Number.isInteger(b.audio) && b.audio >= 0 && b.audio < 200 ? b.audio : undefined;
    const source = b.version ? need(b.version) : undefined;
    // forceTranscode: wenn der Browser die Originaldatei doch nicht abspielen konnte
    const info = await call(q.u.id, `/Items/${m[1]}/PlaybackInfo`, { method: 'POST', timeout: 30000, query: { userId: uid(q) },
      body: { UserId: uid(q), DeviceProfile: profile(caps, bitrate), StartTimeTicks: Math.round(start * 1e7), MaxStreamingBitrate: bitrate, AudioStreamIndex: audio, MediaSourceId: source,
        SubtitleStreamIndex: -1, EnableDirectPlay: !b.forceTranscode, EnableDirectStream: !b.forceTranscode, EnableTranscoding: true, AllowVideoStreamCopy: !b.forceTranscode, AllowAudioStreamCopy: !b.forceTranscode, AutoOpenLiveStream: true } });
    const s = (info.MediaSources || []).find(x => !source || id(x.Id) === source) || (info.MediaSources || [])[0];
    if (!s) throw new JfError(502, info.ErrorCode ? 'Jellyfin: ' + str(info.ErrorCode, 60) : 'Keine abspielbare Datei gefunden');
    const streams = s.MediaStreams || [], isAudio = !streams.some(x => x.Type === 'Video');
    // Wunsch-Tonspur: Originaldatei spielt immer die Standardspur, andere Spuren gehen nur umgewandelt
    const otherAudio = audio !== undefined && audio !== s.DefaultAudioStreamIndex;
    const direct = !b.forceTranscode && (s.SupportsDirectPlay || s.SupportsDirectStream) && !(otherAudio && s.TranscodingUrl);
    const sid = id(s.Id) || str(s.Id, 64), play = str(info.PlaySessionId, 64);
    let upstream;
    if (direct) upstream = `${BASE}/${isAudio ? 'Audio' : 'Videos'}/${m[1]}/stream?static=true&mediaSourceId=${encodeURIComponent(sid)}&playSessionId=${encodeURIComponent(play)}&deviceId=${encodeURIComponent(links[q.u.id].device)}`;
    else {
      const t = String(s.TranscodingUrl || ''); if (!t.startsWith('/') || t.startsWith('//')) throw new JfError(502, 'Jellyfin kann diese Datei für den Browser nicht umwandeln (Rechte im Jellyfin-Konto prüfen)');
      const u = new URL(BASE + t); u.searchParams.delete('StartTimeTicks'); if (start) u.searchParams.set('StartTimeTicks', String(Math.round(start * 1e7))); upstream = u.href;
    }
    const mine = [...tickets].filter(([, t]) => t.uid === q.u.id).sort((a, c) => a[1].used - c[1].used);
    while (mine.length >= 3) drop(mine.shift()[0]);
    const key = crypto.randomBytes(24).toString('base64url');
    const subs = streams.filter(x => x.Type === 'Subtitle' && x.IsTextSubtitleStream && Number.isInteger(x.Index)).slice(0, 30).map(x => ({ index: x.Index, label: str(x.DisplayTitle || x.Language || 'Untertitel', 80), lang: str(x.Language, 10) }));
    tickets.set(key, { uid: q.u.id, sess: q.sess.key, item: m[1], source: sid, play, method: direct ? 'direct' : 'transcode', path: upstream, subs: new Set(subs.map(x => x.index)), offset: direct ? 0 : start, used: Date.now(), open: new Set() });
    send(res, 200, { ticket: key, url: '/api/jf/stream/' + key, method: direct ? 'direct' : 'transcode', start, duration: sec(s.RunTimeTicks), audioOnly: isAudio, subs,
      audio: streams.filter(x => x.Type === 'Audio').slice(0, 30).map(x => ({ index: x.Index, label: str(x.DisplayTitle || x.Language || 'Ton', 80) })), audioIndex: audio ?? s.DefaultAudioStreamIndex ?? null });
  });
  route('GET', /^\/api\/jf\/stream\/([A-Za-z0-9_-]{32})$/, (q, res, m) => { const t = ticketOf(q, m[1]); pipe(q, res, t.path, { types: /^(video|audio)\/[a-z0-9.+-]+$|^application\/octet-stream$/, ticket: t }); });
  // Untertitel als WebVTT. Bei umgewandelten Videos beginnt die Zeit beim Startpunkt, deshalb werden die Zeiten verschoben.
  const moved = (line, by) => line.replace(/(?:(\d\d):)?(\d\d):(\d\d)\.(\d{3})/g, (_, h, mi, s, ms) => {
    const t = Math.max(0, (+h || 0) * 3600 + +mi * 60 + +s + ms / 1000 - by), total = Math.round(t * 1000), p = (n, l = 2) => String(n).padStart(l, '0');
    return `${p(Math.floor(total / 3600000))}:${p(Math.floor(total / 60000) % 60)}:${p(Math.floor(total / 1000) % 60)}.${p(total % 1000, 3)}`; });
  const shift = (vtt, by) => !by ? vtt : vtt.split('\n').map(l => l.includes('-->') ? moved(l, by) : l).join('\n');
  route('GET', /^\/api\/jf\/sub\/([A-Za-z0-9_-]{32})\/(\d{1,3})$/, async (q, res, m) => {
    const t = ticketOf(q, m[1]), i = +m[2]; if (!t.subs.has(i)) throw new JfError(404, 'Untertitel nicht gefunden');
    const l = links[q.u.id]; if (!l) throw new JfError(409, 'Noch nicht mit Jellyfin verbunden', { relogin: true });
    const r = await raw(`/Videos/${t.item}/${encodeURIComponent(t.source)}/Subtitles/${i}/0/Stream.vtt`, { device: l.device, token: l.token, timeout: 60000 });
    if (!r.ok) throw new JfError(502, 'Untertitel nicht verfügbar');
    send(res, 200, shift((await r.text()).slice(0, 5e6), t.offset), 'text/vtt; charset=utf-8');
  });
  route('POST', /^\/api\/jf\/progress\/([A-Za-z0-9_-]{32})$/, async (q, res, m) => {
    const b = await json(q.req), t = ticketOf(q, m[1]);
    const ev = b.event === 'start' ? '' : b.event === 'stop' ? '/Stopped' : '/Progress';
    await call(q.u.id, '/Sessions/Playing' + ev, { method: 'POST', body: { ItemId: t.item, MediaSourceId: t.source, PlaySessionId: t.play, PositionTicks: Math.round(Math.max(0, +b.pos || 0) * 1e7),
      IsPaused: !!b.paused, CanSeek: true, PlayMethod: t.method === 'direct' ? 'DirectPlay' : 'Transcode' } });
    if (b.event === 'stop') drop(m[1]);
    send(res, 200, { ok: true });
  });

  return {
    // Beim Abmelden bzw. Sperren laufende Wiedergaben sofort beenden
    cutSession: key => { for (const [k, t] of tickets) if (t.sess === key) drop(k); },
    cutUser: userId => { for (const [k, t] of tickets) if (t.uid === userId) drop(k); },
    forget
  };
};
