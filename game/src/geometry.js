// geometry.js — pure 2D geometry for the lasso: distances, path length,
// point-in-polygon tests and polygon area. No DOM, no state; every function
// takes plain {x, y} points so the node test suite can exercise them.

export function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

export function polylineLength(points) {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += dist(points[i - 1], points[i]);
  return total;
}

// Ray-casting point-in-polygon. Polygons with fewer than 3 vertices
// contain nothing.
export function pointInPolygon(pt, poly) {
  if (!poly || poly.length < 3) return false;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    const crosses = (a.y > pt.y) !== (b.y > pt.y);
    if (crosses) {
      const xAtY = a.x + ((pt.y - a.y) / (b.y - a.y)) * (b.x - a.x);
      if (pt.x < xAtY) inside = !inside;
    }
  }
  return inside;
}

// Shoelace area, always positive regardless of winding.
export function polygonArea(poly) {
  if (!poly || poly.length < 3) return 0;
  let sum = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    sum += (poly[j].x + poly[i].x) * (poly[j].y - poly[i].y);
  }
  return Math.abs(sum / 2);
}

// A drawn path counts as closed when it has at least 3 points and its
// end comes back within `threshold` pixels of its start.
export function isClosed(points, threshold) {
  if (!points || points.length < 3) return false;
  return dist(points[0], points[points.length - 1]) <= threshold;
}
