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

  /* group number 1..16 -> role class: the five group colors are assigned in order of first appearance
     and cycle from the sixth, so group 6 takes the first color; 'neutral' -> the neutral role (a node
     outside every group of a diagram that has groups); anything else -> no class (the node falls back
     to --accent) */
  A.GROUP_COLORS = 5;
  A.groupClass = function (n) {
    if (n === 'neutral') return 'g-neutral';
    return n >= 1 ? 'g-' + (((Math.floor(n) - 1) % A.GROUP_COLORS) + 1) : '';
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

  /* Height of a header-band node with `rows` body rows, each one row high, or, given `heights` (an
     array of row heights, for a node with a half row), the sum of those. */
  A.headerNodeHeight = function (rows, heights) {
    var m = A.headerMetrics, total = 0, i;
    if (heights) { for (i = 0; i < heights.length; i++) total += heights[i]; }
    else total = rows * m.row;
    return total > 0 ? m.band + total + m.padBottom : m.band;   /* no body rows: the band alone */
  };

  /* Least width that fits `title` in the band, and, when the band carries chips (`bandChips`, the
     same list the node is drawn with), the chips too: the title, a gap of one title inset, the chips
     and the chip inset at the right edge. */
  A.headerNodeMinWidth = function (title, bandChips) {
    var m = A.headerMetrics, w = A.textWidth(title, 't-band') + 2 * m.titleInset;
    if (bandChips && bandChips.length) {
      var chipsW = 0;
      bandChips.forEach(function (c, i) { chipsW += A.chipWidth(c.label) + (i ? A.chipMetrics.gap : 0); });
      w = A.textWidth(title, 't-band') + m.titleInset + m.titleInset + chipsW + m.chipInset;
    }
    return Math.ceil(w);
  };

  /* Vertical center of body row `i` (0-based) of a header-band node whose top is at `y`; `heights` as
     for headerNodeHeight. */
  A.headerRowCenter = function (y, i, heights) {
    var m = A.headerMetrics, top = y + m.band, k;
    for (k = 0; k < i; k++) top += heights ? heights[k] : m.row;
    return top + (heights ? heights[i] : m.row) / 2;
  };

  /* The header-band node of the design: body, band (rounded on its top corners only), the line under
     the band, the body rows (a hairline above each but the first, and the ground that a highlight
     tints), then the outline again with no fill. A node with no body rows is its band alone, rounded
     on all four corners, with no line under it. The title is left-aligned and centered vertically in
     the band. Returns the <g> (class node-group); g.rowEls[i] is the <g class="row"> of body row i, to
     which the caller adds the row's content, placing it with headerRowCenter.
     opts: x, y, width, rows (number of body rows), group (1..16, 'neutral' or 0), title, italic,
     ungrouped (a node outside every group of a diagram that has groups: dashed outline).
     Optional, all off by default, so a node drawn without them is drawn exactly as before:
       rules      row indexes above which the line of the .node-rule role replaces the hairline (the
                  rule between the compartments of a class)
       rowHeights an array of row heights (a compartment that is empty keeps a half row)
       bandChips  [{label, role}] chips right-aligned in the band, the chip inset from the right edge */
  A.headerNode = function (o) {
    var r = A.px('--radius');
    var m = A.headerMetrics;
    var heights = o.rowHeights || null;
    var height = A.headerNodeHeight(o.rows, heights);
    var dash = o.ungrouped ? ' ungrouped' : '';
    var rules = o.rules || [];
    var g = A.el('g', { 'class': 'hnode node-group ' + A.groupClass(o.group) });
    g.rowEls = [];
    g.appendChild(A.el('rect', { 'class': 'node' + dash, x: o.x, y: o.y, width: o.width, height: height, rx: r, ry: r }));
    if (height > m.band) {
      g.appendChild(A.el('path', { 'class': 'band', d: topRoundedRect(o.x, o.y, o.width, m.band, r) }));
      g.appendChild(A.el('line', { 'class': 'node-rule', x1: o.x, x2: o.x + o.width, y1: o.y + m.band, y2: o.y + m.band }));
    } else {
      g.appendChild(A.el('rect', { 'class': 'band', x: o.x, y: o.y, width: o.width, height: m.band, rx: r, ry: r }));
    }
    var top = o.y + m.band;
    for (var i = 0; i < o.rows; i++) {
      var rh = heights ? heights[i] : m.row;
      var ruled = rules.indexOf(i) >= 0;
      var sep = null;
      if (ruled) sep = A.el('line', { 'class': 'node-rule', x1: o.x, x2: o.x + o.width, y1: top, y2: top });
      else if (i) sep = A.el('line', { 'class': 'row-sep', x1: o.x + m.chipInset, x2: o.x + o.width - m.chipInset, y1: top, y2: top });
      var row = A.el('g', { 'class': 'row' }, [
        A.el('rect', { 'class': 'row-bg', x: o.x + 1, y: top + (i ? 0.5 : 0.75), width: o.width - 2, height: rh - (i ? 0.5 : 0.75) }),
        sep
      ]);
      g.appendChild(row);
      g.rowEls.push(row);
      top += rh;
    }
    g.appendChild(A.el('rect', { 'class': 'node-outline' + dash, x: o.x, y: o.y, width: o.width, height: height, rx: r, ry: r }));
    g.appendChild(A.text(o.x + m.titleInset, o.y + m.band / 2 + 0.5, o.title,
      't-band band-text' + (o.italic ? ' t-italic' : ''), { 'text-anchor': 'start' }));
    if (o.bandChips && o.bandChips.length) {
      var chipsW = 0;
      o.bandChips.forEach(function (c, k) { chipsW += A.chipWidth(c.label) + (k ? A.chipMetrics.gap : 0); });
      var cx = o.x + o.width - m.chipInset - chipsW;
      o.bandChips.forEach(function (c) {
        g.appendChild(A.chip(cx, o.y + m.band / 2, c.label, c.role));
        cx += A.chipWidth(c.label) + A.chipMetrics.gap;
      });
    }
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

  /* A chip with its left edge at x, centered on cy. role: primary | foreign | unique | stereotype,
     which sets --k (a key token). Returns the <g>. */
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

  /* ---------- line hops ----------
     Where a horizontal run of one connector crosses a vertical run of another, the horizontal one hops:
     a semicircle of radius 0.4 times --arrowhead, bulging upward, in the same path. A crossing nearer
     than one --arrowhead to a bend or to a node end (the end of either run) does not hop, a shared end
     point is never a crossing, and two hops on one run never touch. Only horizontal runs hop, so two
     connectors never both jump at one point, and every crossing shows a hop: a reader tells a crossing
     from a junction. */
  A.hopRadius = function () { return A.px('--arrowhead') * 0.4; };

  /* polylines: an array of point lists, in draw order. Returns an array of the same length: for each
     polyline, the crossing points [{x, y}] where it hops over another connector's vertical run. */
  A.hops = function (polylines) {
    var u = A.px('--arrowhead'), r = A.hopRadius(), eps = 0.01, verticals = [];
    polylines.forEach(function (pts, idx) {
      for (var k = 0; k + 1 < pts.length; k++) {
        var p = pts[k], q = pts[k + 1];
        if (Math.abs(p.x - q.x) <= eps && Math.abs(p.y - q.y) > eps) {
          verticals.push({ idx: idx, x: p.x, y1: Math.min(p.y, q.y), y2: Math.max(p.y, q.y) });
        }
      }
    });
    return polylines.map(function (pts, idx) {
      var found = [];
      for (var i = 0; i + 1 < pts.length; i++) {
        var a = pts[i], b = pts[i + 1];
        if (Math.abs(a.y - b.y) > eps || Math.abs(a.x - b.x) <= eps) continue;
        var lo = Math.min(a.x, b.x), hi = Math.max(a.x, b.x), onRun = [];
        verticals.forEach(function (v) {
          if (v.idx === idx) return;
          if (v.x - lo < u || hi - v.x < u) return;                      /* near a bend or a node end */
          if (v.y2 - a.y < u || a.y - v.y1 < u) return;                  /* the vertical ends here */
          onRun.push(v.x);
        });
        onRun.sort(function (p, q) { return p - q; });
        var last = -Infinity;
        onRun.forEach(function (x) {
          if (x - last < 2 * r + 2) return;                              /* two hops would touch */
          last = x;
          found.push({ x: x, y: a.y });
        });
      }
      return found;
    });
  };

  /* The path of a connector with its hops (points from A.hops) in place. */
  function hoppedPathData(points, hops) {
    if (!hops || !hops.length) return pathData(points);
    var r = A.hopRadius(), d = 'M' + points[0].x + ' ' + points[0].y;
    for (var i = 0; i + 1 < points.length; i++) {
      var a = points[i], b = points[i + 1];
      var here = Math.abs(a.y - b.y) < 0.01 ? hops.filter(function (h) {
        return Math.abs(h.y - a.y) < 0.01 && h.x > Math.min(a.x, b.x) && h.x < Math.max(a.x, b.x);
      }) : [];
      var dir = b.x >= a.x ? 1 : -1;
      here.sort(function (p, q) { return dir * (p.x - q.x); });
      here.forEach(function (h) {
        d += 'L' + (h.x - dir * r) + ' ' + a.y + 'A' + r + ' ' + r + ' 0 0 ' + (dir > 0 ? 1 : 0) + ' ' + (h.x + dir * r) + ' ' + a.y;
      });
      d += 'L' + b.x + ' ' + b.y;
    }
    return d;
  }

  /* An orthogonal connector through `points` ([{x,y}, ...]). opts: dashed, mark, head, hops (the
     crossing points from A.hops). Returns the <g> (class edge-group): the line, its head, and a wide
     invisible line that catches the pointer. The caller adds notation marks to the same group and
     registers it with A.hl.link. */
  A.edgePath = function (points, o) {
    o = o || {};
    var g = A.el('g', { 'class': 'edge-group' });
    g.appendChild(A.el('path', { 'class': 'edge' + (o.dashed ? ' dashed' : '') + (o.mark ? ' mark' : ''), d: hoppedPathData(points, o.hops) }));
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
     `hovering` on the drawing, so page.css highlights the flagged and dims the others. A click (or a
     tap, or Enter or the space bar on a focused node) pins the highlight: while one is pinned, hovering changes
     nothing, and it ends with Esc, a second click on the pinned element, or a click on the drawing's
     empty part. A click on another element moves the pin. */
  A.hl = (function () {
    var nodes, links, touching, svg, active, pinned, flagged, buttons, pointer = 'mouse';
    var api = {};

    function init() { nodes = {}; links = {}; touching = {}; svg = null; active = null; pinned = null; flagged = []; buttons = {}; }
    init();

    function flag(el) {
      if (el && !el.classList.contains('hl')) { el.classList.add('hl'); flagged.push(el); }
    }

    function unflag() {
      flagged.forEach(function (el) { el.classList.remove('hl'); });
      flagged = [];
      active = null;
      if (svg) svg.classList.remove('hovering');
    }

    function mark() {
      Object.keys(buttons).forEach(function (k) { buttons[k].setAttribute('aria-pressed', k === pinned ? 'true' : 'false'); });
    }

    function clear() { unflag(); pinned = null; mark(); }

    function flagLink(id) {
      var l = links[id];
      l.els.forEach(flag);
      flag(nodes[l.a]);
      flag(nodes[l.b]);
      l.rows.forEach(flag);
      flag(l.tr);
    }

    function show(key) {
      unflag();
      active = key;
      if (svg) svg.classList.add('hovering');
      var id = key.slice(2);
      if (key.charAt(0) === 'l') { flagLink(id); return; }
      flag(nodes[id]);
      (touching[id] || []).forEach(flagLink);
    }

    function pin(key) {
      if (pinned === key) { clear(); return; }
      pinned = key;
      show(key);
      mark();
    }

    function hover(key) { if (!pinned && pointer === 'mouse') show(key); }
    function leave() { if (!pinned && pointer === 'mouse') unflag(); }

    function listen(el, key) {
      el.addEventListener('mouseenter', function () { hover(key); });
      el.addEventListener('mouseleave', leave);
      el.addEventListener('click', function () { pin(key); });
    }

    document.addEventListener('pointerdown', function (ev) { pointer = ev.pointerType === 'mouse' ? 'mouse' : 'touch'; }, true);

    /* forget everything registered: called before a drawing is drawn again */
    api.reset = function () { clear(); init(); var h = document.getElementById('hint'); if (h) h.hidden = true; };

    /* end the pinned highlight (Esc, a click on empty space) */
    api.clear = clear;
    api.isPinned = function () { return !!pinned; };

    /* the drawing's <svg>: it carries `hovering`, and a click on its empty part clears the pin */
    api.bind = function (el) {
      svg = el;
      el.addEventListener('click', function (ev) {
        if (!(ev.target.closest && ev.target.closest('.node-group, .edge-group'))) clear();
      });
    };

    /* a node: id and its element (the group that is flagged and dimmed). opts.label is the accessible
       name: the node is then reachable with Tab, pinned with Enter or the space bar, and a focused node shows
       the focus ring (the .focus-ring shape drawn around it, visible on keyboard focus). */
    api.node = function (id, el, opts) {
      nodes[id] = el;
      listen(el, 'n:' + id);
      if (!opts || !opts.label) return;
      var key = 'n:' + id, bb = el.getBBox(), gap = 3, r = A.px('--radius') + gap;
      el.insertBefore(A.el('rect', { 'class': 'focus-ring', x: bb.x - gap, y: bb.y - gap, width: bb.width + 2 * gap,
        height: bb.height + 2 * gap, rx: r, ry: r }), null);
      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', opts.label);
      el.setAttribute('aria-pressed', 'false');
      buttons[key] = el;
      el.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); pin(key); }
      });
    };

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
      tr.addEventListener('focus', function () { if (!pinned) show('l:' + id); });
      tr.addEventListener('blur', function () { if (!pinned) unflag(); });
      tr.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); pin('l:' + id); }
      });
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

    /* a renderer's view options call this to draw again; the zoom and the options are kept, a pinned
       highlight is cleared by draw's reset */
    A.redraw = draw;

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
