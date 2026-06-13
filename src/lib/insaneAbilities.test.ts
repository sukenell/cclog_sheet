import { beforeEach, describe, expect, it } from 'vitest';
import { buildInsaneChatPalette, createInitialInsaneSheet } from './insane';
import {
  applyInsaneAbilityPreset,
  findInsaneAbilityPreset,
  insaneAbilityPresets,
  loadInsaneAbilityPresets,
  renameInsaneAbilityWithPreset,
  resolveInsaneAbilityPresetSpecialty,
  setInsaneAbilityPresets,
  type InsaneAbilityPreset,
} from './insaneAbilities';

describe('InSane ability presets', () => {
  const samplePresets: InsaneAbilityPreset[] = [
    {
      id: 0,
      category: '기본',
      name: '기본공격',
      type: '공격',
      specialty: '',
      specialtyHint: '아무거나',
      effect: '목표 1명을 선택해서 명중판정을 한다.',
      note: '',
    },
    {
      id: 4,
      category: '범용',
      name: '저격',
      type: '공격',
      specialty: '사격',
      specialtyHint: '기술 분야에서 아무거나, 사격',
      effect: '몹 1개체를 목표로 선택하여 명중판정을 한다.',
      note: '',
    },
    {
      id: 5,
      category: '범용',
      name: '무술',
      type: '공격',
      specialty: '파괴',
      specialtyHint: '폭력 분야에서 아무거나, 파괴',
      effect: '목표 1명을 선택하여 명중판정을 한다.',
      note: '',
    },
    {
      id: 6,
      category: '범용',
      name: '트릭',
      type: '공격',
      specialty: '',
      specialtyHint: '기술분야에서 아무거나',
      effect: '목표 1명을 선택하여 명중판정을 한다.',
      note: '',
    },
  ];

  beforeEach(() => {
    setInsaneAbilityPresets(samplePresets);
  });

  it('loads ability source data through the local runtime preset loader', async () => {
    const loadedPresets = await loadInsaneAbilityPresets(async (path) => ({
      ok: path === '/src/data/insaneAbilities.json',
      json: async () => samplePresets,
    }));

    expect(loadedPresets).toEqual(samplePresets);
    expect(insaneAbilityPresets).toEqual(samplePresets);
  });

  it('clears presets when the local source is unavailable', async () => {
    const loadedPresets = await loadInsaneAbilityPresets(async () => ({
      ok: false,
      json: async () => {
        throw new Error('not found');
      },
    }));

    expect(loadedPresets).toEqual([]);
    expect(insaneAbilityPresets).toEqual([]);
  });

  it('keeps pasted ability source data out of static imports', () => {
    expect(insaneAbilityPresets[0]).toMatchObject({
      category: '기본',
      name: '기본공격',
      type: '공격',
    });
  });

  it('finds presets by exact ability name after trimming outer whitespace', () => {
    expect(findInsaneAbilityPreset(' 기본공격 ')?.name).toBe('기본공격');
    expect(findInsaneAbilityPreset('기본 공격')).toBeNull();
  });

  it('uses a matching specialty name when the preset contains one', () => {
    expect(resolveInsaneAbilityPresetSpecialty(findInsaneAbilityPreset('저격')!)).toBe('사격');
    expect(resolveInsaneAbilityPresetSpecialty(findInsaneAbilityPreset('무술')!)).toBe('파괴');
    expect(resolveInsaneAbilityPresetSpecialty(findInsaneAbilityPreset('트릭')!)).toBe('기술분야에서 아무거나');
  });

  it('applies preset type, specialty, and effect to an ability row', () => {
    const preset = findInsaneAbilityPreset('기본공격')!;
    const ability = applyInsaneAbilityPreset(
      {
        id: 'ability-test',
        name: '기본공격',
        type: '서포트',
        specialty: '',
        effect: '',
      },
      preset,
    );

    expect(ability).toMatchObject({
      id: 'ability-test',
      name: '기본공격',
      type: '공격',
      specialty: '아무거나',
    });
    expect(ability.effect).toContain('목표 1명을 선택해서 명중판정을 한다.');
  });

  it('clears dependent fields when the ability name is emptied', () => {
    expect(
      renameInsaneAbilityWithPreset({
        id: 'ability-test',
        name: '저격',
        type: '공격',
        specialty: '사격',
        effect: '효과',
      }, ''),
    ).toEqual({
      id: 'ability-test',
      name: '',
      type: '',
      specialty: '',
      effect: '',
    });
  });

  it('keeps basic attack specialty selectable from sheet specialties', () => {
    expect(
      renameInsaneAbilityWithPreset({
        id: 'ability-test',
        name: '',
        type: '',
        specialty: '',
        effect: '',
      }, '기본공격').specialty,
    ).toBe('');

    expect(
      renameInsaneAbilityWithPreset({
        id: 'ability-test',
        name: '',
        type: '',
        specialty: '소각',
        effect: '',
      }, '기본공격').specialty,
    ).toBe('소각');
  });

  it('renames without applying preset details while preset import is locked', () => {
    const ability = {
      id: 'ability-test',
      name: '',
      type: '서포트',
      specialty: '',
      effect: '',
    };

    expect(renameInsaneAbilityWithPreset(ability, '저격', false)).toEqual({
      ...ability,
      name: '저격',
    });
  });

  it('feeds completed preset data into palette copy output', () => {
    const sheet = createInitialInsaneSheet();
    sheet.curiosity = '1. 폭력';
    sheet.fear = '소각';
    sheet.skills.소각.checked = true;
    sheet.abilities = [
      applyInsaneAbilityPreset(
        {
          id: 'ability-test',
          name: '기본공격',
          type: '',
          specialty: '',
          effect: '',
        },
        findInsaneAbilityPreset('기본공격')!,
      ),
    ];

    const palette = buildInsaneChatPalette(sheet);

    expect(palette).toContain('【기본공격】 공격 《아무거나》');
    expect(palette).toContain('목표 1명을 선택해서 명중판정을 한다.');
  });
});
