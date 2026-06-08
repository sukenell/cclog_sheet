export type StatKey =
  | 'STR'
  | 'CON'
  | 'POW'
  | 'DEX'
  | 'APP'
  | 'SIZ'
  | 'INT'
  | 'EDU';

export type DynamicBase = 'dexHalf' | 'edu' | 'none';

export interface InvestigatorStats extends Record<StatKey, number> {
  luck: number;
}

export interface DerivedStats {
  hp: number;
  mp: number;
  san: number;
  luck: number;
  damageBonus: string;
  build: number;
  move: number;
}

export interface SheetSkill {
  id: string;
  name: string;
  base: number;
  occupation: number;
  interest: number;
  other: number;
  growth: number;
  checked: boolean;
  category?: string;
  custom?: boolean;
  dynamicBase?: DynamicBase;
  isGroup?: boolean;
  parentId?: string;
}

export type OccupationFormula =
  | 'edu4'
  | 'str2edu2'
  | 'con2edu2'
  | 'pow2edu2'
  | 'dex2edu2'
  | 'app2edu2'
  | 'siz2edu2'
  | 'int2edu2'
  | 'manual';

export interface SkillBudget {
  occupationTotal: number;
  occupationSpent: number;
  occupationRemaining: number;
  interestTotal: number;
  interestSpent: number;
  interestRemaining: number;
}

export interface GrowthResult {
  id: string;
  name: string;
  previousTotal: number;
  increase: number;
  nextGrowth: number;
}

export interface GrowthRollResult {
  skills: SheetSkill[];
  rolledCount: number;
  growthResults: GrowthResult[];
}

export const statLabels: Record<StatKey, string> = {
  STR: '근력',
  CON: '건강',
  POW: '정신력',
  DEX: '민첩',
  APP: '외모',
  SIZ: '크기',
  INT: '지능',
  EDU: '교육',
};

export const occupationFormulaLabels: Record<OccupationFormula, string> = {
  edu4: 'EDU x 4',
  str2edu2: 'STR x 2 + EDU x 2',
  con2edu2: 'CON x 2 + EDU x 2',
  pow2edu2: 'POW x 2 + EDU x 2',
  dex2edu2: 'DEX x 2 + EDU x 2',
  app2edu2: 'APP x 2 + EDU x 2',
  siz2edu2: 'SIZ x 2 + EDU x 2',
  int2edu2: 'INT x 2 + EDU x 2',
  manual: '직접 입력',
};

export const defaultStats: InvestigatorStats = {
  STR: 50,
  CON: 50,
  POW: 50,
  DEX: 50,
  APP: 50,
  SIZ: 50,
  INT: 50,
  EDU: 50,
  luck: 50,
};

const statKeys: StatKey[] = ['STR', 'CON', 'POW', 'DEX', 'APP', 'SIZ', 'INT', 'EDU'];

export function clampPercent(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(99, Math.round(value)));
}

export function half(value: number): number {
  return Math.floor(clampPercent(value) / 2);
}

export function fifth(value: number): number {
  return Math.floor(clampPercent(value) / 5);
}

export function fourFifths(value: number): number {
  return Math.floor((clampPercent(value) * 4) / 5);
}

function d6(rng: () => number): number {
  return Math.floor(rng() * 6) + 1;
}

function roll3d6x5(rng: () => number): number {
  return (d6(rng) + d6(rng) + d6(rng)) * 5;
}

function roll2d6plus6x5(rng: () => number): number {
  return (d6(rng) + d6(rng) + 6) * 5;
}

export function rollInvestigatorStats(rng: () => number = Math.random): InvestigatorStats {
  return {
    STR: roll3d6x5(rng),
    CON: roll3d6x5(rng),
    POW: roll3d6x5(rng),
    DEX: roll3d6x5(rng),
    APP: roll3d6x5(rng),
    SIZ: roll2d6plus6x5(rng),
    INT: roll2d6plus6x5(rng),
    EDU: roll2d6plus6x5(rng),
    luck: roll3d6x5(rng),
  };
}

export function calculateDerivedStats(stats: InvestigatorStats): DerivedStats {
  const strengthAndSize = stats.STR + stats.SIZ;
  const { damageBonus, build } = calculateDamageProfile(strengthAndSize);

  return {
    hp: Math.floor((stats.CON + stats.SIZ) / 10),
    mp: Math.floor(stats.POW / 5),
    san: clampPercent(stats.POW),
    luck: clampPercent(stats.luck),
    damageBonus,
    build,
    move: calculateMove(stats),
  };
}

