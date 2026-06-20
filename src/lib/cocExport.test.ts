import { describe, expect, it } from 'vitest';
import { createCocExportArchive } from './cocExport';
import type { SheetSkill } from './character';

const skills: SheetSkill[] = [
  {
    id: 'spot-hidden',
    name: '관찰력',
    base: 25,
    occupation: 20,
    interest: 0,
    other: 0,
    growth: 0,
    checked: false,
  },
  {
    id: 'listen',
    name: '듣기',
    base: 20,
    occupation: 0,
    interest: 0,
    other: 0,
    growth: 0,
    checked: false,
  },
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
    occupation: 0,
    interest: 5,
    other: 0,
    growth: 0,
    checked: false,
    parentId: 'art-craft',
  },
];

const sheet = {
  basic: {
    name: '비공개 테스트',
    player: '플레이어',
    occupation: '탐정',
    age: '27',
    gender: '여성',
    color: '#68c870',
    birthplace: '서울',
    imageUrl: 'https://example.com/portrait.png',
    standingImages: [],
  },
  stats: {
    STR: 60,
    CON: 70,
    POW: 55,
    DEX: 80,
    APP: 45,
    SIZ: 65,
    INT: 50,
    EDU: 75,
    luck: 40,
  },
  sanity: { current: 44, temporaryInsanity: true, indefiniteInsanity: false },
  skills,
  weapons: [{ id: 'weapon', name: '권총' }],
  armors: [{ id: 'armor', head: '', body: '', defense: '1' }],
  spells: [{ id: 'spell', name: '주문' }],
  inventory: '비밀 아이템',
  cash: '100',
  backstory: { ideology: '비밀' },
  scenarios: [{ id: 'scenario', title: '비밀 시나리오' }],
  memo: '숨길 메모',
};

describe('createCocExportArchive', () => {
  it('keeps the full COC sheet when exporting without filters', () => {
    expect(createCocExportArchive(sheet, 'full', 'coc7')).toMatchObject({
      gameSystem: 'coc7',
      basic: { name: '비공개 테스트', occupation: '탐정' },
      skills,
      memo: '숨길 메모',
    });
  });

  it('exports only invested skills while keeping parent group rows for invested children', () => {
    const archive = createCocExportArchive(sheet, 'investedSkills', 'coc7');

    expect(archive.skills?.map((skill) => skill.id)).toEqual([
      'spot-hidden',
      'art-craft',
      'art-craft-cooking',
    ]);
  });

  it('redacts every COC field except characteristics and sanity when requested', () => {
    const archive = createCocExportArchive(sheet, 'characteristicsOnly', 'coc6');

    expect(archive).toMatchObject({
      gameSystem: 'coc6',
      basic: { name: '비공개 탐사자', player: '', occupation: '', imageUrl: '' },
      stats: sheet.stats,
      sanity: sheet.sanity,
      skills: [],
      weapons: [],
      armors: [],
      spells: [],
      inventory: '',
      cash: '',
      backstory: {},
      scenarios: [],
      memo: '',
    });
  });
});
