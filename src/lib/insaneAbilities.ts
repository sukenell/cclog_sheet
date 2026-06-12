import rawAbilityPresets from '../data/insaneAbilities.json';
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

export const insaneAbilityPresets: InsaneAbilityPreset[] =
  rawAbilityPresets as InsaneAbilityPreset[];

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
