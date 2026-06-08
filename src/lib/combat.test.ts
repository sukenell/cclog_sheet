import { describe, expect, it } from 'vitest';
import {
  createDefaultArmor,
  createDefaultSpell,
  createDefaultWeapon,
  createDefaultWeapons,
  normalizeArmors,
  normalizeSpells,
  normalizeWeapons,
} from './combat';

describe('combat weapons', () => {
  it('starts with an unarmed melee weapon using brawl and 1d3+db damage', () => {
    expect(createDefaultWeapons()).toEqual([
      {
        id: 'weapon-unarmed',
        category: 'melee',
        name: '비무장',
        skill: '근접전(격투)',
        damage: '1d3+db',
        range: '접촉',
        attacks: '1',
        ammo: '-',
        malfunction: '-',
        isDefault: true,
      },
    ]);
  });

  it('sets the default skill from the selected weapon category', () => {
    expect(createDefaultWeapon('melee', 'a')).toMatchObject({
      category: 'melee',
      skill: '근접전(격투)',
    });
    expect(createDefaultWeapon('handgun', 'b')).toMatchObject({
      category: 'handgun',
      skill: '사격(권총)',
    });
    expect(createDefaultWeapon('rifle', 'c')).toMatchObject({
      category: 'rifle',
      skill: '사격(라이플/산탄총)',
    });
    expect(createDefaultWeapon('shotgun', 'd')).toMatchObject({
      category: 'shotgun',
      skill: '사격(라이플/산탄총)',
    });
  });

  it('normalizes old weapon rows into categorized weapon rows', () => {
    expect(
      normalizeWeapons([
        {
          id: 'legacy-knife',
          name: '칼',
          skill: '근접전(격투)',
          damage: '1d4+db',
        },
      ]),
    ).toEqual([
      createDefaultWeapons()[0],
      expect.objectContaining({
        id: 'legacy-knife',
        category: 'melee',
        name: '칼',
        damage: '1d4+db',
      }),
    ]);
  });
});

describe('combat armor and spells', () => {
  it('migrates the old armor memo into a body armor row', () => {
    expect(normalizeArmors('가죽 재킷 1점')).toEqual([
      {
        id: 'armor-legacy',
        head: '',
        body: '가죽 재킷 1점',
        defense: '',
      },
    ]);
  });

  it('creates blank armor and spell rows for tab add buttons', () => {
    expect(createDefaultArmor('armor-a')).toEqual({
      id: 'armor-a',
      head: '',
      body: '',
      defense: '',
    });
    expect(createDefaultSpell('spell-a')).toEqual({
      id: 'spell-a',
      name: '',
      cost: '',
      castTime: '',
      description: '',
    });
  });

  it('normalizes missing armor and spell collections to empty lists', () => {
    expect(normalizeArmors(undefined)).toEqual([]);
    expect(normalizeSpells(undefined)).toEqual([]);
  });
});
