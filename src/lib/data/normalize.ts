export function norm(v: string | null | undefined) {
  if (v == null) return null;
  const s = `${v}`.trim().replace(/\s+/g, " ").toLowerCase();
  return s.length ? s : null;
}

export function toNum(v: string | null): number | undefined {
  if (v == null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

