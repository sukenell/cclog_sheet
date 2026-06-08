import { describe, expect, it } from 'vitest';
import { parseSheetArchive, serializeSheetArchive } from './sheetArchive';

describe('sheet JSON archive', () => {
  it('keeps the uploaded portrait data URL in exported and imported JSON', () => {
    const portrait = 'data:image/png;base64,aGVsbG8=';
    const exported = serializeSheetArchive({
      basic: { name: '초상 포함 탐사자' },
      portrait,
    });

    expect(JSON.parse(exported)).toMatchObject({ portrait });
    expect(parseSheetArchive<{ portrait?: string }>(exported)).toMatchObject({ portrait });
  });
});
