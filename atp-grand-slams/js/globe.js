/* globe.js - dot-matrix globe drawn on a <canvas> (orthographic projection, no libraries).
   Arcs run from a champion's home country to the Slam venue where the titles were won.
   Arc thickness = number of titles. Drag to rotate; hover a marker for details. */
(function (g) {
  'use strict';
  const D = Math.PI / 180;
  const COL = { ink: '#2b4530', sea: '#eef4e8', grid: '#d5e1cb', land: '#86a882', white: '#fdfdfb', blush: '#f8e3e7', pink: '#ea96a4' };
  const SLAM_COLOR = { AO: '#6fa8b0', RG: '#ea96a4', W: '#6f9a5f', USO: '#c6d445' };
  let DOTS = null;

  function inRing(x, y, ring) {
    let c = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  const box = r => r.reduce((b, p) => [Math.min(b[0], p[0]), Math.max(b[1], p[0]), Math.min(b[2], p[1]), Math.max(b[3], p[1])], [1e9, -1e9, 1e9, -1e9]);
  function buildDots(step) {
    if (DOTS) return DOTS;
    const prep = a => a.map(r => ({ r, b: box(r) }));
    const land = prep(g.WORLD.LAND), water = prep(g.WORLD.WATER);
    const hit = (list, x, y) => list.some(o => y >= o.b[2] && y <= o.b[3] &&
      ((x >= o.b[0] && x <= o.b[1] && inRing(x, y, o.r)) || (o.b[1] > 180 && x + 360 >= o.b[0] && x + 360 <= o.b[1] && inRing(x + 360, y, o.r))));
    DOTS = [];
    for (let k = 0, lat = -87; lat <= 87; lat += step, k++) {
      const n = Math.max(1, Math.round(360 * Math.cos(lat * D) / step));
      for (let i = 0; i < n; i++) {
        const lon = -180 + (i + (k % 2) * .5) * 360 / n;
        if (hit(land, lon, lat) && !hit(water, lon, lat)) DOTS.push([lon, lat]);
      }
    }
    return DOTS;
  }

  class SlamGlobe {
    constructor(canvas, o) {
      this.c = canvas; this.ctx = canvas.getContext('2d'); this.venues = o.venues; this.countries = o.countries || [];
      this.lon0 = o.lon != null ? o.lon : 10; this.lat0 = o.lat != null ? o.lat : 22; this.slams = new Set(o.slams || ['AO', 'RG', 'W', 'USO']);
      this.spin = o.spin !== false && !matchMedia('(prefers-reduced-motion: reduce)').matches; this.tipEl = o.tip; this.tipHtml = o.tipHtml;
      this.zoom = 1; this.aspect = o.aspect || .94; this.c.style.aspectRatio = '1 / ' + this.aspect; this.hits = []; this.hover = null; this.drag = null; this.anim = null; this.visible = true; this.step = o.step || 2.7; this.labelTop = o.labelTop || 4;
      buildDots(this.step); this.resize();
      new ResizeObserver(() => { this.resize(); this.draw(); }).observe(canvas);
      if ('IntersectionObserver' in window) new IntersectionObserver(es => { this.visible = es[0].isIntersecting; if (this.visible) this._start(); }).observe(canvas);
      canvas.addEventListener('pointerdown', e => { this.drag = { x: e.clientX, y: e.clientY }; this.spin = false; this.anim = null; canvas.setPointerCapture(e.pointerId); if (o.onInteract) o.onInteract(); });
      canvas.addEventListener('pointermove', e => this._move(e));
      canvas.addEventListener('pointerup', () => { this.drag = null; });
      canvas.addEventListener('pointerleave', () => { this.hover = null; this._tip(null); });
      this._start();
    }
    resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1), w = Math.max(240, Math.round(this.c.clientWidth || 480));
      this.W = w; this.H = Math.round(w * this.aspect); this.c.width = w * dpr; this.c.height = this.H * dpr; this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.R0 = w * .385; this.R = this.R0 * this.zoom; this.cx = w / 2; this.cy = this.H / 2;
    }
    setCountries(list) { this.countries = list; this.draw(); }
    setSlams(set) { this.slams = new Set(set); this.draw(); }
    focusOn(lon, lat, zoom) { this.spin = false; this.anim = { lon, lat, zoom: zoom || 1 }; this._start(); }
    _start() { if (this.raf) return; const f = () => { this.raf = null; if (!this.visible) return; let go = false;
        if (this.anim) { let dl = ((this.anim.lon - this.lon0 + 540) % 360) - 180; const dt = this.anim.lat - this.lat0;
          const dz = this.anim.zoom - this.zoom; this.lon0 += dl * .14; this.lat0 += dt * .14; this.zoom += dz * .14; this.R = this.R0 * this.zoom;
          if (Math.abs(dl) < .05 && Math.abs(dt) < .05 && Math.abs(dz) < .005) this.anim = null; go = true; }
        else if (this.spin) { this.lon0 = (this.lon0 + .1) % 360; go = true; }
        this.draw(); if (go) this.raf = requestAnimationFrame(f); };
      this.raf = requestAnimationFrame(f); }
    _move(e) {
      if (this.drag) { const dx = e.clientX - this.drag.x, dy = e.clientY - this.drag.y; this.drag = { x: e.clientX, y: e.clientY };
        const k = 180 / (this.R * Math.PI) * 1.15; this.lon0 -= dx * k; this.lat0 = Math.max(-75, Math.min(75, this.lat0 + dy * k)); this.draw(); return; }
      const r = this.c.getBoundingClientRect(), x = (e.clientX - r.left) * this.W / r.width, y = (e.clientY - r.top) * this.W / r.width;
      let best = null, bd = 1e9; for (const h of this.hits) { const d = Math.hypot(h.x - x, h.y - y); if (d < h.r + 5 && d < bd) { best = h; bd = d; } }
      this.hover = best ? best.item : null; this._tip(best, x, y); this.draw();
    }
    _tip(h, x, y) {
      if (!this.tipEl) return; if (!h) { this.tipEl.style.display = 'none'; return; }
      this.tipEl.innerHTML = this.tipHtml(h.item); this.tipEl.style.display = 'block';
      const pw = this.c.getBoundingClientRect().width, k = pw / this.W; let left = x * k + 14; if (left + 240 > pw) left = x * k - 250; this.tipEl.style.left = Math.max(4, left) + 'px'; this.tipEl.style.top = Math.max(4, y * k - 10) + 'px';
    }
    proj(lon, lat, rr) {
      const l = (lon - this.lon0) * D, p = lat * D, p0 = this.lat0 * D, cp = Math.cos(p);
      const cosc = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * cp * Math.cos(l);
      const x = cp * Math.sin(l), y = Math.cos(p0) * Math.sin(p) - Math.sin(p0) * cp * Math.cos(l), k = this.R * (rr || 1);
      return { x: this.cx + x * k, y: this.cy - y * k, c: cosc, vis: cosc >= 0 || (rr || 1) * Math.sqrt(Math.max(0, 1 - cosc * cosc)) >= 1 };
    }
    arc(a, b) {
      const v = (lo, la) => [Math.cos(la * D) * Math.cos(lo * D), Math.cos(la * D) * Math.sin(lo * D), Math.sin(la * D)], A = v(a.lon, a.lat), B = v(b.lon, b.lat);
      const om = Math.acos(Math.max(-1, Math.min(1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2]))), lift = .05 + .15 * om / Math.PI, pts = [], N = 56;
      for (let i = 0; i <= N; i++) { const t = i / N, s0 = Math.sin((1 - t) * om) / Math.sin(om || 1), s1 = Math.sin(t * om) / Math.sin(om || 1);
        const q = [0, 1, 2].map(k => om ? s0 * A[k] + s1 * B[k] : A[k]);
        pts.push(this.proj(Math.atan2(q[1], q[0]) / D, Math.asin(Math.max(-1, Math.min(1, q[2]))) / D, 1 + lift * Math.sin(Math.PI * t))); }
      return pts;
    }
    draw() {
      const ctx = this.ctx, W = this.W, R = this.R, cx = this.cx, cy = this.cy; ctx.clearRect(0, 0, W, this.H); this.hits = []; this.boxes = [];
      // sticker shadow + sea
      ctx.fillStyle = COL.ink; ctx.beginPath(); ctx.arc(cx + 7, cy + 7, R, 0, 7); ctx.fill();
      ctx.fillStyle = COL.sea; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill();
      // graticule
      ctx.strokeStyle = COL.grid; ctx.lineWidth = 1;
      for (let lon = -180; lon < 180; lon += 30) this._poly(i => this.proj(lon, -90 + i * 3), 61);
      for (let lat = -60; lat <= 60; lat += 30) this._poly(i => this.proj(-180 + i * 3, lat), 121);
      // land dots
      ctx.fillStyle = COL.land; const p0 = this.lat0 * D, sp0 = Math.sin(p0), cp0 = Math.cos(p0), sz = this.R0 * .0165 * Math.sqrt(this.zoom);
      for (const [lon, lat] of DOTS) {
        const l = (lon - this.lon0) * D, p = lat * D, cp = Math.cos(p), cosc = sp0 * Math.sin(p) + cp0 * cp * Math.cos(l);
        if (cosc < .03) continue;
        const x = cx + R * cp * Math.sin(l), y = cy - R * (cp0 * Math.sin(p) - sp0 * cp * Math.cos(l));
        ctx.beginPath(); ctx.arc(x, y, sz * (.55 + .5 * cosc), 0, 7); ctx.fill();
      }
      // arcs
      const vmap = {}; this.venues.forEach(v => vmap[v.slam] = v);
      const arcs = []; for (const c of this.countries) for (const s in c.by_slam) if (c.by_slam[s] > 0 && this.slams.has(s)) arcs.push({ c, s, n: c.by_slam[s] });
      arcs.sort((a, b) => b.n - a.n);
      for (const a of arcs) { const pts = this.arc(c2(a.c), vmap[a.s]), w = 1.3 + Math.sqrt(a.n) * 1.15, hot = this.hover && this.hover.country === a.c.country;
        for (const [style, lw] of [[COL.white, w + 3], [SLAM_COLOR[a.s], w]]) { ctx.strokeStyle = style; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.globalAlpha = style === COL.white ? .75 : (hot || !this.hover ? .95 : .35);
          let open = false; ctx.beginPath(); for (const p of pts) { if (!p.vis) { open = false; continue; } if (open) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); open = true; } ctx.stroke(); }
        ctx.globalAlpha = 1; }
      // outline
      ctx.strokeStyle = COL.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke();
      // country markers (circles first, labels afterwards so they do not collide)
      const shown = this.countries.filter(c => Object.keys(c.by_slam).some(s => this.slams.has(s) && c.by_slam[s] > 0));
      const many = this.zoom > 1.6, vis = [];
      for (const c of shown) { const p = this.proj(c.lon, c.lat); if (p.c < .08) continue;
        const n = Object.keys(c.by_slam).reduce((a, s) => a + (this.slams.has(s) ? c.by_slam[s] : 0), 0), r = (4.5 + Math.sqrt(n) * 2.3) * Math.min(1.6, Math.sqrt(this.zoom)), hot = this.hover && this.hover.country === c.country;
        ctx.fillStyle = hot ? COL.white : COL.blush; ctx.strokeStyle = COL.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fill(); ctx.stroke();
        vis.push({ c, p, r, n, hot }); this.hits.push({ x: p.x, y: p.y, r, item: c }); }
      ctx.font = '600 13px Fredoka, "Trebuchet MS", sans-serif';
      const vp = []; for (const v of this.venues) { if (!this.slams.has(v.slam)) continue; const p = this.proj(v.lon, v.lat); if (p.c < .05) continue; vp.push({ v, p }); }
      for (const { v, p } of vp) this._label(v.city, p.x + 14, p.y - 9, true);
      vis.sort((a, b) => (b.hot - a.hot) || (b.n - a.n));
      vis.forEach((m, i) => { if (m.hot || many || i < this.labelTop) this._label(m.c.country, m.p.x + m.r + 5, m.p.y + 4.5, m.hot); });
      for (const { v, p } of vp) { this._star(p.x, p.y, 11, SLAM_COLOR[v.slam]); this.hits.push({ x: p.x, y: p.y, r: 12, item: Object.assign({ venue: true }, v) }); }
    }
    _poly(fn, n) { const ctx = this.ctx; let open = false; ctx.beginPath(); for (let i = 0; i < n; i++) { const p = fn(i); if (p.c < 0) { open = false; continue; } if (open) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); open = true; } ctx.stroke(); }
    _label(t, x, y, force) { const ctx = this.ctx, w = ctx.measureText(t).width, b = [x - 2, y - 13, w + 4, 17];
      if (!force && this.boxes.some(o => b[0] < o[0] + o[2] && b[0] + b[2] > o[0] && b[1] < o[1] + o[3] && b[1] + b[3] > o[1])) return;
      this.boxes.push(b); ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.strokeText(t, x, y); ctx.fillStyle = COL.ink; ctx.fillText(t, x, y); }
    _star(x, y, r, col) { const ctx = this.ctx; ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; ctx[i ? 'lineTo' : 'moveTo'](x + rr * Math.cos(a), y + rr * Math.sin(a)); }
      ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = COL.ink; ctx.lineWidth = 2; ctx.stroke(); }
  }
  const c2 = c => ({ lon: c.lon, lat: c.lat });
  g.SlamGlobe = SlamGlobe; g.SLAM_COLOR = SLAM_COLOR;
})(window);
