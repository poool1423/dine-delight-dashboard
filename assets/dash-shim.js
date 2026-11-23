// Small stand-in for the dashboard engine, so the page runs as a plain website
// (GitHub Pages or opened from disk, no server and no internet connection needed).
(function () {
  const DATA = window.DD_DATA || {};
  const calcs = {}, draws = {}, listeners = [];
  const VALID = ['ALL', 'R01', 'R02', 'R03', 'R04', 'R05', 'R06', 'R07', 'R08'];
  const url = new URL(location.href);
  let params = {rest: VALID.includes(url.searchParams.get('r')) ? url.searchParams.get('r') : 'ALL'};
  let frame = 0;

  function runAll() {
    listeners.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
    Object.entries(draws).forEach(([name, fn]) => {
      document.querySelectorAll('[data-draw="' + name + '"]').forEach((el) => {
        if (el.closest('[hidden]')) return;
        try { fn(el); } catch (e) { console.error(name, e); }
      });
    });
  }
  function schedule() {
    if (frame) return;
    frame = requestAnimationFrame(() => { frame = 0; runAll(); });
  }
  function keepUrl() {
    const u = new URL(location.href);
    if (params.rest && params.rest !== 'ALL') u.searchParams.set('r', params.rest); else u.searchParams.delete('r');
    history.replaceState(null, '', u);
  }

  window.dash = {
    colors: ['#1C84E1', '#17B8B0', '#F2994A', '#8E7CF0'],
    data(id) {
      if (calcs[id]) {
        const c = calcs[id];
        return {status: 'ok', data: c.fn(...c.inputs.map((i) => DATA[i] || []))};
      }
      return DATA[id] ? {status: 'ok', data: DATA[id]} : {status: 'missing', data: []};
    },
    calc(id, o) { calcs[id] = o; },
    loader() {},
    draw(name, fn) {
      if (typeof fn === 'function') draws[name] = fn;
      else if (fn && (fn.update || fn.mount)) draws[name] = fn.update || fn.mount;
      else if (draws[name]) schedule();
    },
    onData(fn) { listeners.push(fn); },
    params() { return Object.assign({}, params); },
    setParams(o) { Object.assign(params, o); keepUrl(); schedule(); },
    resetParams() { params = {rest: 'ALL'}; keepUrl(); schedule(); },
    setLink(name) { const u = new URL(location.href); u.hash = name; history.replaceState(null, '', u); },
    refresh() {},
    start() {
      runAll();
      // Redraw when a tab is shown, when the width changes and once the fonts are in
      new MutationObserver((records) => {
        if (records.some((r) => r.target.classList && r.target.classList.contains('dd-tab') && (r.oldValue !== null) !== r.target.hasAttribute('hidden'))) schedule();
      }).observe(document.getElementById('dash-root'), {subtree: true, attributes: true, attributeFilter: ['hidden'], attributeOldValue: true});
      let w = window.innerWidth;
      window.addEventListener('resize', () => { if (window.innerWidth !== w) { w = window.innerWidth; schedule(); } });
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
      window.addEventListener('beforeprint', runAll);
    }
  };
})();
