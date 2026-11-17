/* Page chrome of an artifact page, shared by every artifact type: the Dark mode toggle, the zoom
   controls, the counts line in the head, and the legend and details cards under the drawing.
   Loaded after core.js, whose boot sequence calls A.chrome.init / reset / drawn.
   No style value lives here: colors, fonts and geometry come from the role classes of page.css. */
(function () {
  'use strict';

  var A = window.Artifact;
  var STORE_KEY = 'artifacts.colorMode';
  var ZOOM_MIN = 0.3, ZOOM_MAX = 3, ZOOM_STEP = 1.2;
  var root = document.documentElement;

  function byId(id) { return document.getElementById(id); }

  /* A small HTML helper for cells and rows: tag, class, text or child nodes. */
  A.h = function (tag, cls, content) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    (Array.isArray(content) ? content : [content]).forEach(function (c) {
      if (c === null || c === undefined) return;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  };

  /* ---------- the Dark mode toggle (VC-6) ----------
     With no stored choice the page follows the system preference: data-theme stays unset, the theme's
     media-query block applies, and the toggle shows what the system prefers. Toggling stores the
     choice (when storage allows) and sets data-theme on the root element. A stored "system" from an
     earlier version counts as no choice. */

  function storedChoice() {
    try {
      var v = window.localStorage.getItem(STORE_KEY);
      return v === 'light' || v === 'dark' ? v : null;
    } catch (e) {
      return null; /* storage blocked or unavailable: follow the system */
    }
  }

  function storeChoice(mode) {
    try { window.localStorage.setItem(STORE_KEY, mode); }
    catch (e) { /* storage unavailable: the choice lasts for this view only */ }
  }

  function systemDark() {
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }

  function isDark() {
    var t = root.getAttribute('data-theme');
    return t ? t === 'dark' : systemDark();
  }

  var early = storedChoice();
  if (early) root.setAttribute('data-theme', early); /* before first paint: no flash of the wrong mode */

  function initToggle() {
    var box = byId('mode-toggle');
    if (!box) return;
    box.checked = isDark();
    box.addEventListener('change', function () {
      var mode = box.checked ? 'dark' : 'light';
      root.setAttribute('data-theme', mode);
      storeChoice(mode);
    });
    var mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    if (mq && mq.addEventListener) {
      mq.addEventListener('change', function () {
        if (!root.getAttribute('data-theme')) box.checked = isDark(); /* no choice made: follow the system */
      });
    }
  }

  /* ---------- zoom ---------- */

  var scale = 1, fitting = false, base = null, svg = null;

  function applyScale() {
    var level = byId('zoom-level');
    if (level) level.textContent = Math.round(scale * 100) + '%';
    if (!svg || !base) return;
    svg.setAttribute('width', Math.round(base.w * scale));
    svg.setAttribute('height', Math.round(base.h * scale));
  }

  function fitScale() {
    var frame = byId('frame'), drawing = byId('drawing');
    if (!frame || !base) return 1;
    var cs = window.getComputedStyle(drawing);
    var room = frame.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    /* Fit only ever scales down: a drawing narrower than its frame stays at its drawn size */
    return Math.min(1, Math.max(ZOOM_MIN, room / base.w));
  }

  function zoomTo(next, fit) {
    fitting = fit;
    scale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next));
    applyScale();
  }

  function initZoom() {
    byId('zoom-in').addEventListener('click', function () { zoomTo(scale * ZOOM_STEP, false); });
    byId('zoom-out').addEventListener('click', function () { zoomTo(scale / ZOOM_STEP, false); });
    byId('zoom-fit').addEventListener('click', function () { zoomTo(fitScale(), true); });
    byId('zoom-actual').addEventListener('click', function () { zoomTo(1, false); });
    window.addEventListener('resize', function () { if (fitting) zoomTo(fitScale(), true); });
    applyScale();
  }

  /* ---------- the counts line, the legend card and the details card ---------- */

  A.setMeta = function (text) {
    var el = byId('page-meta');
    if (!el) return;
    el.textContent = text || '';
    el.hidden = !text;
  };

  function showBelow() {
    var below = byId('below');
    if (below) below.hidden = byId('legend-card').hidden && byId('details-card').hidden;
  }

  /* sections: [{title, items: [{sample: <svg> built with the drawing's own roles, text}]}] */
  A.legend = function (sections) {
    var box = byId('legend');
    box.textContent = '';
    var any = false;
    sections.forEach(function (s) {
      if (!s.items.length) return;
      any = true;
      box.appendChild(A.h('h3', 'legend-section', s.title));
      s.items.forEach(function (it) {
        box.appendChild(A.h('div', 'legend-row', [it.sample, A.h('span', '', it.text)]));
      });
    });
    byId('legend-card').hidden = !any;
    showBelow();
  };

  /* spec: {title, columns: [labels], rows: [{cells: [string | Node], link: connector id}]}. Each row is
     linked to the drawing's connector `link` through A.hl. */
  A.details = function (spec) {
    var box = byId('details');
    box.textContent = '';
    byId('details-title').textContent = spec.title;
    var head = A.h('tr', '', spec.columns.map(function (c) { return A.h('th', '', c); }));
    var body = A.h('tbody', '', spec.rows.map(function (r) {
      var tr = A.h('tr', '', r.cells.map(function (c) { return A.h('td', '', c); }));
      tr.tabIndex = 0;
      if (r.link) A.hl.row(r.link, tr);
      return tr;
    }));
    box.appendChild(A.h('table', 'details', [A.h('thead', '', head), body]));
    byId('details-card').hidden = !spec.rows.length;
    showBelow();
  };

  /* ---------- hooks for the core's boot sequence ---------- */

  A.chrome = {
    init: function () { initToggle(); initZoom(); },
    reset: function () {
      A.setMeta('');
      byId('legend').textContent = '';
      byId('details').textContent = '';
      byId('legend-card').hidden = true;
      byId('details-card').hidden = true;
      showBelow();
      svg = null;
      base = null;
    },
    /* a drawing was mounted: take its drawn size from its viewBox and apply the current zoom */
    drawn: function (mount) {
      svg = mount.querySelector('svg');
      var vb = svg && svg.viewBox && svg.viewBox.baseVal;
      base = vb && vb.width ? { w: vb.width, h: vb.height } : null;
      if (fitting) scale = fitScale();
      applyScale();
    }
  };
})();
