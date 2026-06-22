import { describe, expect, it } from 'vitest';
import {
  buildInsaneChatPalette,
  buildInsaneCcfoliaCharacter,
  appendInsaneFear,
  canAddInsaneAbility,
  calculateInsaneEffectiveSanity,
  calculateInsaneEffectiveSanityMax,
  calculateInsaneSanityPenalty,
  calculateInsaneSpecialtyTarget,
  createInitialInsaneSheet,
  getInsanePaletteCopyError,
  getInsaneFearNames,
  insaneAbilityLimit,
  insaneSkillCategories,
  insanePaletteRequiredMessage,
  isDefaultInsaneAbility,
  normalizeInsaneSheet,
  rollInsaneRandomSetup,
} from './insane';

describe('inSANe sheet model', () => {
  it('matches the six specialty columns from the source sheet', () => {
    expect(insaneSkillCategories.map((category) => category.name)).toEqual([
      '1. 폭력',
      '2. 정서',
      '3. 지각',
      '4. 기술',
      '5. 지식',
      '6. 괴이',
    ]);
    expect(insaneSkillCategories.every((category) => category.skills.length === 11)).toBe(true);
    expect(insaneSkillCategories[0].skills.slice(0, 3)).toEqual(['소각', '고문', '포박']);
    expect(insaneSkillCategories[5].skills.slice(-3)).toEqual(['꿈', '지저', '우주']);
  });

  it('starts with source-sheet default status and core abilities', () => {
    const sheet = createInitialInsaneSheet();

    expect(sheet.vitals.life).toEqual({
      current: 6,
      max: 6,
      incapacitated: false,
      dead: false,
    });
    expect(sheet.vitals.sanity).toEqual({ current: 6, max: 6, confused: false });
    expect(sheet.basic.player).toBe('');
    expect(sheet.basic.extraImageUrls).toEqual([]);
    expect(sheet.basic.standingImages).toEqual([]);
    expect(sheet.items.painkiller).toBe(0);
    expect(sheet.items.weapon).toBe(0);
    expect(sheet.items.charm).toBe(0);
    expect(sheet.items.scpEnabled).toBe(false);
    expect(sheet.items.scpNetLauncher).toBe(0);
    expect(sheet.items.scpMemoryErase).toBe(0);
    expect(sheet.items.scpDetonator).toBe(0);
    expect(sheet.abilities.map((ability) => ability.name)).toEqual(['기본공격', '전장이동']);
  });

  it('keeps additional portrait image URLs in normalized InSane sheets', () => {
    const sheet = normalizeInsaneSheet({
      basic: {
        imageUrl: 'https://example.com/main.png',
        extraImageUrls: [
          'https://example.com/one.png',
          '',
          'https://example.com/two.png',
          10,
        ],
      },
    });

    expect(sheet.basic.imageUrl).toBe('https://example.com/main.png');
    expect(sheet.basic.extraImageUrls).toEqual([
      'https://example.com/one.png',
      '',
      'https://example.com/two.png',
    ]);
    expect(sheet.basic.standingImages).toEqual([
      { label: '추가 1', imageUrl: 'https://example.com/one.png' },
      { label: '추가 3', imageUrl: 'https://example.com/two.png' },
    ]);
  });

  it('keeps labeled standing images in normalized InSane sheets', () => {
    const sheet = normalizeInsaneSheet({
      basic: {
        standingImages: [
          { label: '@미소', imageUrl: 'https://example.com/smile.png' },
          { label: '', imageUrl: 'https://example.com/no-label.png' },
          { label: '@화남', imageUrl: '' },
          { label: '@놀람', imageUrl: 'https://example.com/surprise.png' },
          { label: 10, imageUrl: 'https://example.com/invalid.png' },
        ],
      },
    });

    expect(sheet.basic.standingImages).toEqual([
      { label: '@미소', imageUrl: 'https://example.com/smile.png' },
      { label: '@놀람', imageUrl: 'https://example.com/surprise.png' },
    ]);
  });

  it('keeps fixed numeric SCP item values in normalized InSane sheets', () => {
    const sheet = normalizeInsaneSheet({
      items: {
        scpEnabled: true,
        scpNetLauncher: 2,
        scpMemoryErase: 3,
        scpDetonator: 4,
      },
    });

    expect(sheet.items.scpEnabled).toBe(true);
    expect(sheet.items.scpNetLauncher).toBe(2);
    expect(sheet.items.scpMemoryErase).toBe(3);
    expect(sheet.items.scpDetonator).toBe(4);
    expect(normalizeInsaneSheet({ items: { scpEnabled: false } }).items.scpEnabled).toBe(false);
  });

  it('copies InSane labeled standing images as CCFOLIA faces', () => {
    const sheet = createInitialInsaneSheet();

    sheet.basic.name = '표정 봉마인';
    sheet.basic.imageUrl = ' https://example.com/main.png ';
    sheet.basic.standingImages = [
      { label: ' @미소 ', imageUrl: ' https://example.com/smile.png ' },
      { label: '', imageUrl: 'https://example.com/no-label.png' },
      { label: '@화남', imageUrl: '' },
    ];
    sheet.curiosity = '1. 폭력';
    sheet.fear = '소각';
    sheet.skills.소각.checked = true;

    expect(buildInsaneCcfoliaCharacter(sheet).data).toMatchObject({
      name: '표정 봉마인',
      iconUrl: 'https://example.com/main.png',
      faces: [
        {
          label: '@미소',
          iconUrl: 'https://example.com/smile.png',
        },
      ],
    });
  });

  it('requires checked specialties, curiosity, and fear before copying the palette', () => {
    const sheet = createInitialInsaneSheet();

    expect(getInsanePaletteCopyError(sheet)).toBe(insanePaletteRequiredMessage);

    sheet.curiosity = '1. 폭력';
    sheet.fear = '소각';
    sheet.skills.소각.checked = true;

    expect(getInsanePaletteCopyError(sheet)).toBeNull();
  });

  it('calculates specialty targets from checked specialties and curiosity gap formulas', () => {
    const sheet = createInitialInsaneSheet();
    sheet.curiosity = '1. 폭력';
    sheet.fear = '소각, 고문';
    sheet.skills.소각.checked = true;

    expect(getInsaneFearNames(sheet.fear)).toEqual(['소각', '고문']);
    expect(calculateInsaneSpecialtyTarget(sheet, '소각')).toBe(5);
    expect(calculateInsaneSpecialtyTarget(sheet, '고문')).toBe(6);
    expect(calculateInsaneSpecialtyTarget(sheet, '포박')).toBe(7);
    expect(calculateInsaneSpecialtyTarget(sheet, '매장')).toBe(12);
    expect(calculateInsaneSpecialtyTarget(sheet, '연심')).toBe(6);
    expect(calculateInsaneSpecialtyTarget(sheet, '고통')).toBe(8);
    expect(calculateInsaneSpecialtyTarget(sheet, '분해')).toBe(10);
  });

  it('appends selected fear specialties as a trimmed comma-separated list', () => {
    expect(appendInsaneFear(' 소각, 민속학 ', '우주')).toBe('소각,민속학,우주');
    expect(appendInsaneFear('소각,민속학', '소각')).toBe('소각,민속학');
    expect(appendInsaneFear('', '')).toBe('');
  });

  it('uses the selected curiosity column as the one-point gap in the source sheet formula', () => {
    const sheet = createInitialInsaneSheet();
    sheet.curiosity = '4. 기술';
    sheet.skills.소각.checked = true;

    expect(calculateInsaneSpecialtyTarget(sheet, '소각')).toBe(5);
    expect(calculateInsaneSpecialtyTarget(sheet, '연심')).toBe(7);
    expect(calculateInsaneSpecialtyTarget(sheet, '고통')).toBe(9);
    expect(calculateInsaneSpecialtyTarget(sheet, '분해')).toBe(10);
    expect(calculateInsaneSpecialtyTarget(sheet, '물리학')).toBe(11);
  });

  it('subtracts checked mystery specialties from sanity with a six point cap', () => {
    const sheet = createInitialInsaneSheet();
    const mysterySkills =
      insaneSkillCategories.find((category) => category.name === '6. 괴이')?.skills ?? [];

    expect(calculateInsaneSanityPenalty(sheet)).toBe(0);
    expect(calculateInsaneEffectiveSanity(sheet)).toBe(6);
    expect(calculateInsaneEffectiveSanityMax(sheet)).toBe(6);

    mysterySkills.slice(0, 8).forEach((name) => {
      sheet.skills[name].checked = true;
    });
    sheet.vitals.sanity.current = 5;

    expect(calculateInsaneSanityPenalty(sheet)).toBe(6);
    expect(calculateInsaneEffectiveSanity(sheet)).toBe(0);
    expect(calculateInsaneEffectiveSanityMax(sheet)).toBe(0);

    sheet.vitals.sanity.current = 10;
    sheet.vitals.sanity.max = 12;

    expect(calculateInsaneEffectiveSanity(sheet)).toBe(4);
    expect(calculateInsaneEffectiveSanityMax(sheet)).toBe(6);
  });

  it('allows up to eight InSane abilities in total', () => {
    const sheet = createInitialInsaneSheet();

    expect(insaneAbilityLimit).toBe(8);
    expect(canAddInsaneAbility(sheet)).toBe(true);

    sheet.abilities = Array.from({ length: insaneAbilityLimit }, (_, index) => ({
      id: `ability-${index + 1}`,
      name: `어빌리티 ${index + 1}`,
      type: '서포트',
      specialty: '',
      effect: '',
    }));

    expect(canAddInsaneAbility(sheet)).toBe(false);
  });

  it('recognizes the two fixed default abilities', () => {
    const sheet = createInitialInsaneSheet();

    expect(isDefaultInsaneAbility(sheet.abilities[0])).toBe(true);
    expect(isDefaultInsaneAbility(sheet.abilities[1])).toBe(true);
    expect(
      isDefaultInsaneAbility({
        id: 'ability-custom',
        name: '기본공격',
        type: '공격',
        specialty: '소각',
        effect: '',
      }),
    ).toBe(false);
  });

  it('builds all roll commands using Cocofolia params', () => {
    const sheet = createInitialInsaneSheet();
    sheet.curiosity = '4. 기술';
    sheet.fear = '민속학';
    sheet.skills.소각.checked = true;
    const palette = buildInsaneChatPalette(sheet);

    expect(palette).toContain('『• • • ✎ 호기심: 4. 기술 • • •』\n✥﹤┈┈ 공포심: 민속학 ┈┈﹥✥');
    expect(palette).not.toContain('　✦호기심');
    expect(palette).toContain('▁ ▂ ▃ ▄ ▅ ▆ ▇ ▌　Ability 목록　 ▌ ▇ ▆ ▅ ▄ ▃ ▂ ▁');
    expect(palette).toContain('【기본공격】 공격 《소각》');
    expect(palette).toContain('2D6 - 🎲  ROLL');
    expect(palette).toContain('2D6>={소각} - 🎲 소각 ROLL');
    expect(palette).toContain('2D6>={민속학} - 🎲 민속학 ROLL');
  });

  it('builds a Cocofolia character payload with calculated params', () => {
    const sheet = createInitialInsaneSheet();
    sheet.basic.name = '테스트 캐릭터';
    sheet.basic.imageUrl = 'https://example.com/icon.png';
    sheet.basic.color = '#68c870';
    sheet.vitals.life.current = 5;
    sheet.curiosity = '1. 폭력';
    sheet.fear = '소각';
    sheet.skills.소각.checked = true;

    const payload = buildInsaneCcfoliaCharacter(sheet);
    const data = payload.data;

    expect(payload.kind).toBe('character');
    expect(data.name).toBe('테스트 캐릭터');
    expect(data.iconUrl).toBe('https://example.com/icon.png');
    expect(data.status).toEqual([
      { label: '생명력', value: 5, max: 6 },
      { label: '이성치', value: 6, max: 6 },
    ]);
    expect(data.params).toHaveLength(66);
    expect(data.params.find((param) => param.label === '소각')?.value).toBe('5');
    expect(data.params.find((param) => param.label === '매장')?.value).toBe('12');
    expect(data.color).toBe('#68c870');
    expect(data.commands).toContain('2D6>={소각}');
  });

  it('exports Cocofolia status with effective sanity after mystery penalties', () => {
    const sheet = createInitialInsaneSheet();
    sheet.skills.시간.checked = true;
    sheet.skills.혼돈.checked = true;

    const payload = buildInsaneCcfoliaCharacter(sheet);

    expect(payload.data.status.find((status) => status.label === '이성치')?.value).toBe(4);
    expect(payload.data.status.find((status) => status.label === '이성치')?.max).toBe(4);
  });

  it('randomly chooses curiosity, fear, and six checked specialties', () => {
    const sheet = createInitialInsaneSheet();
    const values = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];
    const rolled = rollInsaneRandomSetup(sheet, () => values.shift() ?? 0);

    expect(insaneSkillCategories.map((category) => category.name)).toContain(rolled.curiosity);
    expect(Object.keys(rolled.skills)).toContain(rolled.fear);
    expect(Object.values(rolled.skills).filter((skill) => skill.checked)).toHaveLength(6);
  });
});
