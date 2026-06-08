import type { InvestigatorStats, SheetSkill } from '../lib/character';

interface SkillTemplate {
  id: string;
  name: string;
  base: number;
  category: string;
  dynamicBase?: SheetSkill['dynamicBase'];
  isGroup?: boolean;
}

const templates: SkillTemplate[] = [
  { id: 'appraise', name: '감정', base: 5, category: '탐사' },
  { id: 'fighting-brawl', name: '근접전(격투)', base: 25, category: '전투' },
  { id: 'archaeology', name: '고고학', base: 1, category: '지식' },
  { id: 'science', name: '과학', base: 1, category: '지식', isGroup: true },
  { id: 'spot-hidden', name: '관찰력', base: 25, category: '탐사' },
  { id: 'mechanical-repair', name: '기계수리', base: 10, category: '기술' },
  { id: 'jump', name: '도약', base: 20, category: '운동' },
  { id: 'animal-handling', name: '동물 다루기', base: 5, category: '지식' },
  { id: 'listen', name: '듣기', base: 20, category: '탐사' },
  { id: 'climb', name: '오르기', base: 20, category: '운동' },
  { id: 'read-lips', name: '독순술', base: 1, category: '지식' },
  { id: 'fast-talk', name: '말재주', base: 5, category: '사회' },
  { id: 'charm', name: '매혹', base: 15, category: '사회' },
  { id: 'law', name: '법률', base: 5, category: '지식' },
  { id: 'disguise', name: '변장', base: 5, category: '기술' },
  { id: 'firearms-handgun', name: '사격(권총)', base: 20, category: '전투' },
  { id: 'firearms-rifle', name: '사격(라이플/산탄총)', base: 25, category: '전투' },
  { id: 'survival', name: '생존술', base: 10, category: '운동', isGroup: true },
  { id: 'persuade', name: '설득', base: 10, category: '사회' },
  { id: 'sleight-of-hand', name: '손놀림', base: 10, category: '탐사' },
  { id: 'swim', name: '수영', base: 20, category: '운동' },
  { id: 'ride', name: '승마', base: 5, category: '지식' },
  { id: 'credit-rating', name: '재력', base: 0, category: '사회' },
  { id: 'language-own', name: '언어(모국어)', base: 0, category: '지식', dynamicBase: 'edu' },
  { id: 'language-foreign', name: '언어(외국어)', base: 1, category: '지식', isGroup: true },
  { id: 'history', name: '역사', base: 5, category: '지식' },
  { id: 'locksmith', name: '열쇠공', base: 1, category: '기술' },
  { id: 'art-craft', name: '예술/공예', base: 5, category: '사회', isGroup: true },
  { id: 'occult', name: '오컬트', base: 5, category: '지식' },
  { id: 'intimidate', name: '위협', base: 15, category: '사회' },
  { id: 'stealth', name: '은밀행동', base: 20, category: '탐사' },
  { id: 'first-aid', name: '응급처치', base: 30, category: '기술' },
  { id: 'electronics', name: '전자기기', base: 1, category: '기술' },
  { id: 'medicine', name: '의학', base: 1, category: '기술' },
  { id: 'anthropology', name: '인류학', base: 1, category: '지식' },
  { id: 'drive-auto', name: '자동차 운전', base: 20, category: '운동' },
  { id: 'natural-world', name: '자연', base: 10, category: '지식' },
  { id: 'library-use', name: '자료조사', base: 20, category: '탐사' },
  { id: 'elec-repair', name: '전기수리', base: 10, category: '기술' },
  { id: 'psychoanalysis', name: '정신분석', base: 1, category: '기술' },
  { id: 'pilot', name: '조종', base: 1, category: '운동' },
  { id: 'track', name: '추적', base: 10, category: '탐사' },
  { id: 'computer-use', name: '컴퓨터 사용', base: 5, category: '지식' },
  { id: 'cthulhu-mythos', name: '크툴루 신화', base: 0, category: '지식' },
  { id: 'throw', name: '투척', base: 20, category: '운동' },
  { id: 'navigate', name: '항법', base: 10, category: '운동' },
  { id: 'accounting', name: '회계', base: 5, category: '지식' },
  { id: 'dodge', name: '회피', base: 0, category: '전투', dynamicBase: 'dexHalf' },
];

