/* ERD layout: geometry, the ELK layout (groups as compound nodes, ends anchored to the joining
   rows through ports), the grid fallback (tables clustered by group), self-relationship loops and
   connector label placement. Part of the ERD renderer: loaded before erd.js, shares its helpers
   through Artifact.erd. No style value lives here: every size derives from the theme's geometry
   tokens or from the shared primitives' metrics. */
(function () {
  'use strict';
  var A = window.Artifact;
  var E = (A.erd = A.erd || {});

  var HM = A.headerMetrics; /* proportions of the header-band node: owned by the shared primitive */
  var ZM = A.zoneMetrics;   /* room of a zone: owned by the shared primitive */
  var G = null;             /* geometry of this drawing, derived from the theme's tokens (see geometry) */

  /* Every size derives from the theme's --arrowhead length (the design's unit) or from the shared
     primitives; nothing is a style value of this renderer. */
  E.geometry = function () {
    var u = A.px('--arrowhead');
    var g = {
      unit: u,
      nodeNode: Math.round(u * 5),
      layerGap: Math.round(u * 5),
      edgeEdge: Math.round(u * 1.75),
      gridGapX: Math.round(u * 9),
      gridGapY: Math.round(u * 7),
      keyGap: u,                       /* between the chips and the column name */
      typeGap: Math.round(u * 2.25),   /* between the column name and its type */
      minWidth: Math.round(u * 18.75),
      margin: Math.round(u * 2.5),     /* around the whole drawing */
      labelPad: Math.round(u * 0.75),
      labelH: Math.round(u * 1.75),
      half: u * 0.7,                   /* half the width of a notation bar and of the crow's foot */
      foot: u * 1.25,
      ringR: u * 0.45,
      reach: u * 2.4,                  /* the longest mark set: ring and crow's foot */
      sampleW: u * 7,
      sampleH: u * 2.75
    };
    g.step = g.edgeEdge;                           /* between two connector ends on one side */
    g.stub = Math.ceil(g.reach + u * 0.75);        /* a connector runs straight at least this far out of a table */
    g.edgeNode = Math.ceil(g.reach + u * 0.25);    /* ELK: nearest a connector's turn may come to a table: the longest mark set and a margin */
    g.layerGap = Math.max(g.layerGap, Math.ceil(2 * g.reach + u * 0.75)); /* between two tables: the marks of both ends and a visible run */
    g.loopW = Math.round(g.reach + u * 1.5);       /* a self-relationship loop: the marks, plus a visible run */
    var stroke = A.px('--stroke');
    g.pad = u * 0.25;                              /* a small clearance between labels, marks and lines */
    g.sep = 2 * g.half + 2 * stroke;               /* between two neighbouring ends on a side: a bar, its round caps and a gap */
    g.endInset = Math.ceil(A.px('--radius') + g.half + stroke); /* nearest an end may sit to a table's top or bottom: past the corner radius, with its marks on the straight side */
    G = g;
    E.G = g;
    return g;
  };

  function unitVector(a, b) {
    var dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
    return { x: dx / d, y: dy / d };
  }
  E.unitVector = unitVector;

  /* The right side of a table that has a self-relationship is shared: the loop takes the lowest
     stretch of it, and every other connector end stays above. Returns the loop's two end heights
     and the lowest height another end may have. */
  function loopSpan(e) {
    var y2 = e.y + e.h - G.endInset;
    var y1 = y2 - HM.row;
    return { y1: y1, y2: y2, limit: y1 - G.step };
  }
  E.loopSpan = loopSpan;

  /* The stretch of a table side where connector ends may attach. */
  function sideRange(e, side) {
    var lo = e.y + HM.band + G.endInset, hi = e.y + e.h - G.endInset;
    if (side === 'R' && e.loop) hi = loopSpan(e).limit;
    if (hi < lo) { /* a table with one row: the body cannot hold an end, so use the straight part of the whole side */
      lo = e.y + G.endInset;
      hi = side === 'R' && e.loop ? Math.min(e.y + e.h - G.endInset, loopSpan(e).limit) : e.y + e.h - G.endInset;
    }
    return { lo: lo, hi: Math.max(lo, hi) };
  }

  /* Heights for `m` connector ends on one side of a table: evenly along the body, or, when the body
     is too short to keep the ends one step apart, centred on it with that step, reaching into the
     band if need be. */
  function spreadOnSide(e, side, m) {
    var range = sideRange(e, side), ys = [], i;
    var mid = (range.lo + range.hi) / 2;
    if (m === 1) return [mid];
    if ((range.hi - range.lo) / (m + 1) >= G.step) {
      for (i = 0; i < m; i++) ys.push(range.lo + (range.hi - range.lo) * (i + 1) / (m + 1));
      return ys;
    }
    var fullLo = e.y + G.endInset;
    var fullHi = side === 'R' && e.loop ? loopSpan(e).limit : e.y + e.h - G.endInset;
    var span = Math.min(G.step * (m - 1), Math.max(0, fullHi - fullLo));
    var start = Math.max(fullLo, Math.min(mid - span / 2, fullHi - span));
    for (i = 0; i < m; i++) ys.push(start + span * i / (m - 1));
    return ys;
  }

  /* ---------- ELK layout ---------- */

  /* Ports. Every connector end gets a fixed place on a side of its table, so ELK never attaches one
     at a corner. The end of the table the flow starts from is on the right side, the other end on the
     left (the flow normally runs parent to child, so parents sit left of their children; see
     orientations for the exception).
       - A relationship that names its joining columns attaches at the height of those rows, inside
         the row. A row holds as many ends on one side as can be told apart (bars G.sep apart); when a
         row has more, the extras go to the other side of the table, the ones whose other table lies
         on that side first (known from the first pass). A row that cannot be separated even then is
         listed in p.crowded.
       - A relationship without columns attaches on the straight part of a side, at least G.endInset
         from the corner, at the free height nearest its other table, G.sep from every other end.
     Sets e.ports, r.portSrc / r.portDst, p.moved (ends moved to the other side) and p.crowded. */
  function assignPorts(p, placed) {
    var rowIn = A.px('--stroke');
    var cap = Math.max(1, Math.floor((HM.row - 2 * rowIn) / G.sep) + 1);
    var ends = [], byRow = {}, rowKeys = [];
    p.entities.forEach(function (e) { e.ports = []; });
    p.rels.forEach(function (r) { r.portSrc = r.portDst = null; });
    p.moved = 0;
    p.crowded = [];
    function cx(e) { return e.x + e.w / 2; }
    function cy(e) { return e.y + e.h / 2; }
    p.rels.forEach(function (r) {
      if (r.self) return;
      var src = r.flip ? r.from : r.to, dst = r.flip ? r.to : r.from;
      [[src, dst, 'src', 'E'], [dst, src, 'dst', 'W']].forEach(function (d) {
        var e = d[0], col = r.columns ? r.columns[e === r.from ? 0 : 1] : null;
        var end = { r: r, e: e, other: d[1], role: d[2], side: d[3], col: col, y: 0 };
        ends.push(end);
        if (col === null) return;
        var k = e.name + '|' + col;
        if (!byRow[k]) { byRow[k] = []; rowKeys.push(k); }
        byRow[k].push(end);
      });
    });
    /* split the ends of a row between the two sides when one side would hold more than it can separate */
    rowKeys.forEach(function (k) {
      var list = byRow[k], e = list[0].e, col = list[0].col;
      function onSide(s) { return list.filter(function (x) { return x.side === s; }); }
      function moveOne(from, to) {
        var cand = onSide(from);
        var pick = cand[cand.length - 1];
        if (placed) {   /* the end whose other table lies furthest towards the other side */
          pick = cand.slice().sort(function (a, b) { return (cx(a.other) - cx(b.other)) * (from === 'E' ? 1 : -1); })[0];
        }
        pick.side = to;
        p.moved += 1;
      }
      while (onSide('E').length > cap && onSide('W').length < cap) moveOne('E', 'W');
      while (onSide('W').length > cap && onSide('E').length < cap) moveOne('W', 'E');
      if (onSide('E').length > cap || onSide('W').length > cap) p.crowded.push(e.name + '.' + col);
    });
    /* heights: the ends of a row around its center, ordered by the height of their other table */
    var taken = {};   /* entity name + side -> heights already used */
    function use(e, side, y) { var k = e.name + '|' + side; (taken[k] = taken[k] || []).push(y); }
    rowKeys.forEach(function (k) {
      ['E', 'W'].forEach(function (side) {
        var list = byRow[k].filter(function (x) { return x.side === side; });
        if (!list.length) return;
        if (placed) list.sort(function (a, b) { return cy(a.other) - cy(b.other); });
        var e = list[0].e, n = list.length;
        var center = HM.band + e.rowIndex[list[0].col] * HM.row + HM.row / 2;
        var step = n > 1 ? Math.min(G.sep, (HM.row - 2 * rowIn) / (n - 1)) : 0;
        list.forEach(function (x, i) { x.y = center + (i - (n - 1) / 2) * step; use(e, side, x.y); });
      });
    });
    /* ends without columns: the free height nearest the other table on the straight part of the side */
    ends.filter(function (x) { return x.col === null; }).forEach(function (x) {
      var e = x.e, lo = G.endInset, hi = e.h - G.endInset;
      if (x.side === 'E' && e.loop) hi = Math.min(hi, e.h - G.endInset - HM.row - G.step);
      hi = Math.max(lo, hi);
      var used = taken[e.name + '|' + x.side] || [];
      var want = placed ? Math.max(lo, Math.min(hi, cy(x.other) - e.y)) : (lo + hi) / 2;
      var best = null;
      for (var y = Math.ceil(lo); y <= hi; y++) {
        var gap = used.reduce(function (m, u) { return Math.min(m, Math.abs(u - y)); }, Infinity);
        var score = gap >= G.sep ? [1, -Math.abs(y - want)] : [0, gap];
        if (!best || score[0] > best.s[0] || (score[0] === best.s[0] && score[1] > best.s[1])) best = { y: y, s: score };
      }
      x.y = best ? best.y : (lo + hi) / 2;
      if (best && best.s[0] === 0) p.crowded.push(e.name + ' (an end without columns)');
      use(e, x.side, x.y);
    });
    ends.forEach(function (x, i) {
      var id = x.e.name + '|' + x.side + '|' + i;
      x.e.ports.push({ id: id, x: x.side === 'E' ? x.e.w + x.e.loopRoom : 0, y: x.y, width: 0, height: 0,
        layoutOptions: { 'elk.port.side': x.side === 'E' ? 'EAST' : 'WEST' } });
      if (x.role === 'src') x.r.portSrc = id; else x.r.portDst = id;
    });
  }

  function elkNode(e) {
    var n = { id: e.name, width: e.w + e.loopRoom, height: e.h };
    if (e.ports.length) { n.layoutOptions = { 'elk.portConstraints': 'FIXED_POS' }; n.ports = e.ports; }
    return n;
  }

  function elkEdge(r) {
    var src = r.flip ? r.from : r.to, dst = r.flip ? r.to : r.from;
    var edge = { id: r.id, sources: [r.portSrc || src.name], targets: [r.portDst || dst.name] };
    if (r.label) {
      edge.labels = [{ id: r.id + 'l', text: r.label, width: Math.ceil(A.textWidth(r.label, 'edge-label')) + G.labelPad,
        height: G.labelH, layoutOptions: { 'elk.edgeLabels.inline': 'false', 'elk.edgeLabels.placement': 'CENTER' } }];
    }
    return edge;
  }

  function padding(top, side) {
    return '[top=' + top + ',left=' + side + ',bottom=' + side + ',right=' + side + ']';
  }

  /* The spacing ELK keeps, derived from the geometry: it applies to every box that holds nodes, the
     root and each zone, because ELK does not pass these options down. A turn comes no nearer a table
     than the end stub, and two tables facing each other leave room for the marks of both ends. */
  function spacing() {
    return {
      'elk.spacing.nodeNode': String(G.nodeNode),
      'elk.spacing.edgeNode': String(G.edgeNode),
      'elk.spacing.edgeEdge': String(G.edgeEdge),
      'elk.layered.spacing.nodeNodeBetweenLayers': String(G.layerGap),
      'elk.layered.spacing.edgeNodeBetweenLayers': String(G.edgeNode),
      'elk.layered.spacing.edgeEdgeBetweenLayers': String(G.edgeEdge)
    };
  }

  function assign(target, extra) {
    Object.keys(extra).forEach(function (k) { target[k] = extra[k]; });
    return target;
  }

  /* One ELK pass for a given orientation of the relationships (r.flip). Each group is a compound node
     holding its tables, with room above them for the zone label; tables outside every group and all
     connectors sit at the root. ELK lays the whole hierarchy out in one pass (INCLUDE_CHILDREN), so a
     group's tables stay inside its box and boxes never overlap. Table positions come back relative to
     their group and edge routes relative to the box that holds the edge; both are turned into
     absolute coordinates here. */
  function layoutPass(p, placed) {
    var elk = new window.ELK();
    assignPorts(p, placed);
    var root = {
      id: 'root',
      layoutOptions: assign({
        'elk.algorithm': 'layered',
        'elk.direction': 'RIGHT',
        'elk.edgeRouting': 'ORTHOGONAL',
        'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
        'elk.padding': padding(G.margin, G.margin),
        'elk.layered.edgeLabels.sideSelection': 'ALWAYS_UP',
        'elk.separateConnectedComponents': 'true',
        'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES'
      }, spacing()),
      children: [],
      edges: p.rels.filter(function (r) { return !r.self; }).map(elkEdge)
    };
    var boxes = {};
    p.zones.forEach(function (z) {
      boxes[z.id] = { id: 'zone:' + z.id, layoutOptions: assign({ 'elk.padding': padding(ZM.padTop, ZM.pad) }, spacing()), children: [] };
      root.children.push(boxes[z.id]);
    });
    p.entities.forEach(function (e) {
      (e.zone ? boxes[e.zone.id].children : root.children).push(elkNode(e));
    });
    return elk.layout(root).then(function (out) {
      var at = { root: { x: 0, y: 0 } };   /* absolute position of each box that can hold edges */
      function place(node, off) {
        var e = p.byName[node.id];
        e.x = off.x + node.x; e.y = off.y + node.y;
      }
      out.children.forEach(function (c) {
        if (c.id.indexOf('zone:') !== 0) { place(c, at.root); return; }
        var z = p.zoneById[c.id.slice(5)];
        z.x = c.x; z.y = c.y; z.w = c.width; z.h = c.height;
        at[c.id] = { x: c.x, y: c.y };
        c.children.forEach(function (ch) { place(ch, at[c.id]); });
      });
      var edges = {};
      (out.edges || []).forEach(function (ed) { edges[ed.id] = ed; });
      p.rels.forEach(function (r) {
        if (r.self) return;
        var ed = edges[r.id];
        var sec = ed && ed.sections && ed.sections[0];
        if (!sec) throw new Error('the layout returned no route for the relationship ' + r.from.name + ' to ' + r.to.name);
        var off = at[ed.container] || at.root;
        r.points = [sec.startPoint].concat(sec.bendPoints || [], [sec.endPoint])
          .map(function (q) { return { x: q.x + off.x, y: q.y + off.y }; });
        /* the shared drawing code wants the route from the parent (r.to) to the child (r.from) */
        if (r.flip) r.points.reverse();
        if (ed.labels && ed.labels[0]) {
          var l = ed.labels[0];
          r.labelPos = { x: off.x + l.x + l.width / 2, y: off.y + l.y + l.height / 2 };
        }
      });
      shrinkLoopEntities(p);
      clearLoops(p);
      return { width: out.width, height: out.height };
    });
  }

  /* A first pass with the ends at their natural sides; when a row had too many ends on one side, a
     second pass moves the extras to the side their other table lies on, now that positions are known. */
  function layoutOnce(p) {
    return layoutPass(p, false).then(function (size) {
      return p.moved ? layoutPass(p, true) : size;
    });
  }

  /* Orientations to try. The layered layout puts parents left of children, which chains the groups
     (catalog, then sales, then billing) into one long strip when relationships run from group to
     group. The other orientations split the groups into two sides by a greedy maximum cut of the
     graph of groups (an ungrouped table counts as a group of its own) and run every relationship
     between the sides from the left side to the right one, so the groups stack in two columns. Each
     returns, per relationship id, whether the flow runs child to parent. */
  function orientations(p) {
    var natural = {};
    var nodeOf = function (e) { return e.zone ? 'z:' + e.zone.id : 'u:' + e.name; };
    var weight = {}, names = [];
    p.entities.forEach(function (e) {
      var n = nodeOf(e);
      if (!weight[n]) { weight[n] = {}; names.push(n); }
    });
    p.rels.forEach(function (r) {
      var a = nodeOf(r.from), b = nodeOf(r.to);
      if (r.self || a === b) return;
      weight[a][b] = (weight[a][b] || 0) + 1;
      weight[b][a] = (weight[b][a] || 0) + 1;
    });
    function degree(n) { return Object.keys(weight[n]).reduce(function (s, m) { return s + weight[n][m]; }, 0); }
    var side = {};
    names.slice().sort(function (a, b) { return degree(b) - degree(a); }).forEach(function (n) {
      var w = [0, 0];
      Object.keys(weight[n]).forEach(function (m) { if (side[m] !== undefined) w[side[m]] += weight[n][m]; });
      side[n] = w[0] <= w[1] ? 0 : 1;
    });
    var result = [natural];
    if (p.zones.length < 2 || names.length < 3) return result; /* the strip comes from chained groups */
    [0, 1].forEach(function (left) {
      var flips = {};
      p.rels.forEach(function (r) {
        var a = nodeOf(r.from), b = nodeOf(r.to);
        if (r.self || a === b || side[a] === side[b]) return;
        flips[r.id] = side[a] === left; /* the child's side is the left one: the flow starts at the child */
      });
      result.push(flips);
    });
    return result;
  }

  function routeLength(p) {
    var sum = 0;
    p.rels.forEach(function (r) {
      if (r.self || !r.points) return;
      for (var i = 0; i + 1 < r.points.length; i++) {
        sum += Math.abs(r.points[i + 1].x - r.points[i].x) + Math.abs(r.points[i + 1].y - r.points[i].y);
      }
    });
    return sum;
  }

  function snapshot(p, size) {
    return {
      size: size,
      at: p.entities.map(function (e) { return { x: e.x, y: e.y }; }),
      zones: p.zones.map(function (z) { return { x: z.x, y: z.y, w: z.w, h: z.h }; }),
      routes: p.rels.map(function (r) {
        return { points: r.points && r.points.map(function (q) { return { x: q.x, y: q.y }; }), labelPos: r.labelPos };
      })
    };
  }

  function restore(p, s) {
    p.entities.forEach(function (e, i) { e.x = s.at[i].x; e.y = s.at[i].y; });
    p.zones.forEach(function (z, i) { z.x = s.zones[i].x; z.y = s.zones[i].y; z.w = s.zones[i].w; z.h = s.zones[i].h; });
    p.rels.forEach(function (r, i) { r.points = s.routes[i].points; r.labelPos = s.routes[i].labelPos; });
  }

  /* Lay the drawing out with each orientation and keep the best. The score is the total connector
     length, multiplied by how many times wider than three heights the drawing is, so a strip pays for
     its shape and a compact drawing with longer connectors can still win. */
  E.layoutElk = function (p) {
    var best = null;
    return orientations(p).reduce(function (chain, flips) {
      return chain.then(function () {
        p.rels.forEach(function (r) { r.flip = !!flips[r.id]; });
        return layoutOnce(p).then(function (size) {
          var score = routeLength(p) * Math.max(1, size.width / (3 * size.height));
          if (!best || score < best.score) best = { score: score, snap: snapshot(p, size) };
        });
      });
    }, Promise.resolve()).then(function () {
      restore(p, best.snap);
      return best.snap.size;
    });
  };

  /* Entities with a loop were given extra width so that ELK keeps the strip beside them free: move
     route ends that touch the widened right side back to the table's real right side. */
  function shrinkLoopEntities(p) {
    p.rels.forEach(function (r) {
      if (r.self || !r.points) return;
      [[0, r.to], [r.points.length - 1, r.from]].forEach(function (pair) {
        var pt = r.points[pair[0]], e = pair[1];
        if (e.loopRoom && Math.abs(pt.x - (e.x + e.w + e.loopRoom)) < 0.5) pt.x = e.x + e.w;
      });
    });
  }

  /* Move the end of a route (point index `idx`) along its table side to height `y`, keeping every
     run orthogonal. `jogX` is where a jog may be inserted: beyond the table's loop strip. */
  function moveEnd(pts, idx, y, jogX) {
    var dir = idx === 0 ? 1 : -1, n = pts.length;
    var j = idx + dir, k = idx + 2 * dir, oldY = pts[idx].y;
    if (k >= 0 && k < n && Math.abs(pts[k].x - pts[j].x) < 0.5 && Math.abs(pts[j].y - oldY) < 0.5) {
      pts[idx].y = y; pts[j].y = y;
      return;
    }
    var sign = pts[j].x >= pts[idx].x ? 1 : -1;
    var x = (jogX - pts[j].x) * sign > 0 ? (pts[idx].x + pts[j].x) / 2 : jogX;
    pts[idx].y = y;
    if (idx === 0) pts.splice(1, 0, { x: x, y: y }, { x: x, y: oldY });
    else pts.splice(n - 1, 0, { x: x, y: oldY }, { x: x, y: y });
  }

  /* The loop takes the lowest stretch of its table's right side: other ends that ELK attached there
     move up, so no connector crosses the loop and no mark touches a loop mark. */
  function clearLoops(p) {
    p.entities.forEach(function (e) {
      if (!e.loop) return;
      var span = loopSpan(e), range = sideRange(e, 'R'), side = e.x + e.w;
      var ends = [];
      p.rels.forEach(function (r) {
        if (r.self || !r.points) return;
        [[0, r.to], [r.points.length - 1, r.from]].forEach(function (pair) {
          if (pair[1] === e && Math.abs(r.points[pair[0]].x - side) < 0.5) ends.push({ r: r, idx: pair[0], y: r.points[pair[0]].y });
        });
      });
      ends.sort(function (u, v) { return v.y - u.y; });
      var ceil = span.limit;
      ends.forEach(function (end) {
        var y = Math.max(range.lo, Math.min(end.y, ceil));
        if (Math.abs(y - end.y) > 0.5) moveEnd(end.r.points, end.idx, y, side + e.loopRoom);
        ceil = y - G.step;
      });
    });
  }

  /* ---------- grid layout (fallback) ---------- */

  /* A grid: tables in rows and columns, connectors routed through the gaps only. Tables are ordered
     by group and each group starts a new block of rows, so a zone is its block's bounding box plus
     padding and zones never overlap; the ungrouped tables form the last block, with no zone. Each
     connector gets its own lane in a gap and its own attachment point on a table side, so no two
     connector ends and no two runs share a place. The gaps and gutters are sized for the lanes they
     carry and widened by the zone padding and label room, so no lane crosses a zone label. */
  E.layoutGrid = function (p) {
    var blocks = p.zones.map(function (z) { return { zone: z, ents: z.entities.slice() }; });
    var loose = p.entities.filter(function (e) { return !e.zone; });
    if (loose.length) blocks.push({ zone: null, ents: loose });
    var hasZones = p.zones.length > 0;
    var zp = hasZones ? ZM.pad : 0;

    var grid = [], colW = [], rowH = [], nCols = 1, nRows = 0;
    blocks.forEach(function (b) {
      var cols = Math.max(1, Math.round(Math.sqrt(b.ents.length * 1.3)));
      nCols = Math.max(nCols, cols);
      b.firstRow = nRows;
      b.ents.forEach(function (e, i) {
        e.col = i % cols; e.row = b.firstRow + Math.floor(i / cols);
        (grid[e.row] = grid[e.row] || []).push(e);
      });
      b.lastRow = b.firstRow + Math.ceil(b.ents.length / cols) - 1;
      nRows = b.lastRow + 1;
    });
    grid.forEach(function (row, r) {
      rowH[r] = 0;
      row.forEach(function (e) {
        colW[e.col] = Math.max(colW[e.col] || 0, e.w + e.loopRoom);
        rowH[r] = Math.max(rowH[r], e.h);
      });
    });

    /* room a zone takes in the gutter above row r (its label) and below row r-1 (its bottom padding) */
    var above = [], below = [], r0;
    for (r0 = 0; r0 <= nRows; r0++) { above[r0] = 0; below[r0] = 0; }
    blocks.forEach(function (b) {
      if (!b.zone) return;
      below[b.firstRow] = ZM.padTop;
      above[b.lastRow + 1] = ZM.pad;
    });

    /* classify each connector: adjacent in a row (side to side), or out of the child's bottom */
    var links = [], gapLinks = [], gutterLinks = [];
    function lane(list, i, link, key) { (list[i] = list[i] || []).push(link); link[key] = list[i].length - 1; }
    p.rels.forEach(function (r) {
      if (r.self) return;
      var a = r.from, b = r.to;
      var l = { r: r, a: a, b: b, adjacent: a.row === b.row && Math.abs(a.col - b.col) === 1 };
      var toRight = l.adjacent ? b.col > a.col : b.col >= a.col;
      l.sideB = toRight ? 'L' : 'R';
      if (l.adjacent) { l.sideA = toRight ? 'R' : 'L'; l.gap = toRight ? b.col : a.col; }
      else { l.sideA = 'B'; l.gap = toRight ? b.col : b.col + 1; l.gutter = a.row + 1; lane(gutterLinks, l.gutter, l, 'gutterLane'); }
      lane(gapLinks, l.gap, l, 'gapLane');
      links.push(l);
    });

    /* sizes: a gap or gutter is as wide as its lanes need, never less than the design's gap */
    function count(list, i) { return (list[i] || []).length; }
    function gapEnds(g, cnt) {
      var left = g > 0 ? G.stub : G.margin + zp, right = g < nCols ? G.stub : G.margin + zp;
      if (g === 0 && !cnt) right = 0;
      if (g === nCols && !cnt) left = 0;
      return { left: left, right: right };
    }
    function gapWidth(g) {
      var cnt = count(gapLinks, g), ends = gapEnds(g, cnt);
      var w = ends.left + cnt * G.step + ends.right;
      return g > 0 && g < nCols ? Math.max(G.gridGapX, w) : w;
    }
    function gutterHeight(r) {
      var cnt = count(gutterLinks, r);
      if (r === 0) return G.margin + below[0];
      if (r === nRows) return above[r] + (cnt ? G.stub + cnt * G.step : 0) + G.margin;
      return above[r] + Math.max(G.gridGapY, G.stub + cnt * G.step + G.endInset) + below[r];
    }
    var gapStart = [], gapW = [], colX = [], x = 0, g, r;
    for (g = 0; g <= nCols; g++) {
      gapStart[g] = x; gapW[g] = gapWidth(g); x += gapW[g];
      if (g < nCols) { colX[g] = x; x += colW[g] || 0; }
    }
    var gutStart = [], gutH = [], rowY = [], y = 0;
    for (r = 0; r <= nRows; r++) {
      gutStart[r] = y; gutH[r] = gutterHeight(r); y += gutH[r];
      if (r < nRows) { rowY[r] = y; y += rowH[r]; }
    }
    p.entities.forEach(function (e) { e.x = colX[e.col]; e.y = rowY[e.row]; });

    /* lanes: centred in the room a gap or gutter has left after its end stubs and zone room */
    links.forEach(function (l) {
      var g2 = l.gap, cnt = count(gapLinks, g2), ends = gapEnds(g2, cnt);
      var spare = gapW[g2] - ends.left - ends.right - cnt * G.step;
      l.laneX = gapStart[g2] + ends.left + spare / 2 + (l.gapLane + 0.5) * G.step;
      if (!l.adjacent) {
        var c2 = count(gutterLinks, l.gutter);
        var tail = l.gutter === nRows ? G.margin : G.endInset;
        var spare2 = gutH[l.gutter] - above[l.gutter] - below[l.gutter] - G.stub - c2 * G.step - tail;
        l.laneY = gutStart[l.gutter] + above[l.gutter] + G.stub + spare2 / 2 + (l.gutterLane + 0.5) * G.step;
      }
    });

    /* attachment points: spread along each side that carries connector ends */
    var sides = {};
    function add(e, side, l, end) {
      var k = e.name + '|' + side;
      (sides[k] = sides[k] || { e: e, side: side, items: [] }).items.push({ l: l, end: end });
    }
    links.forEach(function (l) { add(l.a, l.sideA, l, 'a'); add(l.b, l.sideB, l, 'b'); });
    function comesFrom(it) {
      if (it.end === 'a') return it.l.b.y + it.l.b.h / 2;
      return it.l.adjacent ? it.l.a.y + it.l.a.h / 2 : it.l.laneY;
    }
    Object.keys(sides).forEach(function (k) {
      var s = sides[k], e = s.e, m = s.items.length;
      if (s.side === 'B') {
        s.items.sort(function (u, v) { return u.l.laneX - v.l.laneX; });
        s.items.forEach(function (it, i) { it.l.ax = e.x + e.w * (i + 1) / (m + 1); });
      } else {
        s.items.sort(function (u, v) { return comesFrom(u) - comesFrom(v); });
        var ys = spreadOnSide(e, s.side, m);
        s.items.forEach(function (it, i) {
          if (it.end === 'a') it.l.ay = ys[i]; else it.l.by = ys[i];
        });
      }
    });

    /* routes, child to parent, then reversed: the shared drawing code wants parent to child */
    links.forEach(function (l) {
      var a = l.a, b = l.b, bx = l.sideB === 'L' ? b.x : b.x + b.w, pts;
      if (l.adjacent) {
        var sx = l.sideA === 'R' ? a.x + a.w : a.x;
        pts = [{ x: sx, y: l.ay }, { x: l.laneX, y: l.ay }, { x: l.laneX, y: l.by }, { x: bx, y: l.by }];
      } else {
        pts = [{ x: l.ax, y: a.y + a.h }, { x: l.ax, y: l.laneY }, { x: l.laneX, y: l.laneY },
          { x: l.laneX, y: l.by }, { x: bx, y: l.by }];
      }
      l.r.points = pts.filter(function (q, i) {
        return !i || Math.abs(q.x - pts[i - 1].x) > 0.01 || Math.abs(q.y - pts[i - 1].y) > 0.01;
      }).reverse();
    });

    /* zones: each block's bounding box plus the zone's padding and label room */
    blocks.forEach(function (b) {
      if (!b.zone) return;
      var x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
      b.ents.forEach(function (e) {
        x1 = Math.min(x1, e.x); y1 = Math.min(y1, e.y);
        x2 = Math.max(x2, e.x + e.w + e.loopRoom); y2 = Math.max(y2, e.y + e.h);
      });
      b.zone.x = x1 - ZM.pad; b.zone.y = y1 - ZM.padTop;
      b.zone.w = x2 - x1 + 2 * ZM.pad; b.zone.h = y2 - y1 + ZM.padTop + ZM.pad;
    });
    placeLabels(p);
    return { width: x, height: y };
  };

  /* ---------- connector labels (grid) ---------- */

  function intersects(a, b) {
    return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  }

  function segmentHits(a, b, rc) {
    var minX = Math.min(a.x, b.x), maxX = Math.max(a.x, b.x), minY = Math.min(a.y, b.y), maxY = Math.max(a.y, b.y);
    return maxX >= rc.x && minX <= rc.x + rc.w && maxY >= rc.y && minY <= rc.y + rc.h;
  }

  /* The box that the marks at the end `pt` of a connector, running along `dir`, occupy. */
  function markBox(pt, dir) {
    var x2 = pt.x + dir.x * G.reach, y2 = pt.y + dir.y * G.reach;
    var nx = Math.abs(dir.y) * G.half, ny = Math.abs(dir.x) * G.half;
    var x1 = Math.min(pt.x, x2) - nx, y1 = Math.min(pt.y, y2) - ny;
    return { x: x1, y: y1, w: Math.abs(x2 - pt.x) + 2 * nx, h: Math.abs(y2 - pt.y) + 2 * ny };
  }

  /* Place each connector label on a run of its own connector where it overlaps no table, no other
     label, no mark, and crosses as few other runs as it can. */
  function placeLabels(p) {
    var solid = [], marks = [], segs = [], placed = [];
    p.zones.forEach(function (z) {
      solid.push({ x: z.x + ZM.labelX, y: z.y + ZM.labelY - G.labelH / 2, w: Math.ceil(A.textWidth(z.label, 'zone-label')), h: G.labelH });
    });
    p.entities.forEach(function (e) {
      solid.push({ x: e.x, y: e.y, w: e.w, h: e.h });
      if (e.loop) {
        var sp = loopSpan(e);
        solid.push({ x: e.x + e.w, y: sp.y1 - G.half, w: e.loopRoom, h: sp.y2 - sp.y1 + 2 * G.half });
      }
    });
    p.rels.forEach(function (r) {
      if (r.self || !r.points) return;
      var pts = r.points, n = pts.length;
      marks.push(markBox(pts[0], unitVector(pts[0], pts[1])));
      marks.push(markBox(pts[n - 1], unitVector(pts[n - 1], pts[n - 2])));
      for (var i = 0; i + 1 < n; i++) segs.push({ a: pts[i], b: pts[i + 1] });
    });
    function cost(rc) {
      var c = 0;
      solid.forEach(function (s) { if (intersects(rc, s)) c += 1000; });
      placed.forEach(function (s) { if (intersects(rc, { x: s.x - G.pad, y: s.y - G.pad, w: s.w + 2 * G.pad, h: s.h + 2 * G.pad })) c += 1000; });
      marks.forEach(function (s) { if (intersects(rc, s)) c += 400; });
      segs.forEach(function (s) { if (segmentHits(s.a, s.b, rc)) c += 25; });
      return c;
    }
    var off = G.labelH / 2 + G.pad;
    p.rels.forEach(function (r) {
      if (r.self || !r.label || !r.points) return;
      var w = Math.ceil(A.textWidth(r.label, 'edge-label')) + G.labelPad, h = G.labelH;
      var best = null;
      function consider(cx, cy, extra) {
        var rc = { x: cx - w / 2, y: cy - h / 2, w: w, h: h };
        var c = cost(rc) + extra;
        if (!best || c < best.cost) best = { cost: c, x: cx, y: cy, rc: rc };
      }
      for (var i = 0; i + 1 < r.points.length; i++) {
        var a = r.points[i], b = r.points[i + 1];
        if (Math.abs(a.y - b.y) < 0.5) {
          var len = Math.abs(b.x - a.x), short = len < w ? 60 : 0;
          [0.5, 0.3, 0.7].forEach(function (t, ti) {
            var cx = a.x + (b.x - a.x) * t;
            consider(cx, a.y - off, short + ti);
            consider(cx, a.y + off, short + ti + 1);
          });
        } else {
          var cy = (a.y + b.y) / 2, top = Math.min(a.y, b.y), bottom = Math.max(a.y, b.y);
          consider(a.x + w / 2 + 2 * G.pad, cy, 40);
          consider(a.x - w / 2 - 2 * G.pad, cy, 41);
          /* centred over the run's top end, or under its bottom end, clear of the marks beside it */
          consider(a.x, top - G.half - h / 2 - G.pad, 5);
          consider(a.x, bottom + G.half + h / 2 + G.pad, 6);
        }
      }
      r.labelPos = { x: best.x, y: best.y };
      placed.push(best.rc);
    });
  }

  E.markBox = markBox;
})();
