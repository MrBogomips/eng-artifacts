/* UML class diagram layout: geometry, the ELK layout (packages as compound nodes, parents above
   children, end labels reserved, self-association loops), the grid fallback and the placement of
   connector labels. Part of the class diagram renderer: loaded before uml-class-diagram.js, shares its
   helpers through Artifact.uml. No style value lives here: every size derives from the theme's
   geometry tokens (the --arrowhead unit) or from the shared primitives' metrics.

   The drawing model `p` it works on (built by the renderer):
     p.nodes   [{name, x, y, w, h, padTop, padR, zone, loop, ...}]  x, y: the class box itself; padTop and
               padR: room kept above and right of it (the generic box's overhang, a self-association loop)
     p.rels    [{id, from, to (nodes), kind, self, labels: {center, from, to}, points, labelPos, ...}]
     p.zones   [{id, label, group, nodes}]
   A layout sets the position of every node and zone, `points` of every relationship (running from
   its `from` end to its `to` end) and, for every label, its box in `labelAt`. */
(function () {
  'use strict';
  var A = window.Artifact;
  var U = (A.uml = A.uml || {});

  var HM = A.headerMetrics; /* proportions of the header-band node: owned by the shared primitive */
  var ZM = A.zoneMetrics;   /* room of a zone: owned by the shared primitive */
  var G = null;             /* geometry of this drawing, derived from the theme's tokens (see geometry) */

  /* Every size derives from the theme's --arrowhead length (the design's unit) or from the shared
     primitives; nothing is a style value of this renderer. */
  U.geometry = function () {
    var u = A.px('--arrowhead');
    var g = {
      unit: u,
      nodeNode: Math.round(u * 5),
      layerGap: Math.round(u * 7),
      edgeEdge: Math.round(u * 1.25),
      gridGapX: Math.round(u * 9),
      gridGapY: Math.round(u * 8),
      minWidth: Math.round(u * 12.5),
      margin: Math.round(u * 2.5),     /* around the whole drawing */
      labelPad: Math.round(u * 0.75),
      labelH: Math.round(u * 1.75),
      half: u * 0.45,                  /* half the width of a triangle, a diamond and an arrowhead */
      reach: u * 1.6,                  /* the longest end shape: a diamond */
      sampleW: u * 7,
      sampleH: u * 2.75
    };
    g.step = g.edgeEdge;                                     /* between two connector ends on one side */
    g.pad = u * 0.25;                                        /* a small clearance between labels, marks and lines */
    g.edgeNode = Math.ceil(g.reach + u * 0.5);               /* nearest a connector's turn may come to a class */
    g.loopW = Math.round(g.reach + u * 2);                   /* a self-association loop: the end shapes, plus a visible run */
    g.stub = Math.ceil(g.reach + u * 0.75);                  /* a connector runs straight at least this far out of a class */
    var stroke = A.px('--stroke');
    g.endInset = Math.ceil(A.px('--radius') + g.half + stroke); /* nearest an end may sit to a corner of a class */
    G = g;
    U.G = g;
    return g;
  };

  function unitVector(a, b) {
    var dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
    return { x: dx / d, y: dy / d };
  }
  U.unitVector = unitVector;

  /* the two end heights of a self-association loop on the right side of a class, in the lowest
     stretch of that side */
  U.loopSpan = function (c) {
    var y2 = c.y + c.h - G.endInset;
    var y1 = Math.max(c.y + G.endInset, y2 - HM.row);
    if (y2 - y1 < 2 * G.half + A.px('--stroke')) y1 = y2 - (2 * G.half + A.px('--stroke'));
    return { y1: y1, y2: y2 };
  };

  U.loopPoints = function (c) {
    var right = c.x + c.w, sp = U.loopSpan(c), x2 = right + G.loopW;
    return [{ x: right, y: sp.y1 }, { x: x2, y: sp.y1 }, { x: x2, y: sp.y2 }, { x: right, y: sp.y2 }];
  };

  function assign(target, extra) {
    Object.keys(extra).forEach(function (k) { target[k] = extra[k]; });
    return target;
  }

  function padding(top, side) {
    return '[top=' + top + ',left=' + side + ',bottom=' + side + ',right=' + side + ']';
  }

  /* The spacing ELK keeps: it applies to every box that holds nodes, the root and each zone, because
     ELK does not pass these options down. */
  function spacing() {
    return {
      'elk.spacing.nodeNode': String(G.nodeNode),
      'elk.spacing.edgeNode': String(G.edgeNode),
      'elk.spacing.edgeEdge': String(G.edgeEdge),
      'elk.spacing.edgeLabel': String(Math.round(G.pad)),
      'elk.layered.spacing.nodeNodeBetweenLayers': String(G.layerGap),
      'elk.layered.spacing.edgeNodeBetweenLayers': String(G.edgeNode),
      'elk.layered.spacing.edgeEdgeBetweenLayers': String(G.edgeEdge)
    };
  }

  function elkNode(c) {
    return { id: c.name, width: c.w + c.padR, height: c.h + c.padTop };
  }

  function elkLabel(id, lab, placement) {
    return { id: id, text: lab.text, width: Math.ceil(lab.w), height: G.labelH,
      layoutOptions: { 'elk.edgeLabels.inline': 'false', 'elk.edgeLabels.placement': placement } };
  }

  /* The layer of each class, from the relationships that order classes: a generalization or a
     realization runs from the parent to the child, a composition or an aggregation from the whole to
     its part. A class's rank is the length of the longest such chain above it (cycles are ignored). */
  function ranks(p) {
    var preds = {}, rank = {}, state = {};
    p.nodes.forEach(function (c) { preds[c.name] = []; });
    p.rels.forEach(function (r) {
      if (r.self) return;
      if (r.kind === 'generalization' || r.kind === 'realization') preds[r.from.name].push(r.to.name);
      else if (r.kind === 'composition' || r.kind === 'aggregation') preds[r.to.name].push(r.from.name);
    });
    function rankOf(n) {
      if (rank[n] !== undefined) return rank[n];
      if (state[n]) return 0;
      state[n] = true;
      var m = 0;
      preds[n].forEach(function (q) { m = Math.max(m, rankOf(q) + 1); });
      state[n] = false;
      rank[n] = m;
      return m;
    }
    p.nodes.forEach(function (c) { rankOf(c.name); });
    return rank;
  }

  /* An ELK edge runs from the upper class to the lower one: from the parent to the child for a
     generalization and a realization, from the whole to the part, and for any other kind from the class
     of the lower rank to the class of the higher one (the `from` end when they tie). That keeps parents
     above their children and every kind of connector pointing the same way, so ELK has few cycles to
     break. The drawing's own routes always run from `from` to `to`: r.flip says the ELK route has to be
     reversed. */
  function elkEdge(r, rank) {
    var flip;
    if (r.kind === 'generalization' || r.kind === 'realization') flip = true;
    else if (r.kind === 'composition' || r.kind === 'aggregation') flip = false;
    else flip = rank[r.from.name] > rank[r.to.name];
    r.flip = flip;
    var src = flip ? r.to : r.from, dst = flip ? r.from : r.to;
    var srcLab = flip ? r.labels.to : r.labels.from, dstLab = flip ? r.labels.from : r.labels.to;
    var labels = [];
    if (srcLab) labels.push(elkLabel(r.id + 't', srcLab, 'TAIL'));
    if (dstLab) labels.push(elkLabel(r.id + 'h', dstLab, 'HEAD'));
    if (r.labels.center) labels.push(elkLabel(r.id + 'c', r.labels.center, 'CENTER'));
    var edge = { id: r.id, sources: [src.name], targets: [dst.name] };
    if (labels.length) edge.labels = labels;
    return edge;
  }

  /* ---------- keeping connector ends where the drawing wants them ---------- */

  function dedupe(pts) {
    return pts.filter(function (q, i) {
      return !i || Math.abs(q.x - pts[i - 1].x) > 0.01 || Math.abs(q.y - pts[i - 1].y) > 0.01;
    });
  }

  /* Move the end of a route (point index idx) along its class side to `value`, keeping every run
     orthogonal: the end and the next bend move together, or, when that would tilt the next run, a jog
     is inserted. vertical: the side is a left or right one (the end moves in y). */
  function moveAlong(pts, idx, vertical, value) {
    var coord = vertical ? 'y' : 'x', other = vertical ? 'x' : 'y';
    var dir = idx === 0 ? 1 : -1, j = idx + dir, k = idx + 2 * dir, n = pts.length;
    var old = pts[idx][coord];
    if (Math.abs(old - value) < 0.5) return;
    if (n >= 3 && k >= 0 && k < n && Math.abs(pts[k][coord] - pts[j][coord]) > 0.5) {
      pts[idx][coord] = value;
      pts[j][coord] = value;
      return;
    }
    var mid = (pts[idx][other] + pts[j][other]) / 2, a = {}, b = {};
    a[other] = mid; a[coord] = value;
    b[other] = mid; b[coord] = old;
    pts[idx][coord] = value;
    if (idx === 0) pts.splice(1, 0, a, b); else pts.splice(n - 1, 0, b, a);
  }

  /* The route's end at class `c` (point index idx). The layout saw the class with its room (the
     generic box's overhang above, a loop's room at the right) as one box: bring the end to the class
     itself, and keep it clear of the corners and of the generic box. */
  function fitEnd(pts, idx, c) {
    var pt = pts[idx];
    var X0 = c.x, Y0 = c.y - c.padTop, X1 = c.x + c.w + c.padR, Y1 = c.y + c.h;
    var right = c.x + c.w, bottom = c.y + c.h;
    var lo, hi;
    if (Math.abs(pt.x - X1) < 0.5 && c.padR) { /* the right side of the room: the class's own right side */
      pt.x = right;
      moveAlong(pts, idx, true, Math.max(c.y + G.endInset, Math.min(bottom - G.endInset, pt.y)));
      return;
    }
    if (Math.abs(pt.x - X0) < 0.5 || Math.abs(pt.x - right) < 0.5) { /* a left or right side */
      lo = c.y + G.endInset; hi = bottom - G.endInset;
      moveAlong(pts, idx, true, Math.max(lo, Math.min(hi, pt.y)));
      return;
    }
    if (Math.abs(pt.y - Y0) < 0.5 || Math.abs(pt.y - c.y) < 0.5 || Math.abs(pt.y - Y1) < 0.5) { /* top or bottom */
      var onTop = Math.abs(pt.y - Y1) >= 0.5;
      if (onTop) pts[idx].y = c.y;
      lo = c.x + G.endInset; hi = right - G.endInset;
      if (onTop && c.generic) hi = Math.max(lo, right - c.generic - G.endInset);
      moveAlong(pts, idx, false, Math.max(lo, Math.min(hi, pt.x)));
    }
  }

  /* ---------- keeping connectors off the zone labels ---------- */

  /* A zone's label sits in the room the zone keeps above its classes (ZM.padTop). ELK knows nothing of
     it and may route a connector through it, so each run that crosses a label's box (with a small
     clearance) is moved past the label: a vertical run to the right of the label or, failing that, to
     its left; a horizontal run below the label or above it. A move is kept only when the new route
     crosses no class and no label, runs no closer than a connector step to a parallel run of another
     connector, and, for a run that ends at a class, keeps the end on that class's side. A run that
     cannot be moved stays where it is. */
  function labelBoxes(p) {
    return p.zones.map(function (z) {
      var w = Math.ceil(A.textWidth(z.label, 'zone-label'));
      var c = G.pad * 2;                                    /* the clearance kept around the label */
      return { x: z.x + ZM.labelX - c, y: z.y + ZM.labelY - G.labelH / 2 - c, w: w + 2 * c, h: G.labelH + 2 * c };
    });
  }

  function crosses(a, b, rc) {
    var minX = Math.min(a.x, b.x), maxX = Math.max(a.x, b.x), minY = Math.min(a.y, b.y), maxY = Math.max(a.y, b.y);
    return maxX > rc.x + 0.01 && minX < rc.x + rc.w - 0.01 && maxY > rc.y + 0.01 && minY < rc.y + rc.h - 0.01;
  }

  function classRects(p) {
    var out = [];
    p.nodes.forEach(function (c) {
      out.push({ x: c.x, y: c.y, w: c.w, h: c.h });
      if (c.generic) out.push({ x: c.x + c.w - c.generic, y: c.y - c.padTop, w: c.generic, h: c.padTop });
    });
    return out;
  }

  /* where an end at class c may sit along its top or bottom side */
  function endRange(c, pt) {
    var right = c.x + c.w, lo = c.x + G.endInset, hi = right - G.endInset;
    if (Math.abs(pt.y - c.y) < 0.5 && c.generic) hi = Math.max(lo, right - c.generic - G.endInset);
    return { lo: lo, hi: hi };
  }

  U.clearZoneLabels = function (p) {
    if (!p.zones.length) return;
    var boxes = labelBoxes(p), solids = classRects(p), tol = 0.5;
    var routes = p.rels.filter(function (r) { return !r.self && r.points && r.points.length > 1; });

    function clash(pts, k, vertical, skip) {      /* a parallel run of another connector too close */
      var a = pts[k], b = pts[k + 1], lo = vertical ? Math.min(a.y, b.y) : Math.min(a.x, b.x), hi = vertical ? Math.max(a.y, b.y) : Math.max(a.x, b.x);
      var at = vertical ? a.x : a.y, bad = false;
      routes.forEach(function (r) {
        if (r === skip) return;
        for (var i = 0; i + 1 < r.points.length; i++) {
          var c = r.points[i], d = r.points[i + 1];
          var par = vertical ? Math.abs(c.x - d.x) < tol : Math.abs(c.y - d.y) < tol;
          if (!par) continue;
          var cl = vertical ? Math.min(c.y, d.y) : Math.min(c.x, d.x), ch = vertical ? Math.max(c.y, d.y) : Math.max(c.x, d.x);
          if (Math.min(hi, ch) - Math.max(lo, cl) > 1 && Math.abs((vertical ? c.x : c.y) - at) < G.step * 0.8) bad = true;
        }
      });
      return bad;
    }

    function acceptable(r, pts) {
      for (var i = 0; i + 1 < pts.length; i++) {
        var a = pts[i], b = pts[i + 1], j;
        for (j = 0; j < solids.length; j++) if (crosses(a, b, solids[j])) return false;
        for (j = 0; j < boxes.length; j++) if (crosses(a, b, boxes[j])) return false;
      }
      return true;
    }

    function copy(r) { return r.points.map(function (q) { return { x: q.x, y: q.y }; }); }

    /* the route with run k moved to `value` (x for a vertical run, y for a horizontal one): the new points
       and the index of the moved run, or null */
    function moved(r, k, vertical, value) {
      var pts = copy(r), n = pts.length, ends = [k, k + 1], axis = vertical ? 'x' : 'y', outside = -1;
      for (var e = 0; e < 2; e++) {
        var i = ends[e];
        if (vertical && (i === 0 || i === n - 1)) {            /* an end on a top or bottom side */
          var rg = endRange(i === 0 ? r.from : r.to, r.points[i]);
          if (value < rg.lo - tol || value > rg.hi + tol) outside = i;
        }
        if (!vertical && (i === 0 || i === n - 1)) return null;
        pts[i][axis] = value;
      }
      if (outside >= 0) return n > 2 ? jogged(r, outside, value) : null;
      /* the runs on either side keep their direction, and a run at a class keeps the room of the end shape */
      for (var s = k - 1; s <= k + 1; s += 2) {
        if (s < 0 || s + 1 >= n) continue;
        var was = r.points[s + 1][axis] - r.points[s][axis], now = pts[s + 1][axis] - pts[s][axis];
        if (was * now <= 0 || ((s === 0 || s + 1 === n - 1) && Math.abs(now) < G.stub - tol && Math.abs(now) < Math.abs(was))) return null;
      }
      return { pts: pts, k: k };
    }

    /* A vertical run out of a class's top or bottom whose end cannot slide to `value` along the class's
       side: the end stays, the route turns after a stub and runs to `value` there. */
    function jogged(r, e, value) {
      var pts = copy(r), n = pts.length, first = e === 0, nx = first ? 1 : n - 2, after = first ? 2 : n - 3;
      var end = pts[e], nxt = pts[nx], dir = nxt.y > end.y ? 1 : -1;
      if (n < 3 || Math.abs(nxt.y - end.y) < G.stub + G.step) return null;
      var was = pts[after].x - nxt.x, now = pts[after].x - value;
      if (was * now <= 0) return null;
      var a = { x: end.x, y: end.y + dir * G.stub }, b = { x: value, y: a.y }, c = { x: value, y: nxt.y };
      if (first) pts.splice(1, 1, a, b, c); else pts.splice(n - 2, 1, c, b, a);
      return { pts: pts, k: first ? 2 : n - 2 };
    }

    routes.forEach(function (r) {
      for (var guard = 0; guard < 12; guard++) {
        var fixed = false;
        for (var k = 0; k + 1 < r.points.length && !fixed; k++) {
          var a = r.points[k], b = r.points[k + 1], vertical = Math.abs(a.x - b.x) < tol, horizontal = Math.abs(a.y - b.y) < tol;
          if (!vertical && !horizontal) continue;
          for (var bi = 0; bi < boxes.length && !fixed; bi++) {
            var bx = boxes[bi];
            if (!crosses(a, b, bx)) continue;
            var cur = vertical ? a.x : a.y, cands = [], m;
            for (m = 0; m < 4; m++) {
              if (vertical) { cands.push(bx.x + bx.w + m * G.step + 1); cands.push(bx.x - m * G.step - 1); }
              else { cands.push(bx.y + bx.h + m * G.step + 1); cands.push(bx.y - m * G.step - 1); }
            }
            cands.sort(function (u, v) { return Math.abs(u - cur) - Math.abs(v - cur); });
            for (m = 0; m < cands.length; m++) {
              var mv = moved(r, k, vertical, cands[m]);
              if (!mv || !acceptable(r, mv.pts) || clash(mv.pts, mv.k, vertical, r)) continue;
              r.points = dedupe(mv.pts);
              fixed = true;
              break;
            }
          }
        }
        if (!fixed) break;
      }
    });
  };

  /* ---------- ELK layout ---------- */

  /* One pass: each package is a compound node holding its classes, with room above them for the zone
     label; classes outside every package and all connectors sit at the root. ELK lays the whole
     hierarchy out in one pass (INCLUDE_CHILDREN), so a package's classes stay inside its box and boxes
     never overlap. Positions come back relative to the box that holds the node and routes relative to
     the box that holds the edge; both are turned into absolute coordinates here. */
  U.layoutElk = function (p) {
    var elk = new window.ELK();
    var rank = ranks(p);
    var root = {
      id: 'root',
      layoutOptions: assign({
        'elk.algorithm': 'layered',
        'elk.direction': 'DOWN',
        'elk.edgeRouting': 'ORTHOGONAL',
        'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
        'elk.padding': padding(G.margin, G.margin),
        'elk.layered.edgeLabels.sideSelection': 'ALWAYS_UP',
        'elk.separateConnectedComponents': 'true',
        'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES'
      }, spacing()),
      children: [],
      edges: p.rels.filter(function (r) { return !r.self; }).map(function (r) { return elkEdge(r, rank); })
    };
    var boxes = {};
    p.zones.forEach(function (z) {
      boxes[z.id] = { id: 'zone:' + z.id, layoutOptions: assign({ 'elk.padding': padding(ZM.padTop, ZM.pad) }, spacing()), children: [] };
      root.children.push(boxes[z.id]);
    });
    p.nodes.forEach(function (c) { (c.zone ? boxes[c.zone.id].children : root.children).push(elkNode(c)); });
    return elk.layout(root).then(function (out) {
      var at = { root: { x: 0, y: 0 } };
      var byName = {};
      p.nodes.forEach(function (c) { byName[c.name] = c; });
      function place(node, off) {
        var c = byName[node.id];
        c.x = off.x + node.x;
        c.y = off.y + node.y + c.padTop;
      }
      out.children.forEach(function (ch) {
        if (ch.id.indexOf('zone:') !== 0) { place(ch, at.root); return; }
        var z = p.zoneById[ch.id.slice(5)];
        z.x = ch.x; z.y = ch.y; z.w = ch.width; z.h = ch.height;
        at[ch.id] = { x: ch.x, y: ch.y };
        ch.children.forEach(function (n) { place(n, at[ch.id]); });
      });
      var edges = {};
      (out.edges || []).forEach(function (ed) { edges[ed.id] = ed; });
      p.rels.forEach(function (r) {
        if (r.self) return;
        var ed = edges[r.id];
        var sec = ed && ed.sections && ed.sections[0];
        if (!sec) throw new Error('the layout returned no route for the relationship ' + r.from.name + ' to ' + r.to.name);
        var off = at[ed.container] || at.root;
        var pts = [sec.startPoint].concat(sec.bendPoints || [], [sec.endPoint])
          .map(function (q) { return { x: q.x + off.x, y: q.y + off.y }; });
        if (r.flip) pts.reverse();
        r.points = pts;
      });
      fitRoutes(p);
      U.clearZoneLabels(p);
      return { width: out.width, height: out.height };
    });
  };

  function fitRoutes(p) {
    p.rels.forEach(function (r) {
      if (r.self || !r.points) return;
      /* the ends first, then the points of the route that carry no run are dropped */
      fitEnd(r.points, 0, r.from);
      fitEnd(r.points, r.points.length - 1, r.to);
      r.points = dedupe(r.points);
    });
  }

  /* ---------- grid layout (fallback) ---------- */

  /* A grid: classes in rows and columns, connectors routed through the gaps and gutters. Classes are
     ordered by package and each package starts a new block of rows, so a zone is its block's bounding
     box plus padding and zones never overlap; the classes outside every package form the last block,
     with no zone. Every connector runs along the gutter beside its source and the column gap beside
     its target, so no run crosses a class; each gets a lane of its own in a gap or gutter. */
  U.layoutGrid = function (p) {
    var blocks = p.zones.map(function (z) { return { zone: z, nodes: z.nodes.slice() }; });
    var loose = p.nodes.filter(function (c) { return !c.zone; });
    if (loose.length) blocks.push({ zone: null, nodes: loose });
    var zp = p.zones.length ? ZM.pad : 0;

    var rowsOf = [], colW = [], rowH = [], nCols = 1, nRows = 0;
    blocks.forEach(function (b) {
      var cols = Math.max(1, Math.round(Math.sqrt(b.nodes.length * 1.3)));
      nCols = Math.max(nCols, cols);
      b.firstRow = nRows;
      b.nodes.forEach(function (c, i) {
        c.col = i % cols; c.row = b.firstRow + Math.floor(i / cols);
        (rowsOf[c.row] = rowsOf[c.row] || []).push(c);
      });
      b.lastRow = b.firstRow + Math.ceil(b.nodes.length / cols) - 1;
      nRows = b.lastRow + 1;
    });
    rowsOf.forEach(function (row, r) {
      rowH[r] = 0;
      row.forEach(function (c) {
        colW[c.col] = Math.max(colW[c.col] || 0, c.w + c.padR);
        rowH[r] = Math.max(rowH[r], c.h + c.padTop);
      });
    });

    /* room a zone takes in the gutter above row r (its label) and below row r-1 (its padding) */
    var above = [], below = [], r0;
    for (r0 = 0; r0 <= nRows; r0++) { above[r0] = 0; below[r0] = 0; }
    blocks.forEach(function (b) {
      if (!b.zone) return;
      below[b.firstRow] = ZM.padTop;
      above[b.lastRow + 1] = ZM.pad;
    });

    /* every connector: out of the source into the gutter below its row (above it when the target is
       higher), along that gutter to the column gap beside the target, along the gap to the target's
       row and into its side. A source and target in one row use the gutter above the row. */
    var links = [], gapLinks = [], gutterLinks = [];
    function lane(list, i, link, key) { (list[i] = list[i] || []).push(link); link[key] = list[i].length - 1; }
    p.rels.forEach(function (r) {
      if (r.self) return;
      var a = r.from, b = r.to, up = b.row < a.row || (b.row === a.row);
      var l = { r: r, a: a, b: b, up: up, sameRow: a.row === b.row };
      l.gutter = up ? a.row : a.row + 1;
      l.toRight = b.col >= a.col;
      l.gap = l.toRight ? b.col : b.col + 1;        /* the gap beside the target's column, on the source's side */
      l.sideB = l.toRight ? 'L' : 'R';
      lane(gutterLinks, l.gutter, l, 'gutterLane');
      lane(gapLinks, l.gap, l, 'gapLane');
      links.push(l);
    });

    function count(list, i) { return (list[i] || []).length; }
    function gapEnds(g) {
      var cnt = count(gapLinks, g);
      var left = g > 0 ? G.stub : G.margin + zp, right = g < nCols ? G.stub : G.margin + zp;
      if (g === 0 && !cnt) right = 0;
      if (g === nCols && !cnt) left = 0;
      return { left: left, right: right };
    }
    function gapWidth(g) {
      var cnt = count(gapLinks, g), e = gapEnds(g);
      var w = e.left + cnt * G.step + e.right;
      return g > 0 && g < nCols ? Math.max(G.gridGapX, w) : w;
    }
    function gutterHeight(r) {
      var cnt = count(gutterLinks, r);
      if (r === 0) return G.margin + below[0] + (cnt ? G.stub + cnt * G.step : 0);
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
    p.nodes.forEach(function (c) { c.x = colX[c.col]; c.y = rowY[c.row] + c.padTop; });

    links.forEach(function (l) {
      var cnt = count(gapLinks, l.gap), e = gapEnds(l.gap);
      var spare = gapW[l.gap] - e.left - e.right - cnt * G.step;
      l.laneX = gapStart[l.gap] + e.left + spare / 2 + (l.gapLane + 0.5) * G.step;
      var c2 = count(gutterLinks, l.gutter);
      var topRoom = above[l.gutter] + G.stub, botRoom = below[l.gutter];
      var spare2 = gutH[l.gutter] - topRoom - botRoom - c2 * G.step - (l.gutter === 0 || l.gutter === nRows ? 0 : G.endInset);
      l.laneY = gutStart[l.gutter] + topRoom + Math.max(0, spare2) / 2 + (l.gutterLane + 0.5) * G.step;
      if (l.gutter === 0) l.laneY = gutStart[0] + G.margin + below[0] + G.stub / 2 + (l.gutterLane + 0.5) * G.step - G.stub / 2;
    });

    /* attachment points, spread along the bottom or top side of the source and the target's side */
    var sides = {};
    function add(c, side, l, end) {
      var k = c.name + '|' + side;
      (sides[k] = sides[k] || { c: c, side: side, items: [] }).items.push({ l: l, end: end });
    }
    links.forEach(function (l) {
      add(l.a, l.up ? 'T' : 'B', l, 'a');
      add(l.b, l.sideB, l, 'b');
    });
    Object.keys(sides).forEach(function (k) {
      var s = sides[k], c = s.c, m = s.items.length;
      if (s.side === 'T' || s.side === 'B') {
        s.items.sort(function (u, v) { return u.l.laneX - v.l.laneX; });
        s.items.forEach(function (it, i) { it.l.ax = c.x + c.w * (i + 1) / (m + 1); });
      } else {
        s.items.sort(function (u, v) { return u.l.laneY - v.l.laneY; });
        var lo = c.y + G.endInset, hi = c.y + c.h - G.endInset;
        s.items.forEach(function (it, i) { it.l.by = m === 1 ? (lo + hi) / 2 : lo + (hi - lo) * i / (m - 1); });
      }
    });
    links.forEach(function (l) {
      var a = l.a, b = l.b, bx = l.sideB === 'L' ? b.x : b.x + b.w;
      var ay = l.up ? a.y : a.y + a.h;
      var pts = [{ x: l.ax, y: ay }, { x: l.ax, y: l.laneY }, { x: l.laneX, y: l.laneY }, { x: l.laneX, y: l.by }, { x: bx, y: l.by }];
      l.r.points = dedupe(pts);
    });

    /* zones: each block's bounding box plus the zone's padding and label room */
    blocks.forEach(function (b) {
      if (!b.zone) return;
      var x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
      b.nodes.forEach(function (c) {
        x1 = Math.min(x1, c.x); y1 = Math.min(y1, c.y - c.padTop);
        x2 = Math.max(x2, c.x + c.w + c.padR); y2 = Math.max(y2, c.y + c.h);
      });
      b.zone.x = x1 - ZM.pad; b.zone.y = y1 - ZM.padTop;
      b.zone.w = x2 - x1 + 2 * ZM.pad; b.zone.h = y2 - y1 + ZM.padTop + ZM.pad;
    });
    U.clearZoneLabels(p);
    return { width: x, height: y };
  };

  /* ---------- connector labels ---------- */

  function intersects(a, b) {
    return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  }

  function segmentHits(a, b, rc) {
    var minX = Math.min(a.x, b.x), maxX = Math.max(a.x, b.x), minY = Math.min(a.y, b.y), maxY = Math.max(a.y, b.y);
    return maxX >= rc.x && minX <= rc.x + rc.w && maxY >= rc.y && minY <= rc.y + rc.h;
  }

  /* The box that the end shape at `pt` of a connector, running along `dir`, occupies. */
  function markBox(pt, dir, reach) {
    var x2 = pt.x + dir.x * reach, y2 = pt.y + dir.y * reach;
    var nx = Math.abs(dir.y) * G.half, ny = Math.abs(dir.x) * G.half;
    var x1 = Math.min(pt.x, x2) - nx, y1 = Math.min(pt.y, y2) - ny;
    return { x: x1, y: y1, w: Math.abs(x2 - pt.x) + 2 * nx, h: Math.abs(y2 - pt.y) + 2 * ny };
  }
  U.markBox = markBox;

  /* Place every label of a connector: the end labels (role and multiplicity) beside their ends, clear
     of the end shape, and the centre label (a binding, a dependency's word) on a run of the connector.
     Each box overlaps no class, no other label, no end shape and crosses as few runs as it can. The
     boxes are the labels' `at` ({x, y, w, h}, the centre at x + w/2). */
  U.placeLabels = function (p) {
    var solid = [], marks = [], segs = [], placed = [];
    p.zones.forEach(function (z) {
      solid.push({ x: z.x + ZM.labelX, y: z.y + ZM.labelY - G.labelH / 2, w: Math.ceil(A.textWidth(z.label, 'zone-label')), h: G.labelH });
    });
    p.nodes.forEach(function (c) {
      solid.push({ x: c.x, y: c.y - c.padTop, w: c.w + c.padR, h: c.h + c.padTop });
    });
    var routes = p.rels.map(function (r) { return r.self ? U.loopPoints(r.from) : r.points; });
    p.rels.forEach(function (r, i) {
      var pts = routes[i];
      if (!pts || pts.length < 2) return;
      var n = pts.length;
      marks.push(markBox(pts[0], unitVector(pts[0], pts[1]), r.reach.from));
      marks.push(markBox(pts[n - 1], unitVector(pts[n - 1], pts[n - 2]), r.reach.to));
      for (var k = 0; k + 1 < n; k++) segs.push({ a: pts[k], b: pts[k + 1] });
    });
    function cost(rc) {
      var c = 0;
      solid.forEach(function (s) { if (intersects(rc, s)) c += 1000; });
      placed.forEach(function (s) { if (intersects(rc, { x: s.x - G.pad, y: s.y - G.pad, w: s.w + 2 * G.pad, h: s.h + 2 * G.pad })) c += 1000; });
      marks.forEach(function (s) { if (intersects(rc, s)) c += 400; });
      segs.forEach(function (s) { if (segmentHits(s.a, s.b, rc)) c += 25; });
      return c;
    }
    function put(lab, candidates) {
      var best = null;
      candidates.forEach(function (cd, i) {
        var rc = { x: cd.x - lab.w / 2, y: cd.y - lab.h / 2, w: lab.w, h: lab.h };
        var c = cost(rc) + i * 0.5 + (cd.extra || 0);
        if (!best || c < best.cost) best = { cost: c, rc: rc };
      });
      lab.at = best.rc;
      placed.push(best.rc);
    }
    var off = G.labelH / 2 + G.pad;

    /* an end label: beside the line just past the end shape, on either side, then further along */
    function endCandidates(pt, dir, reach, lab) {
      var out = [], along;
      [0, 1].forEach(function (more) {
        if (Math.abs(dir.x) > 0.5) {
          along = reach + G.pad + lab.w / 2 + more * (lab.w + G.pad);
          out.push({ x: pt.x + dir.x * along, y: pt.y - off, extra: more });
          out.push({ x: pt.x + dir.x * along, y: pt.y + off, extra: more + 0.25 });
        } else {
          along = reach + G.pad + lab.h / 2 + more * (lab.h + G.pad);
          out.push({ x: pt.x + lab.w / 2 + G.pad * 2, y: pt.y + dir.y * along, extra: more });
          out.push({ x: pt.x - lab.w / 2 - G.pad * 2, y: pt.y + dir.y * along, extra: more + 0.25 });
        }
      });
      return out;
    }
    p.rels.forEach(function (r, i) {
      var pts = routes[i];
      if (!pts || pts.length < 2) return;
      var n = pts.length;
      if (r.labels.from) put(r.labels.from, endCandidates(pts[0], unitVector(pts[0], pts[1]), r.reach.from, r.labels.from));
      if (r.labels.to) put(r.labels.to, endCandidates(pts[n - 1], unitVector(pts[n - 1], pts[n - 2]), r.reach.to, r.labels.to));
    });

    /* a centre label: on a run of its own connector, above or below a horizontal run, beside a vertical one */
    p.rels.forEach(function (r, i) {
      var lab = r.labels.center, pts = routes[i];
      if (!lab || !pts || pts.length < 2) return;
      var cands = [];
      for (var k = 0; k + 1 < pts.length; k++) {
        var a = pts[k], b = pts[k + 1];
        if (Math.abs(a.y - b.y) < 0.5) {
          var short = Math.abs(b.x - a.x) < lab.w ? 60 : 0;
          [0.5, 0.3, 0.7].forEach(function (t, ti) {
            var cx = a.x + (b.x - a.x) * t;
            cands.push({ x: cx, y: a.y - off, extra: short + ti });
            cands.push({ x: cx, y: a.y + off, extra: short + ti + 1 });
          });
        } else {
          var cy = (a.y + b.y) / 2;
          cands.push({ x: a.x + lab.w / 2 + 2 * G.pad, y: cy, extra: 40 });
          cands.push({ x: a.x - lab.w / 2 - 2 * G.pad, y: cy, extra: 41 });
        }
      }
      put(lab, cands);
    });
  };
})();
