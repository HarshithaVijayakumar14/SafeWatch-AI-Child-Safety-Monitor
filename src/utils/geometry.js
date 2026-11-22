/**
 * Computational Geometry Utilities for Hazard Zone Detection
 * Used for raycasting, point-in-polygon and Euclidean distance calculations.
 */

/**
 * Check if a point (x, y) is inside a polygon using ray casting algorithm.
 * @param {[number, number]} point [x, y]
 * @param {Array<[number, number]>} polygon Array of [x, y] vertices
 * @returns {boolean}
 */
export function pointInPolygon(point, polygon) {
  if (!polygon || polygon.length < 3) return false;
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Distance squared between two 2D points.
 */
function distSq(p1, p2) {
  const dx = p1[0] - p2[0];
  const dy = p1[1] - p2[1];
  return dx * dx + dy * dy;
}

/**
 * Perpendicular distance from a point to a line segment [v, w].
 */
export function distancePointToSegment(p, v, w) {
  const l2 = distSq(v, w);
  if (l2 === 0) return Math.sqrt(distSq(p, v));
  // Projection factor t
  let t = ((p[0] - v[0]) * (w[0] - v[0]) + (p[1] - v[1]) * (w[1] - v[1])) / l2;
  t = Math.max(0, Math.min(1, t));
  const projection = [v[0] + t * (w[0] - v[0]), v[1] + t * (w[1] - v[1])];
  return {
    distance: Math.sqrt(distSq(p, projection)),
    closestPoint: projection
  };
}

/**
 * Calculates Euclidean distance in pixels from a point to the nearest polygon edge.
 * If point is inside the polygon, returns 0.
 * @param {[number, number]} point [x, y]
 * @param {Array<[number, number]>} polygon Array of vertices
 * @returns {{ distance: number, closestPoint: [number, number], isInside: boolean }}
 */
export function distancePointToPolygon(point, polygon) {
  if (!polygon || polygon.length < 3) {
    return { distance: Infinity, closestPoint: point, isInside: false };
  }

  const isInside = pointInPolygon(point, polygon);
  if (isInside) {
    return { distance: 0, closestPoint: point, isInside: true };
  }

  let minDistance = Infinity;
  let bestPoint = polygon[0];

  for (let i = 0; i < polygon.length; i++) {
    const v = polygon[i];
    const w = polygon[(i + 1) % polygon.length];
    const { distance, closestPoint } = distancePointToSegment(point, v, w);
    if (distance < minDistance) {
      minDistance = distance;
      bestPoint = closestPoint;
    }
  }

  return { distance: minDistance, closestPoint: bestPoint, isInside: false };
}

/**
 * Get ground/foot contact point for a pedestrian bounding box [x1, y1, x2, y2].
 * In Computer Vision, foot contact point is more accurate than center for 2D plane proximity.
 */
export function getBoundingBoxFootPoint(box) {
  if (!box || box.length < 4) return [0, 0];
  const [x1, y1, x2, y2] = box;
  return [(x1 + x2) / 2, y2];
}

/**
 * Get center of bounding box.
 */
export function getBoundingBoxCenter(box) {
  if (!box || box.length < 4) return [0, 0];
  const [x1, y1, x2, y2] = box;
  return [(x1 + x2) / 2, (y1 + y2) / 2];
}

