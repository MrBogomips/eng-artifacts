/* ERD renderer: draws an ERD model as header-band tables, one zone per group, joined by crow's foot
   connectors, with the legend and the relationships table under the drawing. Registered with the page
   core (shared/page/core.js) under the type "erd"; the layout is in erd-layout.js, loaded before this
   file. Layout is automatic: ELK `layered` with orthogonal routing when the ELK library loaded,
   otherwise a grid with simple orthogonal connectors and a notice. No style value lives here: roles
   come from page.css classes and the shared primitives, sizes derive from the theme's geometry tokens. */
(function () {
  'use strict';
  var A = window.Artifact;
  var E = A.erd;

  var HM = A.headerMetrics; /* proportions of the header-band node: owned by the shared primitive */
  var CM = A.chipMetrics;
  var G = null;             /* geometry of this drawing, from the theme's tokens (see E.geometry) */

  var CARD_WORDS = { '1': 'exactly one', '0..1': 'zero or one', '1..*': 'one or more', '0..*': 'zero or more' };
  var KEY_CHIPS = [
    { flag: 'pk', label: 'PK', role: 'primary', text: 'Primary key' },
    { flag: 'fk', label: 'FK', role: 'foreign', text: 'Foreign key' },
    { flag: 'uk', label: 'UK', role: 'unique', text: 'Unique' }
  ];

  /* ---------- model preparation ---------- */

  function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }

  function prepare(model) {
    var groups = model.groups || [], hasGroups = groups.length > 0;
    var groupNo = {}, zoneById = {}, zones = [];
    groups.forEach(function (g, i) { groupNo[g.id] = i + 1; });
    var entities = model.entities.map(function (e) {
      var rowIndex = {};
      var rows = e.columns.map(function (c, i) {
        rowIndex[c.name] = i;
        var chips = KEY_CHIPS.filter(function (k) { return c[k.flag]; });
        return { name: c.name, type: c.type, pk: !!c.pk, nullable: !!c.nullable, chips: chips };
      });
      var gid = e.group && groupNo[e.group] ? e.group : null;
      /* a group number, or the neutral role for a table outside every group when the model has groups;
         with no groups defined every band takes the accent role (group 0) */
      var group = gid ? groupNo[gid] : (hasGroups ? 'neutral' : 0);
      return { name: e.name, gid: gid, group: group, ungrouped: hasGroups && !gid, zone: null, rows: rows, rowIndex: rowIndex };
    });
    var byName = {};
    entities.forEach(function (e) { byName[e.name] = e; });
    groups.forEach(function (g, i) {
      var inside = entities.filter(function (e) { return e.gid === g.id; });
      if (!inside.length) return;
      var z = { id: g.id, label: g.label || g.id, group: i + 1, entities: inside };
      inside.forEach(function (e) { e.zone = z; });
      zones.push(z);
      zoneById[g.id] = z;
    });
    var rels = (model.relationships || []).map(function (r, i) {
      [r.from, r.to].forEach(function (n) {
        if (!byName[n]) throw new Error('the relationship ' + r.from + ' to ' + r.to + ' names an entity that is not in the model: "' + n + '"');
      });
      return { id: 'r' + i, from: byName[r.from], to: byName[r.to], fromCard: r.fromCard, toCard: r.toCard,
        kind: r.kind || 'referenced', label: r.label || '', self: r.from === r.to, columns: r.columns || null };
    });
    return { entities: entities, rels: rels, zones: zones, zoneById: zoneById, byName: byName, hasGroups: hasGroups };
  }

  /* Width of a table: the band's title, or its widest row (chips, name, the nullable marker, type).
     The chips take one column shared by every row, so the names line up. */
  function measureEntity(e) {
    var chipsW = 0, nameW = 0, rightW = 0;
    e.rows.forEach(function (r) {
      var w = 0;
      r.chips.forEach(function (k, i) { w += A.chipWidth(k.label) + (i ? CM.gap : 0); });
      chipsW = Math.max(chipsW, w);
      nameW = Math.max(nameW, A.textWidth(r.name, r.pk ? 't-member-key' : 't-member'));
      r.typeW = A.textWidth(r.type, 't-data');
      r.nullW = r.nullable ? A.textWidth('null', 't-null') + G.unit * 0.6 : 0;
      rightW = Math.max(rightW, r.typeW + r.nullW);
    });
    var bodyW = HM.chipInset + (chipsW ? chipsW + G.keyGap : 0) + nameW + G.typeGap + rightW + HM.padX;
    e.chipsW = chipsW;
    e.w = Math.ceil(Math.max(G.minWidth, A.headerNodeMinWidth(e.name), bodyW));
    e.h = A.headerNodeHeight(e.rows.length);
    e.loopRoom = 0;
  }

  /* ---------- drawing ---------- */

  /* Notation marks at the table end `pt` of a connector; `dir` is the unit vector pointing from the
     table along the connector. The ring is farthest from the table, the foot nearest to it. */
  function drawMarks(g, pt, dir, card) {
    var unit = G.unit, nx = -dir.y, ny = dir.x;
    var half = G.half, foot = G.foot, r = G.ringR;
    function at(d, side) { return { x: pt.x + dir.x * d + nx * side, y: pt.y + dir.y * d + ny * side }; }
    function line(p1, p2) { g.appendChild(A.el('line', { 'class': 'notation', x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y })); }
    function bar(d) { line(at(d, -half), at(d, half)); }
    function crow() {
      var apex = at(foot, 0);
      line(apex, at(0, -half));
      line(apex, at(0, half));
    }
    function ring(d) {
      var c = at(d + r, 0);
      g.appendChild(A.el('circle', { 'class': 'notation-ring', cx: c.x, cy: c.y, r: r }));
    }
    var many = card === '1..*' || card === '0..*';
    var zero = card === '0..1' || card === '0..*';
    var next = 0;
    if (many) { crow(); next = foot; } else { bar(unit * 0.75); next = unit * 0.75; }
    if (zero) ring(next + unit * 0.25);
    else bar(next + unit * 0.6); /* 1..* : bar outside the foot; 1 : second bar */
  }

  /* A connector with its marks; the group is inserted below the tables, its label (if any) above the
     other connectors. Returns the elements the highlight flags together. */
  function drawRelationship(layer, r) {
    var pts = r.points, n = pts.length;
    var g = A.edgePath(pts, { dashed: r.kind === 'referenced', hops: r.hops });
    /* pts run from the parent (r.to) to the child (r.from) */
    drawMarks(g, pts[0], E.unitVector(pts[0], pts[1]), r.toCard);
    drawMarks(g, pts[n - 1], E.unitVector(pts[n - 1], pts[n - 2]), r.fromCard);
    layer.insertBefore(g, layer.firstChild);
    var els = [g];
    if (r.label && r.labelPos) {
      var lab = A.edgeLabel(r.labelPos.x, r.labelPos.y, r.label, 'middle');
      layer.appendChild(lab);
      els.push(lab);
    }
    return els;
  }

  /* a self-relationship loop leaves the table's right side and returns to it */
  function loopPoints(r) {
    var e = r.from, right = e.x + e.w, sp = E.loopSpan(e);
    var x2 = right + G.loopW;
    return [{ x: right, y: sp.y1 }, { x: x2, y: sp.y1 }, { x: x2, y: sp.y2 }, { x: right, y: sp.y2 }];
  }

  function drawLoop(layer, r) {
    var e = r.from, right = e.x + e.w, sp = E.loopSpan(e);
    var x2 = right + G.loopW;
    var pts = loopPoints(r);
    var g = A.edgePath(pts, { dashed: r.kind === 'referenced', hops: r.hops });
    var out = { x: 1, y: 0 };
    drawMarks(g, pts[0], out, r.toCard);
    drawMarks(g, pts[3], out, r.fromCard);
    layer.insertBefore(g, layer.firstChild);
    var els = [g];
    if (r.label) {
      var lab = A.edgeLabel(x2 + G.unit * 0.75, (sp.y1 + sp.y2) / 2, r.label, 'start');
      layer.appendChild(lab);
      els.push(lab);
    }
    return els;
  }

  /* A table: the shared header-band node, and in each row the key chips, the name, the nullable
     marker and the type. Records each row's element for the highlight. */
  function drawTable(layer, e) {
    var g = A.headerNode({ x: e.x, y: e.y, width: e.w, rows: e.rows.length, group: e.group, title: e.name, ungrouped: e.ungrouped });
    e.rows.forEach(function (row, i) {
      var cy = A.headerRowCenter(e.y, i), el = g.rowEls[i], x = e.x + HM.chipInset;
      row.chips.forEach(function (k) {
        el.appendChild(A.chip(x, cy, k.label, k.role));
        x += A.chipWidth(k.label) + CM.gap;
      });
      el.appendChild(A.text(e.x + HM.chipInset + (e.chipsW ? e.chipsW + G.keyGap : 0), cy, row.name,
        row.pk ? 't-member-key' : 't-member'));
      var right = e.x + e.w - HM.padX;
      el.appendChild(A.text(right, cy, row.type, 't-data', { 'text-anchor': 'end' }));
      if (row.nullable) el.appendChild(A.text(right - row.typeW - G.unit * 0.6, cy, 'null', 't-null', { 'text-anchor': 'end' }));
    });
    layer.appendChild(g);
    e.el = g;
  }

  /* ---------- the cards under the drawing ---------- */

  function sampleSvg(w, h, children) {
    return A.el('svg', { width: w, height: h, viewBox: '0 0 ' + w + ' ' + h, 'aria-hidden': 'true' }, children);
  }

  function lineSample(dashed) {
    var w = G.sampleW, h = G.sampleH;
    return sampleSvg(w, h, [A.el('line', { 'class': 'edge' + (dashed ? ' dashed' : ''), x1: 0, y1: h / 2, x2: w, y2: h / 2 })]);
  }

  /* the marks of one cardinality drawn with the drawing's own function, beside a table's edge */
  function markSample(card) {
    var w = G.sampleW, h = G.sampleH, tx = w - G.unit, s = A.px('--stroke');
    var g = A.el('g');
    g.appendChild(A.el('line', { 'class': 'edge', x1: 0, y1: h / 2, x2: tx, y2: h / 2 }));
    drawMarks(g, { x: tx, y: h / 2 }, { x: -1, y: 0 }, card);
    return sampleSvg(w, h, [g, A.el('rect', { 'class': 'node g-neutral', x: tx, y: s, width: G.unit, height: h - 2 * s, rx: A.smallRadius() })]);
  }

  function chipSample(k, w) {
    return sampleSvg(w, CM.height, [A.chip(0, CM.height / 2, k.label, k.role)]);
  }

  function swatch(group, dashed) {
    var w = Math.round(G.unit * 4), h = Math.round(G.unit * 2.5), s = A.px('--stroke');
    if (dashed) {
      return sampleSvg(w, h, [A.el('rect', { 'class': 'node ungrouped g-neutral', x: s, y: s, width: w - 2 * s, height: h - 2 * s, rx: A.smallRadius() })]);
    }
    return sampleSvg(w, h, [A.zone({ x: s, y: s, width: w - 2 * s, height: h - 2 * s, group: group })]);
  }

  function buildLegend(p, used) {
    var kinds = {};
    p.rels.forEach(function (r) { kinds[r.kind] = true; });
    var nullW = Math.ceil(A.textWidth('null', 't-null')), chipW = used.nullable ? nullW : 0;
    KEY_CHIPS.forEach(function (k) { if (used[k.flag]) chipW = Math.max(chipW, A.chipWidth(k.label)); });
    var sections = [
      { title: 'Relationship kind', items: [] },
      { title: 'Cardinality, at the end touching the table', items: [] },
      { title: 'Keys', items: [] },
      { title: 'Groups', items: [] }
    ];
    if (kinds.owned) sections[0].items.push({ sample: lineSample(false), text: 'Owned: the child exists only as part of its parent' });
    if (kinds.referenced) sections[0].items.push({ sample: lineSample(true), text: 'Referenced: the child only points to its parent' });
    if (p.rels.length) {
      ['1', '0..1', '1..*', '0..*'].forEach(function (c) {
        sections[1].items.push({ sample: markSample(c), text: CARD_WORDS[c].charAt(0).toUpperCase() + CARD_WORDS[c].slice(1) + ' (' + c + ')' });
      });
    }
    KEY_CHIPS.forEach(function (k) {
      if (used[k.flag]) sections[2].items.push({ sample: chipSample(k, chipW), text: k.text });
    });
    if (used.nullable) {
      sections[2].items.push({ sample: sampleSvg(chipW, CM.height, [A.text(0, CM.height / 2, 'null', 't-null')]),
        text: 'Nullable column (the others are NOT NULL)' });
    }
    p.zones.forEach(function (z) { sections[3].items.push({ sample: swatch(z.group, false), text: z.label }); });
    if (p.hasGroups && p.entities.some(function (e) { return e.ungrouped; })) {
      sections[3].items.push({ sample: swatch(0, true), text: 'Outside every group' });
    }
    A.legend(sections);
  }

  function cell(r, end) {
    var e = end === 'from' ? r.from : r.to;
    var col = r.columns ? r.columns[end === 'from' ? 0 : 1] : '';
    return A.h('span', 'cell-data', e.name + (col ? '.' + col : ''));
  }

  function buildDetails(p) {
    var rows = p.rels.map(function (r) {
      return { link: r.id, cells: [
        A.h('span', '', [cell(r, 'from'), ' → ', cell(r, 'to')]),
        A.h('span', 'pill' + (r.kind === 'referenced' ? ' dashed' : ''), r.kind),
        CARD_WORDS[r.fromCard],
        CARD_WORDS[r.toCard]
      ] };
    });
    A.details({ title: 'Relationships', columns: ['Foreign key (child → parent)', 'Kind', 'Child end', 'Parent end'], rows: rows });
  }

  /* what the model uses, for the legend */
  function usage(model) {
    var used = {};
    model.entities.forEach(function (e) {
      e.columns.forEach(function (c) { ['pk', 'fk', 'uk', 'nullable'].forEach(function (f) { if (c[f]) used[f] = true; }); });
    });
    return used;
  }

  /* ---------- entry point ---------- */

  A.register('erd', function (model, mount) {
    G = E.geometry();
    var p = prepare(model);
    E.last = p; /* the laid-out drawing, for the structural checks of the tests */
    p.entities.forEach(function (e) { measureEntity(e); });
    p.rels.forEach(function (r) {
      if (!r.self) return;
      r.from.loop = r;
      r.from.loopRoom = G.loopW + (r.label ? Math.ceil(A.textWidth(r.label, 'edge-label')) + Math.round(G.unit * 1.5) : 0);
    });

    var done;
    if (typeof window.ELK === 'function') {
      done = E.layoutElk(p).catch(function (err) {
        A.notice('Automatic layout failed (' + (err && err.message ? err.message : err) + '), so the tables are arranged in a grid.');
        return E.layoutGrid(p);
      });
    } else {
      A.notice('Automatic layout was unavailable (the layout library could not be loaded), so the tables are arranged in a grid and the connectors are simple paths.');
      done = Promise.resolve(E.layoutGrid(p));
    }

    return done.then(function (size) {
      var zoneLayer = A.el('g', { 'class': 'zones' });
      var edgeLayer = A.el('g', { 'class': 'edges' });
      var tableLayer = A.el('g', { 'class': 'tables' });
      p.zones.forEach(function (z) {
        zoneLayer.appendChild(A.zone({ x: z.x, y: z.y, width: z.w, height: z.h, group: z.group, label: z.label }));
      });
      p.entities.forEach(function (e) { drawTable(tableLayer, e); });
      /* where a connector crosses one drawn before it, it hops (shared primitive) */
      var hopSets = A.hops(p.rels.map(function (r) { return r.self ? loopPoints(r) : r.points; }));
      p.rels.forEach(function (r, i) { r.hops = hopSets[i]; });
      var linked = {};
      p.rels.forEach(function (r) { linked[r.id] = r.self ? drawLoop(edgeLayer, r) : drawRelationship(edgeLayer, r); });

      var maxX = size.width, maxY = size.height;
      p.entities.forEach(function (e) {
        maxX = Math.max(maxX, e.x + e.w + e.loopRoom + G.margin);
        maxY = Math.max(maxY, e.y + e.h + G.margin);
      });
      p.zones.forEach(function (z) {
        maxX = Math.max(maxX, z.x + z.w + G.margin);
        maxY = Math.max(maxY, z.y + z.h + G.margin);
      });
      var w = Math.ceil(maxX), h = Math.ceil(maxY);
      var svg = A.el('svg', { xmlns: 'http://www.w3.org/2000/svg', width: w, height: h, viewBox: '0 0 ' + w + ' ' + h,
        role: 'img', 'aria-label': model.title + ': entity relationship diagram' }, [zoneLayer, edgeLayer, tableLayer]);
      mount.appendChild(svg);

      /* linked highlighting: tables, connectors with their joining rows, and the relationships table */
      A.hl.bind(svg);
      p.entities.forEach(function (e) { A.hl.node(e.name, e.el, { label: 'Table ' + e.name + ': pin its highlight' }); });
      p.rels.forEach(function (r) {
        var rows = r.columns ? [r.from.el.rowEls[r.from.rowIndex[r.columns[0]]], r.to.el.rowEls[r.to.rowIndex[r.columns[1]]]] : [];
        A.hl.link(r.id, r.from.name, r.to.name, { els: linked[r.id], rows: rows });
      });
      A.setMeta(plural(p.entities.length, 'table') + ' · ' + plural(p.rels.length, 'relationship'));
      buildLegend(p, usage(model));
      if (p.rels.length) buildDetails(p);
    });
  });
})();
