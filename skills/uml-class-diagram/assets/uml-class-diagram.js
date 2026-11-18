/* UML class diagram renderer: draws a class diagram model as header-band class nodes (name and
   stereotype chips in the band, attributes and operations below), one zone per package, joined by
   connectors with the UML notation ends, with the legend, the counts line and the relationships table.
   Registered with the page core (shared/page/core.js) under the type "uml-class-diagram"; the layout
   is in uml-class-diagram-layout.js, loaded before this file. The page offers three levels of detail
   and a switch for dependencies (view options), each of which draws the diagram again. No style value
   lives here: roles come from page.css classes and the shared primitives, sizes derive from the
   theme's geometry tokens. */
(function () {
  'use strict';
  var A = window.Artifact;
  var U = A.uml;

  var HM = A.headerMetrics; /* proportions of the header-band node: owned by the shared primitive */
  var CM = A.chipMetrics;
  var G = null;             /* geometry of this drawing, from the theme's tokens (see U.geometry) */

  var VIS = { 'public': '+', 'protected': '#', 'private': '-', 'package': '~' };
  var KIND_WORDS = { generalization: 'specializes', realization: 'realizes', composition: 'composes',
    aggregation: 'aggregates', association: 'is associated with', dependency: 'depends on' };
  var KIND_NAMES = { generalization: 'generalization', realization: 'realization', composition: 'composition',
    aggregation: 'aggregation', association: 'association', dependency: 'dependency' };
  var KIND_PLURALS = { generalization: 'generalizations', realization: 'realizations', composition: 'compositions',
    aggregation: 'aggregations', association: 'associations', dependency: 'dependencies' };
  var KIND_ORDER = ['generalization', 'realization', 'composition', 'aggregation', 'association', 'dependency'];
  var KIND_LEGEND = {
    generalization: 'Generalization: the child specializes its parent',
    realization: 'Realization: the class implements the interface',
    composition: 'Composition: the whole owns its part',
    aggregation: 'Aggregation: the whole refers to its part',
    association: 'Association: an open arrowhead marks a navigable end',
    dependency: 'Dependency: the client uses the supplier'
  };
  var DETAILS = ['all', 'public', 'names'];

  function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }
  function guillemets(s) { return '«' + s + '»'; }

  /* ---------- multiplicity in words ---------- */

  function multWords(m) {
    if (m === '1') return 'exactly one';
    if (m === '0..1') return 'zero or one';
    if (m === '*' || m === '0..*') return 'zero or more';
    if (m === '1..*') return 'one or more';
    var r = /^(\d+)\.\.\*$/.exec(m);
    if (r) return r[1] + ' or more';
    r = /^(\d+)\.\.(\d+)$/.exec(m);
    if (r) return r[1] + ' to ' + r[2];
    return /^\d+$/.test(m) ? 'exactly ' + m : m;
  }

  /* ---------- model preparation ---------- */

  function memberRows(c, detail) {
    var shown = function (m) { return detail === 'all' || !m.visibility || m.visibility === 'public'; };
    var attrs = (c.attributes || []).filter(shown).map(function (a) {
      var rest = (a.type ? ': ' + a.type : '') + (a.multiplicity ? ' [' + a.multiplicity + ']' : '') +
        (a.default ? ' = ' + a.default : '') + (a.readOnly ? ' {readOnly}' : '');
      return { lead: a.visibility ? VIS[a.visibility] + ' ' : '', name: a.name, rest: rest, isStatic: !!a.static, italic: false };
    });
    var ops = (c.operations || []).filter(shown).map(function (o) {
      var params = (o.params || []).map(function (p) { return p.name + (p.type ? ': ' + p.type : ''); }).join(', ');
      var rest = '(' + params + ')' + (o.returns ? ': ' + o.returns : '');
      return { lead: (o.visibility ? VIS[o.visibility] + ' ' : '') + (o.constructor === true ? guillemets('create') + ' ' : ''),
        name: o.name, rest: rest, isStatic: !!o.static, italic: !!o.abstract || c.kind === 'interface' };
    });
    return { attrs: attrs, ops: ops };
  }

  function prepare(model, view) {
    var packages = model.packages || [], hasPackages = packages.length > 0;
    var groupNo = {}, zoneById = {}, zones = [];
    packages.forEach(function (g, i) { groupNo[g.id] = i + 1; });
    var nodes = model.classifiers.map(function (c) {
      var pid = c.package && groupNo[c.package] ? c.package : null;
      var group = pid ? groupNo[pid] : (hasPackages ? 'neutral' : 0);
      var chips = [];
      if (c.kind === 'interface') chips.push({ label: guillemets('interface'), role: 'stereotype' });
      if (c.kind === 'enumeration') chips.push({ label: guillemets('enumeration'), role: 'stereotype' });
      (c.stereotypes || []).forEach(function (s) { chips.push({ label: guillemets(s), role: 'stereotype' }); });
      var node = { name: c.name, src: c, kind: c.kind, pid: pid, group: group, ungrouped: hasPackages && !pid, zone: null,
        chips: chips, params: (c.typeParams || []).join(', '), padTop: 0, padR: 0, generic: 0, loop: null };
      if (view.detail === 'names') node.members = { attrs: [], ops: [] };
      else if (c.kind === 'enumeration') node.members = { attrs: [], ops: [] };
      else node.members = memberRows(c, view.detail);
      node.lits = c.kind === 'enumeration' && view.detail !== 'names' ? (c.literals || []) : [];
      return node;
    });
    var byName = {};
    nodes.forEach(function (n) { byName[n.name] = n; });
    packages.forEach(function (g, i) {
      var inside = nodes.filter(function (n) { return n.pid === g.id; });
      if (!inside.length) return;
      var z = { id: g.id, label: g.label || g.id, group: i + 1, nodes: inside };
      inside.forEach(function (n) { n.zone = z; });
      zones.push(z);
      zoneById[g.id] = z;
    });
    var rels = [];
    (model.relationships || []).forEach(function (r) {
      if (r.kind === 'dependency' && !view.deps) return;
      rels.push(prepareRel(r, 'r' + rels.length, byName));
    });
    return { nodes: nodes, rels: rels, zones: zones, zoneById: zoneById, byName: byName, hasPackages: hasPackages };
  }

  function endLabel(end) {
    if (!end || (!end.role && !end.multiplicity)) return null;
    var w = (end.role ? A.textWidth(end.role, 'edge-label') : 0) + (end.multiplicity ? A.textWidth(end.multiplicity, 't-data') : 0) +
      (end.role && end.multiplicity ? G.unit * 0.5 : 0);
    return { role: end.role || '', mult: end.multiplicity || '', text: (end.role ? end.role + ' ' : '') + (end.multiplicity || ''),
      w: Math.ceil(w) + G.labelPad, h: G.labelH };
  }

  function plainLabel(text) {
    return { role: text, mult: '', text: text, w: Math.ceil(A.textWidth(text, 'edge-label')) + G.labelPad, h: G.labelH };
  }

  /* The end shapes and labels of a relationship, derived from its kind and its ends. */
  var REACH = { triangle: 1, diamond: 1.6, hollowDiamond: 1.6, arrow: 1 };
  function prepareRel(r, id, byName) {
    var shape = { from: null, to: null };
    var fromEnd = r.fromEnd || null, toEnd = r.toEnd || null;
    if (r.kind === 'generalization' || r.kind === 'realization') shape.to = 'triangle';
    else if (r.kind === 'composition') shape.from = 'diamond';
    else if (r.kind === 'aggregation') shape.from = 'hollowDiamond';
    if (r.kind === 'dependency') shape.to = 'arrow';
    if (r.kind === 'association' || r.kind === 'composition' || r.kind === 'aggregation') {
      if (!shape.from && fromEnd && fromEnd.navigable) shape.from = 'arrow';
      if (toEnd && toEnd.navigable) shape.to = 'arrow';
    }
    var center = null;
    if (r.bindings && Object.keys(r.bindings).length) {
      center = plainLabel('<' + Object.keys(r.bindings).map(function (k) { return k + ' → ' + r.bindings[k]; }).join(', ') + '>');
    } else if (r.label) center = plainLabel(r.label);
    var u = G.unit;
    return { id: id, src: r, kind: r.kind, from: byName[r.from], to: byName[r.to], self: r.from === r.to,
      shape: shape, dashed: r.kind === 'realization' || r.kind === 'dependency',
      reach: { from: shape.from ? u * REACH[shape.from] : 0, to: shape.to ? u * REACH[shape.to] : 0 },
      labels: { from: endLabel(fromEnd), to: endLabel(toEnd), center: center } };
  }

  /* ---------- measuring a class ---------- */

  function rowWidth(row) {
    var cls = 't-member' + (row.italic ? ' t-italic' : '') + (row.isStatic ? ' t-static' : '');
    return A.textWidth(row.lead + row.name, cls) + (row.rest ? A.textWidth(row.rest, 't-data' + (row.italic ? ' t-italic' : '')) + G.unit * 0.25 : 0);
  }

  /* The body of a class as a list of rows: the attributes, a half row when a compartment is empty, the
     operations; the index above which the rule between the compartments is drawn; each row's height. */
  function buildBody(n) {
    var rows = [], heights = [], rules = [], half = HM.row / 2;
    function addRow(r, h) { rows.push(r); heights.push(h); }
    if (n.lits.length) {
      n.lits.forEach(function (l) { addRow({ lead: '', name: l, rest: '', isStatic: false, italic: false }, HM.row); });
    } else {
      var a = n.members.attrs, o = n.members.ops;
      if (a.length || o.length) {
        if (a.length) a.forEach(function (r) { addRow(r, HM.row); }); else addRow(null, half);
        rules.push(rows.length);
        if (o.length) o.forEach(function (r) { addRow(r, HM.row); }); else addRow(null, half);
      }
    }
    n.rows = rows; n.rowHeights = heights; n.rules = rules;
  }

  function measureNode(n) {
    buildBody(n);
    var bodyW = 0;
    n.rows.forEach(function (r) { if (r) bodyW = Math.max(bodyW, rowWidth(r)); });
    bodyW += 2 * HM.padX;
    n.w = Math.ceil(Math.max(G.minWidth, A.headerNodeMinWidth(n.name, n.chips), bodyW));
    n.h = A.headerNodeHeight(n.rows.length, n.rowHeights);
    n.padTop = 0; n.padR = 0; n.generic = 0;
    if (n.params) {
      n.genericH = CM.height;
      n.generic = Math.ceil(A.textWidth(n.params, 't-data') + 2 * CM.padX);
      n.padTop = n.genericH / 2;
      n.padR = n.genericH / 2;
    }
  }

  /* ---------- drawing ---------- */

  function endShape(g, pt, dir, shape) {
    if (!shape) return;
    var u = G.unit, half = G.half, nx = -dir.y, ny = dir.x;
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
  }

  function labelEl(lab, cls) {
    var cx = lab.at.x + lab.at.w / 2, cy = lab.at.y + lab.at.h / 2;
    var kids = [];
    if (lab.role) kids.push(A.el('tspan', {}, [lab.role]));
    if (lab.mult) kids.push(A.el('tspan', { 'class': 't-data', dx: lab.role ? G.unit * 0.5 : 0 }, [lab.mult]));
    return A.el('text', { 'class': cls || 'edge-label', x: cx, y: cy, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, kids);
  }

  function drawRelationship(layer, r) {
    var pts = r.route, n = pts.length;
    var g = A.edgePath(pts, { dashed: r.dashed, hops: r.hops });
    endShape(g, pts[0], U.unitVector(pts[0], pts[1]), r.shape.from);
    endShape(g, pts[n - 1], U.unitVector(pts[n - 1], pts[n - 2]), r.shape.to);
    layer.insertBefore(g, layer.firstChild);
    var els = [g];
    ['from', 'to', 'center'].forEach(function (k) {
      var lab = r.labels[k];
      if (!lab || !lab.at) return;
      var el = labelEl(lab);
      layer.appendChild(el);
      els.push(el);
    });
    return els;
  }

  function memberText(x, cy, row) {
    var cls = 't-member' + (row.italic ? ' t-italic' : '') + (row.isStatic ? ' t-static' : '');
    var kids = [A.el('tspan', {}, [row.lead + row.name])];
    if (row.rest) kids.push(A.el('tspan', { 'class': 't-data' + (row.italic ? ' t-italic' : ''), dx: G.unit * 0.25 }, [row.rest]));
    return A.el('text', { 'class': cls, x: x, y: cy, 'dominant-baseline': 'central' }, kids);
  }

  /* A class: the shared header-band node with the stereotype chips in its band, the compartment rule
     and, for a generic class, the dashed box of its type parameters on the band's corner. */
  function drawClass(layer, n) {
    var g = A.headerNode({ x: n.x, y: n.y, width: n.w, rows: n.rows.length, rowHeights: n.rowHeights, rules: n.rules,
      group: n.group, title: n.name, italic: n.kind === 'class' && !!n.src.abstract, ungrouped: n.ungrouped, bandChips: n.chips });
    n.rows.forEach(function (row, i) {
      if (row) g.rowEls[i].appendChild(memberText(n.x + HM.padX, A.headerRowCenter(n.y, i, n.rowHeights), row));
    });
    if (n.params) {
      var h = n.genericH, r = A.smallRadius(), x = n.x + n.w + h / 2 - n.generic, y = n.y - h / 2, dash = ' ungrouped';
      g.appendChild(A.el('rect', { 'class': 'node' + dash, x: x, y: y, width: n.generic, height: h, rx: r, ry: r }));
      g.appendChild(A.el('rect', { 'class': 'node-outline' + dash, x: x, y: y, width: n.generic, height: h, rx: r, ry: r }));
      g.appendChild(A.text(x + n.generic / 2, y + h / 2 + 0.5, n.params, 't-data', { 'text-anchor': 'middle' }));
    }
    layer.appendChild(g);
    n.el = g;
  }

  /* ---------- the cards under the drawing ---------- */

  function sampleSvg(w, h, children) {
    return A.el('svg', { width: w, height: h, viewBox: '0 0 ' + w + ' ' + h, 'aria-hidden': 'true' }, children);
  }

  /* a connector kind drawn with the drawing's own functions: its line, its end shape at the right,
     beside the edge of a class */
  function kindSample(kind) {
    var w = G.sampleW, h = G.sampleH, tx = w - G.unit, s = A.px('--stroke');
    var r = prepareRel({ kind: kind, from: 'a', to: 'b', toEnd: kind === 'association' ? { navigable: true } : {}, fromEnd: {} }, 'sample', { a: null, b: null });
    var g = A.el('g');
    var dashed = r.dashed;
    var rightShape = r.shape.to || r.shape.from;
    g.appendChild(A.el('line', { 'class': 'edge' + (dashed ? ' dashed' : ''), x1: 0, y1: h / 2, x2: tx, y2: h / 2 }));
    endShape(g, { x: tx, y: h / 2 }, { x: -1, y: 0 }, rightShape);
    return sampleSvg(w, h, [g, A.el('rect', { 'class': 'node g-neutral', x: tx, y: s, width: G.unit, height: h - 2 * s, rx: A.smallRadius() })]);
  }

  function textSample(w, text, cls, extra) {
    return sampleSvg(w, CM.height, [A.text(0, CM.height / 2, text, cls, extra)]);
  }

  function chipSample(label, w) {
    return sampleSvg(w, CM.height, [A.chip(0, CM.height / 2, label, 'stereotype')]);
  }

  function genericSample() {
    var h = CM.height, w = Math.ceil(A.textWidth('T', 't-data') + 2 * CM.padX), r = A.smallRadius(), s = A.px('--stroke');
    return sampleSvg(w + 2 * s, h + 2 * s, [
      A.el('rect', { 'class': 'node ungrouped g-neutral', x: s, y: s, width: w, height: h, rx: r, ry: r }),
      A.text(s + w / 2, s + h / 2 + 0.5, 'T', 't-data', { 'text-anchor': 'middle' })]);
  }

  function swatch(group, dashed) {
    var w = Math.round(G.unit * 4), h = Math.round(G.unit * 2.5), s = A.px('--stroke');
    if (dashed) {
      return sampleSvg(w, h, [A.el('rect', { 'class': 'node ungrouped g-neutral', x: s, y: s, width: w - 2 * s, height: h - 2 * s, rx: A.smallRadius() })]);
    }
    return sampleSvg(w, h, [A.zone({ x: s, y: s, width: w - 2 * s, height: h - 2 * s, group: group })]);
  }

  /* what the drawing uses, for the legend */
  function usage(p, view) {
    var u = { kinds: {}, vis: {}, stereo: [], stereoSeen: {}, generic: false, isStatic: false, italic: false,
      members: false, mults: false, ungrouped: false };
    p.rels.forEach(function (r) {
      u.kinds[r.kind] = true;
      if (r.labels.from || r.labels.to) u.mults = true;
    });
    p.nodes.forEach(function (n) {
      n.chips.forEach(function (c) { if (!u.stereoSeen[c.label]) { u.stereoSeen[c.label] = true; u.stereo.push(c.label); } });
      if (n.params) u.generic = true;
      if (n.ungrouped) u.ungrouped = true;
      if (n.kind === 'class' && n.src.abstract) u.italic = true;
      if (n.lits.length) u.members = true;
      n.rows.forEach(function (r) {
        if (!r) return;
        u.members = true;
        if (r.lead) u.vis[r.lead.trim().charAt(0)] = true;
        if (r.isStatic) u.isStatic = true;
        if (r.italic) u.italic = true;
      });
    });
    return u;
  }

  function buildLegend(p, view) {
    var u = usage(p, view);
    var sections = [
      { title: 'Relationship', items: [] }, { title: 'Members', items: [] }, { title: 'Stereotypes', items: [] },
      { title: 'Type parameters', items: [] }, { title: 'Multiplicity', items: [] }, { title: 'Packages', items: [] }
    ];
    KIND_ORDER.forEach(function (k) {
      if (u.kinds[k]) sections[0].items.push({ sample: kindSample(k), text: KIND_LEGEND[k] });
    });
    var memW = Math.ceil(A.textWidth('+ name', 't-member')) + 4;
    [['+', 'public'], ['#', 'protected'], ['-', 'private'], ['~', 'package']].forEach(function (v) {
      if (u.vis[v[0]]) sections[1].items.push({ sample: textSample(memW, v[0] + ' name', 't-member'), text: 'Visibility: ' + v[1] });
    });
    if (u.isStatic) sections[1].items.push({ sample: textSample(memW, 'name', 't-member t-static'), text: 'Underlined: a static member' });
    if (u.italic) sections[1].items.push({ sample: textSample(memW, 'name', 't-member t-italic'), text: 'Italic: an abstract class or operation' });
    var chipW = 0;
    u.stereo.forEach(function (l) { chipW = Math.max(chipW, A.chipWidth(l)); });
    u.stereo.forEach(function (l) {
      sections[2].items.push({ sample: chipSample(l, chipW), text: l === guillemets('interface') ? 'An interface' :
        l === guillemets('enumeration') ? 'An enumeration, its literals listed below' : 'Stereotype' });
    });
    if (u.generic) sections[3].items.push({ sample: genericSample(), text: 'Type parameters of a generic class' });
    if (u.mults) {
      var mw = Math.ceil(A.textWidth('0..*', 't-data')) + 2;
      sections[4].items.push({ sample: textSample(mw, '0..*', 't-data'), text: 'At a connector end: a role name and how many (1, 0..1, 0..*, 1..*)' });
    }
    p.zones.forEach(function (z) { sections[5].items.push({ sample: swatch(z.group, false), text: z.label }); });
    if (p.hasPackages && u.ungrouped) sections[5].items.push({ sample: swatch(0, true), text: 'Outside every package' });
    A.legend(sections);
  }

  function endWords(end) {
    if (!end || !end.multiplicity) return '';
    var w = multWords(end.multiplicity);
    return end.role ? end.role + ', ' + w : w;
  }

  function buildDetails(p) {
    var rows = p.rels.map(function (r) {
      var kind = KIND_WORDS[r.kind];
      var pill = A.h('span', 'pill' + (r.dashed ? ' dashed' : ''), kind);
      var note = '';
      if (r.src.bindings) note = ' ' + r.labels.center.text;
      else if (r.src.label) note = ' (' + r.src.label + ')';
      return { link: r.id, cells: [
        A.h('span', 'cell-data', r.from.name),
        A.h('span', '', [pill, note]),
        A.h('span', 'cell-data', r.to.name),
        endWords(r.src.fromEnd),
        endWords(r.src.toEnd)
      ] };
    });
    A.details({ title: 'Relationships', columns: ['Source', 'Relationship', 'Target', 'At source', 'At target'], rows: rows });
  }

  function buildCounts(p) {
    var parts = [];
    if (p.zones.length) parts.push(plural(p.zones.length, 'package'));
    parts.push(plural(p.nodes.length, 'classifier'));
    var counts = {}, per = [];
    p.rels.forEach(function (r) { counts[r.kind] = (counts[r.kind] || 0) + 1; });
    KIND_ORDER.forEach(function (k) { if (counts[k]) per.push(counts[k] + ' ' + (counts[k] === 1 ? KIND_NAMES[k] : KIND_PLURALS[k])); });
    parts.push(plural(p.rels.length, 'relationship') + (per.length ? ' (' + per.join(', ') + ')' : ''));
    A.setMeta(parts.join(' · '));
  }

  /* ---------- view options ---------- */

  function registerOptions(model) {
    var hasDeps = (model.relationships || []).some(function (r) { return r.kind === 'dependency'; });
    A.viewOptions([
      { id: 'detail', type: 'choice', label: 'Detail', value: 'all', options: [
        { value: 'all', label: 'All members', key: '1' },
        { value: 'public', label: 'Public members', key: '2' },
        { value: 'names', label: 'Class names', key: '3' }] },
      { id: 'deps', type: 'switch', label: 'Dependencies', value: true, key: 'd', hidden: !hasDeps }
    ]);
  }

  /* ---------- entry point ---------- */

  function layout(p) {
    if (typeof window.ELK === 'function') {
      return U.layoutElk(p).catch(function (err) {
        A.notice('Automatic layout failed (' + (err && err.message ? err.message : err) + '), so the classes are arranged in a grid.');
        return U.layoutGrid(p);
      });
    }
    A.notice('Automatic layout was unavailable (the layout library could not be loaded), so the classes are arranged by package in a grid and the connectors are simple paths.');
    return Promise.resolve(U.layoutGrid(p));
  }

  A.register('uml-class-diagram', function (model, mount) {
    G = U.geometry();
    registerOptions(model);
    var view = { detail: DETAILS.indexOf(A.view.detail) >= 0 ? A.view.detail : 'all', deps: A.view.deps !== false };
    var p = prepare(model, view);
    U.last = p; /* the laid-out drawing, for the structural checks of the tests */
    p.nodes.forEach(function (n) { measureNode(n); });
    p.rels.forEach(function (r) {
      if (!r.self) return;
      r.from.loop = r;
      var labW = Math.max(r.labels.from ? r.labels.from.w : 0, r.labels.to ? r.labels.to.w : 0);
      r.from.padR += G.loopW + (labW ? Math.ceil(labW + G.pad * 2) : 0);
    });

    return layout(p).then(function (size) {
      var zoneLayer = A.el('g', { 'class': 'zones' });
      var edgeLayer = A.el('g', { 'class': 'edges' });
      var classLayer = A.el('g', { 'class': 'classes' });
      p.rels.forEach(function (r) { r.route = r.self ? U.loopPoints(r.from) : r.points; });
      U.placeLabels(p);
      var hopSets = A.hops(p.rels.map(function (r) { return r.route; }));
      p.rels.forEach(function (r, i) { r.hops = hopSets[i]; });

      p.zones.forEach(function (z) {
        zoneLayer.appendChild(A.zone({ x: z.x, y: z.y, width: z.w, height: z.h, group: z.group, label: z.label }));
      });
      p.nodes.forEach(function (n) { drawClass(classLayer, n); });
      var linked = {};
      p.rels.forEach(function (r) { linked[r.id] = drawRelationship(edgeLayer, r); });

      var maxX = size.width, maxY = size.height;
      p.nodes.forEach(function (n) {
        maxX = Math.max(maxX, n.x + n.w + n.padR + G.margin);
        maxY = Math.max(maxY, n.y + n.h + G.margin);
      });
      p.zones.forEach(function (z) {
        maxX = Math.max(maxX, z.x + z.w + G.margin);
        maxY = Math.max(maxY, z.y + z.h + G.margin);
      });
      p.rels.forEach(function (r) {
        ['from', 'to', 'center'].forEach(function (k) {
          var lab = r.labels[k];
          if (lab && lab.at) { maxX = Math.max(maxX, lab.at.x + lab.at.w + G.margin); maxY = Math.max(maxY, lab.at.y + lab.at.h + G.margin); }
        });
      });
      var w = Math.ceil(maxX), h = Math.ceil(maxY);
      var svg = A.el('svg', { xmlns: 'http://www.w3.org/2000/svg', width: w, height: h, viewBox: '0 0 ' + w + ' ' + h,
        role: 'img', 'aria-label': model.title + ': UML class diagram' }, [zoneLayer, edgeLayer, classLayer]);
      mount.appendChild(svg);

      /* linked highlighting: classes, connectors, and the relationships table */
      A.hl.bind(svg);
      p.nodes.forEach(function (n) { A.hl.node(n.name, n.el, { label: 'Class ' + n.name + ': pin its highlight' }); });
      p.rels.forEach(function (r) { A.hl.link(r.id, r.from.name, r.to.name, { els: linked[r.id] }); });
      buildCounts(p);
      buildLegend(p, view);
      if (p.rels.length) buildDetails(p); else A.details({ title: 'Relationships', columns: [], rows: [] });
    });
  });
})();
