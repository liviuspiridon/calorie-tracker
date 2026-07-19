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
