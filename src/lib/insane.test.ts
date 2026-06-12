import { describe, expect, it } from 'vitest';
import {
  buildInsaneChatPalette,
  buildInsaneCcfoliaCharacter,
  calculateInsaneEffectiveSanity,
  calculateInsaneSanityPenalty,
  calculateInsaneSpecialtyTarget,
  createInitialInsaneSheet,
  getInsanePaletteCopyError,
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
    expect(sheet.items.painkiller).toBe(0);
    expect(sheet.items.weapon).toBe(0);
    expect(sheet.items.charm).toBe(0);
    expect(sheet.items.scpAbilities.map((item) => item.name)).toEqual([
      '네트런처',
      '기억소거',
      '기폭장치',
    ]);
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
  });

  it('requires checked specialties, curiosity, and fear before copying the palette', () => {
    const sheet = createInitialInsaneSheet();

    expect(getInsanePaletteCopyError(sheet)).toBe(insanePaletteRequiredMessage);

    sheet.curiosity = '1. 폭력';
    sheet.fear = '소각';
    sheet.skills.소각.checked = true;

    expect(getInsanePaletteCopyError(sheet)).toBeNull();
  });

  it('calculates specialty targets from checked specialties, curiosity, and fear', () => {
    const sheet = createInitialInsaneSheet();
    sheet.curiosity = '1. 폭력';
    sheet.fear = '소각';
    sheet.skills.소각.checked = true;

    expect(calculateInsaneSpecialtyTarget(sheet, '소각')).toBe(6);
    expect(calculateInsaneSpecialtyTarget(sheet, '고문')).toBe(5);
    expect(calculateInsaneSpecialtyTarget(sheet, '포박')).toBe(6);
    expect(calculateInsaneSpecialtyTarget(sheet, '매장')).toBe(11);
    expect(calculateInsaneSpecialtyTarget(sheet, '연심')).toBe(6);
  });

  it('never lowers a specialty target below five after penalties stack', () => {
    const sheet = createInitialInsaneSheet();
    sheet.curiosity = '1. 폭력';
    sheet.skills.소각.checked = true;

    expect(calculateInsaneSpecialtyTarget(sheet, '소각')).toBe(5);
    expect(calculateInsaneSpecialtyTarget(sheet, '고문')).toBe(5);
  });

  it('subtracts checked mystery specialties from sanity with a six point cap', () => {
    const sheet = createInitialInsaneSheet();
    const mysterySkills =
      insaneSkillCategories.find((category) => category.name === '6. 괴이')?.skills ?? [];

    expect(calculateInsaneSanityPenalty(sheet)).toBe(0);
    expect(calculateInsaneEffectiveSanity(sheet)).toBe(6);

    mysterySkills.slice(0, 8).forEach((name) => {
      sheet.skills[name].checked = true;
    });
    sheet.vitals.sanity.current = 5;

    expect(calculateInsaneSanityPenalty(sheet)).toBe(6);
    expect(calculateInsaneEffectiveSanity(sheet)).toBe(0);

    sheet.vitals.sanity.current = 10;

    expect(calculateInsaneEffectiveSanity(sheet)).toBe(4);
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
    sheet.curiosity = '1. 폭력';
    sheet.fear = '우주';
    sheet.skills.소각.checked = true;
    const palette = buildInsaneChatPalette(sheet);

    expect(palette).toContain('────────🌠Ability');
    expect(palette).toContain('【기본공격】 공격 《소각》');
    expect(palette).toContain('2D6>={소각}');
    expect(palette).toContain('2D6>={우주}');
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
    expect(data.params.find((param) => param.label === '소각')?.value).toBe('6');
    expect(data.params.find((param) => param.label === '매장')?.value).toBe('11');
    expect(data.color).toBe('#68c870');
    expect(data.commands).toContain('2D6>={소각}');
  });

  it('exports Cocofolia status with effective sanity after mystery penalties', () => {
    const sheet = createInitialInsaneSheet();
    sheet.skills.시간.checked = true;
    sheet.skills.혼돈.checked = true;

    const payload = buildInsaneCcfoliaCharacter(sheet);

    expect(payload.data.status.find((status) => status.label === '이성치')?.value).toBe(4);
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
