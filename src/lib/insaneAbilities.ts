import { insaneSpecialtyNames, type InsaneAbility } from './insane';

export interface InsaneAbilityPreset {
  id: number;
  category: string;
  name: string;
  type: string;
  specialty: string;
  specialtyHint: string;
  effect: string;
  note: string;
}

interface AbilityPresetResponse {
  ok: boolean;
  json: () => Promise<unknown>;
}

type AbilityPresetFetcher = (path: string) => Promise<AbilityPresetResponse>;

const localAbilityPresetPath = '/src/data/insaneAbilities.json';

export let insaneAbilityPresets: InsaneAbilityPreset[] = [];

export function setInsaneAbilityPresets(presets: unknown): InsaneAbilityPreset[] {
  insaneAbilityPresets = Array.isArray(presets)
    ? presets.map(normalizeInsaneAbilityPreset).filter((preset): preset is InsaneAbilityPreset => Boolean(preset))
    : [];

  return insaneAbilityPresets;
}

export async function loadInsaneAbilityPresets(
  fetcher: AbilityPresetFetcher = (path) => fetch(path),
): Promise<InsaneAbilityPreset[]> {
  try {
    const response = await fetcher(localAbilityPresetPath);

    if (!response.ok) {
      return setInsaneAbilityPresets([]);
    }

    return setInsaneAbilityPresets(await response.json());
  } catch {
    return setInsaneAbilityPresets([]);
  }
}

export function findInsaneAbilityPreset(name: string): InsaneAbilityPreset | null {
  const normalizedName = name.trim();

  if (!normalizedName) return null;

  return insaneAbilityPresets.find((preset) => preset.name === normalizedName) ?? null;
}

export function resolveInsaneAbilityPresetSpecialty(preset: InsaneAbilityPreset): string {
  const tokens = [preset.specialty, preset.specialtyHint]
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean);
  const matchingSpecialty = tokens.find((token) => insaneSpecialtyNames.includes(token));

  return matchingSpecialty ?? (preset.specialty.trim() || preset.specialtyHint.trim());
}

export function applyInsaneAbilityPreset(
  ability: InsaneAbility,
  preset: InsaneAbilityPreset,
): InsaneAbility {
  return {
    ...ability,
    name: preset.name,
    type: preset.type,
    specialty: resolveInsaneAbilityPresetSpecialty(preset),
    effect: preset.effect,
  };
}

export function renameInsaneAbilityWithPreset(
  ability: InsaneAbility,
  name: string,
  canApplyPreset = true,
): InsaneAbility {
  if (!name.trim()) {
    return {
      ...ability,
      name: '',
      type: '',
      specialty: '',
      effect: '',
    };
  }

  const renamedAbility = { ...ability, name };

  if (!canApplyPreset) return renamedAbility;

  const preset = findInsaneAbilityPreset(name);

  if (!preset) return renamedAbility;

  const completedAbility = applyInsaneAbilityPreset(renamedAbility, preset);

  if (preset.name === '기본공격' && !insaneSpecialtyNames.includes(completedAbility.specialty)) {
    return {
      ...completedAbility,
      specialty: insaneSpecialtyNames.includes(ability.specialty) ? ability.specialty : '',
    };
  }

  return completedAbility;
}

function normalizeInsaneAbilityPreset(value: unknown): InsaneAbilityPreset | null {
  if (!isRecord(value)) return null;

  return {
    id: Number.isFinite(Number(value.id)) ? Number(value.id) : 0,
    category: stringValue(value.category),
    name: stringValue(value.name),
    type: stringValue(value.type),
    specialty: stringValue(value.specialty),
    specialtyHint: stringValue(value.specialtyHint),
    effect: stringValue(value.effect),
    note: stringValue(value.note),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
