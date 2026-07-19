/** Strips any stray prose/markdown fencing a model might wrap JSON in. */
export function extractJson(text: string): string {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : text;
}
