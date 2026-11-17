/* Core of an artifact page: the color-mode switch, text measurement, drawing primitives, the
   notice and error areas, and the boot sequence. Shared by every artifact type.
   No style value lives here: colors, fonts and geometry come from the theme's tokens, read at run
   time, or from the role classes of page.css. */
(function () {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';
  var STORE_KEY = 'artifacts.colorMode';
  var MODES = ['system', 'light', 'dark'];
  var A = (window.Artifact = { renderers: {} });

  /* ---------- color-mode switch (VC-6) ---------- */

  function readChoice() {
    try {
      var v = window.localStorage.getItem(STORE_KEY);
      return MODES.indexOf(v) >= 0 ? v : 'system';
    } catch (e) {
      return 'system'; /* storage blocked or unavailable: start on System */
    }
  }

  function writeChoice(mode) {
    try {
      if (mode === 'system') window.localStorage.removeItem(STORE_KEY);
      else window.localStorage.setItem(STORE_KEY, mode);
    } catch (e) { /* storage unavailable: the choice lasts for this view only */ }
  }

  function applyMode(mode) {
    var root = document.documentElement;
    if (mode === 'light' || mode === 'dark') root.setAttribute('data-theme', mode);
    else root.removeAttribute('data-theme');
    var buttons = document.querySelectorAll('.mode-switch button');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute('aria-pressed', String(buttons[i].getAttribute('data-mode') === mode));
    }
  }

  A.mode = readChoice();
  applyMode(A.mode); /* before first paint: no flash of the wrong mode */

  A.initSwitch = function () {
    var buttons = document.querySelectorAll('.mode-switch button');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function (ev) {
        A.mode = ev.currentTarget.getAttribute('data-mode');
        writeChoice(A.mode);
        applyMode(A.mode);
      });
    }
    applyMode(A.mode);
  };

  /* ---------- tokens ---------- */

  A.token = function (name) {
    return window.getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  };

  /* A length token in px. A theme must define it; a missing or non-numeric one is an error, never
     a silent default, so the page shows the message instead of another theme's value. */
  A.px = function (name) {
    var n = parseFloat(A.token(name));
    if (!isFinite(n)) throw new Error('The theme does not define a length for ' + name + '.');
    return n;
  };

  /* ---------- fonts and text measurement ---------- */

  var FACES = [
    ['--font-display', '600'],
    ['--font-body', '400'], ['--font-body', '500'], ['--font-body', '600'],
    ['--font-data', '400'], ['--font-data', '500'], ['--font-data', '600']
  ];

  /* Ask for every face the roles use, then wait for them, but never longer than timeoutMs. Resolves
     {ready: bool, pending: Promise}: pending settles when the fonts finally arrive. */
  A.loadFonts = function (timeoutMs) {
    if (!document.fonts || !document.fonts.load) {
      return Promise.resolve({ ready: true, pending: Promise.resolve() });
    }
    var loads = FACES.map(function (f) {
      return document.fonts.load(f[1] + ' 12px ' + A.token(f[0])).catch(function () { return []; });
    });
    var all = Promise.all(loads).then(function () { return document.fonts.ready; });
    var timer;
    var timeout = new Promise(function (resolve) {
      timer = setTimeout(function () { resolve(false); }, timeoutMs);
    });
    return Promise.race([all.then(function () { return true; }), timeout]).then(function (ready) {
      clearTimeout(timer);
      return { ready: ready, pending: all };
    });
  };

  var measureSvg = null;
  var measureCache = {};

  A.clearMeasureCache = function () { measureCache = {}; };

  /* Width in px of `text` drawn with the type role class `cls` (a class of page.css). */
  A.textWidth = function (text, cls) {
    var key = cls + '\u0000' + text;
    if (measureCache[key] !== undefined) return measureCache[key];
    if (!measureSvg) {
      measureSvg = document.createElementNS(SVGNS, 'svg');
      measureSvg.setAttribute('aria-hidden', 'true');
      measureSvg.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;overflow:hidden;visibility:hidden';
      document.body.appendChild(measureSvg);
    }
    var t = document.createElementNS(SVGNS, 'text');
    t.setAttribute('class', cls);
    t.textContent = text;
    measureSvg.appendChild(t);
    var w = t.getComputedTextLength();
    measureSvg.removeChild(t);
    measureCache[key] = w;
    return w;
  };

  /* ---------- notices and errors ---------- */

  function area(id, cls) {
    return document.getElementById(id) || (function () {
      var d = document.createElement('div');
      d.id = id;
      d.className = cls;
      document.body.insertBefore(d, document.body.firstChild);
      return d;
    })();
  }

  A.notice = function (message) {
    var p = document.createElement('p');
    p.className = 'notice';
    p.textContent = message;
    area('notices', 'notices').appendChild(p);
  };

  A.fail = function (err) {
    var msg = err && err.message ? err.message : String(err);
    var p = document.createElement('p');
    p.className = 'error';
    p.textContent = 'This diagram could not be drawn: ' + msg;
    area('errors', 'errors').appendChild(p);
    var frame = document.getElementById('frame');
    if (frame) frame.hidden = true; /* the message stands in place of the drawing */
    if (window.console && console.error) console.error(err);
  };

  A.clearMessages = function () {
    ['notices', 'errors'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = '';
    });
  };

  /* ---------- drawing primitives (SVG) ---------- */

  A.el = function (tag, attrs, children) {
    var e = document.createElementNS(SVGNS, tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (attrs[k] !== null && attrs[k] !== undefined) e.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) {
      if (c === null || c === undefined) return;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  };

  A.text = function (x, y, str, cls, extra) {
    var attrs = { x: x, y: y, 'class': cls, 'dominant-baseline': 'central' };
    if (extra) Object.keys(extra).forEach(function (k) { attrs[k] = extra[k]; });
    return A.el('text', attrs, [str]);
  };

  /* group number 1..5 -> role class; 'neutral' -> the neutral role (a node outside every group of a
     diagram that has groups); anything else -> no class (the node falls back to --accent) */
  A.groupClass = function (n) {
    if (n === 'neutral') return 'g-neutral';
    return n >= 1 && n <= 5 ? 'g-' + n : '';
  };

  function topRoundedRect(x, y, w, h, r) {
    r = Math.min(r, w / 2, h);
    return 'M' + x + ' ' + (y + h) + 'V' + (y + r) + 'Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y +
      'H' + (x + w - r) + 'Q' + (x + w) + ' ' + y + ' ' + (x + w) + ' ' + (y + r) + 'V' + (y + h) + 'Z';
  }

  /* Proportions of the header-band node, shared by every artifact type that draws one (table, class,
     package, pool): the band, one body row, the inner side padding and the padding under the last
     row. They live here, with the primitive, so a type cannot size its node differently. */
  A.headerMetrics = { band: 28, row: 22, padX: 10, padBottom: 6 };

  /* Height of a header-band node with `rows` body rows. */
  A.headerNodeHeight = function (rows) {
    var m = A.headerMetrics;
    return m.band + rows * m.row + m.padBottom;
  };

  /* Least width that fits `title` in the band. */
  A.headerNodeMinWidth = function (title) {
    return Math.ceil(A.textWidth(title, 't-band') + 2 * A.headerMetrics.padX);
  };

  /* Vertical center of body row `i` (0-based) of a header-band node whose top is at `y`. */
  A.headerRowCenter = function (y, i) {
    var m = A.headerMetrics;
    return y + m.band + i * m.row + m.row / 2;
  };

  /* The header-band node of the design: body, band (rounded on its top corners only), the line under
     the band, then the outline again with no fill. The title is centered in the band. Returns the <g>;
     the caller adds the body content, placing rows with headerRowCenter.
     opts: x, y, width, rows (number of body rows), group (1..5, 'neutral' or 0), title, italic */
  A.headerNode = function (o) {
    var r = A.px('--radius');
    var band = A.headerMetrics.band;
    var height = A.headerNodeHeight(o.rows);
    var g = A.el('g', { 'class': 'hnode ' + A.groupClass(o.group) });
    g.appendChild(A.el('rect', { 'class': 'node', x: o.x, y: o.y, width: o.width, height: height, rx: r, ry: r }));
    g.appendChild(A.el('path', { 'class': 'band', d: topRoundedRect(o.x, o.y, o.width, band, r) }));
    g.appendChild(A.el('line', { 'class': 'node-rule', x1: o.x, x2: o.x + o.width, y1: o.y + band, y2: o.y + band }));
    g.appendChild(A.el('rect', { 'class': 'node-outline', x: o.x, y: o.y, width: o.width, height: height, rx: r, ry: r }));
    g.appendChild(A.text(o.x + o.width / 2, o.y + band / 2 + 0.5, o.title,
      't-band band-text' + (o.italic ? ' t-italic' : ''), { 'text-anchor': 'middle' }));
    return g;
  };

  /* A node with no band. */
  A.plainNode = function (o) {
    var r = A.px('--radius');
    return A.el('rect', { 'class': 'node ' + A.groupClass(o.group), x: o.x, y: o.y,
      width: o.width, height: o.height, rx: r, ry: r });
  };

  function pathData(points) {
    return points.map(function (p, i) { return (i ? 'L' : 'M') + p.x + ' ' + p.y; }).join('');
  }

  /* An orthogonal connector through `points` ([{x,y}, ...]). opts: dashed, mark, head. */
  A.edgePath = function (points, o) {
    o = o || {};
    var g = A.el('g');
    g.appendChild(A.el('path', { 'class': 'edge' + (o.dashed ? ' dashed' : '') + (o.mark ? ' mark' : ''), d: pathData(points) }));
    if (o.head && points.length > 1) {
      var a = points[points.length - 2], b = points[points.length - 1];
      var len = A.px('--arrowhead'), half = (len * 0.9) / 2;
      var dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
      var ux = dx / d, uy = dy / d;
      var bx = b.x - ux * len, by = b.y - uy * len;
      g.appendChild(A.el('polygon', { 'class': 'edge-head',
        points: b.x + ',' + b.y + ' ' + (bx - uy * half) + ',' + (by + ux * half) + ' ' + (bx + uy * half) + ',' + (by - ux * half) }));
    }
    return g;
  };

  /* Status mark, about 9px across, centered at cx, cy: done disc, active ring with the right half
     filled, risk triangle, late square, todo empty ring. */
  A.statusMark = function (state, cx, cy) {
    var s = 'var(--status-' + state + ')';
    var style = '--s:' + s;
    var h = 4.5;
    switch (state) {
      case 'done':
        return A.el('circle', { 'class': 'status', style: style, cx: cx, cy: cy, r: h });
      case 'active':
        return A.el('g', { style: style }, [
          A.el('circle', { 'class': 'status-open', cx: cx, cy: cy, r: h - 0.75 }),
          A.el('path', { 'class': 'status', d: 'M' + cx + ' ' + (cy - h + 0.75) + 'A' + (h - 0.75) + ' ' + (h - 0.75) + ' 0 0 1 ' + cx + ' ' + (cy + h - 0.75) + 'Z' })
        ]);
      case 'risk':
        return A.el('polygon', { 'class': 'status', style: style, points: cx + ',' + (cy - h) + ' ' + (cx + h) + ',' + (cy + h - 0.5) + ' ' + (cx - h) + ',' + (cy + h - 0.5) });
      case 'late':
        return A.el('rect', { 'class': 'status', style: style, x: cx - h + 0.5, y: cy - h + 0.5, width: 2 * h - 1, height: 2 * h - 1 });
      default:
        return A.el('circle', { 'class': 'status-open', style: style, cx: cx, cy: cy, r: h - 0.75 });
    }
  };

  /* A label with its halo of the surface behind it. anchor: start | middle | end */
  A.edgeLabel = function (x, y, str, anchor) {
    return A.text(x, y, str, 'edge-label', { 'text-anchor': anchor || 'middle' });
  };

  /* ---------- boot ---------- */

  A.register = function (type, render) { A.renderers[type] = render; };

  function readModel() {
    var node = document.getElementById('model');
    if (!node) throw new Error('the page carries no model');
    try { return JSON.parse(node.textContent); }
    catch (e) { throw new Error('the model in this page is not valid JSON (' + e.message + ')'); }
  }

  A.boot = function () {
    A.initSwitch();
    var type = document.body.getAttribute('data-type');
    var mount = document.getElementById('drawing');
    var model;
    try {
      model = readModel();
      if (!A.renderers[type]) throw new Error('no renderer is loaded for artifact type "' + type + '"');
    } catch (e) { A.fail(e); return; }

    function draw() {
      A.clearMessages();
      var frame = document.getElementById('frame');
      if (frame) frame.hidden = false;
      mount.textContent = '';
      return Promise.resolve()
        .then(function () { return A.renderers[type](model, mount); })
        .catch(A.fail);
    }

    A.loadFonts(2500).then(function (fonts) {
      return draw().then(function () {
        if (!fonts.ready) {
          /* the fonts arrived after the first drawing: measure again, once */
          fonts.pending.then(function () { A.clearMeasureCache(); return draw(); });
        }
      });
    });
  };
})();
