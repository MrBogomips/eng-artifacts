/* ERD renderer: draws an ERD model as header-band tables joined by crow's foot connectors.
   Registered with the page core (shared/page/core.js) under the type "erd". Layout is automatic: ELK
   `layered` with orthogonal routing when the ELK library loaded, otherwise a grid with simple
   orthogonal connectors and a notice. No style value lives here: roles come from page.css classes,
   sizes derived from the theme's geometry tokens. */
(function () {
  'use strict';
  var A = window.Artifact;

  var HM = A.headerMetrics; /* proportions of the header-band node: owned by the shared primitive */
  var G = null;             /* geometry of this drawing, derived from the theme's tokens (see geometry) */

  /* Every size derives from the theme's --arrowhead length (the design's unit) or from the shared
     header-band primitive; nothing is a style value of this renderer. */
  function geometry() {
    var u = A.px('--arrowhead');
    var g = {
      unit: u,
      nodeNode: Math.round(u * 5),
      layerGap: Math.round(u * 10),
      edgeNode: Math.round(u * 3),
      edgeEdge: Math.round(u * 1.75),
      gridGapX: Math.round(u * 9),
      gridGapY: Math.round(u * 7),
      keyGap: u,                       /* between the key marker and the column name */
      typeGap: Math.round(u * 2.25),   /* between the column name and its type */
      minWidth: Math.round(u * 18.75),
      margin: Math.round(u * 2.5),     /* around the whole drawing */
      labelPad: Math.round(u * 0.75),
      labelH: Math.round(u * 1.75),
      half: u * 0.7,                   /* half the width of a notation bar and of the crow's foot */
      foot: u * 1.25,
      ringR: u * 0.45,
      reach: u * 2.4,                  /* the longest mark set: ring and crow's foot */
      sampleW: u * 3.5,
      sampleH: u * 1.25
    };
    g.step = g.edgeEdge;                           /* between two connector ends on one side */
    g.stub = Math.ceil(g.reach + u * 0.75);        /* a connector runs straight at least this far out of a table */
    g.loopW = Math.round(g.reach + u * 1.5);       /* a self-relationship loop: the marks, plus a visible run */
    g.endInset = Math.ceil(g.half + 3);            /* nearest an end may sit to a table corner */
    return g;
  }

  /* ---------- model preparation ---------- */

  function prepare(model) {
    var groupNo = {}, hasGroups = (model.groups || []).length > 0;
    (model.groups || []).forEach(function (g, i) { groupNo[g.id] = i + 1; });
    var entities = model.entities.map(function (e) {
      var rows = e.columns.map(function (c) {
        var key = c.pk && c.fk ? 'PK FK' : c.pk ? 'PK' : c.fk ? 'FK' : '';
        return { name: c.name, type: c.type, pk: !!c.pk, key: key };
      });
      /* a group number, or the neutral role for a table outside every group when the model has groups;
         with no groups defined every band takes the accent role (group 0) */
      var group = e.group && groupNo[e.group] ? groupNo[e.group] : (hasGroups ? 'neutral' : 0);
      return { name: e.name, group: group, rows: rows };
    });
    var byName = {};
    entities.forEach(function (e) { byName[e.name] = e; });
    var rels = (model.relationships || []).map(function (r, i) {
      [r.from, r.to].forEach(function (n) {
        if (!byName[n]) throw new Error('the relationship ' + r.from + ' to ' + r.to + ' names an entity that is not in the model: "' + n + '"');
      });
      return { id: 'r' + i, from: byName[r.from], to: byName[r.to], fromCard: r.fromCard, toCard: r.toCard,
        kind: r.kind || 'referenced', label: r.label || '', self: r.from === r.to };
    });
    return { entities: entities, rels: rels };
  }

  function measureEntity(e) {
    var keyW = 0, nameW = 0, typeW = 0;
    e.rows.forEach(function (r) {
      if (r.key) keyW = Math.max(keyW, A.textWidth(r.key, 't-data'));
      nameW = Math.max(nameW, A.textWidth(r.name, r.pk ? 't-member-key' : 't-member'));
      typeW = Math.max(typeW, A.textWidth(r.type, 't-data'));
    });
    var bodyW = HM.padX + (keyW ? keyW + G.keyGap : 0) + nameW + G.typeGap + typeW + HM.padX;
    e.keyW = keyW;
    e.w = Math.ceil(Math.max(G.minWidth, A.headerNodeMinWidth(e.name), bodyW));
    e.h = A.headerNodeHeight(e.rows.length);
    e.loopRoom = 0;
  }

  /* The right side of a table that has a self-relationship is shared: the loop takes the lowest
     stretch of it, and every other connector end stays above. Returns the loop's two end heights
     and the lowest height another end may have. */
  function loopSpan(e) {
    var y2 = e.y + e.h - G.endInset;
    var y1 = y2 - HM.row;
    return { y1: y1, y2: y2, limit: y1 - G.step };
  }

  /* The stretch of a table side where connector ends may attach. */
  function sideRange(e, side) {
    var lo = e.y + HM.band + G.endInset, hi = e.y + e.h - G.endInset;
    if (side === 'R' && e.loop) hi = loopSpan(e).limit;
    return { lo: lo, hi: Math.max(lo, hi) };
  }

  /* ---------- layout ---------- */

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

  function layoutWithElk(p) {
    var elk = new window.ELK();
    var graph = {
      id: 'root',
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': 'RIGHT',
        'elk.edgeRouting': 'ORTHOGONAL',
        'elk.padding': '[top=' + G.margin + ',left=' + G.margin + ',bottom=' + G.margin + ',right=' + G.margin + ']',
        'elk.spacing.nodeNode': String(G.nodeNode),
        'elk.spacing.edgeNode': String(G.edgeNode),
        'elk.spacing.edgeEdge': String(G.edgeEdge),
        'elk.layered.spacing.nodeNodeBetweenLayers': String(G.layerGap),
        'elk.layered.spacing.edgeNodeBetweenLayers': String(G.edgeNode),
        'elk.layered.spacing.edgeEdgeBetweenLayers': String(G.edgeEdge),
        'elk.layered.edgeLabels.sideSelection': 'ALWAYS_UP',
        'elk.separateConnectedComponents': 'true',
        'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES'
      },
      children: p.entities.map(function (e) {
        return { id: e.name, width: e.w + e.loopRoom, height: e.h };
      }),
      edges: p.rels.filter(function (r) { return !r.self; }).map(function (r) {
        /* parent to child: parents are laid out to the left of their children */
        var edge = { id: r.id, sources: [r.to.name], targets: [r.from.name] };
        if (r.label) {
          edge.labels = [{ id: r.id + 'l', text: r.label, width: Math.ceil(A.textWidth(r.label, 'edge-label')) + G.labelPad,
            height: G.labelH, layoutOptions: { 'elk.edgeLabels.inline': 'false', 'elk.edgeLabels.placement': 'CENTER' } }];
        }
        return edge;
      })
    };
    return elk.layout(graph).then(function (out) {
      var pos = {};
      out.children.forEach(function (c) { pos[c.id] = c; });
      p.entities.forEach(function (e) { e.x = pos[e.name].x; e.y = pos[e.name].y; });
      var edges = {};
      (out.edges || []).forEach(function (ed) { edges[ed.id] = ed; });
      p.rels.forEach(function (r) {
        if (r.self) return;
        var ed = edges[r.id];
        var sec = ed && ed.sections && ed.sections[0];
        if (!sec) throw new Error('the layout returned no route for the relationship ' + r.from.name + ' to ' + r.to.name);
        /* the route runs parent to child: start is at r.to, end is at r.from */
        r.points = [sec.startPoint].concat(sec.bendPoints || [], [sec.endPoint]).map(function (q) { return { x: q.x, y: q.y }; });
        if (ed.labels && ed.labels[0]) {
          var l = ed.labels[0];
          r.labelPos = { x: l.x + l.width / 2, y: l.y + l.height / 2 };
        }
      });
      shrinkLoopEntities(p);
      clearLoops(p);
      return { width: out.width, height: out.height };
    });
  }

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

  /* A grid: tables in rows and columns, connectors routed through the gaps only. Each connector gets
     its own lane in a gap and its own attachment point on a table side, so no two connector ends and
     no two runs share a place. The gaps are sized for the lanes they carry. */
  function layoutGrid(p) {
    var n = p.entities.length;
    var nCols = Math.max(1, Math.round(Math.sqrt(n * 1.3)));
    var grid = [], colW = [], rowH = [];
    p.entities.forEach(function (e, i) {
      e.col = i % nCols; e.row = Math.floor(i / nCols);
      (grid[e.row] = grid[e.row] || []).push(e);
    });
    var nRows = grid.length;
    grid.forEach(function (row, r) {
      rowH[r] = 0;
      row.forEach(function (e) {
        colW[e.col] = Math.max(colW[e.col] || 0, e.w + e.loopRoom);
        rowH[r] = Math.max(rowH[r], e.h);
      });
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
    function gapWidth(g) {
      var cnt = count(gapLinks, g);
      var left = g > 0 ? G.stub : G.margin, right = g < nCols ? G.stub : G.margin;
      if (g === 0 && !cnt) right = 0;
      if (g === nCols && !cnt) left = 0;
      var w = left + cnt * G.step + right;
      return g > 0 && g < nCols ? Math.max(G.gridGapX, w) : w;
    }
    function gutterHeight(r) {
      var cnt = count(gutterLinks, r);
      if (r === 0) return G.margin;
      if (r === nRows) return (cnt ? G.stub + cnt * G.step : 0) + G.margin;
      return Math.max(G.gridGapY, G.stub + cnt * G.step + G.endInset);
    }
    var gapStart = [], gapW = [], colX = [], x = 0;
    for (var g = 0; g <= nCols; g++) {
      gapStart[g] = x; gapW[g] = gapWidth(g); x += gapW[g];
      if (g < nCols) { colX[g] = x; x += colW[g]; }
    }
    var gutStart = [], gutH = [], rowY = [], y = 0;
    for (var r = 0; r <= nRows; r++) {
      gutStart[r] = y; gutH[r] = gutterHeight(r); y += gutH[r];
      if (r < nRows) { rowY[r] = y; y += rowH[r]; }
    }
    p.entities.forEach(function (e) { e.x = colX[e.col]; e.y = rowY[e.row]; });

    /* lanes: centred in the room a gap or gutter has left after its end stubs */
    links.forEach(function (l) {
      var g2 = l.gap, cnt = count(gapLinks, g2);
      var left = g2 > 0 ? G.stub : G.margin, right = g2 < nCols ? G.stub : G.margin;
      if (g2 === 0 && !cnt) right = 0;
      if (g2 === nCols && !cnt) left = 0;
      var spare = gapW[g2] - left - right - cnt * G.step;
      l.laneX = gapStart[g2] + left + spare / 2 + (l.gapLane + 0.5) * G.step;
      if (!l.adjacent) {
        var c2 = count(gutterLinks, l.gutter);
        var spare2 = gutH[l.gutter] - G.stub - c2 * G.step - (l.gutter === nRows ? G.margin : G.endInset);
        l.laneY = gutStart[l.gutter] + G.stub + spare2 / 2 + (l.gutterLane + 0.5) * G.step;
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
    placeLabels(p);
    return { width: x, height: y };
  }

  /* ---------- labels (grid) ---------- */

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
      placed.forEach(function (s) { if (intersects(rc, { x: s.x - 2, y: s.y - 2, w: s.w + 4, h: s.h + 4 })) c += 1000; });
      marks.forEach(function (s) { if (intersects(rc, s)) c += 400; });
      segs.forEach(function (s) { if (segmentHits(s.a, s.b, rc)) c += 25; });
      return c;
    }
    var off = G.labelH / 2 + 2;
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
          consider(a.x + w / 2 + 4, cy, 40);
          consider(a.x - w / 2 - 4, cy, 41);
          /* centred over the run's top end, or under its bottom end, clear of the marks beside it */
          consider(a.x, top - G.half - h / 2 - 2, 5);
          consider(a.x, bottom + G.half + h / 2 + 2, 6);
        }
      }
      r.labelPos = { x: best.x, y: best.y };
      placed.push(best.rc);
    });
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

  function unitVector(a, b) {
    var dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
    return { x: dx / d, y: dy / d };
  }

  function drawRelationship(layer, r) {
    var pts = r.points;
    var g = A.el('g', { 'class': 'rel' });
    g.appendChild(A.edgePath(pts, { dashed: r.kind === 'referenced' }));
    /* pts run from the parent (r.to) to the child (r.from) */
    drawMarks(g, pts[0], unitVector(pts[0], pts[1]), r.toCard);
    var n = pts.length;
    drawMarks(g, pts[n - 1], unitVector(pts[n - 1], pts[n - 2]), r.fromCard);
    if (r.label && r.labelPos) layer.appendChild(A.edgeLabel(r.labelPos.x, r.labelPos.y, r.label, 'middle'));
    layer.insertBefore(g, layer.firstChild);
  }

  function drawLoop(layer, r) {
    var e = r.from, g = A.el('g', { 'class': 'rel' });
    var right = e.x + e.w, sp = loopSpan(e);
    var x2 = right + G.loopW;
    var pts = [{ x: right, y: sp.y1 }, { x: x2, y: sp.y1 }, { x: x2, y: sp.y2 }, { x: right, y: sp.y2 }];
    g.appendChild(A.edgePath(pts, { dashed: r.kind === 'referenced' }));
    var out = { x: 1, y: 0 };
    drawMarks(g, pts[0], out, r.toCard);
    drawMarks(g, pts[3], out, r.fromCard);
    layer.insertBefore(g, layer.firstChild);
    if (r.label) layer.appendChild(A.edgeLabel(x2 + G.unit * 0.75, (sp.y1 + sp.y2) / 2, r.label, 'start'));
  }

  function drawTable(layer, e) {
    var g = A.headerNode({ x: e.x, y: e.y, width: e.w, rows: e.rows.length, group: e.group, title: e.name });
    e.rows.forEach(function (row, i) {
      var cy = A.headerRowCenter(e.y, i);
      var x = e.x + HM.padX;
      if (row.key) g.appendChild(A.text(x, cy, row.key, 't-data'));
      g.appendChild(A.text(x + (e.keyW ? e.keyW + G.keyGap : 0), cy, row.name, row.pk ? 't-member-key' : 't-member'));
      g.appendChild(A.text(e.x + e.w - HM.padX, cy, row.type, 't-data', { 'text-anchor': 'end' }));
    });
    layer.appendChild(g);
  }

  function legend(p) {
    var kinds = {};
    p.rels.forEach(function (r) { kinds[r.kind] = true; });
    var items = [];
    function sample(dashed, text) {
      var w = G.sampleW, h = G.sampleH;
      var svg = A.el('svg', { width: w, height: h, viewBox: '0 0 ' + w + ' ' + h, 'aria-hidden': 'true' },
        [A.el('line', { 'class': 'edge' + (dashed ? ' dashed' : ''), x1: 0, y1: h / 2, x2: w, y2: h / 2 })]);
      var li = document.createElement('li');
      li.appendChild(svg);
      li.appendChild(document.createTextNode(text));
      items.push(li);
    }
    if (kinds.owned) sample(false, 'Owned: the child exists only as part of its parent');
    if (kinds.referenced) sample(true, 'Referenced: the child only points to its parent');
    if (!items.length) return null;
    var ul = document.createElement('ul');
    ul.className = 'legend';
    items.forEach(function (li) { ul.appendChild(li); });
    return ul;
  }

  /* ---------- entry point ---------- */

  A.register('erd', function (model, mount) {
    G = geometry();
    var p = prepare(model);
    p.entities.forEach(function (e) { measureEntity(e); });
    p.rels.forEach(function (r) {
      if (!r.self) return;
      r.from.loop = r;
      r.from.loopRoom = G.loopW + (r.label ? Math.ceil(A.textWidth(r.label, 'edge-label')) + Math.round(G.unit * 1.5) : 0);
    });

    var done;
    if (typeof window.ELK === 'function') {
      done = layoutWithElk(p).catch(function (err) {
        A.notice('Automatic layout failed (' + (err && err.message ? err.message : err) + '), so the tables are arranged in a grid.');
        return layoutGrid(p);
      });
    } else {
      A.notice('Automatic layout was unavailable (the layout library could not be loaded), so the tables are arranged in a grid and the connectors are simple paths.');
      done = Promise.resolve(layoutGrid(p));
    }

    return done.then(function (size) {
      var edgeLayer = A.el('g', { 'class': 'edges' });
      var tableLayer = A.el('g', { 'class': 'tables' });
      p.entities.forEach(function (e) { drawTable(tableLayer, e); });
      p.rels.forEach(function (r) {
        if (r.self) drawLoop(edgeLayer, r);
        else drawRelationship(edgeLayer, r);
      });
      var maxX = size.width, maxY = size.height;
      p.entities.forEach(function (e) {
        maxX = Math.max(maxX, e.x + e.w + e.loopRoom + G.margin);
        maxY = Math.max(maxY, e.y + e.h + G.margin);
      });
      var w = Math.ceil(maxX), h = Math.ceil(maxY);
      var svg = A.el('svg', { xmlns: 'http://www.w3.org/2000/svg', width: w, height: h, viewBox: '0 0 ' + w + ' ' + h,
        role: 'img', 'aria-label': model.title + ': entity relationship diagram' }, [edgeLayer, tableLayer]);
      mount.appendChild(svg);
      var lg = legend(p);
      if (lg) mount.appendChild(lg);
    });
  });
})();
