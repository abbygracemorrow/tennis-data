/* report.js - draws the charts on index.html from the JSON that build_site.py embeds in the page. */
(function () {
  'use strict';
  const R = JSON.parse(document.getElementById('report-data').textContent);
  const { C, SLAM_COLOR } = Charts, $ = id => document.getElementById(id), sn = n => n.replace(/^[A-Z.]+\s+/, '');
  const SL = ['AO', 'RG', 'W', 'USO'], BIG3 = ['Djokovic N.', 'Nadal R.', 'Federer R.'];
  const pct1 = x => (x * 100).toFixed(1) + '%';

  function titles() {
    Charts.barH($('c-titles'), R.titles.slice(0, 12).map((t, i) => ({
      label: t.name, value: t.total, color: i < 3 ? C.pink : C.sage,
      tip: `<b>${t.name}</b><br>${t.total} titles<br>` + SL.filter(s => t[s]).map(s => `${R.slam_names[s]}: ${t[s]}`).join('<br>') })), { label: 'Grand Slam titles by player' });
  }
  function bySlam() {
    const box = $('c-byslam'); if (!box.children.length) box.innerHTML = SL.map(s => `<div><h4><i class="dot" style="background:${SLAM_COLOR[s]}"></i>${R.slam_names[s]}</h4><div class="chart" id="bs-${s}"></div></div>`).join('');
    SL.forEach(s => Charts.barH($('bs-' + s), R.by_slam[s].slice(0, 5).map(r => ({ label: r.name, value: r.titles, color: SLAM_COLOR[s] })),
      { barH: 18, gap: 7, labelW: 96, rpad: 30, max: Math.max(...R.by_slam[s].map(r => r.titles)), label: R.slam_names[s] + ' titles' }));
  }
  function grid() {
    const cls = p => p === 'Federer R.' ? 'g-fed' : p === 'Nadal R.' ? 'g-nad' : p === 'Djokovic N.' ? 'g-djo' : (p === 'Alcaraz C.' || p === 'Sinner J.') ? 'g-nxt' : 'g-oth';
    let h = `<table class="cgrid"><thead><tr><th></th>${SL.map(s => `<th scope="col">${{ AO: 'Australian', RG: 'Roland G.', W: 'Wimbledon', USO: 'US Open' }[s]}</th>`).join('')}</tr></thead><tbody>`;
    R.champions_by_year.forEach(r => { h += `<tr><td class="yr">${r.year}</td>` + SL.map(s => r[s] ? `<td class="c ${cls(r[s].player)}" title="${r[s].name}">${sn(r[s].name)}</td>` : `<td class="c none">${r.year === 2020 && s === 'W' ? 'cancelled' : '\u2013'}</td>`).join('') + '</tr>'; });
    $('c-grid').innerHTML = h + '</tbody></table>';
    if (!$('c-grid-legend').children.length) $('c-grid-legend').innerHTML = [['g-djo', 'Djokovic'], ['g-nad', 'Nadal'], ['g-fed', 'Federer'], ['g-nxt', 'Alcaraz or Sinner'], ['g-oth', 'Anyone else']]
      .map(([c, l]) => `<span><i style="background:${{ 'g-djo': C.ink, 'g-nad': C.pink, 'g-fed': C.sage, 'g-nxt': C.ball, 'g-oth': C.dust }[c]}"></i>${l}</span>`).join('');
  }
  function rateChart(id, rows, key, nKey, min, max) {
    Charts.barH($(id), rows.map(r => ({ label: r.name, value: r[key], color: BIG3.includes(r.player) ? C.pink : C.sage, valueLabel: pct1(r[key]),
      tip: `<b>${r.name}</b><br>${pct1(r[key])} win rate<br>${r[nKey]} matches` })), { dot: true, axis: true, min, max, fmt: pct1, axisFmt: v => Math.round(v * 100) + '%', labelW: 100, rpad: 60, label: 'Win rate' });
  }
  function gap() {
    const show = new Set([...R.gap_up.slice(0, 5), ...R.gap_down.slice(0, 3)].map(g => g.player).concat(BIG3, ['Alcaraz C.', 'Sinner J.', 'Wawrinka S.']));
    Charts.scatter($('c-gap'), R.gap_points.map(g => ({ x: g.r3, y: g.r5, label: sn(g.name), show: show.has(g.player), color: g.gap >= 0 ? C.sage : C.pink, r: 4 + Math.min(3, g.n5 / 200),
      tip: `<b>${g.name}</b><br>Best-of-3: ${pct1(g.r3)} (${g.n3} matches)<br>Best-of-5: ${pct1(g.r5)} (${g.n5} matches)<br>Difference: ${g.gap >= 0 ? '+' : ''}${(g.gap * 100).toFixed(1)} points` })),
      { xmin: .35, xmax: .88, ymin: .2, ymax: .95, xfmt: v => Math.round(v * 100) + '%', yfmt: v => Math.round(v * 100) + '%', xlabel: 'Win rate in best-of-three', ylabel: 'Win rate in best-of-five', diagonal: true, label: 'Best-of-3 against best-of-5 win rate' });
  }
  function streaks() {
    Charts.barH($('c-streaks'), R.streaks.map(s => ({ label: s.name, value: s.length, color: BIG3.includes(s.player) ? C.pink : C.sage,
      tip: `<b>${s.name}</b><br>${s.length} wins in a row<br>${s.start} to ${s.end}${s.active ? `<br>Current streak: ${s.active}` : ''}` })), { label: 'Longest Grand Slam winning streaks' });
  }
  function finals() {
    Charts.stackedH($('c-finals'), R.finals.map(f => ({ label: f.name, total: `${f.titles}/${f.finals}`,
      parts: [{ value: f.titles, color: C.sage, tip: `<b>${f.name}</b><br>${f.titles} titles` }, { value: f.lost, color: C.pink, tip: `<b>${f.name}</b><br>${f.lost} finals lost` }] })), { labelW: 118, label: 'Finals won and lost' });
    if (!$('c-finals-legend').children.length) Charts.legend($('c-finals-legend').parentNode, []), $('c-finals-legend').innerHTML = `<span><i style="background:${C.sage}"></i>Final won</span><span><i style="background:${C.pink}"></i>Final lost</span><span>Label = titles / finals</span>`;
  }

  /* ---- globes ---- */
  let heroGlobe, storyGlobe; const on = new Set(SL);
  function tipHtml(it) {
    if (it.venue) { const n = R.titles.reduce((a, t) => a + t[it.slam], 0); return `<b>${it.city}</b><br>${it.name}<br>${n} titles decided here in the data`; }
    const per = SL.filter(s => it.by_slam[s]).map(s => `${R.slam_names[s]} ${it.by_slam[s]}`).join(' \u00b7 ');
    return `<b>${it.country}</b> \u00b7 ${it.titles} titles<br>${per}<br>` + it.champions.map(c => `${c.name} (${c.titles})`).join(', ');
  }
  function globes() {
    heroGlobe = new SlamGlobe($('hero-globe'), { venues: R.venues, countries: [], lon: 130, lat: 20, step: 3.1 });
    storyGlobe = new SlamGlobe($('story-globe'), { venues: R.venues, countries: R.countries, lon: -30, lat: 30, tip: $('story-tip'), tipHtml, spin: false, labelTop: 3 });
    $('slam-chips').innerHTML = SL.map(s => `<button class="chip" type="button" aria-pressed="true" data-slam="${s}"><i class="dot" style="background:${SLAM_COLOR[s]}"></i>${R.slam_names[s]}</button>`).join('');
    $('slam-chips').addEventListener('click', e => { const b = e.target.closest('.chip'); if (!b) return; const s = b.dataset.slam;
      if (on.has(s) && on.size > 1) on.delete(s); else on.add(s); b.setAttribute('aria-pressed', on.has(s)); storyGlobe.setSlams(on); list(); });
    $('venue-btns').innerHTML = ['<button class="chip" type="button" data-go="world">Whole globe</button>', '<button class="chip" type="button" data-go="europe">Zoom to Europe</button>']
      .concat(R.venues.filter(v => v.slam === 'AO' || v.slam === 'USO').map(v => `<button class="chip" type="button" data-go="${v.slam}">Go to ${v.city}</button>`)).join('');
    $('venue-btns').addEventListener('click', e => { const b = e.target.closest('.chip'); if (!b) return; const g = b.dataset.go;
      if (g === 'world') storyGlobe.focusOn(-30, 30, 1); else if (g === 'europe') storyGlobe.focusOn(9, 46, 2.9);
      else { const v = R.venues.find(x => x.slam === g); storyGlobe.focusOn(v.lon - 10, v.lat * .5, 1.5); } });
    list();
  }
  function list() {
    const rows = R.countries.map(c => ({ c: c.country, n: SL.reduce((a, s) => a + (on.has(s) ? c.by_slam[s] : 0), 0) })).filter(r => r.n).sort((a, b) => b.n - a.n);
    $('country-list').innerHTML = rows.map(r => `<li><span>${r.c}</span><b>${r.n}</b></li>`).join('');
  }

  function all() { Charts.barH; Charts.titleGrid($('c-career'), R.slam_grid, SL, R.slam_names); titles(); bySlam(); grid();
    rateChart('c-bo5', R.bo5_top, 'r5', 'n5', .6, .95); rateChart('c-bo3', R.bo3_top, 'r3', 'n3', .6, .85); gap(); streaks(); finals(); }
  all(); globes();
  let t; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(all, 150); });
})();
