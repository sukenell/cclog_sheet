import { describe, expect, it } from 'vitest';
import { buildCharacterClipboardPayload, serializeCharacterClipboardPayload } from './clipboardExport';
import type { InvestigatorStats, SheetSkill } from './character';
import type { SanityInfo } from './sheet';

const stats: InvestigatorStats = {
  STR: 60,
  CON: 70,
  POW: 55,
  DEX: 80,
  APP: 45,
  SIZ: 65,
  INT: 50,
  EDU: 75,
  luck: 40,
};

const sanity: SanityInfo = {
  current: 47,
  temporaryInsanity: false,
  indefiniteInsanity: false,
};

const skills: SheetSkill[] = [
  {
    id: 'spot-hidden',
    name: '관찰력',
    base: 25,
    occupation: 20,
    interest: 3,
    other: 2,
    growth: 5,
    checked: false,
  },
  {
    id: 'dodge',
    name: '회피',
    base: 0,
    occupation: 10,
    interest: 0,
    other: 0,
    growth: 0,
    checked: false,
    dynamicBase: 'dexHalf',
  },
];

describe('buildCharacterClipboardPayload', () => {
  it('builds a character payload from current sheet values', () => {
    const payload = buildCharacterClipboardPayload({
      name: '누구누구',
      stats,
      sanity,
      skills,
      weapons: [
        {
          name: '비무장',
          damage: '1D3 + DB',
        },
        {
          name: '테스트 검',
          damage: '2D6 + DB',
        },
      ],
    });

    expect(payload).toMatchObject({
      kind: 'character',
      data: {
        name: '누구누구',
        initiative: 80,
        status: [
          { label: 'HP', value: 13, max: 13 },
          { label: 'MP', value: 11, max: 11 },
          { label: '이성', value: 47, max: 55 },
          { label: '행운', value: 40, max: 40 },
        ],
        params: [
          { label: '이동력', value: '8' },
          { label: '체구', value: '1' },
          { label: 'DB', value: '+1d4' },
        ],
      },
    });
    expect(payload.data.commands).toContain('CC<=60  근력');
    expect(payload.data.commands).toContain('CC<={이성}  이성');
    expect(payload.data.commands).toContain('CC<=55  관찰력');
    expect(payload.data.commands).toContain('CC<=50  회피');
    expect(payload.data.commands).toContain('1d3+{DB}  비무장');
    expect(payload.data.commands).toContain('2d6+{DB}  테스트 검');
  });

  it('serializes to clipboard-ready JSON', () => {
    const text = serializeCharacterClipboardPayload(
      buildCharacterClipboardPayload({
        name: '',
        stats,
        sanity,
        skills,
        weapons: [],
      }),
    );

    expect(JSON.parse(text)).toMatchObject({
      kind: 'character',
      data: {
        name: '새로운 탐사자',
      },
    });
  });

  it('exports specialty skills but not parent group rows as commands', () => {
    const payload = buildCharacterClipboardPayload({
      name: '전문화 테스트',
      stats,
      sanity,
      skills: [
        {
          id: 'art-craft',
          name: '예술/공예',
          base: 5,
          occupation: 0,
          interest: 0,
          other: 0,
          growth: 0,
          checked: false,
          isGroup: true,
        },
        {
          id: 'art-craft-cooking',
          name: '예술/공예(요리)',
          base: 5,
          occupation: 10,
          interest: 5,
          other: 0,
          growth: 0,
          checked: false,
          parentId: 'art-craft',
        },
      ],
      weapons: [],
    });

    expect(payload.data.commands).toContain('CC<=20  예술/공예(요리)');
    expect(payload.data.commands).not.toContain('CC<=5  예술/공예\n');
  });
});
