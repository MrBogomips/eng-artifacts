/* UML object diagram renderer: draws an object diagram model as header-band instance nodes (the title
   `name : Class` underlined and the stereotype chips in the band, one row per slot below), one zone per
   package, joined by links (solid connectors, an open arrowhead at a navigable end, role names at the ends,
   a name at the middle), with the legend, the counts line and the links table.
   Registered with the page core (shared/page/core.js) under the type "uml-object-diagram"; the layout
   and the notation it shares with the other UML types are in shared/uml/ (uml-layout.js and
   uml-notation.js, loaded before this file). The page offers two levels of detail (all slots, names
   only) as a view option, which draws the diagram again. No style value lives here: roles come from
   page.css classes and the shared primitives, sizes derive from the theme's geometry tokens. */
(function () {
  'use strict';
  var A = window.Artifact;
  var U = A.uml;

  var HM = A.headerMetrics; /* proportions of the header-band node: owned by the shared primitive */
  var CM = A.chipMetrics;
  var G = null;             /* geometry of this drawing, from the theme's tokens (see U.geometry) */
  var plural = U.plural, guillemets = U.guillemets;

  var DETAILS = ['all', 'names'];

  /* ---------- model preparation ---------- */

  function title(o) {
    if (o.literal) return o.literal + ' : ' + o['class'];
    return (o.name ? o.name + ' ' : '') + ': ' + o['class'];
  }

  function slotRows(o) {
    return (o.slots || []).map(function (s) {
      return { lead: '', name: s.name, rest: (s.type ? ': ' + s.type + ' ' : '') + '= ' + s.value, isStatic: false, italic: false };
    });
  }

  function prepare(model, view) {
    var packages = model.packages || [], hasPackages = packages.length > 0;
    var groupNo = {}, zoneById = {}, zones = [];
    packages.forEach(function (g, i) { groupNo[g.id] = i + 1; });
    var nodes = model.objects.map(function (o) {
      var pid = o.package && groupNo[o.package] ? o.package : null;
      var chips = [];
      if (o.literal) chips.push({ label: guillemets('enumeration'), role: 'stereotype' });
      (o.stereotypes || []).forEach(function (s) { chips.push({ label: guillemets(s), role: 'stereotype' }); });
      var rows = view.detail === 'names' || o.literal ? [] : slotRows(o);
      return { name: 'obj:' + o.id, id: o.id, src: o, title: title(o), titleUnderline: true, titleItalic: false,
        pid: pid, group: pid ? groupNo[pid] : (hasPackages ? 'neutral' : 0), ungrouped: hasPackages && !pid, zone: null,
        chips: chips, rows: rows, rowHeights: rows.map(function () { return HM.row; }), rules: [],
        padTop: 0, padR: 0, generic: 0, loop: null };
    });
    var byId = {};
    nodes.forEach(function (n) { byId[n.id] = n; });
    packages.forEach(function (g, i) {
      var inside = nodes.filter(function (n) { return n.pid === g.id; });
      if (!inside.length) return;
      var z = { id: g.id, label: g.label || g.id, group: i + 1, nodes: inside, parent: null };
      inside.forEach(function (n) { n.zone = z; });
      zones.push(z);
      zoneById[g.id] = z;
    });
    var rels = (model.links || []).map(function (l, i) { return prepareLink(l, 'r' + i, byId); });
    return { nodes: nodes, rels: rels, zones: zones, zoneById: zoneById, byId: byId, hasPackages: hasPackages };
  }

  /* A link: a solid connector, no mark at an end that is not navigable, an open arrowhead at one that is. */
  function prepareLink(l, id, byId) {
    var fromEnd = l.fromEnd || null, toEnd = l.toEnd || null;
    var shape = { from: fromEnd && fromEnd.navigable ? 'arrow' : null, to: toEnd && toEnd.navigable ? 'arrow' : null };
    var u = G.unit;
    var labels = { from: U.endLabel(fromEnd), to: U.endLabel(toEnd), center: l.name ? U.plainLabel(l.name) : null };
    var self = l.from === l.to;
    return { id: id, src: l, kind: 'link', from: byId[l.from], to: byId[l.to], self: self,
      stackLabels: self && !!labels.center && !!(labels.from || labels.to), /* the loop of a link with a name and a role: see U.placeLabels */
      shape: shape, dashed: false,
      reach: { from: shape.from ? u * U.REACH[shape.from] : 0, to: shape.to ? u * U.REACH[shape.to] : 0 },
      labels: labels };
  }

  /* ---------- the cards under the drawing ---------- */

  function usage(p) {
    var u = { navigable: false, stereo: [], stereoSeen: {}, ungrouped: false, literal: false, slots: false };
    p.rels.forEach(function (r) { if (r.shape.from || r.shape.to) u.navigable = true; });
    p.nodes.forEach(function (n) {
      n.chips.forEach(function (c) { if (!u.stereoSeen[c.label]) { u.stereoSeen[c.label] = true; u.stereo.push(c.label); } });
      if (n.ungrouped) u.ungrouped = true;
      if (n.src.literal) u.literal = true;
      if (n.rows.length) u.slots = true;
    });
    return u;
  }

  function slotSample() {
    var row = { lead: '', name: 'name', rest: '= value', isStatic: false, italic: false };
    return U.sampleSvg(Math.ceil(U.rowWidth(row)) + 2, CM.height, [U.memberText(0, CM.height / 2, row)]);
  }

  function buildLegend(p) {
    var u = usage(p);
    var sections = [
      { title: 'Instances', items: [] }, { title: 'Links', items: [] }, { title: 'Stereotypes', items: [] },
      { title: 'Packages', items: [] }
    ];
    var tw = Math.ceil(A.textWidth('name : Class', 't-member t-static')) + 4;
    sections[0].items.push({ sample: U.textSample(tw, 'name : Class', 't-member t-static'), text: 'An instance: its name and class, underlined; : Class when it has no name' });
    if (u.slots) sections[0].items.push({ sample: slotSample(), text: 'A slot: name = value, or name : type = value' });
    if (p.rels.length) sections[1].items.push({ sample: U.lineSample(null, false), text: 'A link between two instances' });
    if (u.navigable) sections[1].items.push({ sample: U.lineSample('arrow', false), text: 'An open arrowhead marks a navigable end' });
    var chipW = 0;
    u.stereo.forEach(function (l) { chipW = Math.max(chipW, A.chipWidth(l)); });
    u.stereo.forEach(function (l) {
      sections[2].items.push({ sample: U.chipSample(l, chipW), text: l === guillemets('enumeration') ? 'An enumeration literal' : 'Stereotype' });
    });
    p.zones.forEach(function (z) { sections[3].items.push({ sample: U.swatch(z.group, false), text: z.label }); });
    if (p.hasPackages && u.ungrouped) sections[3].items.push({ sample: U.swatch(0, true), text: 'Outside every package' });
    A.legend(sections);
  }

  function endWords(end) {
    if (!end) return '';
    var parts = [];
    if (end.role) parts.push(end.role);
    if (end.navigable) parts.push('navigable');
    return parts.join(', ');
  }

  function buildDetails(p) {
    var rows = p.rels.map(function (r) {
      return { link: r.id, cells: [
        A.h('span', 'cell-data', r.from.title),
        A.h('span', '', [A.h('span', 'pill', r.src.name || 'link')]),
        A.h('span', 'cell-data', r.to.title),
        endWords(r.src.fromEnd),
        endWords(r.src.toEnd)
      ] };
    });
    A.details({ title: 'Links', columns: ['Source', 'Link', 'Target', 'At source', 'At target'], rows: rows });
  }

  function buildCounts(p) {
    var parts = [];
    if (p.zones.length) parts.push(plural(p.zones.length, 'package'));
    parts.push(plural(p.nodes.length, 'object'));
    parts.push(plural(p.rels.length, 'link'));
    A.setMeta(parts.join(' · '));
  }

  /* ---------- view options ---------- */

  function registerOptions() {
    A.viewOptions([
      { id: 'detail', type: 'choice', label: 'Detail', value: 'all', options: [
        { value: 'all', label: 'All slots', key: '1' },
        { value: 'names', label: 'Object names', key: '2' }] }
    ]);
  }

  /* ---------- entry point ---------- */

  /* The fallback: the flat grid, then every link that runs through a zone label routed past it. */
  function grid(p) {
    var size = U.layoutGrid(p);
    U.avoidWriting(p, false);
    return size;
  }

  /* An end label of a link on the first column or row may lie left of or above the drawing: move the
     whole drawing in. */
  function keepLabelsInView(p) {
    var x = 0, y = 0;
    p.rels.forEach(function (r) {
      ['from', 'to', 'center'].forEach(function (k) {
        var lab = r.labels[k];
        if (lab && lab.at) { x = Math.min(x, lab.at.x); y = Math.min(y, lab.at.y); }
      });
    });
    if (x < 0 || y < 0) U.shiftAll(p, x < 0 ? G.pad - x : 0, y < 0 ? G.pad - y : 0);
  }

  function layout(p) {
    if (typeof window.ELK === 'function') {
      return U.layoutElk(p).catch(function (err) {
        A.notice('Automatic layout failed (' + (err && err.message ? err.message : err) + '), so the objects are arranged in a grid.');
        return grid(p);
      });
    }
    A.notice('Automatic layout was unavailable (the layout library could not be loaded), so the objects are arranged by package in a grid and the links are simple paths.');
    return Promise.resolve(grid(p));
  }

  A.register('uml-object-diagram', function (model, mount) {
    G = U.geometry();
    registerOptions();
    var view = { detail: DETAILS.indexOf(A.view.detail) >= 0 ? A.view.detail : 'all' };
    var p = prepare(model, view);
    U.last = p; /* the laid-out drawing, for the structural checks of the tests */
    p.nodes.forEach(function (n) { U.sizeNode(n); });
    p.rels.forEach(function (r) {
      if (!r.self) return;
      r.from.loop = r;
      var labW = Math.max(r.labels.from ? r.labels.from.w : 0, r.labels.to ? r.labels.to.w : 0, r.stackLabels ? r.labels.center.w : 0);
      r.from.padR += G.loopW + (labW ? Math.ceil(labW + G.pad * 2) : 0);
    });

    return layout(p).then(function (size) {
      var zoneLayer = A.el('g', { 'class': 'zones' });
      var edgeLayer = A.el('g', { 'class': 'edges' });
      var nodeLayer = A.el('g', { 'class': 'objects' });
      p.rels.forEach(function (r) { r.route = r.self ? U.loopPoints(r.from) : r.points; });
      U.placeLabels(p);
      keepLabelsInView(p);
      var hopSets = A.hops(p.rels.map(function (r) { return r.route; }));
      p.rels.forEach(function (r, i) { r.hops = hopSets[i]; });

      p.zones.forEach(function (z) {
        zoneLayer.appendChild(A.zone({ x: z.x, y: z.y, width: z.w, height: z.h, group: z.group, label: z.label }));
      });
      p.nodes.forEach(function (n) { U.drawNode(nodeLayer, n); });
      var linked = {};
      p.rels.forEach(function (r) { linked[r.id] = U.drawConnector(edgeLayer, r); });

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
        role: 'img', 'aria-label': model.title + ': UML object diagram' }, [zoneLayer, edgeLayer, nodeLayer]);
      mount.appendChild(svg);

      /* linked highlighting: objects, links, and the links table */
      A.hl.bind(svg);
      p.nodes.forEach(function (n) { A.hl.node(n.name, n.el, { label: 'Object ' + n.title + ': pin its highlight' }); });
      p.rels.forEach(function (r) { A.hl.link(r.id, r.from.name, r.to.name, { els: linked[r.id] }); });
      buildCounts(p);
      buildLegend(p);
      if (p.rels.length) buildDetails(p); else A.details({ title: 'Links', columns: [], rows: [] });
    });
  });
})();
