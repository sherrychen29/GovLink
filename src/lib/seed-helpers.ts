// Relative date helpers for curated demo report timestamps.

export function daysAgo(d: number, hour = 14, minute = 0): string {
  const t = new Date();
  t.setDate(t.getDate() - d);
  t.setHours(hour, minute, 0, 0);
  return t.toISOString();
}

export function hoursAgo(h: number, minute = 0): string {
  const t = new Date();
  t.setHours(t.getHours() - h, minute, 0, 0);
  return t.toISOString();
}

export function atOffset(base: string, minutes: number): string {
  return new Date(new Date(base).getTime() + minutes * 60000).toISOString();
}
