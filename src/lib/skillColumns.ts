import type { SheetSkill } from './character';

export function splitSkillsIntoColumns(skills: SheetSkill[]): SheetSkill[][] {
  if (skills.length === 0) return [[]];

  const targetSize = Math.ceil(skills.length / 2);
  const groups = groupSkillsByParent(skills);
  const left: SheetSkill[] = [];
  const right: SheetSkill[] = [];
  let shouldFillRight = false;

  groups.forEach((group) => {
    if (!shouldFillRight && left.length > 0) {
      const currentDistance = Math.abs(targetSize - left.length);
      const nextDistance = Math.abs(targetSize - (left.length + group.length));
      shouldFillRight = currentDistance <= nextDistance;
    }

    if (shouldFillRight) {
      right.push(...group);
    } else {
      left.push(...group);
    }
  });

  return right.length ? [left, right] : [left];
}

function groupSkillsByParent(skills: SheetSkill[]): SheetSkill[][] {
  const groups: SheetSkill[][] = [];

  skills.forEach((skill) => {
    const previousGroup = groups[groups.length - 1];
    const previousParent = previousGroup?.[0];

    if (skill.parentId && previousParent?.id === skill.parentId) {
      previousGroup.push(skill);
      return;
    }

    groups.push([skill]);
  });

  return groups;
}
