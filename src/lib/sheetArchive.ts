export function serializeSheetArchive(sheet: unknown): string {
  return JSON.stringify(sheet, null, 2);
}

export function parseSheetArchive<T>(text: string): Partial<T> {
  return JSON.parse(text) as Partial<T>;
}
