import { describe, expect, it } from 'vitest';
import { splitSkillsIntoColumns } from './skillColumns';
import type { SheetSkill } from './character';

function skill(id: string): SheetSkill {
  return {
    id,
    name: id,
    base: 0,
    occupation: 0,
    interest: 0,
    other: 0,
    growth: 0,
    checked: false,
  };
}

describe('splitSkillsIntoColumns', () => {
  it('keeps skill order while splitting the list into balanced columns', () => {
    const columns = splitSkillsIntoColumns(['a', 'b', 'c', 'd', 'e'].map(skill));

    expect(columns.map((column) => column.map((item) => item.id))).toEqual([
      ['a', 'b', 'c'],
      ['d', 'e'],
    ]);
  });

  it('keeps specialty skills with their parent group at the column boundary', () => {
    const parent = {
      ...skill('art-craft'),
      isGroup: true,
    };
    const child = {
      ...skill('art-craft-cooking'),
      parentId: 'art-craft',
      custom: true,
    };
    const columns = splitSkillsIntoColumns([skill('a'), skill('b'), parent, child, skill('c')]);

    expect(columns.map((column) => column.map((item) => item.id))).toEqual([
      ['a', 'b'],
      ['art-craft', 'art-craft-cooking', 'c'],
    ]);
  });

  it('returns one empty column for an empty list', () => {
    expect(splitSkillsIntoColumns([])).toEqual([[]]);
  });
});
