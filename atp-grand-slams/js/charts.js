/* charts.js - small SVG chart toolkit (no libraries). Every function draws into a container element
   and can be called again to redraw, so charts resize and update with the dashboard filters. */
(function (g) {
  'use strict';
  const C = { ink: '#2b4530', soft: '#557059', grid: '#e1e2d0', sage: '#80a47f', foliage: '#70905f', pink: '#ea96a4',
    pinkDeep: '#c95a72', lime: '#e5ee9f', limeMid: '#ccd582', ball: '#c6d445', teal: '#6fa8b0', cream: '#f2f4e9',
    blush: '#f8e3e7', olive: '#a3af64', white: '#fdfdfb', dust: '#e1e2d0' };
  const SLAM_COLOR = { AO: '#6fa8b0', RG: '#ea96a4', W: '#6f9a5f', USO: '#c6d445' };
  const SERIES = ['#70905f', '#ea96a4', '#6fa8b0', '#c6d445', '#a3af64', '#c95a72', '#2b4530', '#b9a7d4'];

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const int = n => Math.round(n).toLocaleString('en-US');
  const pct = (x, d = 1) => (x * 100).toFixed(d) + '%';
  const clip = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1) + '\u2026' : String(s));

  function ensureTip() {
    if (document.getElementById('tt')) return;
    const t = document.createElement('div'); t.id = 'tt'; t.className = 'tt'; t.setAttribute('role', 'tooltip'); document.body.appendChild(t);
    document.addEventListener('pointermove', e => {
      const el = e.target.closest ? e.target.closest('[data-tip]') : null;
      if (!el) { t.style.display = 'none'; return; }
      t.innerHTML = el.getAttribute('data-tip'); t.style.display = 'block';
      const r = t.getBoundingClientRect(); let x = e.clientX + 14, y = e.clientY + 14;
      if (x + r.width > innerWidth - 6) x = e.clientX - r.width - 14;
      if (y + r.height > innerHeight - 6) y = e.clientY - r.height - 14;
      t.style.left = Math.max(4, x) + 'px'; t.style.top = Math.max(4, y) + 'px';
    });
    document.addEventListener('scroll', () => { t.style.display = 'none'; }, true);
  }
  const tipAttr = h => (h ? ` data-tip="${esc(h)}"` : '');

  function niceTicks(lo, hi, n = 5) {
    if (hi === lo) hi = lo + 1;
    const raw = (hi - lo) / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / mag;
    const step = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * mag;
    const out = []; for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-6; v += step) out.push(+v.toFixed(10));
    return out;
  }
  const mix = (a, b, t) => { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); const A = p(a), B = p(b);
    return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  const width = (el, min = 300) => Math.max(min, Math.floor(el.clientWidth || el.getBoundingClientRect().width || 600));
  const wrap = (W, H, label, inner) => `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}" preserveAspectRatio="xMidYMid meet">${inner}</svg>`;
  const empty = (el, msg) => { el.innerHTML = `<div class="empty">${esc(msg || 'No data for the current filters.')}</div>`; };

  function legend(el, items) {
    el.insertAdjacentHTML('beforeend', `<div class="legend">${items.map(i => `<span><i style="background:${i.color}"></i>${esc(i.label)}</span>`).join('')}</div>`);
  }

  /* horizontal bars, or lollipops when o.dot is true (used when the axis does not start at zero) */
  function barH(el, rows, o = {}) {
    ensureTip(); if (!rows.length) return empty(el, o.empty);
    const W = width(el), bh = o.barH || 22, gap = o.gap || 9, top = 6, axis = o.axis ? 30 : 4;
    const fmt = o.fmt || int, lw = o.labelW || Math.min(200, Math.max(70, Math.max(...rows.map(r => String(r.label).length)) * 7.1 + 10));
    const rp = o.rpad || 58, max = o.max != null ? o.max : Math.max(...rows.map(r => r.value), 1e-9), min = o.min != null ? o.min : 0;
    const iw = W - lw - rp, sx = v => lw + Math.max(0, (v - min) / (max - min)) * iw, H = top + rows.length * (bh + gap) + axis;
    let s = '';
    if (o.axis) {
      const ticks = o.ticks || niceTicks(min, max, 5);
      ticks.forEach(t => { const x = sx(t); s += `<line x1="${x}" x2="${x}" y1="${top}" y2="${H - axis + 2}" stroke="${C.grid}" stroke-dasharray="3 4"/><text class="ax" x="${x}" y="${H - 8}" text-anchor="middle">${esc((o.axisFmt || fmt)(t))}</text>`; });
    }
    rows.forEach((r, i) => {
      const y = top + i * (bh + gap), cy = y + bh / 2, x1 = sx(r.value), col = r.color || o.color || C.sage;
      s += `<g${tipAttr(r.tip || `<b>${esc(r.label)}</b><br>${esc(fmt(r.value))}`)}>`;
      s += `<rect x="0" y="${y - gap / 2}" width="${W}" height="${bh + gap}" fill="transparent"/>`;
      s += `<text class="lbl" x="${lw - 8}" y="${cy + 4.5}" text-anchor="end">${esc(clip(r.label, 26))}</text>`;
      if (o.dot) s += `<line x1="${sx(min)}" x2="${x1}" y1="${cy}" y2="${cy}" stroke="${col}" stroke-width="3.5" stroke-linecap="round"/><circle cx="${x1}" cy="${cy}" r="8.5" fill="${col}" stroke="${C.ink}" stroke-width="2"/>`;
      else s += `<rect x="${lw}" y="${y}" width="${Math.max(2, x1 - lw)}" height="${bh}" rx="6" fill="${col}" stroke="${C.ink}" stroke-width="1.6"/>`;
      s += `<text class="val" x="${x1 + (o.dot ? 15 : 8)}" y="${cy + 4.5}">${esc(r.valueLabel || fmt(r.value))}</text></g>`;
    });
    el.innerHTML = wrap(W, H, o.label || 'Bar chart', s);
  }

  /* vertical bars (used for chronological categories such as years) */
  function barV(el, rows, o = {}) {
    ensureTip(); if (!rows.length) return empty(el, o.empty);
    const W = width(el), H = o.h || 300, l = 44, r = 8, t = 12, b = 46, fmt = o.fmt || int;
    const max = o.max != null ? o.max : Math.max(...rows.map(x => x.value), 1e-9), ticks = niceTicks(0, max, 5), top = Math.max(max, ticks[ticks.length - 1]);
    const iw = W - l - r, ih = H - t - b, bw = iw / rows.length, every = Math.ceil(rows.length / Math.floor(iw / 44));
    let s = ticks.map(v => { const y = t + ih - v / top * ih; return `<line x1="${l}" x2="${W - r}" y1="${y}" y2="${y}" stroke="${C.grid}"/><text class="ax" x="${l - 6}" y="${y + 4}" text-anchor="end">${esc((o.axisFmt || fmt)(v))}</text>`; }).join('');
    rows.forEach((d, i) => {
      const h = Math.max(1.5, d.value / top * ih), x = l + i * bw + bw * .14, y = t + ih - h;
      s += `<g${tipAttr(d.tip || `<b>${esc(d.label)}</b><br>${esc(fmt(d.value))}`)}><rect x="${l + i * bw}" y="${t}" width="${bw}" height="${ih}" fill="transparent"/><rect x="${x}" y="${y}" width="${bw * .72}" height="${h}" rx="4" fill="${d.color || o.color || C.sage}" stroke="${C.ink}" stroke-width="1.3"/></g>`;
      if (i % every === 0) s += `<text class="ax" x="${l + i * bw + bw / 2}" y="${H - b + 16}" text-anchor="${rows.length > 8 ? 'end' : 'middle'}" ${rows.length > 8 ? `transform="rotate(-40 ${l + i * bw + bw / 2} ${H - b + 16})"` : ''}>${esc(clip(d.label, 14))}</text>`;
    });
    el.innerHTML = wrap(W, H, o.label || 'Bar chart', s);
  }

  /* stacked horizontal bars: rows [{label, parts:[{value,color,tip}]}] */
  function stackedH(el, rows, o = {}) {
    ensureTip(); if (!rows.length) return empty(el);
    const W = width(el), bh = 24, gap = 10, lw = o.labelW || 118, rp = 30, top = 6;
    const max = Math.max(...rows.map(r => r.parts.reduce((a, p) => a + p.value, 0))), H = top + rows.length * (bh + gap) + 6, sx = v => v / max * (W - lw - rp);
    let s = '';
    rows.forEach((r, i) => {
      const y = top + i * (bh + gap); let x = lw;
      s += `<text class="lbl" x="${lw - 8}" y="${y + bh / 2 + 4.5}" text-anchor="end">${esc(clip(r.label, 22))}</text>`;
      r.parts.forEach(p => { if (p.value <= 0) return; const w = sx(p.value);
        s += `<g${tipAttr(p.tip)}><rect x="${x}" y="${y}" width="${w}" height="${bh}" fill="${p.color}" stroke="${C.ink}" stroke-width="1.6"/>${w > 11 ? `<text class="val" x="${x + w / 2}" y="${y + bh / 2 + 4.5}" text-anchor="middle">${p.value}</text>` : ''}</g>`; x += w; });
      s += `<text class="val" x="${x + 8}" y="${y + bh / 2 + 4.5}">${r.total != null ? r.total : ''}</text>`;
    });
    el.innerHTML = wrap(W, H, o.label || 'Stacked bar chart', s);
  }

  /* line chart with several series. series [{name,color,values:[...|null]}] */
  function line(el, xs, series, o = {}) {
    ensureTip(); series = series.filter(s => s.values.some(v => v != null)); if (!series.length) return empty(el, o.empty);
    const W = width(el), H = o.h || 300, l = 48, r = 14, t = 12, b = 30, fmt = o.fmt || int;
    const all = series.flatMap(s => s.values.filter(v => v != null)), lo = o.min != null ? o.min : 0, hi = o.max != null ? o.max : Math.max(...all, 1e-9);
    const ticks = niceTicks(lo, hi, 5), top = Math.max(hi, ticks[ticks.length - 1]), iw = W - l - r, ih = H - t - b;
    const sx = i => l + (xs.length === 1 ? iw / 2 : i / (xs.length - 1) * iw), sy = v => t + ih - (v - lo) / (top - lo || 1) * ih;
    let s = ticks.map(v => `<line x1="${l}" x2="${W - r}" y1="${sy(v)}" y2="${sy(v)}" stroke="${C.grid}"/><text class="ax" x="${l - 6}" y="${sy(v) + 4}" text-anchor="end">${esc((o.axisFmt || fmt)(v))}</text>`).join('');
    const every = Math.ceil(xs.length / Math.max(2, Math.floor(iw / 52)));
    xs.forEach((x, i) => { if (i % every === 0) s += `<text class="ax" x="${sx(i)}" y="${H - 8}" text-anchor="middle">${esc(x)}</text>`; });
    series.forEach((se, k) => {
      const col = se.color || SERIES[k % SERIES.length]; let d = '', pen = false;
      se.values.forEach((v, i) => { if (v == null) { pen = false; return; } d += `${pen ? 'L' : 'M'}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`; pen = true; });
      s += `<path d="${d}" fill="none" stroke="${col}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`;
      se.values.forEach((v, i) => { if (v == null) return;
        s += `<circle cx="${sx(i)}" cy="${sy(v)}" r="${xs.length > 30 ? 2.6 : 3.6}" fill="${col}" stroke="${C.ink}" stroke-width="1.2"/><circle cx="${sx(i)}" cy="${sy(v)}" r="9" fill="transparent"${tipAttr(`<b>${esc(se.name)}</b> \u00b7 ${esc(xs[i])}<br>${esc(fmt(v))}`)}/>`; });
    });
    el.innerHTML = wrap(W, H, o.label || 'Line chart', s);
    if (series.length > 1 || o.legend) legend(el, series.map((se, k) => ({ label: se.name, color: se.color || SERIES[k % SERIES.length] })));
  }

  /* scatter plot. pts [{x,y,label,color,r,tip,show}] */
  function scatter(el, pts, o = {}) {
    ensureTip(); if (!pts.length) return empty(el, o.empty);
    const W = width(el), H = o.h || Math.min(520, Math.round(W * .82)), l = 68, r = 18, t = 14, b = 48;
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    let x0 = o.xmin != null ? o.xmin : Math.min(...xs), x1 = o.xmax != null ? o.xmax : Math.max(...xs), y0 = o.ymin != null ? o.ymin : Math.min(...ys), y1 = o.ymax != null ? o.ymax : Math.max(...ys);
    if (o.xmin == null) { const p = (x1 - x0) * .06 || 1; x0 -= p; x1 += p; } if (o.ymin == null) { const p = (y1 - y0) * .06 || 1; y0 -= p; y1 += p; }
    const iw = W - l - r, ih = H - t - b, sx = v => l + (v - x0) / (x1 - x0) * iw, sy = v => t + ih - (v - y0) / (y1 - y0) * ih;
    const xf = o.xfmt || int, yf = o.yfmt || int; let s = '';
    niceTicks(x0, x1, 6).forEach(v => { s += `<line x1="${sx(v)}" x2="${sx(v)}" y1="${t}" y2="${t + ih}" stroke="${C.grid}"/><text class="ax" x="${sx(v)}" y="${t + ih + 17}" text-anchor="middle">${esc(xf(v))}</text>`; });
    niceTicks(y0, y1, 6).forEach(v => { s += `<line x1="${l}" x2="${l + iw}" y1="${sy(v)}" y2="${sy(v)}" stroke="${C.grid}"/><text class="ax" x="${l - 7}" y="${sy(v) + 4}" text-anchor="end">${esc(yf(v))}</text>`; });
    if (o.diagonal) { const a = Math.max(x0, y0), z = Math.min(x1, y1); s += `<line x1="${sx(a)}" y1="${sy(a)}" x2="${sx(z)}" y2="${sy(z)}" stroke="${C.pinkDeep}" stroke-width="2" stroke-dasharray="6 5"/>`; }
    s += `<text class="ax" x="${l + iw / 2}" y="${H - 6}" text-anchor="middle" style="font-size:13px">${esc(o.xlabel || '')}</text>`;
    s += `<text class="ax" transform="translate(12 ${t + ih / 2}) rotate(-90)" text-anchor="middle" style="font-size:13px">${esc(o.ylabel || '')}</text>`;
    const sorted = pts.slice().sort((a, b) => (a.show ? 1 : 0) - (b.show ? 1 : 0));
    sorted.forEach(p => { s += `<circle cx="${sx(p.x)}" cy="${sy(p.y)}" r="${p.r || 5}" fill="${p.color || C.sage}" fill-opacity="${p.show ? 1 : .62}" stroke="${C.ink}" stroke-width="${p.show ? 1.8 : 1}"${tipAttr(p.tip)}/>`; });
    const boxes = [];
    pts.filter(p => p.show).forEach(p => {
      const w = p.label.length * 6.6 + 4, h = 14, px = sx(p.x), py = sy(p.y);
      const opts = [[px + 9, py + 4], [px - 9 - w, py + 4], [px - w / 2, py - 11], [px - w / 2, py + 20], [px + 9, py - 9], [px - 9 - w, py - 9]];
      let pick = opts.find(([x, y]) => x > 2 && x + w < W - 2 && !boxes.some(b => x < b[0] + b[2] && x + w > b[0] && y - h < b[1] && y > b[1] - b[3])) || opts[0];
      boxes.push([pick[0], pick[1], w, h]);
      s += `<text class="lbl" x="${pick[0]}" y="${pick[1]}" style="font-size:12px;font-weight:500;paint-order:stroke;stroke:#fff;stroke-width:3.5px">${esc(p.label)}</text>`;
    });
    el.innerHTML = wrap(W, H, o.label || 'Scatter plot', s);
  }

  /* heatmap. cells matrix[r][c] = number|null */
  function heatmap(el, rowLabels, colLabels, m, o = {}) {
    ensureTip(); const flat = m.flat().filter(v => v != null); if (!flat.length) return empty(el);
    const W = width(el), fmt = o.fmt || int, lw = Math.min(170, Math.max(60, Math.max(...rowLabels.map(x => String(x).length)) * 7 + 10)), top = 44;
    const cw = (W - lw - 6) / colLabels.length, ch = 30, H = top + rowLabels.length * ch + 6;
    const lo = Math.min(...flat), hi = Math.max(...flat); let s = '';
    colLabels.forEach((c, j) => { s += `<text class="ax" x="${lw + j * cw + cw / 2}" y="${top - 12}" text-anchor="middle">${esc(clip(c, 12))}</text>`; });
    rowLabels.forEach((rl, i) => {
      s += `<text class="lbl" x="${lw - 8}" y="${top + i * ch + ch / 2 + 4.5}" text-anchor="end">${esc(clip(rl, 24))}</text>`;
      colLabels.forEach((cl, j) => { const v = m[i][j], x = lw + j * cw, y = top + i * ch;
        if (v == null) { s += `<rect x="${x + 1.5}" y="${y + 1.5}" width="${cw - 3}" height="${ch - 3}" rx="6" fill="none" stroke="${C.grid}" stroke-dasharray="3 3"/>`; return; }
        const t = hi === lo ? .6 : (v - lo) / (hi - lo);
        s += `<g${tipAttr(`<b>${esc(rl)}</b> \u00b7 ${esc(cl)}<br>${esc(fmt(v))}`)}><rect x="${x + 1.5}" y="${y + 1.5}" width="${cw - 3}" height="${ch - 3}" rx="6" fill="${mix('#f8e3e7', '#70905f', t)}" stroke="${C.ink}" stroke-width="1"/>${cw > 44 ? `<text class="val" x="${x + cw / 2}" y="${y + ch / 2 + 4.5}" text-anchor="middle" style="fill:${t > .62 ? '#fff' : C.ink};font-size:11.5px">${esc(fmt(v))}</text>` : ''}</g>`; });
    });
    el.innerHTML = wrap(W, H, o.label || 'Heat map', s);
  }

  /* checklist grid: who has won which Slam. rows [{name, AO,RG,W,USO, career}] */
  function titleGrid(el, rows, slams, names) {
    ensureTip(); const W = width(el), lw = Math.min(150, W * .3), rh = 40, top = 62, H = top + rows.length * rh + 4, cw = (W - lw - 8) / slams.length;
    let s = '';
    slams.forEach((k, j) => { const cx = lw + j * cw + cw / 2;
      s += `<circle cx="${cx}" cy="14" r="7" fill="${SLAM_COLOR[k]}" stroke="${C.ink}" stroke-width="1.6"/><text class="ax" x="${cx}" y="42" text-anchor="middle" style="font-size:12.5px;fill:${C.ink}">${esc(names[k].replace('Australian Open', 'Aus. Open').replace('Roland Garros', 'Roland G.'))}</text>`; });
    rows.forEach((r, i) => { const y = top + i * rh, cy = y + rh / 2;
      if (r.career) s += `<rect x="0" y="${y + 2}" width="${W}" height="${rh - 4}" rx="12" fill="${C.lime}" stroke="${C.ink}" stroke-width="1.6"/>`;
      s += `<text class="lbl" x="10" y="${cy + 4.5}" style="font-weight:${r.career ? 600 : 400}">${esc(r.name)}</text>`;
      slams.forEach((k, j) => { const cx = lw + j * cw + cw / 2, n = r[k];
        if (n > 0) s += `<g${tipAttr(`<b>${esc(r.name)}</b><br>${n} ${esc(names[k])} title${n > 1 ? 's' : ''}`)}><circle cx="${cx}" cy="${cy}" r="14" fill="${SLAM_COLOR[k]}" stroke="${C.ink}" stroke-width="1.8"/><text class="val" x="${cx}" y="${cy + 4.5}" text-anchor="middle">${n}</text></g>`;
        else s += `<circle cx="${cx}" cy="${cy}" r="5" fill="none" stroke="${C.sage}" stroke-width="1.6" stroke-dasharray="2.5 2.5"/>`; });
    });
    el.innerHTML = wrap(W, H, 'Which Grand Slams each player has won', s);
  }

  g.Charts = { C, SLAM_COLOR, SERIES, esc, int, pct, clip, niceTicks, mix, legend, barH, barV, stackedH, line, scatter, heatmap, titleGrid, ensureTip, empty };
})(window);
