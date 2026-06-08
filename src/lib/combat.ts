export type WeaponCategory =
  | 'melee'
  | 'handgun'
  | 'rifle'
  | 'shotgun'
  | 'automatic'
  | 'heavy'
  | 'other';

export interface CombatWeapon {
  id: string;
  category: WeaponCategory;
  name: string;
  skill: string;
  damage: string;
  range: string;
  attacks: string;
  ammo: string;
  malfunction: string;
  isDefault?: boolean;
}

export interface CombatArmor {
  id: string;
  head: string;
  body: string;
  defense: string;
}

export interface CombatSpell {
  id: string;
  name: string;
  cost: string;
  castTime: string;
  description: string;
}

export const weaponCategoryLabels: Record<WeaponCategory, string> = {
  melee: '근거리',
  handgun: '권총',
  rifle: '라이플',
  shotgun: '산탄총',
  automatic: '자동화기',
  heavy: '폭발물/중화기',
  other: '기타',
};

export const weaponCategories = Object.keys(weaponCategoryLabels) as WeaponCategory[];

export function createDefaultWeapons(): CombatWeapon[] {
  return [
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
  ];
}

export function createDefaultWeapon(category: WeaponCategory, id: string): CombatWeapon {
  return {
    id,
    category,
    name: '',
    skill: getDefaultWeaponSkill(category),
    damage: '',
    range: '',
    attacks: '',
    ammo: '',
    malfunction: '',
  };
}

export function createDefaultArmor(id: string): CombatArmor {
  return {
    id,
    head: '',
    body: '',
    defense: '',
  };
}

export function createDefaultSpell(id: string): CombatSpell {
  return {
    id,
    name: '',
    cost: '',
    castTime: '',
    description: '',
  };
}

export function normalizeWeapons(value: unknown): CombatWeapon[] {
  const defaultWeapon = createDefaultWeapons()[0];
  const source = Array.isArray(value) ? value : [];
  const normalized = source
    .map((weapon) => normalizeWeapon(weapon))
    .filter((weapon): weapon is CombatWeapon => Boolean(weapon));
  const nonDefaultWeapons = normalized.filter((weapon) => weapon.id !== defaultWeapon.id);
  const storedDefaultWeapon = normalized.find((weapon) => weapon.id === defaultWeapon.id);

  return [
    {
      ...defaultWeapon,
      ...storedDefaultWeapon,
      id: defaultWeapon.id,
      category: 'melee',
      name: '비무장',
      skill: '근접전(격투)',
      damage: '1d3+db',
      isDefault: true,
    },
    ...nonDefaultWeapons,
  ];
}

export function normalizeArmors(value: unknown): CombatArmor[] {
  if (typeof value === 'string') {
    const legacyBody = value.trim();
    return legacyBody
      ? [
          {
            id: 'armor-legacy',
            head: '',
            body: legacyBody,
            defense: '',
          },
        ]
      : [];
  }

  if (!Array.isArray(value)) return [];

  return value
    .map((armor) => normalizeArmor(armor))
    .filter((armor): armor is CombatArmor => Boolean(armor));
}

export function normalizeSpells(value: unknown): CombatSpell[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((spell) => normalizeSpell(spell))
    .filter((spell): spell is CombatSpell => Boolean(spell));
}

function getDefaultWeaponSkill(category: WeaponCategory): string {
  if (category === 'melee') return '근접전(격투)';
  if (category === 'handgun') return '사격(권총)';
  if (category === 'rifle' || category === 'shotgun') return '사격(라이플/산탄총)';
  return '';
}

function normalizeWeapon(value: unknown): CombatWeapon | null {
  if (!isRecord(value)) return null;

  const category = normalizeWeaponCategory(value.category, value.skill);
  return {
    id: asString(value.id) || `weapon-${Date.now()}`,
    category,
    name: asString(value.name),
    skill: asString(value.skill) || getDefaultWeaponSkill(category),
    damage: asString(value.damage),
    range: asString(value.range),
    attacks: asString(value.attacks),
    ammo: asString(value.ammo),
    malfunction: asString(value.malfunction),
    isDefault: Boolean(value.isDefault),
  };
}

function normalizeArmor(value: unknown): CombatArmor | null {
  if (!isRecord(value)) return null;

  return {
    id: asString(value.id) || `armor-${Date.now()}`,
    head: asString(value.head),
    body: asString(value.body),
    defense: asString(value.defense),
  };
}

function normalizeSpell(value: unknown): CombatSpell | null {
  if (!isRecord(value)) return null;

  return {
    id: asString(value.id) || `spell-${Date.now()}`,
    name: asString(value.name),
    cost: asString(value.cost),
    castTime: asString(value.castTime),
    description: asString(value.description),
  };
}

function normalizeWeaponCategory(value: unknown, skill: unknown): WeaponCategory {
  if (typeof value === 'string' && value in weaponCategoryLabels) return value as WeaponCategory;

  if (asString(skill).includes('권총')) return 'handgun';
  if (asString(skill).includes('라이플') || asString(skill).includes('산탄총')) return 'rifle';
  if (asString(skill).includes('근접전') || asString(skill).includes('격투')) return 'melee';
  return 'other';
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
