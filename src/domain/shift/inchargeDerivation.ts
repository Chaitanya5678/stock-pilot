export interface ShiftEntry {
  inchargeId: string;
  effectiveAt: Date;
}

/**
 * Mirrors the reference prototype's getInchargeAt (docs/BUSINESS_RULES.md
 * §8): the entry with the latest effectiveAt that is still <= `at`. Ties on
 * effectiveAt are broken by whichever entry was recorded later — an
 * implementation decision the reference left undefined (docs/DOMAIN.md §7).
 * Callers must pass `entries` in ascending insertion order (e.g. ascending
 * createdAt) for the tie-break to be deterministic. Returns null if no
 * entry applies yet.
 */
export function deriveInchargeAt(entries: readonly ShiftEntry[], at: Date): string | null {
  let latest: ShiftEntry | null = null;

  for (const entry of entries) {
    if (entry.effectiveAt.getTime() > at.getTime()) continue;
    if (!latest || entry.effectiveAt.getTime() >= latest.effectiveAt.getTime()) {
      latest = entry;
    }
  }

  return latest ? latest.inchargeId : null;
}
