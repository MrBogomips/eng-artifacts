/* UML layout, shared by the UML artifact types (class, object, package diagram, and the ones that
   follow): geometry, the ELK layout (zones and containers as compound nodes, nested to any depth,
   parents above children, end labels reserved, self-connection loops), the grid fallbacks and the
   placement of connector labels. Loaded before the type's own renderer (assets/<type>.json lists it
   under "shared"); shares its helpers with it and with uml-notation.js through Artifact.uml. No style
   value lives here: every size derives from the theme's geometry tokens (the --arrowhead unit) or from
   the shared primitives' metrics.

   The drawing model `p` a renderer builds and a layout works on:
     p.nodes   [{name, x, y, w, h, padTop, padR, zone, loop, ...}]  x, y: the node box itself; padTop and
               padR: room kept above and right of it (a generic box's overhang, a self-connection loop);
               generic: width of an overhanging box at the top right that connector ends keep clear of;
               tab: width of a folder tab at the top left (the box's top strip, one band high, holds
               nothing right of it, so an end there lands on the body below)
     p.rels    [{id, from, to (nodes or zones), kind, self, labels: {center, from, to}, points, ...}]
     p.zones   [{id, label, group, nodes, parent, headRoom, minW, avoid, ...}]  a zone holds nodes and, through
               `parent`, other zones (nested to any depth); headRoom: room above its content (default: the
               zone label's); minW: least width; avoid: boxes, relative to the zone, that connectors keep
               off (default: the label); items: its nodes and child zones in drawing order, for the nested
               grid (p.items for the root). A zone may be the end of a relationship (isZone: true, with
               padTop, padR and generic 0 and, for a folder, tab, as a node's); a package that holds
               packages is one.
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
    g.edgeNode = Math.ceil(g.reach + u * 0.5);               /* nearest a connector's turn may come to a node */
    g.loopW = Math.round(g.reach + u * 2);                   /* a self-association loop: the end shapes, plus a visible run */
    g.stub = Math.ceil(g.reach + u * 0.75);                  /* a connector runs straight at least this far out of a node */
    var stroke = A.px('--stroke');
    g.endInset = Math.ceil(A.px('--radius') + g.half + stroke); /* nearest an end may sit to a corner of a node */
    G = g;
    U.G = g;
    return g;
  };

  function unitVector(a, b) {
    var dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
    return { x: dx / d, y: dy / d };
  }
  U.unitVector = unitVector;

  /* the two end heights of a self-connection loop on the right side of a node, in the lowest
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

  /* the id the layout knows an end of a relationship by: a node by its name, a zone by its id */
  function endId(e) { return e.isZone ? 'zone:' + e.id : e.name; }

  function elkLabel(id, lab, placement) {
    return { id: id, text: lab.text, width: Math.ceil(lab.w), height: G.labelH,
      layoutOptions: { 'elk.edgeLabels.inline': 'false', 'elk.edgeLabels.placement': placement } };
  }

  /* The layer of each node, from the relationships that order nodes: a generalization or a
     realization runs from the parent to the child, a composition or an aggregation from the whole to
     its part. A node's rank is the length of the longest such chain above it (cycles are ignored). Any
     other kind (association, dependency, link) orders nothing. */
  function ranks(p) {
    var preds = {}, rank = {}, state = {};
    p.nodes.forEach(function (c) { preds[c.name] = []; });
    p.zones.forEach(function (z) { preds['zone:' + z.id] = []; });
    p.rels.forEach(function (r) {
      if (r.self) return;
      if (r.kind === 'generalization' || r.kind === 'realization') preds[endId(r.from)].push(endId(r.to));
      else if (r.kind === 'composition' || r.kind === 'aggregation') preds[endId(r.to)].push(endId(r.from));
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
    p.zones.forEach(function (z) { rankOf('zone:' + z.id); });
    return rank;
  }

  /* An ELK edge runs from the upper node to the lower one: from the parent to the child for a
     generalization and a realization, from the whole to the part, and for any other kind from the node
     of the lower rank to the node of the higher one (the `from` end when they tie). That keeps parents
     above their children and every kind of connector pointing the same way, so ELK has few cycles to
     break. The drawing's own routes always run from `from` to `to`: r.flip says the ELK route has to be
     reversed. */
  function elkEdge(r, rank) {
    var flip;
    if (r.kind === 'generalization' || r.kind === 'realization') flip = true;
    else if (r.kind === 'composition' || r.kind === 'aggregation') flip = false;
    else flip = rank[endId(r.from)] > rank[endId(r.to)];
    r.flip = flip;
    var src = flip ? r.to : r.from, dst = flip ? r.from : r.to;
    var srcLab = flip ? r.labels.to : r.labels.from, dstLab = flip ? r.labels.from : r.labels.to;
    var labels = [];
    if (srcLab) labels.push(elkLabel(r.id + 't', srcLab, 'TAIL'));
    if (dstLab) labels.push(elkLabel(r.id + 'h', dstLab, 'HEAD'));
    if (r.labels.center) labels.push(elkLabel(r.id + 'c', r.labels.center, 'CENTER'));
    var edge = { id: r.id, sources: [endId(src)], targets: [endId(dst)] };
    if (labels.length) edge.labels = labels;
    return edge;
  }

  /* ---------- keeping connector ends where the drawing wants them ---------- */

  function dedupe(pts) {
    return pts.filter(function (q, i) {
      return !i || Math.abs(q.x - pts[i - 1].x) > 0.01 || Math.abs(q.y - pts[i - 1].y) > 0.01;
    });
  }

  /* Move the end of a route (point index idx) along its node side to `value`, keeping every run
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

  /* Where an end may sit along the top side of a node with a folder tab: clamped to [lo, hi] and kept
     off the corner where the tab meets the body. Returns the x. */
  function clampTab(c, lo, hi, x) {
    var v = Math.max(lo, Math.min(hi, x)), edge = c.x + c.tab, gap = G.endInset;
    if (v > edge - gap && v < edge + gap) v = v >= edge && edge + gap <= hi ? edge + gap : edge - gap;
    return v;
  }

  /* The route's end at node `c` (point index idx). The layout saw the node with its room (the
     generic box's overhang above, a loop's room at the right) as one box: bring the end to the node
     itself, and keep it clear of the corners and of the generic box. A node with a folder tab has only
     the tab in the top strip of its box: an end on the top side right of the tab, and one on the right
     side within the strip, lands on the body below it. */
  function fitEnd(pts, idx, c) {
    var pt = pts[idx];
    var X0 = c.x, Y0 = c.y - c.padTop, X1 = c.x + c.w + c.padR, Y1 = c.y + c.h;
    var right = c.x + c.w, bottom = c.y + c.h;
    var lo, hi;
    if (Math.abs(pt.x - X1) < 0.5 && c.padR) { /* the right side of the room: the node's own right side */
      pt.x = right;
      moveAlong(pts, idx, true, Math.max(c.y + G.endInset, Math.min(bottom - G.endInset, pt.y)));
      return;
    }
    if (Math.abs(pt.x - X0) < 0.5 || Math.abs(pt.x - right) < 0.5) { /* a left or right side */
      lo = c.y + G.endInset; hi = bottom - G.endInset;
      if (c.tab && Math.abs(pt.x - right) < 0.5) lo = c.y + HM.band + G.endInset;
      moveAlong(pts, idx, true, Math.max(lo, Math.min(hi, pt.y)));
      return;
    }
    if (Math.abs(pt.y - Y0) < 0.5 || Math.abs(pt.y - c.y) < 0.5 || Math.abs(pt.y - Y1) < 0.5) { /* top or bottom */
      var onTop = Math.abs(pt.y - Y1) >= 0.5;
      if (onTop) pts[idx].y = c.y;
      lo = c.x + G.endInset; hi = right - G.endInset;
      if (onTop && c.generic) hi = Math.max(lo, right - c.generic - G.endInset);
      if (onTop && c.tab) {
        moveAlong(pts, idx, false, clampTab(c, lo, hi, pt.x));
        pt.y = pt.x > c.x + c.tab ? c.y + HM.band : c.y;
      } else moveAlong(pts, idx, false, Math.max(lo, Math.min(hi, pt.x)));
    }
  }

  /* ---------- keeping connectors off the zone labels ---------- */

  /* A zone's label sits in the room the zone keeps above its nodes (ZM.padTop). ELK knows nothing of
     it and may route a connector through it, so each run that crosses a label's box (with a small
     clearance) is moved past the label: a vertical run to the right of the label or, failing that, to
     its left; a horizontal run below the label or above it. A move is kept only when the new route
     crosses no node and no label, runs no closer than a connector step to a parallel run of another
     connector, and, for a run that ends at a node, keeps the end on that node's side. A run that
     cannot be moved stays where it is. A zone that carries more than a label (the tab and member rows
     of a package that holds packages) names the boxes to keep off in `avoid`. */
  function zoneBoxes(z) { /* the boxes of a zone's own writing, absolute */
    if (z.avoid) return z.avoid.map(function (b) { return { x: z.x + b.x, y: z.y + b.y, w: b.w, h: b.h }; });
    return [{ x: z.x + ZM.labelX, y: z.y + ZM.labelY - G.labelH / 2, w: Math.ceil(A.textWidth(z.label, 'zone-label')), h: G.labelH }];
  }

  function labelBoxes(p) {
    var c = G.pad * 2;                                      /* the clearance kept around the label */
    var out = [];
    p.zones.forEach(function (z) {
      zoneBoxes(z).forEach(function (b) { out.push({ x: b.x - c, y: b.y - c, w: b.w + 2 * c, h: b.h + 2 * c }); });
    });
    return out;
  }

  function crosses(a, b, rc) {
    var minX = Math.min(a.x, b.x), maxX = Math.max(a.x, b.x), minY = Math.min(a.y, b.y), maxY = Math.max(a.y, b.y);
    return maxX > rc.x + 0.01 && minX < rc.x + rc.w - 0.01 && maxY > rc.y + 0.01 && minY < rc.y + rc.h - 0.01;
  }

  function nodeRects(p) {
    var out = [];
    p.nodes.forEach(function (c) {
      out.push({ x: c.x, y: c.y, w: c.w, h: c.h });
      if (c.generic) out.push({ x: c.x + c.w - c.generic, y: c.y - c.padTop, w: c.generic, h: c.padTop });
    });
    return out;
  }

  /* where an end at node c may sit along its top or bottom side: [lo, hi], less the corner where a
     folder tab meets the body (skipLo..skipHi) */
  function endRange(c, pt) {
    var right = c.x + c.w, lo = c.x + G.endInset, hi = right - G.endInset;
    if (Math.abs(pt.y - c.y) < 0.5 && c.generic) hi = Math.max(lo, right - c.generic - G.endInset);
    var rg = { lo: lo, hi: hi };
    if (c.tab && pt.y < c.y + c.h / 2) { rg.skipLo = c.x + c.tab - G.endInset; rg.skipHi = c.x + c.tab + G.endInset; }
    return rg;
  }

  U.clearZoneLabels = function (p) {
    if (!p.zones.length) return;
    var boxes = labelBoxes(p), solids = nodeRects(p), tol = 0.5;
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
          if (value < rg.lo - tol || value > rg.hi + tol || (rg.skipLo !== undefined && value > rg.skipLo + tol && value < rg.skipHi - tol)) outside = i;
        }
        if (!vertical && (i === 0 || i === n - 1)) return null;
        pts[i][axis] = value;
        if (vertical && (i === 0 || i === n - 1)) {            /* an end at a folder tab: the tab's top or the body's */
          var nd = i === 0 ? r.from : r.to;
          if (nd.tab && r.points[i].y < nd.y + nd.h / 2) pts[i].y = value > nd.x + nd.tab ? nd.y + HM.band : nd.y;
        }
      }
      if (outside >= 0) return n > 2 ? jogged(r, outside, value) : null;
      /* the runs on either side keep their direction, and a run at a node keeps the room of the end shape */
      for (var s = k - 1; s <= k + 1; s += 2) {
        if (s < 0 || s + 1 >= n) continue;
        var was = r.points[s + 1][axis] - r.points[s][axis], now = pts[s + 1][axis] - pts[s][axis];
        if (was * now <= 0 || ((s === 0 || s + 1 === n - 1) && Math.abs(now) < G.stub - tol && Math.abs(now) < Math.abs(was))) return null;
      }
      return { pts: pts, k: k };
    }

    /* A vertical run out of a node's top or bottom whose end cannot slide to `value` along the node's
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

  /* ---------- rerouting a connector past what it must not cross ---------- */

  /* A connector must not run through a node it does not belong to, nor through the writing of a zone: its
     label, or, for a package that holds packages, its tab and member rows. ELK knows nothing of the
     writing and the grid fallback of the nodes, and moving a single run (clearZoneLabels) is not always
     possible: when the connector's ends are fixed, the way past may need new bends or another side of
     an end node. So a connector that still crosses one of them is routed again: a shortest orthogonal
     path with few bends on the lines that run along the obstacles, from one of the candidate attachment
     points of its first node to one of its last, each leaving its side with a stub of straight line.
     Its own end nodes are obstacles too, so the path never runs through them; paths close to another
     connector's run cost more. A connector with no way past keeps its route. */
  /* the node or zone e and every zone that holds it */
  function holders(e) {
    var out = [], q = e;
    while (q) { out.push(q); q = q.isZone ? q.parent : q.zone; }
    return out;
  }

  function ownBoxes(p) { /* the raw boxes a connector must not cross: zone writing, zones (a fallback layout only), every node */
    var out = [];
    p.zones.forEach(function (z) { zoneBoxes(z).forEach(function (b) { out.push({ rc: b, owner: z, node: false }); }); });
    p.zones.forEach(function (z) { out.push({ rc: { x: z.x, y: z.y, w: z.w, h: z.h }, owner: z, node: false, zone: true }); });
    p.nodes.forEach(function (c) {
      out.push({ rc: { x: c.x, y: c.y, w: c.w, h: c.h }, owner: c, node: true });
      if (c.generic) out.push({ rc: { x: c.x + c.w - c.generic, y: c.y - c.padTop, w: c.generic, h: c.padTop }, owner: c, node: true });
      if (c.padR) out.push({ rc: { x: c.x + c.w, y: c.y, w: c.padR, h: c.h }, owner: c, node: true });
    });
    return out;
  }

  /* where a connector may attach to node or zone e: the sides, a few places along each, as fitEnd would
     leave them (clear of the corners, of a generic box and of a folder tab's inner corner) */
  function attachPoints(e) {
    var inset = G.endInset, right = e.x + e.w, bottom = e.y + e.h, out = [];
    function span(lo, hi) { return hi < lo ? [] : hi - lo < 1 ? [(lo + hi) / 2] : [lo, (lo + hi) / 2, hi]; }
    var topHi = right - inset - (e.generic || 0);
    if (e.tab) {
      span(e.x + inset, e.x + e.tab - inset).forEach(function (x) { out.push({ x: x, y: e.y, dx: 0, dy: -1 }); });
      span(e.x + e.tab + inset, topHi).forEach(function (x) { out.push({ x: x, y: e.y + HM.band, dx: 0, dy: -1 }); });
    } else span(e.x + inset, topHi).forEach(function (x) { out.push({ x: x, y: e.y, dx: 0, dy: -1 }); });
    span(e.x + inset, right - inset).forEach(function (x) { out.push({ x: x, y: bottom, dx: 0, dy: 1 }); });
    span(e.y + inset, bottom - inset).forEach(function (y) { out.push({ x: e.x, y: y, dx: -1, dy: 0 }); });
    if (!e.padR) span(e.y + (e.tab ? HM.band : 0) + inset, bottom - inset).forEach(function (y) { out.push({ x: right, y: y, dx: 1, dy: 0 }); });
    return out;
  }

  /* the end of a route as an attachment: its point and the unit vector out of the node */
  function endAttach(pts, idx) {
    var a = pts[idx], b = pts[idx === 0 ? 1 : pts.length - 2], d = unitVector(a, b);
    return { x: a.x, y: a.y, dx: Math.round(d.x), dy: Math.round(d.y), kept: true };
  }

  var DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  function dirIndex(dx, dy) { for (var i = 0; i < 4; i++) if (DIRS[i][0] === dx && DIRS[i][1] === dy) return i; return -1; }

  /* a binary heap of {cost, ...} */
  function Heap() { this.a = []; }
  Heap.prototype.push = function (x) {
    var a = this.a, i = a.push(x) - 1;
    while (i > 0) { var j = (i - 1) >> 1; if (a[j].cost <= a[i].cost) break; var t = a[i]; a[i] = a[j]; a[j] = t; i = j; }
  };
  Heap.prototype.pop = function () {
    var a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      for (var i = 0; ;) {
        var l = 2 * i + 1, r = l + 1, m = i;
        if (l < a.length && a[l].cost < a[m].cost) m = l;
        if (r < a.length && a[r].cost < a[m].cost) m = r;
        if (m === i) break;
        var t = a[i]; a[i] = a[m]; a[m] = t; i = m;
      }
    }
    return top;
  };

  /* The new route of r, or null. `boxes` from ownBoxes; `others` the segments of the other routes. */
  function findRoute(r, boxes, others, nodesToo, taken) {
    var m = Math.ceil(G.edgeNode / 2), stub = G.stub, bend = G.unit * 3, i, j;
    var mine = [r.from, r.to];
    var held = holders(r.from).concat(holders(r.to));
    var obstacles = [];
    boxes.forEach(function (b) {
      if (b.zone) { if (nodesToo && held.indexOf(b.owner) < 0) obstacles.push({ x: b.rc.x - m, y: b.rc.y - m, w: b.rc.w + 2 * m, h: b.rc.h + 2 * m }); return; }
      var own = b.node ? mine.indexOf(b.owner) >= 0 : (b.owner === r.from || b.owner === r.to);
      var rc = b.rc;
      obstacles.push(own ? rc : { x: rc.x - m, y: rc.y - m, w: rc.w + 2 * m, h: rc.h + 2 * m });
    });
    function blocked(a, b) { for (var k = 0; k < obstacles.length; k++) if (crosses(a, b, obstacles[k])) return true; return false; }

    var starts = [endAttach(r.points, 0)].concat(attachPoints(r.from).map(function (q) { q.kept = false; return q; }));
    var goals = [endAttach(r.points, r.points.length - 1)].concat(attachPoints(r.to).map(function (q) { q.kept = false; return q; }));
    function withStub(q) { return { q: q, s: { x: q.x + q.dx * stub, y: q.y + q.dy * stub } }; }
    function free(a) { /* a new attachment keeps off the ends other connectors already have, so two arrowheads never coincide */
      if (a.q.kept) return true;
      return !taken.some(function (t) { return Math.abs(t.x - a.q.x) < G.step * 2 && Math.abs(t.y - a.q.y) < G.step * 2; });
    }
    starts = starts.map(withStub).filter(function (a) { return free(a) && !blocked({ x: a.q.x, y: a.q.y }, a.s); });
    goals = goals.map(withStub).filter(function (a) { return free(a) && !blocked({ x: a.q.x, y: a.q.y }, a.s); });
    if (!starts.length || !goals.length) return null;

    var xs = {}, ys = {}, minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    function line(x, y) { xs[Math.round(x * 2)] = x; ys[Math.round(y * 2)] = y; }
    obstacles.forEach(function (o) {
      line(o.x, o.y); line(o.x + o.w, o.y + o.h);
      minX = Math.min(minX, o.x); maxX = Math.max(maxX, o.x + o.w); minY = Math.min(minY, o.y); maxY = Math.max(maxY, o.y + o.h);
    });
    starts.concat(goals).forEach(function (a) { line(a.s.x, a.s.y); });
    line(minX - G.margin, minY - G.margin); line(maxX + G.margin, maxY + G.margin);
    var X = Object.keys(xs).map(function (k) { return xs[k]; }).sort(function (a, b) { return a - b; });
    var Y = Object.keys(ys).map(function (k) { return ys[k]; }).sort(function (a, b) { return a - b; });
    function ix(x) { var lo = 0, hi = X.length - 1; while (lo < hi) { var mid = (lo + hi) >> 1; if (X[mid] < x - 0.25) lo = mid + 1; else hi = mid; } return lo; }
    function iy(y) { var lo = 0, hi = Y.length - 1; while (lo < hi) { var mid = (lo + hi) >> 1; if (Y[mid] < y - 0.25) lo = mid + 1; else hi = mid; } return lo; }

    function crowd(a, b) { /* extra cost of a run beside or on another connector's run */
      var c = 0;
      others.forEach(function (o) {
        var vert = Math.abs(a.x - b.x) < 0.5;
        if (vert !== (Math.abs(o.a.x - o.b.x) < 0.5)) return;
        var d = vert ? Math.abs(a.x - o.a.x) : Math.abs(a.y - o.a.y);
        if (d >= G.step * 0.8) return;
        var lo = vert ? Math.max(Math.min(a.y, b.y), Math.min(o.a.y, o.b.y)) : Math.max(Math.min(a.x, b.x), Math.min(o.a.x, o.b.x));
        var hi = vert ? Math.min(Math.max(a.y, b.y), Math.max(o.a.y, o.b.y)) : Math.min(Math.max(a.x, b.x), Math.max(o.a.x, o.b.x));
        if (hi - lo > 1) c += (hi - lo) * 3;
      });
      return c;
    }

    var goalAt = {};
    goals.forEach(function (g) {
      var d = dirIndex(-g.q.dx, -g.q.dy);
      goalAt[ix(g.s.x) + ',' + iy(g.s.y) + ',' + d] = g;
    });
    var best = {}, heap = new Heap();
    starts.forEach(function (a) {
      var d = dirIndex(a.q.dx, a.q.dy), key = ix(a.s.x) + ',' + iy(a.s.y) + ',' + d;
      var cost = stub + (a.q.kept ? 0 : G.unit * 3);
      if (best[key] === undefined || cost < best[key].cost) {
        best[key] = { cost: cost, prev: null, start: a };
        heap.push({ cost: cost, i: ix(a.s.x), j: iy(a.s.y), d: d, key: key });
      }
    });
    var found = null;
    while (heap.a.length) {
      var cur = heap.pop();
      if (!cur.final && cur.cost > best[cur.key].cost + 1e-9) continue;
      if (goalAt[cur.key]) {
        var gl = goalAt[cur.key];
        if (cur.final || gl.q.kept) { found = cur; break; }
        heap.push({ cost: cur.cost + G.unit * 3, i: cur.i, j: cur.j, d: cur.d, key: cur.key, final: true });  /* a new attachment costs a little */
        continue;
      }
      for (var nd = 0; nd < 4; nd++) {
        if ((nd + 2) % 4 === cur.d) continue;                       /* no turning back */
        var ni = cur.i + (nd === 1 ? 1 : nd === 3 ? -1 : 0), nj = cur.j + (nd === 2 ? 1 : nd === 0 ? -1 : 0);
        if (ni < 0 || nj < 0 || ni >= X.length || nj >= Y.length) continue;
        var from = { x: X[cur.i], y: Y[cur.j] }, to = { x: X[ni], y: Y[nj] };
        if (blocked(from, to)) continue;
        var cost = cur.cost + Math.abs(to.x - from.x) + Math.abs(to.y - from.y) + (nd === cur.d ? 0 : bend) + crowd(from, to);
        var key = ni + ',' + nj + ',' + nd;
        if (best[key] === undefined || cost < best[key].cost - 1e-9) {
          best[key] = { cost: cost, prev: cur.key, i: cur.i, j: cur.j };
          heap.push({ cost: cost, i: ni, j: nj, d: nd, key: key });
        }
      }
    }
    if (!found) return null;
    var pts = [], k = found.key;
    while (k !== null) { var b = best[k], idx = k.split(','); pts.unshift({ x: X[+idx[0]], y: Y[+idx[1]] }); if (b.prev === null) { pts.unshift({ x: b.start.q.x, y: b.start.q.y }); } k = b.prev; }
    var goal = goalAt[found.key];
    pts.push({ x: goal.q.x, y: goal.q.y });
    return dedupe(pts).filter(function (q, n, a) { /* drop a point in the middle of a straight run */
      if (n === 0 || n === a.length - 1) return true;
      return !((Math.abs(a[n - 1].x - q.x) < 0.01 && Math.abs(q.x - a[n + 1].x) < 0.01) || (Math.abs(a[n - 1].y - q.y) < 0.01 && Math.abs(q.y - a[n + 1].y) < 0.01));
    });
  }

  /* Route again every connector that still runs through zone writing or a node that is not its own.
     `nodesToo` is false for an ELK layout, which already keeps connectors off the nodes. */
  U.avoidWriting = function (p, nodesToo) {
    var boxes = ownBoxes(p);
    var routes = p.rels.filter(function (r) { return !r.self && r.points && r.points.length > 1; });
    function crossing(r) {
      for (var i = 0; i + 1 < r.points.length; i++) {
        for (var k = 0; k < boxes.length; k++) {
          var b = boxes[k];
          if (b.node && (!nodesToo || b.owner === r.from || b.owner === r.to)) continue;
          if (b.zone && (!nodesToo || holders(r.from).indexOf(b.owner) >= 0 || holders(r.to).indexOf(b.owner) >= 0)) continue;
          if (crosses(r.points[i], r.points[i + 1], b.rc)) return true;
        }
      }
      return false;
    }
    var borders = [];      /* a run beside a zone's border reads as part of it: it costs as a parallel connector does */
    p.zones.forEach(function (z) {
      var x2 = z.x + z.w, y2 = z.y + z.h;
      borders.push({ a: { x: z.x, y: z.y }, b: { x: x2, y: z.y } }, { a: { x: z.x, y: y2 }, b: { x: x2, y: y2 } },
        { a: { x: z.x, y: z.y }, b: { x: z.x, y: y2 } }, { a: { x: x2, y: z.y }, b: { x: x2, y: y2 } });
    });
    routes.forEach(function (r) {
      if (!crossing(r)) return;
      var others = borders.slice();
      routes.forEach(function (o) {
        if (o === r) return;
        for (var i = 0; i + 1 < o.points.length; i++) others.push({ a: o.points[i], b: o.points[i + 1] });
      });
      var taken = [];
      routes.forEach(function (o) { if (o !== r) taken.push(o.points[0], o.points[o.points.length - 1]); });
      var next = findRoute(r, boxes, others, nodesToo, taken);
      if (next && next.length > 1) r.points = next;
    });
  };

  /* ---------- ELK layout ---------- */

  /* One pass: each zone is a compound node holding its nodes and its child zones, with room above
     them for its label (or whatever its `padTop` reserves); nodes outside every zone and all connectors
     sit at the root. ELK lays the whole hierarchy out in one pass (INCLUDE_CHILDREN), so a zone's nodes
     stay inside its box and boxes never overlap. Positions come back relative to the box that holds the
     node and routes relative to the box that holds the edge; both are turned into absolute coordinates
     here. */
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
      var opts = assign({ 'elk.padding': padding(z.headRoom === undefined ? ZM.padTop : z.headRoom, ZM.pad) }, spacing());
      if (z.minW) {
        opts['elk.nodeSize.constraints'] = 'MINIMUM_SIZE';
        opts['elk.nodeSize.minimum'] = '(' + Math.ceil(z.minW) + ',0)';
      }
      boxes[z.id] = { id: 'zone:' + z.id, layoutOptions: opts, children: [] };
    });
    p.zones.forEach(function (z) { (z.parent ? boxes[z.parent.id] : root).children.push(boxes[z.id]); });
    p.nodes.forEach(function (c) { (c.zone ? boxes[c.zone.id].children : root.children).push(elkNode(c)); });
    return elk.layout(root).then(function (out) {
      var at = { root: { x: 0, y: 0 } };
      var byName = {};
      p.nodes.forEach(function (c) { byName[c.name] = c; });
      function place(node, off) {
        if (node.id.indexOf('zone:') !== 0) {
          var c = byName[node.id];
          c.x = off.x + node.x;
          c.y = off.y + node.y + c.padTop;
          return;
        }
        var z = p.zoneById[node.id.slice(5)];
        z.x = off.x + node.x; z.y = off.y + node.y; z.w = node.width; z.h = node.height;
        at[node.id] = { x: z.x, y: z.y };
        (node.children || []).forEach(function (n) { place(n, at[node.id]); });
      }
      out.children.forEach(function (ch) { place(ch, at.root); });
      var edges = {};
      (out.edges || []).forEach(function (ed) { edges[ed.id] = ed; });
      p.rels.forEach(function (r) {
        if (r.self) return;
        var ed = edges[r.id];
        var sec = ed && ed.sections && ed.sections[0];
        if (!sec) throw new Error('the layout returned no route for the relationship ' + endName(r.from) + ' to ' + endName(r.to));
        var off = at[ed.container] || at.root;
        var pts = [sec.startPoint].concat(sec.bendPoints || [], [sec.endPoint])
          .map(function (q) { return { x: q.x + off.x, y: q.y + off.y }; });
        if (r.flip) pts.reverse();
        r.points = pts;
      });
      fitRoutes(p);
      U.clearZoneLabels(p);
      U.avoidWriting(p, false);
      return { width: out.width, height: out.height };
    });
  };

  function endName(e) { return e.isZone ? e.label || e.id : e.name; }

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

  /* A grid: nodes in rows and columns, connectors routed through the gaps and gutters. Nodes are
     ordered by zone and each zone starts a new block of rows, so a zone is its block's bounding
     box plus padding and zones never overlap; the nodes outside every zone form the last block,
     with no zone. Every connector runs along the gutter beside its source and the column gap beside
     its target, so no run crosses a node; each gets a lane of its own in a gap or gutter. */
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
        var x0 = s.side === 'T' && c.tab ? c.x + c.tab + G.endInset : c.x;  /* right of a folder tab */
        s.items.forEach(function (it, i) { it.l.ax = x0 + (c.w - (x0 - c.x)) * (i + 1) / (m + 1); });
      } else {
        s.items.sort(function (u, v) { return u.l.laneY - v.l.laneY; });
        var lo = c.y + (s.side === 'R' && c.tab ? HM.band : 0) + G.endInset, hi = c.y + c.h - G.endInset;
        if (c.tab && hi < lo) lo = hi = c.y + (HM.band + c.h) / 2;   /* a short folder: the middle of its body, on the straight part of the side */
        s.items.forEach(function (it, i) { it.l.by = m === 1 ? (lo + hi) / 2 : lo + (hi - lo) * i / (m - 1); });
      }
    });
    links.forEach(function (l) {
      var a = l.a, b = l.b, bx = l.sideB === 'L' ? b.x : b.x + b.w;
      var ay = l.up ? a.y + (a.tab && l.ax > a.x + a.tab ? HM.band : 0) : a.y + a.h;
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

  /* ---------- nested grid layout (fallback for zones that hold zones) ---------- */

  /* A grid that keeps the nesting: the items of the root and of every zone (its child zones and its
     nodes, in `items` when the zone or `p.items` names them, else the child zones first) are set in rows
     and columns, a zone is its content plus its padding and its label room, so a nested zone always lies
     inside its parent and siblings never overlap. Connectors are simple paths, each leaving the side
     of its source that faces the target and entering the facing side of the target, ends spread along
     a side; a path may cross a box it does not belong to, which the notice says. */
  U.layoutGridNested = function (p) {
    var kids = {}, loose = [];
    p.zones.forEach(function (z) { kids[z.id] = []; });
    p.zones.forEach(function (z) { (z.parent ? kids[z.parent.id] : loose).push(z); });
    p.nodes.forEach(function (c) { (c.zone ? kids[c.zone.id] : loose).push(c); });
    function itemsOf(z) { return (z ? z.items : p.items) || (z ? kids[z.id] : loose); }
    function sizeOf(it) { return it.isZone ? { w: it.w, h: it.h } : { w: it.w + it.padR, h: it.h + it.padTop }; }

    /* items in a grid: positions relative to the grid, and its size */
    function arrange(items) {
      var cols = Math.max(1, Math.round(Math.sqrt(items.length * 1.3))), colW = [], rowH = [], i;
      items.forEach(function (it, k) {
        var sz = sizeOf(it), c = k % cols, r = Math.floor(k / cols);
        colW[c] = Math.max(colW[c] || 0, sz.w);
        rowH[r] = Math.max(rowH[r] || 0, sz.h);
      });
      var xs = [], ys = [], x = 0, y = 0;
      for (i = 0; i < colW.length; i++) { xs[i] = x; x += colW[i] + G.gridGapX; }
      for (i = 0; i < rowH.length; i++) { ys[i] = y; y += rowH[i] + G.gridGapY; }
      return { w: Math.max(0, x - G.gridGapX), h: Math.max(0, y - G.gridGapY),
        at: items.map(function (it, k) { return { it: it, x: xs[k % cols], y: ys[Math.floor(k / cols)] }; }) };
    }

    var grids = {};
    function measure(z) { /* children first: a zone's size comes from its content */
      itemsOf(z).forEach(function (it) { if (it.isZone) measure(it); });
      var g = arrange(itemsOf(z));
      grids[z.id] = g;
      z.w = Math.max(g.w + 2 * ZM.pad, z.minW || 0);
      z.h = (z.headRoom === undefined ? ZM.padTop : z.headRoom) + g.h + ZM.pad;
    }
    function put(items, g, ox, oy) {
      g.at.forEach(function (a) {
        if (a.it.isZone) {
          a.it.x = ox + a.x; a.it.y = oy + a.y;
          put(itemsOf(a.it), grids[a.it.id], a.it.x + ZM.pad, a.it.y + (a.it.headRoom === undefined ? ZM.padTop : a.it.headRoom));
        } else { a.it.x = ox + a.x; a.it.y = oy + a.y + a.it.padTop; }
      });
    }
    p.zones.forEach(function (z) { if (!z.parent) measure(z); });
    var top = arrange(itemsOf(null));
    put(itemsOf(null), top, G.margin, G.margin);

    /* connectors: sides facing each other, ends spread along a side */
    var ends = {};
    function box(e) { return { x: e.x, y: e.y, w: e.w, h: e.h }; }
    function key(e, side) { return endId(e) + '|' + side; }
    var links = [];
    p.rels.forEach(function (r) {
      if (r.self) return;
      var a = box(r.from), b = box(r.to), dx = (b.x + b.w / 2) - (a.x + a.w / 2), dy = (b.y + b.h / 2) - (a.y + a.h / 2);
      var vertical = Math.abs(dy) * (a.w + b.w) >= Math.abs(dx) * (a.h + b.h);
      var l = { r: r, vertical: vertical };
      l.sa = vertical ? (dy >= 0 ? 'B' : 'T') : (dx >= 0 ? 'R' : 'L');
      l.sb = vertical ? (dy >= 0 ? 'T' : 'B') : (dx >= 0 ? 'L' : 'R');
      [[r.from, l.sa, 'a'], [r.to, l.sb, 'b']].forEach(function (q) {
        var k = key(q[0], q[1]);
        (ends[k] = ends[k] || { e: q[0], side: q[1], items: [] }).items.push({ l: l, end: q[2] });
      });
      links.push(l);
    });
    Object.keys(ends).forEach(function (k) {
      var s = ends[k], e = s.e, m = s.items.length, horizontalSide = s.side === 'T' || s.side === 'B';
      var lo = horizontalSide ? e.x + G.endInset : e.y + G.endInset, hi = horizontalSide ? e.x + e.w - G.endInset : e.y + e.h - G.endInset;
      if (e.tab && horizontalSide && s.side === 'T') lo = Math.min(hi, e.x + e.tab + G.endInset);
      if (e.tab && s.side === 'R') lo = e.y + HM.band + G.endInset;
      if (e.tab && s.side === 'R' && hi < lo) lo = hi = e.y + (HM.band + e.h) / 2;  /* a short folder: the middle of its body */
      s.items.sort(function (u, v) {
        var o = function (it) { var q = it.end === 'a' ? it.l.r.to : it.l.r.from; return horizontalSide ? q.x + q.w / 2 : q.y + q.h / 2; };
        return o(u) - o(v);
      });
      s.items.forEach(function (it, i) { it.l['at' + it.end] = lo + (hi - lo) * (i + 1) / (m + 1); });
    });
    function onSide(e, side, t) { /* the point of side `side` of e at position t along it */
      if (side === 'T') return { x: t, y: e.tab && t > e.x + e.tab ? e.y + HM.band : e.y };
      if (side === 'B') return { x: t, y: e.y + e.h };
      return { x: side === 'L' ? e.x : e.x + e.w, y: t };
    }
    var lane = {};
    links.forEach(function (l) {
      var r = l.r, pa = onSide(r.from, l.sa, l.ata), pb = onSide(r.to, l.sb, l.atb);
      var n = (lane[l.sa + l.sb + l.vertical] = (lane[l.sa + l.sb + l.vertical] || 0) + 1) - 1;
      var pts;
      if (l.vertical) {
        var my = (pa.y + pb.y) / 2 + (n % 3 - 1) * G.step;
        pts = [pa, { x: pa.x, y: my }, { x: pb.x, y: my }, pb];
      } else {
        var mx = (pa.x + pb.x) / 2 + (n % 3 - 1) * G.step;
        pts = [pa, { x: mx, y: pa.y }, { x: mx, y: pb.y }, pb];
      }
      r.points = dedupe(pts);
    });

    var w = top.w + 2 * G.margin, h = top.h + 2 * G.margin;
    U.clearZoneLabels(p);
    U.avoidWriting(p, true);
    return { width: w, height: h };
  };

  /* Move the whole drawing (nodes, zones, routes, placed labels) by (dx, dy). */
  U.shiftAll = function (p, dx, dy) {
    function pt(q) { q.x += dx; q.y += dy; }
    p.nodes.forEach(pt);
    p.zones.forEach(pt);
    p.rels.forEach(function (r) {
      (r.points || []).forEach(pt);
      if (r.route && r.route !== r.points) r.route.forEach(pt);
      ['from', 'to', 'center'].forEach(function (k) { if (r.labels[k] && r.labels[k].at) pt(r.labels[k].at); });
    });
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
     Each box overlaps no node, no other label, no end shape and crosses as few runs as it can. The
     boxes are the labels' `at` ({x, y, w, h}, the centre at x + w/2). */
  U.placeLabels = function (p) {
    var solid = [], marks = [], segs = [], placed = [];
    p.zones.forEach(function (z) {
      zoneBoxes(z).forEach(function (b) { solid.push(b); });
    });
    p.nodes.forEach(function (c) {  /* the room reserved for a loop's stacked labels is theirs to use */
      solid.push({ x: c.x, y: c.y - c.padTop, w: c.w + (c.loop && c.loop.stackLabels ? 0 : c.padR), h: c.h + c.padTop });
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
      if (r.stackLabels || !pts || pts.length < 2) return;
      var n = pts.length;
      if (r.labels.from) put(r.labels.from, endCandidates(pts[0], unitVector(pts[0], pts[1]), r.reach.from, r.labels.from));
      if (r.labels.to) put(r.labels.to, endCandidates(pts[n - 1], unitVector(pts[n - 1], pts[n - 2]), r.reach.to, r.labels.to));
    });

    /* A loop that carries three labels (two role names and a name) on a node a band high has no room for
       them beside its runs: a connection that sets `stackLabels` has them in one column right of the
       loop, from the end at the top, the name, to the end at the bottom, centered on the loop. The
       renderer reserves the width (padR) for the widest of the three. */
    p.rels.forEach(function (r, i) {
      var pts = routes[i];
      if (!r.stackLabels || !pts || pts.length < 2) return;
      var labs = [r.labels.from, r.labels.center, r.labels.to].filter(Boolean);
      var x2 = Math.max.apply(null, pts.map(function (q) { return q.x; }));
      var mid = (pts[0].y + pts[pts.length - 1].y) / 2, step = G.labelH + G.pad;
      labs.forEach(function (lab, k) {
        var cy = mid + (k - (labs.length - 1) / 2) * step, x = x2 + G.pad * 2 + lab.w / 2, cands = [{ x: x, y: cy }];
        [1, -1, 2, -2].forEach(function (m, j) { cands.push({ x: x, y: cy + m * step, extra: 1 + j }); });
        put(lab, cands);
      });
    });
    /* a centre label: on a run of its own connector, above or below a horizontal run, beside a vertical one */
    p.rels.forEach(function (r, i) {
      var lab = r.labels.center, pts = routes[i];
      if (r.stackLabels || !lab || !pts || pts.length < 2) return;
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
