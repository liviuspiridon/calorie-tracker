export interface Point {
  x: number;
  y: number;
}

/**
 * Smooth cubic-bezier path through arbitrary points — the standard
 * tangent-based control-point technique for a fluid line chart without a
 * charting library. Each point's control points are derived from the
 * direction between its neighbors, scaled by `smoothing`.
 */
export function smoothLinePath(points: Point[], smoothing = 0.2): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  return points.reduce((path, point, index, all) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const [csx, csy] = controlPoint(all[index - 1], all[index - 2], point, false, smoothing);
    const [cex, cey] = controlPoint(point, all[index - 1], all[index + 1], true, smoothing);
    return `${path} C ${csx} ${csy}, ${cex} ${cey}, ${point.x} ${point.y}`;
  }, "");
}

/**
 * Fritsch-Carlson monotone cubic Hermite spline — the same technique behind
 * D3's `curveMonotoneX`. Unlike `smoothLinePath` above (a free tangent-based
 * spline that can overshoot and invent peaks/valleys between points), this
 * clamps each segment's tangents so the curve never exceeds the secant slope
 * between its two endpoints — smooth, but never diverges from what the data
 * actually says. Points must be sorted by ascending x (chronological).
 */
export function monotoneCubicPath(points: Point[]): string {
  const n = points.length;
  if (n === 0) return "";
  if (n === 1) return `M ${points[0].x} ${points[0].y}`;

  const dx: number[] = [];
  const d: number[] = []; // secant slope per segment [0..n-2]
  for (let i = 0; i < n - 1; i++) {
    dx.push(points[i + 1].x - points[i].x);
    d.push((points[i + 1].y - points[i].y) / dx[i]);
  }

  // Initial tangent at each point: average of adjacent secants; flatten to
  // zero at local extrema so the curve doesn't wiggle past the point.
  const m: number[] = new Array(n);
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) {
    m[i] = d[i - 1] === 0 || d[i] === 0 || d[i - 1] > 0 !== d[i] > 0 ? 0 : (d[i - 1] + d[i]) / 2;
  }

  // Clamp tangents per segment (alpha^2 + beta^2 <= 9) so the curve can't overshoot the secant.
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const alpha = m[i] / d[i];
    const beta = m[i + 1] / d[i];
    const s = alpha * alpha + beta * beta;
    if (s > 9) {
      const tau = 3 / Math.sqrt(s);
      m[i] = tau * alpha * d[i];
      m[i + 1] = tau * beta * d[i];
    }
  }

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const c1x = p0.x + dx[i] / 3;
    const c1y = p0.y + (m[i] * dx[i]) / 3;
    const c2x = p1.x - dx[i] / 3;
    const c2y = p1.y - (m[i + 1] * dx[i]) / 3;
    path += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p1.x} ${p1.y}`;
  }
  return path;
}

function segment(a: Point, b: Point): { length: number; angle: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return { length: Math.sqrt(dx * dx + dy * dy), angle: Math.atan2(dy, dx) };
}

/** `previous`/`next` fall back to `current` at the ends of the series. */
function controlPoint(
  current: Point,
  previous: Point | undefined,
  next: Point | undefined,
  reverse: boolean,
  smoothing: number,
): [number, number] {
  const prev = previous ?? current;
  const after = next ?? current;
  const { length, angle } = segment(prev, after);
  const a = angle + (reverse ? Math.PI : 0);
  const dist = length * smoothing;
  return [current.x + Math.cos(a) * dist, current.y + Math.sin(a) * dist];
}
