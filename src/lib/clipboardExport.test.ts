import { describe, expect, it } from 'vitest';
import {
  buildCharacterClipboardPayload,
  buildSecretDiceRollOptions,
  serializeCharacterClipboardPayload,
  serializeSecretDiceImport,
} from './clipboardExport';
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

describe('secret dice Roll20 import export', () => {
  it('lists selectable characteristic and skill rolls from current sheet values', () => {
    const options = buildSecretDiceRollOptions({
      name: '비밀 탐사자',
      stats,
      sanity,
      skills: [
        ...skills,
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
      ],
      weapons: [],
    });

    expect(options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'stat:STR', kind: 'stat', label: '근력', value: 60 }),
        expect.objectContaining({ id: 'stat:SAN', kind: 'stat', label: '이성', value: 47 }),
        expect.objectContaining({
          id: 'skill:spot-hidden',
          kind: 'skill',
          label: '관찰력',
          value: 55,
          attributeName: 'spothidden',
          templateName: '@{spothidden_txt}',
        }),
        expect.objectContaining({
          id: 'skill:dodge',
          kind: 'skill',
          label: '회피',
          value: 50,
          attributeName: 'dodge',
          templateName: '@{dodge_txt}',
        }),
      ]),
    );
    expect(options.some((option) => option.id === 'skill:art-craft')).toBe(false);
  });

  it('serializes selected rolls as whispered normal secret dice abilities', () => {
    const text = serializeSecretDiceImport(
      {
        name: '비밀 탐사자',
        stats,
        sanity,
        skills,
        weapons: [],
      },
      ['stat:STR', 'skill:spot-hidden'],
      'normal',
    );
    const json = JSON.parse(text.replace('[R20JE:COC7_IMPORT:1]\n', '').replace('\n[/R20JE]', ''));

    expect(text.startsWith('[R20JE:COC7_IMPORT:1]\n')).toBe(true);
    expect(text.endsWith('\n[/R20JE]')).toBe(true);
    expect(json).toMatchObject({
      character: '비밀 탐사자',
      attributes: {
        hp: { current: 13, max: 13 },
        mp: { current: 11, max: 11 },
        str: { current: 60, max: '' },
        spothidden: { current: 55, max: '' },
      },
      abilities: {
        '근력_비밀':
          '/w gm &{template:coc-1}{{name=@{str_txt}}}{{success=[[@{str}]]}}{{hard=[[floor(@{str} /2)]]}}{{extreme=[[floor(@{str}/5)]]}}{{roll1=[[1d100]]}}',
        '관찰력_비밀':
          '/w gm &{template:coc-1}{{name=@{spothidden_txt}}}{{success=[[@{spothidden}]]}}{{hard=[[floor(@{spothidden} /2)]]}}{{extreme=[[floor(@{spothidden}/5)]]}}{{roll1=[[1d100]]}}',
      },
    });
    expect(json.attributes.con).toBeUndefined();
    expect(Object.keys(json.abilities)).toEqual(['근력_비밀', '관찰력_비밀']);
  });

  it('uses pasted Roll20 COC7 variable names for built-in skills', () => {
    const text = serializeSecretDiceImport(
      {
        name: '기능 변수 테스트',
        stats,
        sanity,
        skills: [
          {
            id: 'firearms-handgun',
            name: '사격(권총)',
            base: 20,
            occupation: 10,
            interest: 0,
            other: 0,
            growth: 0,
            checked: false,
          },
          {
            id: 'mechanical-repair',
            name: '기계수리',
            base: 10,
            occupation: 20,
            interest: 0,
            other: 0,
            growth: 0,
            checked: false,
          },
          {
            id: 'credit-rating',
            name: '재력',
            base: 0,
            occupation: 30,
            interest: 0,
            other: 0,
            growth: 0,
            checked: false,
          },
        ],
        weapons: [],
      },
      ['skill:firearms-handgun', 'skill:mechanical-repair', 'skill:credit-rating'],
      'normal',
    );
    const json = JSON.parse(text.replace('[R20JE:COC7_IMPORT:1]\n', '').replace('\n[/R20JE]', ''));

    expect(json.attributes).toMatchObject({
      firearms_hg: { current: 30, max: '' },
      mechrepair: { current: 30, max: '' },
      creditrating: { current: 30, max: '' },
    });
    expect(json.abilities['사격(권총)_비밀']).toContain('{{name=@{firearms_hg_txt}}}');
    expect(json.abilities['기계수리_비밀']).toContain('{{success=[[@{mechrepair}]]}}');
    expect(json.abilities['재력_비밀']).toContain('{{extreme=[[floor(@{creditrating}/5)]]}}');
  });

  it('exports luck with the Roll20 maximum shown on the sheet', () => {
    const text = serializeSecretDiceImport(
      {
        name: '행운 테스트',
        stats,
        sanity,
        skills,
        weapons: [],
      },
      ['stat:LUCK'],
      'normal',
    );
    const json = JSON.parse(text.replace('[R20JE:COC7_IMPORT:1]\n', '').replace('\n[/R20JE]', ''));

    expect(json.attributes.luck).toEqual({ current: 40, max: 99 });
  });

  it('uses the correction dice template when requested', () => {
    const text = serializeSecretDiceImport(
      {
        name: '',
        stats,
        sanity,
        skills,
        weapons: [],
      },
      ['stat:DEX'],
      'bonus',
    );

    expect(text).toContain('/w gm &{template:coc}{{name=@{dex_txt}}}');
    expect(text).not.toContain('template:coc-1');
    expect(text).toContain('"character": "새로운 탐사자"');
  });
});
