/* Page chrome of an artifact page, shared by every artifact type: the Dark mode toggle, the zoom
   controls (buttons, Ctrl or Cmd with the wheel, pinch, drag to pan), the keyboard shortcuts, the
   view options of an artifact type, the counts line in the head, and the legend and details cards
   under the drawing.
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

  /* Zoom so that the point of the drawing under (clientX, clientY) stays under it: the frame scrolls
     sideways and the page scrolls vertically (the frame grows with the drawing) by what the scale
     change moved. */
  function zoomAt(next, clientX, clientY) {
    if (!svg || !base) { zoomTo(next, false); return; }
    var rect = svg.getBoundingClientRect(), before = scale;
    zoomTo(next, false);
    var ratio = scale / before;
    if (ratio === 1) return;
    var frame = byId('frame');
    frame.scrollLeft += (clientX - rect.left) * (ratio - 1);
    window.scrollBy(0, (clientY - rect.top) * (ratio - 1));
  }

  function textEntry(t) {
    if (!t || !t.tagName) return false;
    var tag = t.tagName.toLowerCase();
    if (tag === 'textarea' || tag === 'select' || t.isContentEditable) return true;
    return tag === 'input' && !/^(checkbox|radio|button|range|submit|reset|color|file|image)$/i.test(t.type || 'text');
  }

  /* Drag the drawing's empty part (primary button, mouse or pen; a touch screen scrolls natively): it
     pans once the pointer has moved 4px, and the click that ends a pan neither pins nor clears. */
  function initPan(frame) {
    var PAN_THRESHOLD = 4, start = null, last = null, moved = false, swallow = false;
    frame.addEventListener('pointerdown', function (ev) {
      if (ev.button !== 0 || ev.pointerType === 'touch' || !ev.isPrimary) return;
      if (ev.target.closest && ev.target.closest('.node-group, .edge-group')) return;
      start = last = { x: ev.clientX, y: ev.clientY };
      moved = false;
    });
    document.addEventListener('pointermove', function (ev) {
      if (!start) return;
      if (!moved && Math.abs(ev.clientX - start.x) < PAN_THRESHOLD && Math.abs(ev.clientY - start.y) < PAN_THRESHOLD) return;
      if (!moved) { moved = true; frame.classList.add('panning'); }
      frame.scrollLeft -= ev.clientX - last.x;
      window.scrollBy(0, -(ev.clientY - last.y));
      last = { x: ev.clientX, y: ev.clientY };
    });
    function end() {
      if (!start) return;
      if (moved) { swallow = true; setTimeout(function () { swallow = false; }, 0); }
      frame.classList.remove('panning');
      start = null;
    }
    document.addEventListener('pointerup', end);
    document.addEventListener('pointercancel', end);
    frame.addEventListener('click', function (ev) {
      if (swallow) { swallow = false; ev.stopPropagation(); ev.preventDefault(); }
    }, true);
    frame.addEventListener('selectstart', function (ev) { if (start && moved) ev.preventDefault(); });
  }

  /* Ctrl or Cmd with the wheel zooms around the pointer, ZOOM_STEP per 100 units of delta. A trackpad
     pinch arrives as a wheel event with ctrlKey in Chromium and Firefox; Safari sends gesture events.
     Two touches on a touch screen pinch the same way. A plain wheel is left alone: the page scrolls. */
  function initWheelAndPinch(frame) {
    frame.addEventListener('wheel', function (ev) {
      if (!ev.ctrlKey && !ev.metaKey) return;
      ev.preventDefault();
      var delta = ev.deltaY * (ev.deltaMode === 1 ? 33 : ev.deltaMode === 2 ? 400 : 1);
      zoomAt(scale * Math.pow(ZOOM_STEP, -delta / 100), ev.clientX, ev.clientY);
    }, { passive: false });

    var gestureStart = 1;
    frame.addEventListener('gesturestart', function (ev) { ev.preventDefault(); gestureStart = scale; });
    frame.addEventListener('gesturechange', function (ev) {
      ev.preventDefault();
      zoomAt(gestureStart * ev.scale, ev.clientX, ev.clientY);
    });

    var touches = {}, pinchBase = null;
    function spread() {
      var ids = Object.keys(touches);
      if (ids.length < 2) return null;
      var a = touches[ids[0]], b = touches[ids[1]];
      return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }
    frame.addEventListener('pointerdown', function (ev) {
      if (ev.pointerType !== 'touch') return;
      touches[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
      var sp = spread();
      if (sp) pinchBase = { d: sp.d, scale: scale };
    });
    frame.addEventListener('pointermove', function (ev) {
      if (ev.pointerType !== 'touch' || !touches[ev.pointerId]) return;
      touches[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
      var sp = spread();
      if (sp && pinchBase) zoomAt(pinchBase.scale * sp.d / pinchBase.d, sp.x, sp.y);
    });
    function lift(ev) { delete touches[ev.pointerId]; pinchBase = null; }
    frame.addEventListener('pointerup', lift);
    frame.addEventListener('pointercancel', lift);
  }

  function initZoom() {
    byId('zoom-in').addEventListener('click', function () { zoomTo(scale * ZOOM_STEP, false); });
    byId('zoom-out').addEventListener('click', function () { zoomTo(scale / ZOOM_STEP, false); });
    byId('zoom-fit').addEventListener('click', function () { zoomTo(fitScale(), true); });
    byId('zoom-actual').addEventListener('click', function () { zoomTo(1, false); });
    window.addEventListener('resize', function () { if (fitting) zoomTo(fitScale(), true); });
    var frame = byId('frame');
    if (frame) { initPan(frame); initWheelAndPinch(frame); }
    applyScale();
  }

  /* ---------- keyboard shortcuts ----------
     On the document, ignored while a text field has the focus and when Ctrl, Cmd or Alt is held (the
     browser's own shortcuts). The shared keys are fixed; an artifact type adds its own with
     A.shortcuts.add(key, label, handler) and the hint line under the drawing lists them all. */

  var typeKeys = [];
  var SHARED_KEYS = [
    { keys: ['+', '='], show: '+', label: 'zoom in', run: function () { zoomTo(scale * ZOOM_STEP, false); } },
    { keys: ['-', '_'], show: '\u2212', label: 'zoom out', run: function () { zoomTo(scale / ZOOM_STEP, false); } },
    { keys: ['f'], show: 'F', label: 'fit', run: function () { zoomTo(fitScale(), true); } },
    { keys: ['0'], show: '0', label: '1:1', run: function () { zoomTo(1, false); } },
    { keys: ['t'], show: 'T', label: 'dark mode', run: function () { var b = byId('mode-toggle'); if (b) b.click(); } },
    { keys: ['Escape'], show: 'Esc', label: 'release the highlight', run: function () { A.hl.clear(); } }
  ];

  A.shortcuts = {
    /* key: the character; label: what the hint line says it does; handler: called with no argument.
       Adding a key again replaces the earlier one, so a renderer may register on every drawing. */
    add: function (key, label, handler) {
      typeKeys = typeKeys.filter(function (k) { return k.keys[0] !== key.toLowerCase(); });
      typeKeys.push({ keys: [key.toLowerCase()], show: key.length === 1 ? key.toUpperCase() : key, label: label, run: handler });
      renderShortcutHint();
    }
  };

  function renderShortcutHint() {
    var p = byId('shortcut-hint');
    if (!p) return;
    p.textContent = '';
    p.appendChild(document.createTextNode('Keys: '));
    SHARED_KEYS.concat(typeKeys).forEach(function (k, i) {
      if (i) p.appendChild(document.createTextNode(' \u00b7 '));
      p.appendChild(A.h('kbd', 'kbd', k.show));
      p.appendChild(document.createTextNode(' ' + k.label));
    });
    p.hidden = false;
  }

  function initShortcuts() {
    document.addEventListener('keydown', function (ev) {
      if (ev.defaultPrevented || ev.ctrlKey || ev.metaKey || ev.altKey || textEntry(ev.target)) return;
      var key = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key, hit = null;
      SHARED_KEYS.concat(typeKeys).forEach(function (k) { if (!hit && k.keys.indexOf(key) >= 0) hit = k; });
      if (!hit) return;
      if (hit.keys[0] === 'Escape' && !A.hl.isPinned()) return;
      ev.preventDefault();
      hit.run();
    });
    renderShortcutHint();
  }

  /* ---------- view options ----------
     An artifact type that offers options for how it is drawn (a level of detail, a layer that can be
     hidden) describes them once with A.viewOptions(spec) and reads their values from A.view. A change
     draws the artifact again (A.redraw) with the zoom kept and any pinned highlight cleared.
     spec: [{id, type: 'choice', label, value, options: [{value, label, key}]},
            {id, type: 'switch', label, value, key}]
     An option with `hidden: true` keeps its value but shows no control and has no key: a type hides
     an option that does nothing for the model at hand. A choice is a radio group of segments, a switch is a small copy of the Dark mode toggle. */

  A.view = {};
  var optionsBuilt = false;

  function changeOption(id, value) {
    if (A.view[id] === value) return;
    A.view[id] = value;
    syncOptions();
    if (A.redraw) A.redraw();
  }

  var optionSync = [];
  function syncOptions() { optionSync.forEach(function (f) { f(); }); }

  function choiceControl(o) {
    var buttons = [];
    var group = A.h('div', 'vo-seg', []);
    group.setAttribute('role', 'radiogroup');
    group.setAttribute('aria-label', o.label);
    o.options.forEach(function (opt) {
      var b = A.h('button', 'vo-opt', opt.label);
      b.type = 'button';
      b.setAttribute('role', 'radio');
      if (opt.key) b.title = o.label + ': ' + opt.label + ' (key ' + opt.key.toUpperCase() + ')';
      b.addEventListener('click', function () { changeOption(o.id, opt.value); });
      b.addEventListener('keydown', function (ev) {
        var i = buttons.indexOf(b), n = buttons.length, to = -1;
        if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') to = (i + 1) % n;
        else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') to = (i + n - 1) % n;
        if (to < 0) return;
        ev.preventDefault();
        buttons[to].focus();
        changeOption(o.id, o.options[to].value);
      });
      buttons.push(b);
      group.appendChild(b);
      if (opt.key) A.shortcuts.add(opt.key, opt.label.toLowerCase(), function () { changeOption(o.id, opt.value); });
    });
    optionSync.push(function () {
      o.options.forEach(function (opt, i) {
        var on = A.view[o.id] === opt.value;
        buttons[i].setAttribute('aria-checked', on ? 'true' : 'false');
        buttons[i].tabIndex = on ? 0 : -1;
        buttons[i].classList.toggle('on', on);
      });
    });
    return A.h('div', 'vo-group', [A.h('span', 'vo-label', o.label), group]);
  }

  function switchControl(o) {
    var input = A.h('input', '', []);
    input.type = 'checkbox';
    input.setAttribute('role', 'switch');
    input.addEventListener('change', function () { changeOption(o.id, input.checked); });
    if (o.key) A.shortcuts.add(o.key, o.label.toLowerCase(), function () { changeOption(o.id, !A.view[o.id]); });
    optionSync.push(function () { input.checked = !!A.view[o.id]; });
    return A.h('label', 'mode-toggle vo-switch', [
      input,
      A.h('span', 'mode-track', [A.h('span', 'mode-thumb', [])]),
      A.h('span', 'mode-label', o.label)
    ]);
  }

  /* Idempotent: the first call builds the controls and sets the initial values, later calls (a type
     calls it on every drawing) change nothing. */
  A.viewOptions = function (spec) {
    if (optionsBuilt) return;
    optionsBuilt = true;
    var box = byId('view-options');
    if (!box) return;
    spec.forEach(function (o) {
      A.view[o.id] = o.value;
      if (o.hidden) return; /* an option that does nothing for this model: no control, no key */
      box.appendChild(o.type === 'switch' ? switchControl(o) : choiceControl(o));
    });
    box.hidden = !box.children.length;
    syncOptions();
  };

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
    init: function () { initToggle(); initZoom(); initShortcuts(); },
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
