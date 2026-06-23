import type { InsaneAbility } from './insane';

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

export let insaneAbilityPresets: InsaneAbilityPreset[] = [];

export function setInsaneAbilityPresets(): InsaneAbilityPreset[] {
  insaneAbilityPresets = [];
  return insaneAbilityPresets;
}

export async function loadInsaneAbilityPresets(): Promise<InsaneAbilityPreset[]> {
  return setInsaneAbilityPresets();
}

export function findInsaneAbilityPreset(): InsaneAbilityPreset | null {
  return null;
}

export function resolveInsaneAbilityPresetSpecialty(): string {
  return '';
}

export function applyInsaneAbilityPreset(
  ability: InsaneAbility,
): InsaneAbility {
  return ability;
}

export function renameInsaneAbilityWithPreset(
  ability: InsaneAbility,
  name: string,
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

  return {
    ...ability,
    name,
  };
}