export const skillCategories = ['전체', ...Array.from(new Set(templates.map((skill) => skill.category)))];

const koreanNameCollator = new Intl.Collator('ko-KR', {
  numeric: true,
  sensitivity: 'base',
});

export function sortSkillsByKoreanName(skills: SheetSkill[]): SheetSkill[] {
  const childrenByParent = new Map<string, SheetSkill[]>();

  skills.forEach((skill) => {
    if (!skill.parentId) return;
    const children = childrenByParent.get(skill.parentId) ?? [];
    children.push(skill);
    childrenByParent.set(skill.parentId, children);
  });

  const emittedIds = new Set<string>();
  const builtInSkills = skills
    .filter((skill) => !skill.custom && !skill.parentId)
    .sort((a, b) => koreanNameCollator.compare(a.name, b.name));
  const sortedSkills = builtInSkills.flatMap((skill) => {
    emittedIds.add(skill.id);
    const childSkills = (childrenByParent.get(skill.id) ?? []).sort((a, b) =>
      koreanNameCollator.compare(a.name, b.name),
    );
    childSkills.forEach((childSkill) => emittedIds.add(childSkill.id));
    return [skill, ...childSkills];
  });
  const orphanChildSkills = skills
    .filter((skill) => skill.parentId && !emittedIds.has(skill.id))
    .sort((a, b) => koreanNameCollator.compare(a.name, b.name));
  const customSkills = skills
    .filter((skill) => skill.custom && !skill.parentId)
    .sort((a, b) => koreanNameCollator.compare(a.name, b.name));

  return [...sortedSkills, ...orphanChildSkills, ...customSkills];
}

export function createInitialSkills(_stats: InvestigatorStats): SheetSkill[] {
  return sortSkillsByKoreanName(
    templates.map((skill) => ({
      ...skill,
      occupation: 0,
      interest: 0,
      other: 0,
      growth: 0,
      checked: false,
    })),
  );
}

export function normalizeStoredSkills(
  storedSkills: SheetSkill[],
  stats: InvestigatorStats,
): SheetSkill[] {
  const currentSkills = createInitialSkills(stats);
  const currentSkillIds = new Set(currentSkills.map((skill) => skill.id));
  const storedSkillById = new Map(storedSkills.map((skill) => [skill.id, skill]));
  const normalizedBuiltInSkills = currentSkills.map((currentSkill) => {
    const storedSkill = storedSkillById.get(currentSkill.id);

    if (!storedSkill) return currentSkill;

    return {
      ...currentSkill,
      occupation: storedSkill.occupation ?? 0,
      interest: storedSkill.interest ?? 0,
      other: storedSkill.other ?? 0,
      growth: storedSkill.growth ?? 0,
      checked: storedSkill.checked ?? false,
    };
  });
  const customOrLegacySkills = storedSkills
    .filter((skill) => skill.custom || !currentSkillIds.has(skill.id))
    .map((skill) => ({
      ...skill,
      other: skill.other ?? 0,
      isGroup: Boolean(skill.isGroup),
    }));

  return sortSkillsByKoreanName([...normalizedBuiltInSkills, ...customOrLegacySkills]);
}

export function createSpecialtySkill(
  parent: SheetSkill,
  specialtyName: string,
  id: string,
): SheetSkill {
  const name = specialtyName.trim();

  return {
    id,
    name: `${parent.name}(${name})`,
    base: parent.base,
    occupation: 0,
    interest: 0,
    other: 0,
    growth: 0,
    checked: false,
    category: parent.category,
    custom: true,
    dynamicBase: parent.dynamicBase,
    parentId: parent.id,
    isGroup: false,
  };
}
