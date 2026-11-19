/* UML notation, shared by the UML artifact types: the connector end shapes (triangle, diamonds, open
   arrowhead), connector labels, the header-band node with its compartments (the class of the class
   diagram, the instance of the object diagram; an underlined title is an option), the folder-tab node
   (the package), member rows, and the samples of the legend cards. Loaded after uml-layout.js and
   before the type's own renderer (assets/<type>.json lists both under "shared"); registers on
   Artifact.uml and uses the geometry uml-layout.js derives (Artifact.uml.G, set by U.geometry()).
   No style value lives here: roles come from page.css classes and the shared primitives, sizes derive
   from the theme's geometry tokens. */
(function () {
  'use strict';
  var A = window.Artifact;
  var U = (A.uml = A.uml || {});

  var HM = A.headerMetrics; /* proportions of the header-band node: owned by the shared primitive */
  var CM = A.chipMetrics;

  U.plural = function (n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); };
  U.guillemets = function (s) { return '«' + s + '»'; };

  /* ---------- connector end shapes ---------- */

  /* how far each end shape reaches along its connector, in --arrowhead units */
  U.REACH = { triangle: 1, diamond: 1.6, hollowDiamond: 1.6, arrow: 1 };

  /* the end shape `shape` (arrow: the open arrowhead; triangle; diamond; hollowDiamond) at the end `pt`
     of a connector that runs along `dir` (the unit vector pointing into the connector) */
  U.endShape = function (g, pt, dir, shape) {
    if (!shape) return;
    var G = U.G, u = G.unit, half = G.half, nx = -dir.y, ny = dir.x;
    function at(d, side) { return { x: pt.x + dir.x * d + nx * side, y: pt.y + dir.y * d + ny * side }; }
    function str(p) { return p.x + ',' + p.y; }
    if (shape === 'arrow') {
      [-half, half].forEach(function (s) {
        var p = at(u, s);
        g.appendChild(A.el('line', { 'class': 'notation', x1: pt.x, y1: pt.y, x2: p.x, y2: p.y }));
      });
    } else if (shape === 'triangle') {
      g.appendChild(A.el('polygon', { 'class': 'notation-ring', points: [str(pt), str(at(u, -half)), str(at(u, half))].join(' ') }));
    } else {
      var pts = [str(pt), str(at(u * 0.8, -half)), str(at(u * 1.6, 0)), str(at(u * 0.8, half))].join(' ');
      g.appendChild(A.el('polygon', { 'class': shape === 'diamond' ? 'edge-head' : 'notation-ring', points: pts }));
    }
  };

  /* ---------- connector labels ---------- */

  /* the label at a connector's end: a role name and, when given, a multiplicity */
  U.endLabel = function (end) {
    var G = U.G;
    if (!end || (!end.role && !end.multiplicity)) return null;
    var w = (end.role ? A.textWidth(end.role, 'edge-label') : 0) + (end.multiplicity ? A.textWidth(end.multiplicity, 't-data') : 0) +
      (end.role && end.multiplicity ? G.unit * 0.5 : 0);
    return { role: end.role || '', mult: end.multiplicity || '', text: (end.role ? end.role + ' ' : '') + (end.multiplicity || ''),
      w: Math.ceil(w) + G.labelPad, h: G.labelH };
  };

  /* a label of one text (a name, a keyword, a binding) */
  U.plainLabel = function (text) {
    var G = U.G;
    return { role: text, mult: '', text: text, w: Math.ceil(A.textWidth(text, 'edge-label')) + G.labelPad, h: G.labelH };
  };

  /* the <text> of a label placed by the layout (lab.at) */
  U.labelEl = function (lab, cls) {
    var G = U.G;
    var cx = lab.at.x + lab.at.w / 2, cy = lab.at.y + lab.at.h / 2;
    var kids = [];
    if (lab.role) kids.push(A.el('tspan', {}, [lab.role]));
    if (lab.mult) kids.push(A.el('tspan', { 'class': 't-data', dx: lab.role ? G.unit * 0.5 : 0 }, [lab.mult]));
    return A.el('text', { 'class': cls || 'edge-label', x: cx, y: cy, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, kids);
  };

  /* A connector: the line (dashed or not, hopping as `r.hops` says), the end shapes `r.shape.from` and
     `r.shape.to`, and its labels. r.route: the points; r.labels: {from, to, center}, each placed. Returns
     the elements to highlight together, the connector's group first. */
  U.drawConnector = function (layer, r) {
    var pts = r.route, n = pts.length;
    var g = A.edgePath(pts, { dashed: r.dashed, hops: r.hops });
    U.endShape(g, pts[0], U.unitVector(pts[0], pts[1]), r.shape.from);
    U.endShape(g, pts[n - 1], U.unitVector(pts[n - 1], pts[n - 2]), r.shape.to);
    layer.insertBefore(g, layer.firstChild);
    var els = [g];
    ['from', 'to', 'center'].forEach(function (k) {
      var lab = r.labels[k];
      if (!lab || !lab.at) return;
      var el = U.labelEl(lab);
      layer.appendChild(el);
      els.push(el);
    });
    return els;
  };

  /* ---------- member rows ---------- */

  /* A row of a node body: {lead, name, rest, isStatic, italic}: the lead (a visibility mark) and the
     name in the member role, the rest (a type, a value) in the data face. */
  U.rowWidth = function (row) {
    var cls = 't-member' + (row.italic ? ' t-italic' : '') + (row.isStatic ? ' t-static' : '');
    return A.textWidth(row.lead + row.name, cls) + (row.rest ? A.textWidth(row.rest, 't-data' + (row.italic ? ' t-italic' : '')) + U.G.unit * 0.25 : 0);
  };

  U.memberText = function (x, cy, row) {
    var cls = 't-member' + (row.italic ? ' t-italic' : '') + (row.isStatic ? ' t-static' : '');
    var kids = [A.el('tspan', {}, [row.lead + row.name])];
    if (row.rest) kids.push(A.el('tspan', { 'class': 't-data' + (row.italic ? ' t-italic' : ''), dx: U.G.unit * 0.25 }, [row.rest]));
    return A.el('text', { 'class': cls, x: x, y: cy, 'dominant-baseline': 'central' }, kids);
  };

  /* ---------- the header-band node ---------- */

  /* The size of a header-band node whose `title`, `chips`, `rows` (null: an empty half row) and
     `rowHeights` are set: wide enough for the band and the widest row, high as its rows. Sets n.w, n.h and
     clears the room around it (padTop, padR, generic). */
  U.sizeNode = function (n) {
    var bodyW = 0;
    n.rows.forEach(function (r) { if (r) bodyW = Math.max(bodyW, U.rowWidth(r)); });
    bodyW += 2 * HM.padX;
    n.w = Math.ceil(Math.max(U.G.minWidth, A.headerNodeMinWidth(n.title, n.chips), bodyW));
    n.h = A.headerNodeHeight(n.rows.length, n.rowHeights);
    n.padTop = 0; n.padR = 0; n.generic = 0;
  };

  /* A header-band node: the shared header-band primitive with the title (underlined when
     n.titleUnderline: an instance; italic when n.titleItalic: an abstract class), the stereotype chips
     in the band, the rows with their text and the rules between compartments (n.rules). The node's
     group is appended to `layer` and kept as n.el. */
  U.drawNode = function (layer, n) {
    var g = A.headerNode({ x: n.x, y: n.y, width: n.w, rows: n.rows.length, rowHeights: n.rowHeights, rules: n.rules,
      group: n.group, title: n.title, italic: !!n.titleItalic, ungrouped: n.ungrouped, bandChips: n.chips });
    if (n.titleUnderline) g.querySelector('.band-text').classList.add('t-static');
    n.rows.forEach(function (row, i) {
      if (row) g.rowEls[i].appendChild(U.memberText(n.x + HM.padX, A.headerRowCenter(n.y, i, n.rowHeights), row));
    });
    layer.appendChild(g);
    n.el = g;
    return g;
  };

  /* ---------- the folder-tab node (a package) ---------- */

  /* The outline of a folder: a tab at the top left, one band high and `tab` wide, over a body that
     spans the width. Corners round with --radius; the tab meets the body at a sharp inside corner. */
  function folderPath(x, y, w, h, tab, r) {
    var band = HM.band, rb = Math.min(r, Math.max(0, w - tab), h - band);
    return 'M' + x + ' ' + (y + r) + 'Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y +
      'H' + (x + tab - r) + 'Q' + (x + tab) + ' ' + y + ' ' + (x + tab) + ' ' + (y + r) +
      'V' + (y + band) + 'H' + (x + w - rb) + 'Q' + (x + w) + ' ' + (y + band) + ' ' + (x + w) + ' ' + (y + band + rb) +
      'V' + (y + h - r) + 'Q' + (x + w) + ' ' + (y + h) + ' ' + (x + w - r) + ' ' + (y + h) +
      'H' + (x + r) + 'Q' + x + ' ' + (y + h) + ' ' + x + ' ' + (y + h - r) + 'Z';
  }

  function tabPath(x, y, tab, r) {
    return 'M' + x + ' ' + (y + HM.band) + 'V' + (y + r) + 'Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y +
      'H' + (x + tab - r) + 'Q' + (x + tab) + ' ' + y + ' ' + (x + tab) + ' ' + (y + r) + 'V' + (y + HM.band) + 'Z';
  }

  /* The width of the tab for a title and chips: the header band's own rule (title inset, title, title
     inset, chips, chip inset), the title measured in the tab text role, one step smaller than a band
     title. A tab with no chip is the title between two title insets. */
  U.tabWidth = function (title, chips) {
    var w = A.textWidth(title, 't-tab') + 2 * HM.titleInset;
    if (chips && chips.length) {
      var chipsW = 0;
      chips.forEach(function (c, i) { chipsW += A.chipWidth(c.label) + (i ? CM.gap : 0); });
      w += chipsW + HM.chipInset;
    }
    return Math.ceil(w);
  };

  /* The height of a folder with `rowHeights` of member rows (none: a short body of half a row). */
  U.folderHeight = function (rowHeights) {
    var total = 0;
    rowHeights.forEach(function (h) { total += h; });
    return HM.band + (rowHeights.length ? total : HM.row / 2) + HM.padBottom;
  };

  /* A folder at n.x, n.y, n.w wide and n.h high with the tab n.tab: the body in the node role or, for a
     package that holds packages (n.container), in the zone role; the tab in the band role with the
     title and the stereotype chips; the member rows (n.rows, n.rowHeights) one under the tab and the
     next. n.group: the group role; n.ungrouped: dashed outline. The node's group is appended to
     `layer` and kept as n.el. */
  U.drawFolder = function (layer, n) {
    var r = A.px('--radius'), dash = n.ungrouped ? ' ungrouped' : '';
    var g = A.el('g', { 'class': 'fnode node-group ' + A.groupClass(n.group) });
    var body = folderPath(n.x, n.y, n.w, n.h, n.tab, r);
    g.appendChild(A.el('path', { 'class': (n.container ? 'zone' : 'node') + dash, d: body }));
    g.appendChild(A.el('path', { 'class': 'band', d: tabPath(n.x, n.y, n.tab, r) }));
    g.appendChild(A.el('line', { 'class': 'node-rule', x1: n.x, x2: n.x + n.tab, y1: n.y + HM.band, y2: n.y + HM.band }));
    var top = n.y + HM.band;
    n.rows.forEach(function (row, i) {
      var rh = n.rowHeights[i];
      var kids = [A.el('rect', { 'class': 'row-bg', x: n.x + 1, y: top + (i ? 0.5 : 0.75), width: n.w - 2, height: rh - (i ? 0.5 : 0.75) })];
      if (i) kids.push(A.el('line', { 'class': 'row-sep', x1: n.x + HM.chipInset, x2: n.x + n.w - HM.chipInset, y1: top, y2: top }));
      var rowEl = A.el('g', { 'class': 'row' }, kids);
      rowEl.appendChild(U.memberText(n.x + HM.padX, top + rh / 2, row));
      g.appendChild(rowEl);
      top += rh;
    });
    g.appendChild(A.el('path', { 'class': 'node-outline' + dash, d: body }));
    g.appendChild(A.text(n.x + HM.titleInset, n.y + HM.band / 2 + 0.5, n.title, 't-tab band-text', { 'text-anchor': 'start' }));
    var chipsW = 0;
    n.chips.forEach(function (c, k) { chipsW += A.chipWidth(c.label) + (k ? CM.gap : 0); });
    var cx = n.x + n.tab - HM.chipInset - chipsW;
    n.chips.forEach(function (c) {
      g.appendChild(A.chip(cx, n.y + HM.band / 2, c.label, c.role));
      cx += A.chipWidth(c.label) + CM.gap;
    });
    layer.appendChild(g);
    n.el = g;
    return g;
  };

  /* ---------- samples for the legend cards ---------- */

  U.sampleSvg = function (w, h, children) {
    return A.el('svg', { width: w, height: h, viewBox: '0 0 ' + w + ' ' + h, 'aria-hidden': 'true' }, children);
  };

  /* a connector drawn with the drawing's own functions: its line (dashed or not), its end shape at the
     right, beside the edge of a node */
  U.lineSample = function (shape, dashed) {
    var G = U.G, w = G.sampleW, h = G.sampleH, tx = w - G.unit, s = A.px('--stroke');
    var g = A.el('g');
    g.appendChild(A.el('line', { 'class': 'edge' + (dashed ? ' dashed' : ''), x1: 0, y1: h / 2, x2: tx, y2: h / 2 }));
    U.endShape(g, { x: tx, y: h / 2 }, { x: -1, y: 0 }, shape);
    return U.sampleSvg(w, h, [g, A.el('rect', { 'class': 'node g-neutral', x: tx, y: s, width: G.unit, height: h - 2 * s, rx: A.smallRadius() })]);
  };

  U.textSample = function (w, text, cls, extra) {
    return U.sampleSvg(w, CM.height, [A.text(0, CM.height / 2, text, cls, extra)]);
  };

  U.chipSample = function (label, w) {
    return U.sampleSvg(w, CM.height, [A.chip(0, CM.height / 2, label, 'stereotype')]);
  };

  /* a package's zone (a colored area), or, dashed, the neutral node outside every package */
  U.swatch = function (group, dashed) {
    var G = U.G, w = Math.round(G.unit * 4), h = Math.round(G.unit * 2.5), s = A.px('--stroke');
    if (dashed) {
      return U.sampleSvg(w, h, [A.el('rect', { 'class': 'node ungrouped g-neutral', x: s, y: s, width: w - 2 * s, height: h - 2 * s, rx: A.smallRadius() })]);
    }
    return U.sampleSvg(w, h, [A.zone({ x: s, y: s, width: w - 2 * s, height: h - 2 * s, group: group })]);
  };

  /* a small folder in a group's role */
  U.folderSample = function (group) {
    var G = U.G, w = Math.round(G.unit * 4), h = Math.round(G.unit * 2.75), s = A.px('--stroke');
    var r = Math.min(A.smallRadius(), h / 4), tab = Math.round(w * 0.45), band = Math.round(h * 0.38);
    var x = s, y = s, bw = w - 2 * s, bh = h - 2 * s;
    var d = 'M' + x + ' ' + (y + r) + 'Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y + 'H' + (x + tab - r) + 'Q' + (x + tab) + ' ' + y + ' ' + (x + tab) + ' ' + (y + r) +
      'V' + (y + band) + 'H' + (x + bw - r) + 'Q' + (x + bw) + ' ' + (y + band) + ' ' + (x + bw) + ' ' + (y + band + r) +
      'V' + (y + bh - r) + 'Q' + (x + bw) + ' ' + (y + bh) + ' ' + (x + bw - r) + ' ' + (y + bh) + 'H' + (x + r) + 'Q' + x + ' ' + (y + bh) + ' ' + x + ' ' + (y + bh - r) + 'Z';
    var tabD = 'M' + x + ' ' + (y + band) + 'V' + (y + r) + 'Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y + 'H' + (x + tab - r) + 'Q' + (x + tab) + ' ' + y + ' ' + (x + tab) + ' ' + (y + r) + 'V' + (y + band) + 'Z';
    return U.sampleSvg(w, h, [A.el('g', { 'class': A.groupClass(group) }, [
      A.el('path', { 'class': 'node', d: d }), A.el('path', { 'class': 'band', d: tabD }), A.el('path', { 'class': 'node-outline', d: d })])]);
  };
})();
