import { describe, expect, it } from 'vitest';
import { detectSheetArchiveSystem, parseSheetArchive, serializeSheetArchive } from './sheetArchive';

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

  it('detects CoC and InSane archive shapes before import', () => {
    expect(
      detectSheetArchiveSystem({
        basic: { name: '탐사자' },
        stats: { STR: 60, DEX: 50 },
        sanity: { current: 50 },
        skills: [],
      }),
    ).toBe('coc7');

    expect(
      detectSheetArchiveSystem({
        basic: { name: '봉마인' },
        vitals: { life: { current: 6 }, sanity: { current: 6 } },
        curiosity: '1. 폭력',
        skills: { 소각: { checked: true, target: 5 } },
      }),
    ).toBe('insane');

    expect(detectSheetArchiveSystem({ basic: { name: '애매한 데이터' } })).toBe('unknown');
  });
});
