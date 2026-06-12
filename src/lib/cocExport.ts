import type { CocEdition, SheetSkill } from './character';
import type { BasicInfo, SanityInfo } from './sheet';

export type CocExportMode = 'full' | 'investedSkills' | 'characteristicsOnly';

export interface CocExportSheet {
  basic: BasicInfo;
  stats: unknown;
  sanity: SanityInfo;
  skills?: SheetSkill[];
  weapons?: unknown[];
  armors?: unknown[];
  spells?: unknown[];
  inventory?: string;
  cash?: string;
  backstory?: Record<string, string>;
  scenarios?: unknown[];
  memo?: string;
  portrait?: string;
}

export function createCocExportArchive<T extends CocExportSheet>(
  sheet: T,
  mode: CocExportMode,
  gameSystem: CocEdition,
): T & { gameSystem: CocEdition; skills?: SheetSkill[] } {
  if (mode === 'investedSkills') {
    return {
      ...sheet,
      gameSystem,
      skills: filterInvestedSkills(sheet.skills ?? []),
    };
  }

  if (mode === 'characteristicsOnly') {
    return {
      ...sheet,
      gameSystem,
      basic: createRedactedBasicInfo(),
      skills: [],
      weapons: [],
      armors: [],
      spells: [],
      inventory: '',
      cash: '',
      backstory: {},
      scenarios: [],
      memo: '',
      portrait: undefined,
    };
  }

  return {
    ...sheet,
    gameSystem,
  };
}

function filterInvestedSkills(skills: SheetSkill[]): SheetSkill[] {
  const includedIds = new Set<string>();

  skills.forEach((skill) => {
    if (!isInvestedSkill(skill)) return;

    includedIds.add(skill.id);
    if (skill.parentId) includedIds.add(skill.parentId);
  });

  return skills.filter((skill) => includedIds.has(skill.id));
}

function isInvestedSkill(skill: SheetSkill): boolean {
  if (skill.isGroup) return false;

  return (
    positive(skill.occupation) +
      positive(skill.interest) +
      positive(skill.growth) +
      positive(skill.other ?? 0) >
    0
  );
}

function positive(value: number): number {
  return Math.max(0, Number.isFinite(value) ? value : 0);
}

function createRedactedBasicInfo(): BasicInfo {
  return {
    name: '비공개 탐사자',
    player: '',
    occupation: '',
    age: '',
    gender: '',
    color: '',
    birthplace: '',
    imageUrl: '',
  };
}
