/* UML package diagram renderer: draws a package diagram model as folder-tab nodes (a tab holding the
   name and the stereotype chips over a body that lists the package's members), a package that holds
   packages as a larger folder whose body, in the zone ground of its group, contains its children, joined
   by dependencies (dashed connectors with an open arrowhead at the supplier and the keyword «import»,
   «access» or «merge» at the middle), with the legend, the counts line and the dependencies table.
   Registered with the page core (shared/page/core.js) under the type "uml-package-diagram"; the layout
   and the notation it shares with the other UML types are in shared/uml/ (uml-layout.js and
   uml-notation.js, loaded before this file). The page offers two levels of detail (members shown, names
   only) as a view option, which draws the diagram again. No style value lives here: roles come from
   page.css classes and the shared primitives, sizes derive from the theme's geometry tokens. */
(function () {
  'use strict';
  var A = window.Artifact;
  var U = A.uml;

  var HM = A.headerMetrics; /* proportions of the header-band node: owned by the shared primitive */
  var ZM = A.zoneMetrics;
  var G = null;             /* geometry of this drawing, from the theme's tokens (see U.geometry) */
  var plural = U.plural, guillemets = U.guillemets;

  var DETAILS = ['all', 'names'];
  var KIND_ORDER = ['import', 'access', 'merge', 'dependency'];
  var KIND_LEGEND = {
    'import': guillemets('import') + ': the client uses the public elements of the supplier',
    access: guillemets('access') + ': as import, the elements stay private to the client',
    merge: guillemets('merge') + ': the client\'s elements extend the supplier\'s',
    dependency: 'Dependency: the client uses the supplier'
  };
  var KIND_NOUNS = { 'import': ['import', 'imports'], access: ['access', 'accesses'], merge: ['merge', 'merges'], dependency: ['plain', 'plain'] };
  var MEMBER_KEYWORD = { 'interface': guillemets('interface'), enumeration: guillemets('enumeration') };

  /* ---------- model preparation ---------- */

  function memberRows(pkg, view) {
    if (view.detail === 'names') return [];
    return (pkg.members || []).map(function (m) {
      return { lead: '', name: m.name, rest: MEMBER_KEYWORD[m.kind] || '', isStatic: false, italic: false };
    });
  }

  /* Every package is an entity with the folder's fields; one that holds packages is a zone (a compound
     node of the layout, and the end of a dependency like a node), one that holds none a node. */
  function prepare(model, view) {
    var packages = model.packages, kids = {}, ents = {}, nodes = [], zones = [], rootItems = [];
    packages.forEach(function (g) { if (g.parent) kids[g.parent] = (kids[g.parent] || 0) + 1; });
    packages.forEach(function (g, i) {
      var rows = memberRows(g, view);
      var chips = (g.stereotypes || []).map(function (s) { return { label: guillemets(s), role: 'stereotype' }; });
      var e = { id: g.id, key: 'pkg:' + g.id, src: g, title: g.name, label: g.name, group: i + 1, ungrouped: false,
        chips: chips, rows: rows, rowHeights: rows.map(function () { return HM.row; }), container: !!kids[g.id],
        padTop: 0, padR: 0, generic: 0, loop: null, zone: null, parent: null, depth: 0 };
      ents[g.id] = e;
      if (e.container) { e.isZone = true; e.nodes = []; e.items = []; zones.push(e); } else { e.name = e.key; nodes.push(e); }
    });
    packages.forEach(function (g) {
      var e = ents[g.id], parent = g.parent ? ents[g.parent] : null;
      e.parent = parent;
      if (e.container) { e.parent = parent; } else { e.zone = parent; }
      if (parent) { parent.items.push(e); if (!e.container) parent.nodes.push(e); } else rootItems.push(e);
    });
    zones.forEach(function (z) { var d = 0, q = z.parent; while (q) { d++; q = q.parent; } z.depth = d; });
    var zoneById = {};
    zones.forEach(function (z) { zoneById[z.id] = z; });
    var rels = (model.dependencies || []).map(function (d, i) { return prepareDependency(d, 'r' + i, ents); });
    return { nodes: nodes, rels: rels, zones: zones, zoneById: zoneById, ents: ents, items: rootItems };
  }

  /* A dependency: dashed, an open arrowhead at the supplier, the keyword of an import, access or merge
     as the label (a plain dependency its own label, when it has one). */
  function prepareDependency(d, id, ents) {
    var u = G.unit, text = null;
    if (d.kind !== 'dependency') text = guillemets(d.kind) + (d.label ? ' ' + d.label : '');
    else if (d.label) text = d.label;
    return { id: id, src: d, kind: d.kind, from: ents[d.from], to: ents[d.to], self: false,
      shape: { from: null, to: 'arrow' }, dashed: true, reach: { from: 0, to: u * U.REACH.arrow },
      labels: { from: null, to: null, center: text ? U.plainLabel(text) : null } };
  }

  /* ---------- measuring a package ---------- */

  function rowsWidth(e) {
    var w = 0;
    e.rows.forEach(function (r) { w = Math.max(w, U.rowWidth(r)); });
    return e.rows.length ? Math.ceil(w + 2 * HM.padX) : 0;
  }

  /* A package that holds none: the folder's size. One that holds packages: what the layout reserves
     above its children (the tab, the member rows, a gap), its least width, and the boxes connectors keep
     off. */
  function measure(e) {
    e.tab = U.tabWidth(e.title, e.chips);
    var rw = rowsWidth(e), least = Math.ceil(Math.max(G.minWidth, e.tab + HM.chipInset, rw));
    var rowsH = 0;
    e.rowHeights.forEach(function (h) { rowsH += h; });
    if (!e.container) {
      e.w = least;
      e.h = U.folderHeight(e.rowHeights);
      return;
    }
    e.headRoom = HM.band + rowsH + (e.rows.length ? HM.padBottom : 0) + Math.round(ZM.pad / 2);
    e.minW = least;
    e.avoid = [{ x: 0, y: 0, w: e.tab, h: HM.band }];
    if (e.rows.length) e.avoid.push({ x: 0, y: HM.band, w: rw, h: rowsH });
  }

  /* ---------- the cards under the drawing ---------- */

  function usage(p, model) {
    var u = { kinds: {}, stereo: [], stereoSeen: {}, keywords: [], keywordSeen: {} };
    p.rels.forEach(function (r) { u.kinds[r.kind] = true; });
    Object.keys(p.ents).forEach(function (id) {
      var e = p.ents[id];
      e.chips.forEach(function (c) { if (!u.stereoSeen[c.label]) { u.stereoSeen[c.label] = true; u.stereo.push(c.label); } });
      e.rows.forEach(function (r) { if (r.rest && !u.keywordSeen[r.rest]) { u.keywordSeen[r.rest] = true; u.keywords.push(r.rest); } });
    });
    return u;
  }

  function buildLegend(p, model) {
    var u = usage(p, model);
    var sections = [
      { title: 'Packages', items: [] }, { title: 'Dependencies', items: [] },
      { title: 'Stereotypes', items: [] }, { title: 'Members', items: [] }
    ];
    sections[0].items.push({ sample: U.folderSample(1), text: 'A package: its name in the tab, its members and the packages it holds in the body' });
    KIND_ORDER.forEach(function (k) {
      if (u.kinds[k]) sections[1].items.push({ sample: U.lineSample('arrow', true), text: KIND_LEGEND[k] });
    });
    var chipW = 0;
    u.stereo.forEach(function (l) { chipW = Math.max(chipW, A.chipWidth(l)); });
    u.stereo.forEach(function (l) { sections[2].items.push({ sample: U.chipSample(l, chipW), text: 'Stereotype' }); });
    u.keywords.forEach(function (k) {
      var w = Math.ceil(A.textWidth(k, 't-data')) + 2;
      sections[3].items.push({ sample: U.textSample(w, k, 't-data'), text: k === MEMBER_KEYWORD['interface'] ? 'A member that is an interface' : 'A member that is an enumeration' });
    });
    A.legend(sections);
  }

  function path(e) {
    var names = [];
    for (var q = e; q; q = q.parent) names.unshift(q.title);
    return names.join(' / ');
  }

  function buildDetails(p) {
    var rows = p.rels.map(function (r) {
      var word = r.kind === 'dependency' ? 'dependency' : guillemets(r.kind);
      return { link: r.id, cells: [
        A.h('span', 'cell-data', path(r.from)),
        A.h('span', '', [A.h('span', 'pill dashed', word), r.src.label ? ' (' + r.src.label + ')' : '']),
        A.h('span', 'cell-data', path(r.to))
      ] };
    });
    A.details({ title: 'Dependencies', columns: ['Client', 'Kind', 'Supplier'], rows: rows });
  }

  function buildCounts(p, model) {
    var members = 0;
    model.packages.forEach(function (g) { members += (g.members || []).length; });
    var parts = [plural(model.packages.length, 'package')];
    if (members) parts.push(plural(members, 'member'));
    var counts = {}, per = [];
    p.rels.forEach(function (r) { counts[r.kind] = (counts[r.kind] || 0) + 1; });
    KIND_ORDER.forEach(function (k) { if (counts[k]) per.push(counts[k] + ' ' + KIND_NOUNS[k][counts[k] === 1 ? 0 : 1]); });
    parts.push(p.rels.length + (p.rels.length === 1 ? ' dependency' : ' dependencies') + (per.length ? ' (' + per.join(', ') + ')' : ''));
    A.setMeta(parts.join(' · '));
  }

  /* ---------- view options ---------- */

  function registerOptions() {
    A.viewOptions([
      { id: 'detail', type: 'choice', label: 'Detail', value: 'all', options: [
        { value: 'all', label: 'Members shown', key: '1' },
        { value: 'names', label: 'Package names', key: '2' }] }
    ]);
  }

  /* ---------- entry point ---------- */

  /* The fallback: a model with no nesting is a flat grid with connectors through its gutters; one with
     nesting is the nested grid. */
  function grid(p) { return p.zones.length ? U.layoutGridNested(p) : U.layoutGrid(p); }

  function layout(p) {
    if (typeof window.ELK === 'function') {
      return U.layoutElk(p).catch(function (err) {
        A.notice('Automatic layout failed (' + (err && err.message ? err.message : err) + '), so the packages are arranged in a grid that keeps their nesting.');
        return grid(p);
      });
    }
    A.notice('Automatic layout was unavailable (the layout library could not be loaded), so the packages are arranged in a grid that keeps their nesting and the dependencies are simple paths.');
    return Promise.resolve(grid(p));
  }

  A.register('uml-package-diagram', function (model, mount) {
    G = U.geometry();
    registerOptions();
    var view = { detail: DETAILS.indexOf(A.view.detail) >= 0 ? A.view.detail : 'all' };
    var p = prepare(model, view);
    U.last = p; /* the laid-out drawing, for the structural checks of the tests */
    var all = p.zones.concat(p.nodes);
    all.forEach(measure);

    return layout(p).then(function (size) {
      var folderLayer = A.el('g', { 'class': 'folders' });
      var edgeLayer = A.el('g', { 'class': 'edges' });
      var leafLayer = A.el('g', { 'class': 'leaves' });
      p.rels.forEach(function (r) { r.route = r.points; });
      U.placeLabels(p);
      var hopSets = A.hops(p.rels.map(function (r) { return r.route; }));
      p.rels.forEach(function (r, i) { r.hops = hopSets[i]; });

      /* the packages that hold packages first, outer before inner, then the connectors above them, then
         the packages that hold none: a connector between two nested packages shows over the ground of
         the package that holds them */
      p.zones.slice().sort(function (a, b) { return a.depth - b.depth; }).forEach(function (z) { U.drawFolder(folderLayer, z); });
      p.nodes.forEach(function (n) { U.drawFolder(leafLayer, n); });
      var linked = {};
      p.rels.forEach(function (r) { linked[r.id] = U.drawConnector(edgeLayer, r); });

      var maxX = size.width, maxY = size.height;
      all.forEach(function (e) {
        maxX = Math.max(maxX, e.x + e.w + G.margin);
        maxY = Math.max(maxY, e.y + e.h + G.margin);
      });
      p.rels.forEach(function (r) {
        var lab = r.labels.center;
        if (lab && lab.at) { maxX = Math.max(maxX, lab.at.x + lab.at.w + G.margin); maxY = Math.max(maxY, lab.at.y + lab.at.h + G.margin); }
      });
      var w = Math.ceil(maxX), h = Math.ceil(maxY);
      var svg = A.el('svg', { xmlns: 'http://www.w3.org/2000/svg', width: w, height: h, viewBox: '0 0 ' + w + ' ' + h,
        role: 'img', 'aria-label': model.title + ': UML package diagram' }, [folderLayer, edgeLayer, leafLayer]);
      mount.appendChild(svg);

      /* linked highlighting: packages, dependencies, and the dependencies table */
      A.hl.bind(svg);
      all.forEach(function (e) { A.hl.node(e.key, e.el, { label: 'Package ' + path(e) + ': pin its highlight' }); });
      p.rels.forEach(function (r) { A.hl.link(r.id, r.from.key, r.to.key, { els: linked[r.id] }); });
      buildCounts(p, model);
      buildLegend(p, model);
      if (p.rels.length) buildDetails(p); else A.details({ title: 'Dependencies', columns: [], rows: [] });
    });
  });
})();