function calculateDamageProfile(total: number): Pick<DerivedStats, 'damageBonus' | 'build'> {
  if (total <= 64) return { damageBonus: '-2', build: -2 };
  if (total <= 84) return { damageBonus: '-1', build: -1 };
  if (total <= 124) return { damageBonus: '0', build: 0 };
  if (total <= 164) return { damageBonus: '+1d4', build: 1 };
  if (total <= 204) return { damageBonus: '+1d6', build: 2 };

  const extraSteps = Math.floor((total - 205) / 80);
  const dice = 2 + extraSteps;
  return { damageBonus: `+${dice}d6`, build: dice + 1 };
}

function calculateMove(stats: InvestigatorStats): number {
  if (stats.STR < stats.SIZ && stats.DEX < stats.SIZ) return 7;
  if (stats.STR > stats.SIZ && stats.DEX > stats.SIZ) return 9;
  return 8;
}

export function resolveSkillBase(skill: SheetSkill, stats: InvestigatorStats): number {
  if (skill.dynamicBase === 'dexHalf') return half(stats.DEX);
  if (skill.dynamicBase === 'edu') return clampPercent(stats.EDU);
  return clampPercent(skill.base);
}

export function calculateSkillTotal(skill: SheetSkill, stats?: InvestigatorStats): number {
  const base = stats ? resolveSkillBase(skill, stats) : skill.base;
  return clampPercent(
    base +
      positiveNumber(skill.occupation) +
      positiveNumber(skill.interest) +
      positiveNumber(skill.growth) +
      positiveNumber(skill.other ?? 0),
  );
}

export function isSkillGroup(skill: SheetSkill): boolean {
  return Boolean(skill.isGroup);
}

export function applyGrowthRolls(
  skills: SheetSkill[],
  stats: InvestigatorStats,
  rng: () => number = Math.random,
): GrowthRollResult {
  const growthResults: GrowthResult[] = [];
  let rolledCount = 0;

  const nextSkills = skills.map((skill) => {
    if (!skill.checked || isSkillGroup(skill)) return skill;

    rolledCount += 1;
    const previousTotal = calculateSkillTotal(skill, stats);
    const increase = Math.floor(rng() * 10) + 1;
    const nextGrowth = positiveNumber(skill.growth) + increase;

    growthResults.push({
      id: skill.id,
      name: skill.name,
      previousTotal,
      increase,
      nextGrowth,
    });

    return {
      ...skill,
      growth: nextGrowth,
      checked: false,
    };
  });

  return {
    skills: nextSkills,
    rolledCount,
    growthResults,
  };
}

export function calculateOccupationTotal(
  stats: InvestigatorStats,
  formula: OccupationFormula,
  manualValue = 0,
): number {
  switch (formula) {
    case 'str2edu2':
      return stats.STR * 2 + stats.EDU * 2;
    case 'con2edu2':
      return stats.CON * 2 + stats.EDU * 2;
    case 'pow2edu2':
      return stats.POW * 2 + stats.EDU * 2;
    case 'dex2edu2':
      return stats.DEX * 2 + stats.EDU * 2;
    case 'app2edu2':
      return stats.APP * 2 + stats.EDU * 2;
    case 'siz2edu2':
      return stats.SIZ * 2 + stats.EDU * 2;
    case 'int2edu2':
      return stats.INT * 2 + stats.EDU * 2;
    case 'manual':
      return Math.max(0, Math.round(manualValue));
    case 'edu4':
    default:
      return stats.EDU * 4;
  }
}

export function calculateSkillBudget(
  skills: SheetSkill[],
  stats: InvestigatorStats,
  formula: OccupationFormula,
  manualOccupationTotal = 0,
): SkillBudget {
  const occupationTotal = calculateOccupationTotal(stats, formula, manualOccupationTotal);
  const interestTotal = stats.INT * 2;
  const pointSpendingSkills = skills.filter((skill) => !isSkillGroup(skill));
  const occupationSpent = pointSpendingSkills.reduce((sum, skill) => sum + positiveNumber(skill.occupation), 0);
  const interestSpent = pointSpendingSkills.reduce((sum, skill) => sum + positiveNumber(skill.interest), 0);

  return {
    occupationTotal,
    occupationSpent,
    occupationRemaining: occupationTotal - occupationSpent,
    interestTotal,
    interestSpent,
    interestRemaining: interestTotal - interestSpent,
  };
}

export function normalizeStats(stats: InvestigatorStats): InvestigatorStats {
  return {
    ...statKeys.reduce((result, key) => ({ ...result, [key]: clampPercent(stats[key]) }), {} as Record<
      StatKey,
      number
    >),
    luck: clampPercent(stats.luck),
  };
}

export function positiveNumber(value: number): number {
  return Math.max(0, Math.round(Number.isFinite(value) ? value : 0));
}
