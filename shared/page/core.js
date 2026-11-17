/* Core of an artifact page: tokens, text measurement, drawing primitives (header-band node, zone,
   chip, connector, status mark), the linked-highlight registry, the notice and error areas and the
   boot sequence. Shared by every artifact type. The page chrome (the Dark mode toggle, zoom, the
   legend and details cards) is in chrome.js.
   No style value lives here: colors, fonts and geometry come from the theme's tokens, read at run
   time, or from the role classes of page.css. */
(function () {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';
  var A = (window.Artifact = { renderers: {}, stats: { draws: 0 } });

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

  /* Does the theme load web fonts? A theme with system font stacks has no @import and no @font-face. */
  A.themeLoadsFonts = function () {
    var el = document.getElementById('theme');
    var css = el ? el.textContent.replace(/\/\*[\s\S]*?\*\//g, '') : '';
    return /@import|@font-face/i.test(css);
  };

  /* Ask for every face the roles use, then wait for them, but never longer than timeoutMs. Resolves
     {ready: bool, pending: Promise}: pending settles when the fonts finally arrive. A theme that loads
     no web font is ready at once: one layout pass, no waiting. */
  A.loadFonts = function (timeoutMs) {
    if (!A.themeLoadsFonts() || !document.fonts || !document.fonts.load) {
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
     package, pool): the band, one body row, the title and chip insets, the inner side padding and the
     padding under the last row. They live here, with the primitive, so a type cannot size its node
     differently. */
  A.headerMetrics = { band: 34, row: 24, titleInset: 12, chipInset: 8, padX: 10, padBottom: 4 };

  /* A chip (a small tinted label, such as a key): its height, the padding at each side of its text and
     the gap between neighbours. */
  A.chipMetrics = { height: 16, padX: 6, gap: 3 };

  /* A zone: the room its label takes above the nodes, the padding at the other sides, and where the
     label sits. */
  A.zoneMetrics = { padTop: 40, pad: 24, labelX: 16, labelY: 20 };

  /* Height of a header-band node with `rows` body rows. */
  A.headerNodeHeight = function (rows) {
    var m = A.headerMetrics;
    return m.band + rows * m.row + m.padBottom;
  };

  /* Least width that fits `title` in the band. */
  A.headerNodeMinWidth = function (title) {
    return Math.ceil(A.textWidth(title, 't-band') + 2 * A.headerMetrics.titleInset);
  };

  /* Vertical center of body row `i` (0-based) of a header-band node whose top is at `y`. */
  A.headerRowCenter = function (y, i) {
    var m = A.headerMetrics;
    return y + m.band + i * m.row + m.row / 2;
  };

  /* The header-band node of the design: body, band (rounded on its top corners only), the line under
     the band, the body rows (a hairline above each but the first, and the ground that a highlight
     tints), then the outline again with no fill. The title is left-aligned and centered vertically in
     the band. Returns the <g> (class node-group); g.rowEls[i] is the <g class="row"> of body row i, to
     which the caller adds the row's content, placing it with headerRowCenter.
     opts: x, y, width, rows (number of body rows), group (1..5, 'neutral' or 0), title, italic,
     ungrouped (a node outside every group of a diagram that has groups: dashed outline) */
  A.headerNode = function (o) {
    var r = A.px('--radius');
    var m = A.headerMetrics;
    var height = A.headerNodeHeight(o.rows);
    var dash = o.ungrouped ? ' ungrouped' : '';
    var g = A.el('g', { 'class': 'hnode node-group ' + A.groupClass(o.group) });
    g.rowEls = [];
    g.appendChild(A.el('rect', { 'class': 'node' + dash, x: o.x, y: o.y, width: o.width, height: height, rx: r, ry: r }));
    g.appendChild(A.el('path', { 'class': 'band', d: topRoundedRect(o.x, o.y, o.width, m.band, r) }));
    g.appendChild(A.el('line', { 'class': 'node-rule', x1: o.x, x2: o.x + o.width, y1: o.y + m.band, y2: o.y + m.band }));
    for (var i = 0; i < o.rows; i++) {
      var top = o.y + m.band + i * m.row;
      var row = A.el('g', { 'class': 'row' }, [
        A.el('rect', { 'class': 'row-bg', x: o.x + 1, y: top + (i ? 0.5 : 0.75), width: o.width - 2, height: m.row - (i ? 0.5 : 0.75) }),
        i ? A.el('line', { 'class': 'row-sep', x1: o.x + m.chipInset, x2: o.x + o.width - m.chipInset, y1: top, y2: top }) : null
      ]);
      g.appendChild(row);
      g.rowEls.push(row);
    }
    g.appendChild(A.el('rect', { 'class': 'node-outline' + dash, x: o.x, y: o.y, width: o.width, height: height, rx: r, ry: r }));
    g.appendChild(A.text(o.x + m.titleInset, o.y + m.band / 2 + 0.5, o.title,
      't-band band-text' + (o.italic ? ' t-italic' : ''), { 'text-anchor': 'start' }));
    return g;
  };

  /* A node with no band. */
  A.plainNode = function (o) {
    var r = A.px('--radius');
    return A.el('rect', { 'class': 'node ' + A.groupClass(o.group), x: o.x, y: o.y,
      width: o.width, height: o.height, rx: r, ry: r });
  };

  /* The zone of a group: a rounded area tinted with the group color, with its label at the top left.
     opts: x, y, width, height, group (1..5), label. Returns the <g> (class zone-group). */
  A.zone = function (o) {
    var zm = A.zoneMetrics;
    /* the corner never exceeds a quarter of the zone's smaller side, so a small sample (a legend
       swatch) still reads as a rounded rectangle whatever the theme's --zone-radius is */
    var r = Math.min(A.px('--zone-radius'), o.width / 4, o.height / 4);
    var g = A.el('g', { 'class': 'zone-group ' + A.groupClass(o.group) });
    g.appendChild(A.el('rect', { 'class': 'zone', x: o.x, y: o.y, width: o.width, height: o.height, rx: r, ry: r }));
    if (o.label) g.appendChild(A.text(o.x + zm.labelX, o.y + zm.labelY, o.label, 'zone-label'));
    return g;
  };

  /* Corner radius of the small shapes that stand for a role beside the text (chip, legend swatch,
     sample of a node edge): the smaller of --radius and 4px. */
  A.smallRadius = function () { return Math.min(A.px('--radius'), 4); };

  /* Width of a chip carrying `label`. */
  A.chipWidth = function (label) {
    return Math.ceil(A.textWidth(label, 't-chip') + 2 * A.chipMetrics.padX);
  };

  /* A chip with its left edge at x, centered on cy. role: primary | foreign | unique, which sets --k
     (a key token). Returns the <g>. */
  A.chip = function (x, cy, label, role) {
    var cm = A.chipMetrics, w = A.chipWidth(label), r = A.smallRadius();
    return A.el('g', { 'class': 'chip-group k-' + role }, [
      A.el('rect', { 'class': 'chip', x: x, y: cy - cm.height / 2, width: w, height: cm.height, rx: r, ry: r }),
      A.text(x + w / 2, cy + 0.5, label, 't-chip chip-text', { 'text-anchor': 'middle' })
    ]);
  };

  function pathData(points) {
    return points.map(function (p, i) { return (i ? 'L' : 'M') + p.x + ' ' + p.y; }).join('');
  }

  /* An orthogonal connector through `points` ([{x,y}, ...]). opts: dashed, mark, head. Returns the
     <g> (class edge-group): the line, its head, and a wide invisible line that catches the pointer.
     The caller adds notation marks to the same group and registers it with A.hl.link. */
  A.edgePath = function (points, o) {
    o = o || {};
    var g = A.el('g', { 'class': 'edge-group' });
    g.appendChild(A.el('path', { 'class': 'edge' + (o.dashed ? ' dashed' : '') + (o.mark ? ' mark' : ''), d: pathData(points) }));
    g.appendChild(A.el('path', { 'class': 'edge-hit', d: pathData(points) }));
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

  /* ---------- linked highlighting ----------
     A renderer declares what is connected to what; the registry does the rest. Pointing at a node, a
     connector or a row of the details table flags that element and what it connects with `hl` and puts
     `hovering` on the drawing, so page.css highlights the flagged and dims the others. On a touch
     screen a tap does the same and a second tap, or a tap elsewhere, clears it. */
  A.hl = (function () {
    var nodes, links, touching, svg, active, flagged, pointer = 'mouse';
    var api = {};

    function init() { nodes = {}; links = {}; touching = {}; svg = null; active = null; flagged = []; }
    init();

    function flag(el) {
      if (el && !el.classList.contains('hl')) { el.classList.add('hl'); flagged.push(el); }
    }

    function clear() {
      flagged.forEach(function (el) { el.classList.remove('hl'); });
      flagged = [];
      active = null;
      if (svg) svg.classList.remove('hovering');
    }

    function flagLink(id) {
      var l = links[id];
      l.els.forEach(flag);
      flag(nodes[l.a]);
      flag(nodes[l.b]);
      l.rows.forEach(flag);
      flag(l.tr);
    }

    function show(key) {
      clear();
      active = key;
      if (svg) svg.classList.add('hovering');
      var id = key.slice(2);
      if (key.charAt(0) === 'l') { flagLink(id); return; }
      flag(nodes[id]);
      (touching[id] || []).forEach(flagLink);
    }

    function listen(el, key) {
      el.addEventListener('mouseenter', function () { if (pointer === 'mouse') show(key); });
      el.addEventListener('mouseleave', function () { if (pointer === 'mouse') clear(); });
      el.addEventListener('click', function () {
        if (pointer !== 'mouse') { if (active === key) clear(); else show(key); }
      });
    }

    document.addEventListener('pointerdown', function (ev) { pointer = ev.pointerType === 'mouse' ? 'mouse' : 'touch'; }, true);

    /* forget everything registered: called before a drawing is drawn again */
    api.reset = function () { clear(); init(); var h = document.getElementById('hint'); if (h) h.hidden = true; };

    /* the drawing's <svg>: it carries `hovering`, and a tap on its empty part clears */
    api.bind = function (el) {
      svg = el;
      el.addEventListener('click', function (ev) {
        if (pointer !== 'mouse' && !(ev.target.closest && ev.target.closest('.node-group, .edge-group'))) clear();
      });
    };

    /* a node: id and its element (the group that is flagged and dimmed) */
    api.node = function (id, el) { nodes[id] = el; listen(el, 'n:' + id); };

    /* a connector between nodes a and b. opts.els: the elements to flag (the connector's group first,
       then anything that belongs to it, a label for instance); opts.rows: row elements at its ends */
    api.link = function (id, a, b, opts) {
      opts = opts || {};
      links[id] = { a: a, b: b, els: opts.els || [], rows: opts.rows || [], tr: null };
      [a, b].forEach(function (n) { (touching[n] = touching[n] || []).indexOf(id) < 0 && touching[n].push(id); });
      if (links[id].els[0]) listen(links[id].els[0], 'l:' + id);
      var h = document.getElementById('hint'); if (h) h.hidden = false;
    };

    /* the details-table row that describes connector `id` */
    api.row = function (id, tr) {
      if (!links[id]) return;
      links[id].tr = tr;
      listen(tr, 'l:' + id);
      tr.addEventListener('focus', function () { show('l:' + id); });
      tr.addEventListener('blur', clear);
    };

    return api;
  })();

  /* ---------- boot ---------- */

  A.register = function (type, render) { A.renderers[type] = render; };

  function readModel() {
    var node = document.getElementById('model');
    if (!node) throw new Error('the page carries no model');
    try { return JSON.parse(node.textContent); }
    catch (e) { throw new Error('the model in this page is not valid JSON (' + e.message + ')'); }
  }

  /* the page chrome (chrome.js) hooks, called when present */
  function chrome(name, arg) { return A.chrome && A.chrome[name] ? A.chrome[name](arg) : undefined; }

  A.boot = function () {
    chrome('init');
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
      A.hl.reset();
      chrome('reset');
      A.stats.draws += 1;
      return Promise.resolve()
        .then(function () { return A.renderers[type](model, mount); })
        .then(function () { chrome('drawn', mount); })
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
