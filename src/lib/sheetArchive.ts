export type SheetArchiveSystem = 'coc7' | 'insane' | 'unknown';

export function serializeSheetArchive(sheet: unknown): string {
  return JSON.stringify(sheet, null, 2);
}

export function parseSheetArchive<T>(text: string): Partial<T> {
  return JSON.parse(text) as Partial<T>;
}

export function detectSheetArchiveSystem(archive: unknown): SheetArchiveSystem {
  if (!isRecord(archive)) return 'unknown';

  if (archive.gameSystem === 'insane' || archive.system === 'insane') return 'insane';
  if (archive.gameSystem === 'coc7' || archive.system === 'coc7') return 'coc7';

  if (isRecord(archive.vitals) || typeof archive.curiosity === 'string' || typeof archive.fear === 'string') {
    return 'insane';
  }

  if (isRecord(archive.stats) || isRecord(archive.sanity) || Array.isArray(archive.skills)) {
    return 'coc7';
  }

  return 'unknown';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
