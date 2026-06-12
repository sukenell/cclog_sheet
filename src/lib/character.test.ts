import { describe, expect, it } from 'vitest';
import {
  applyGrowthRolls,
  calculateDerivedStats,
  calculateSkillBudget,
  calculateSkillTotal,
  convertInvestigatorStats,
  fourFifths,
  rollInvestigatorStats,
  type InvestigatorStats,
  type SheetSkill,
} from './character';

const baseStats: InvestigatorStats = {
  STR: 50,
  CON: 60,
  POW: 55,
  DEX: 70,
  APP: 40,
  SIZ: 65,
  INT: 80,
  EDU: 75,
  luck: 45,
};

describe('calculateDerivedStats', () => {
  it('derives 7th edition resource values from characteristics', () => {
    expect(calculateDerivedStats(baseStats)).toEqual({
      hp: 12,
      mp: 11,
      san: 55,
      luck: 45,
      damageBonus: '0',
      build: 0,
      move: 8,
    });
  });

  it('derives 6th edition resource values from raw characteristics', () => {
    const coc6Stats: InvestigatorStats = {
      STR: 14,
      CON: 12,
      POW: 11,
      DEX: 9,
      APP: 13,
      SIZ: 16,
      INT: 15,
      EDU: 14,
      luck: 12,
    };

    expect(calculateDerivedStats(coc6Stats, 'coc6')).toEqual({
      hp: 14,
      mp: 11,
      san: 55,
      luck: 60,
      damageBonus: '+1d4',
      build: 0,
      move: 7,
    });
  });
});

describe('convertInvestigatorStats', () => {
  it('converts the current sheet characteristics in place between 7th and 6th edition scales', () => {
    expect(convertInvestigatorStats(baseStats, 'coc7', 'coc6')).toEqual({
      STR: 10,
      CON: 12,
      POW: 11,
      DEX: 14,
      APP: 8,
      SIZ: 13,
      INT: 16,
      EDU: 15,
      luck: 9,
    });

    expect(
      convertInvestigatorStats(
        {
          STR: 10,
          CON: 12,
          POW: 11,
          DEX: 14,
          APP: 8,
          SIZ: 13,
          INT: 16,
          EDU: 15,
          luck: 9,
        },
        'coc6',
        'coc7',
      ),
    ).toEqual(baseStats);
  });
});

describe('fourFifths', () => {
  it('returns the displayed four-fifths threshold for sanity', () => {
    expect(fourFifths(37)).toBe(29);
    expect(fourFifths(50)).toBe(40);
  });
});

describe('calculateSkillBudget', () => {
  it('totals occupation and interest points and reports remaining pools', () => {
    const skills: SheetSkill[] = [
      {
        id: 'library-use',
        name: '자료조사',
        base: 20,
        occupation: 40,
        interest: 10,
        other: 0,
        growth: 0,
        checked: false,
      },
      {
        id: 'listen',
        name: '듣기',
        base: 20,
        occupation: 15,
        interest: 25,
        other: 0,
        growth: 0,
        checked: false,
      },
    ];

    expect(calculateSkillBudget(skills, baseStats, 'edu4')).toEqual({
      occupationTotal: 300,
      occupationSpent: 55,
      occupationRemaining: 245,
      interestTotal: 160,
      interestSpent: 35,
      interestRemaining: 125,
    });
  });

  it('uses 6th edition occupation and interest point multipliers for raw characteristics', () => {
    expect(calculateSkillBudget([], { ...baseStats, INT: 15, EDU: 14 }, 'edu4', 0, 'coc6')).toMatchObject({
      occupationTotal: 280,
      interestTotal: 150,
    });
  });

  it('ignores parent group rows when totaling spent points', () => {
    const skills: SheetSkill[] = [
      {
        id: 'science',
        name: '과학',
        base: 1,
        occupation: 99,
        interest: 99,
        other: 0,
        growth: 0,
        checked: false,
        isGroup: true,
      },
      {
        id: 'science-chemistry',
        name: '과학(화학)',
        base: 1,
        occupation: 20,
        interest: 10,
        other: 0,
        growth: 0,
        checked: false,
        parentId: 'science',
      },
    ];

    expect(calculateSkillBudget(skills, baseStats, 'edu4')).toMatchObject({
      occupationSpent: 20,
      interestSpent: 10,
    });
  });
});

describe('calculateSkillTotal', () => {
  it('adds other modifiers to the displayed skill total', () => {
    const skill = {
      id: 'spot-hidden',
      name: '관찰력',
      base: 25,
      occupation: 20,
      interest: 15,
      other: 12,
      growth: 0,
      checked: false,
    };

    expect(calculateSkillTotal(skill)).toBe(72);
  });
});

describe('applyGrowthRolls', () => {
  it('grows every checked skill by 1d10 and reports details', () => {
    const skills: SheetSkill[] = [
      {
        id: 'spot-hidden',
        name: '관찰력',
        base: 25,
        occupation: 25,
        interest: 0,
        other: 0,
        growth: 0,
        checked: true,
      },
      {
        id: 'listen',
        name: '듣기',
        base: 20,
        occupation: 60,
        interest: 0,
        other: 0,
        growth: 0,
        checked: true,
      },
      {
        id: 'library-use',
        name: '자료조사',
        base: 20,
        occupation: 0,
        interest: 0,
        other: 0,
        growth: 0,
        checked: false,
      },
    ];
    const rolls = [0, 0.9];
    const rng = () => rolls.shift() ?? 0;

    const result = applyGrowthRolls(skills, baseStats, rng);

    expect(result.rolledCount).toBe(2);
    expect(result.growthResults).toEqual([
      {
        id: 'spot-hidden',
        name: '관찰력',
        previousTotal: 50,
        increase: 1,
        nextGrowth: 1,
      },
      {
        id: 'listen',
        name: '듣기',
        previousTotal: 80,
        increase: 10,
        nextGrowth: 10,
      },
    ]);
    expect(result.skills.map((skill) => ({ id: skill.id, growth: skill.growth, checked: skill.checked }))).toEqual([
      { id: 'spot-hidden', growth: 1, checked: false },
      { id: 'listen', growth: 10, checked: false },
      { id: 'library-use', growth: 0, checked: false },
    ]);
  });

  it('does not roll growth for parent group rows', () => {
    const skills: SheetSkill[] = [
      {
        id: 'art-craft',
        name: '예술/공예',
        base: 5,
        occupation: 0,
        interest: 0,
        other: 0,
        growth: 0,
        checked: true,
        isGroup: true,
      },
    ];

    const result = applyGrowthRolls(skills, baseStats, () => 0.9);

    expect(result.rolledCount).toBe(0);
    expect(result.growthResults).toEqual([]);
    expect(result.skills[0]).toMatchObject({ checked: true, growth: 0 });
  });
});

describe('rollInvestigatorStats', () => {
  it('rolls deterministic 7th edition characteristics from an injected RNG', () => {
    const rolls = rollInvestigatorStats(() => 0);

    expect(rolls).toEqual({
      STR: 15,
      CON: 15,
      POW: 15,
      DEX: 15,
      APP: 15,
      SIZ: 40,
      INT: 40,
      EDU: 40,
      luck: 15,
    });
  });

  it('rolls deterministic 6th edition raw characteristics from an injected RNG', () => {
    const rolls = rollInvestigatorStats('coc6', () => 0);

    expect(rolls).toEqual({
      STR: 3,
      CON: 3,
      POW: 3,
      DEX: 3,
      APP: 3,
      SIZ: 8,
      INT: 8,
      EDU: 8,
      luck: 3,
    });
  });
});
