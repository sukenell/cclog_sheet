import { describe, expect, it } from 'vitest';
import { defaultStats, resolveSkillBase, type InvestigatorStats, type SheetSkill } from '../lib/character';
import {
  createInitialSkills,
  createSpecialtySkill,
  normalizeStoredSkills,
  sortSkillsByKoreanName,
} from './skills';

describe('normalizeStoredSkills', () => {
  it('refreshes built-in skill labels and default base values from current templates', () => {
    const storedSkills = [
      {
        id: 'firearms-rifle',
        name: '사격(소총/산탄총)',
        base: 99,
        occupation: 10,
        interest: 5,
        growth: 0,
        checked: false,
        category: '전투',
      },
      {
        id: 'custom-skill',
        name: '개인 특기',
        base: 40,
        occupation: 0,
        interest: 0,
        other: 3,
        growth: 0,
        checked: false,
        category: '사용자',
        custom: true,
      },
    ] as SheetSkill[];

    const normalized = normalizeStoredSkills(storedSkills, defaultStats);

    expect(normalized.find((skill) => skill.id === 'firearms-rifle')).toMatchObject({
      id: 'firearms-rifle',
      name: '사격(라이플/산탄총)',
      base: 25,
      other: 0,
      occupation: 10,
      interest: 5,
    });
    expect(normalized.find((skill) => skill.id === 'spot-hidden')).toMatchObject({
      id: 'spot-hidden',
      name: '관찰력',
      base: 25,
    });
    expect(normalized.find((skill) => skill.id === 'custom-skill')).toMatchObject({
      id: 'custom-skill',
      name: '개인 특기',
      base: 40,
      other: 3,
    });
  });

  it('adds newly introduced templates to stored sheets', () => {
    const normalized = normalizeStoredSkills([], defaultStats);

    expect(normalized.map((skill) => skill.name)).toEqual(
      expect.arrayContaining(['동물 다루기', '변장', '전자기기', '독순술', '승마']),
    );
  });
});

describe('sortSkillsByKoreanName', () => {
  it('sorts skills by Korean alphabetical order', () => {
    const skills = [
      { id: 'accounting', name: '회계' },
      { id: 'appraise', name: '감정' },
      { id: 'listen', name: '듣기' },
      { id: 'library-use', name: '자료조사' },
    ] as SheetSkill[];

    expect(sortSkillsByKoreanName(skills).map((skill) => skill.name)).toEqual([
      '감정',
      '듣기',
      '자료조사',
      '회계',
    ]);
  });

  it('keeps custom skills below 회피 regardless of their name', () => {
    const skills = [
      { id: 'survival', name: '생존' },
      { id: 'custom-a', name: '가나다', custom: true },
      { id: 'dodge', name: '회피' },
    ] as SheetSkill[];

    expect(sortSkillsByKoreanName(skills).map((skill) => skill.name)).toEqual([
      '생존',
      '회피',
      '가나다',
    ]);
  });

  it('keeps specialty skills directly below their parent group', () => {
    const skills = [
      { id: 'dodge', name: '회피' },
      { id: 'art-craft-cooking', name: '예술/공예(요리)', parentId: 'art-craft', custom: true },
      { id: 'art-craft', name: '예술/공예', isGroup: true },
    ] as SheetSkill[];

    expect(sortSkillsByKoreanName(skills).map((skill) => skill.name)).toEqual([
      '예술/공예',
      '예술/공예(요리)',
      '회피',
    ]);
  });
});

describe('createInitialSkills', () => {
  it('uses the requested Korean labels for renamed built-in skills', () => {
    const skills = createInitialSkills(defaultStats);

    expect(skills.find((skill) => skill.id === 'fighting-brawl')).toMatchObject({
      name: '근접전(격투)',
    });
    expect(skills.find((skill) => skill.id === 'climb')).toMatchObject({
      name: '오르기',
    });
    expect(skills.find((skill) => skill.id === 'credit-rating')).toMatchObject({
      name: '재력',
    });
    expect(skills.find((skill) => skill.id === 'spot-hidden')).toMatchObject({
      name: '관찰력',
    });
  });

  it('marks configurable parent skills as group rows', () => {
    const skills = createInitialSkills(defaultStats);

    expect(skills.find((skill) => skill.id === 'science')).toMatchObject({
      name: '과학',
      isGroup: true,
      base: 1,
    });
    expect(skills.find((skill) => skill.id === 'survival')).toMatchObject({
      name: '생존술',
      isGroup: true,
      base: 10,
    });
    expect(skills.find((skill) => skill.id === 'art-craft')).toMatchObject({
      name: '예술/공예',
      isGroup: true,
      base: 5,
    });
    expect(skills.find((skill) => skill.id === 'language-foreign')).toMatchObject({
      name: '언어(외국어)',
      isGroup: true,
      base: 1,
    });
  });

  it('sets the requested categories for added skills', () => {
    const skills = createInitialSkills(defaultStats);

    expect(skills.find((skill) => skill.name === '변장')).toMatchObject({ category: '기술' });
    expect(skills.find((skill) => skill.name === '전자기기')).toMatchObject({ category: '기술' });
    expect(skills.find((skill) => skill.name === '동물 다루기')).toMatchObject({ category: '지식' });
    expect(skills.find((skill) => skill.name === '독순술')).toMatchObject({ category: '지식' });
    expect(skills.find((skill) => skill.name === '승마')).toMatchObject({ category: '지식' });
  });

  it('uses 6th edition base values and legacy skills when requested', () => {
    const coc6Stats: InvestigatorStats = {
      STR: 10,
      CON: 12,
      POW: 11,
      DEX: 9,
      APP: 13,
      SIZ: 14,
      INT: 15,
      EDU: 16,
      luck: 11,
    };
    const skills = createInitialSkills(coc6Stats, 'coc6');

    expect(skills.find((skill) => skill.id === 'climb')).toMatchObject({
      name: '오르기',
      base: 40,
    });
    expect(skills.find((skill) => skill.id === 'history')).toMatchObject({
      name: '역사',
      base: 20,
    });
    expect(skills.map((skill) => skill.name)).toEqual(
      expect.arrayContaining(['숨기기', '은신', '흥정', '심리학', '사진술']),
    );
    expect(resolveSkillBase(skills.find((skill) => skill.id === 'dodge')!, coc6Stats)).toBe(18);
    expect(resolveSkillBase(skills.find((skill) => skill.id === 'language-own')!, coc6Stats)).toBe(80);
  });
});

describe('createSpecialtySkill', () => {
  it('creates a child skill that inherits the parent base value', () => {
    const parent = {
      id: 'art-craft',
      name: '예술/공예',
      base: 5,
      occupation: 0,
      interest: 0,
      other: 0,
      growth: 0,
      checked: false,
      category: '사회',
      isGroup: true,
    } satisfies SheetSkill;

    expect(createSpecialtySkill(parent, '요리', 'child-id')).toMatchObject({
      id: 'child-id',
      name: '예술/공예(요리)',
      base: 5,
      parentId: 'art-craft',
      custom: true,
      isGroup: false,
    });
  });
});
