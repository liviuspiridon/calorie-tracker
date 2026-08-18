/**
 * Heckbert "nice numbers" algorithm — rounds a raw step to the nearest
 * 1/2/5/10 (scaled by power of ten) so axis ticks land on numbers a human
 * would actually choose (1, 2, 5, 10, 20...), not raw fractions.
 */
function niceNum(range: number, round: boolean): number {
  const exponent = Math.floor(Math.log10(range));
  const fraction = range / 10 ** exponent;
  let niceFraction: number;
  if (round) {
    niceFraction = fraction < 1.5 ? 1 : fraction < 3 ? 2 : fraction < 7 ? 5 : 10;
  } else {
    niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  }
  return niceFraction * 10 ** exponent;
}

/**
 * Round-number tick values for reference lines, e.g. every 1-2kg for a
 * typical body-weight range. Ticks are clamped to [min, max] — callers own
 * the visible domain (e.g. padded above/below the data) independently, so
 * ticks never expand it, only fill in round values within it.
 */
export function computeNiceTicks(min: number, max: number, targetCount = 5): number[] {
  if (min === max) return [min];

  const range = niceNum(max - min, false);
  const step = niceNum(range / (targetCount - 1), true);
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;

  const ticks: number[] = [];
  for (let v = niceMin; v <= niceMax + step * 0.5; v += step) {
    if (v >= min && v <= max) ticks.push(Math.round(v * 10) / 10);
  }
  return ticks;
}
