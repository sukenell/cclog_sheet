import type {
  InsaneAbility,
  InsaneCcfoliaCharacter,
  InsaneRelationship,
  InsaneSession,
  InsaneSheetState,
  InsaneSkillCategory,
  InsaneSpecialtyState,
  InsaneStandingImage,
} from './insane';

export type {
  InsaneAbility,
  InsaneCcfoliaCharacter,
  InsaneRelationship,
  InsaneSession,
  InsaneSheetState,
  InsaneSkillCategory,
  InsaneSpecialtyState,
  InsaneStandingImage,
} from './insane';

export const insaneSkillCategories: InsaneSkillCategory[] = [];
export const insaneSpecialtyNames: string[] = [];
export const insanePaletteRequiredMessage = 'Unavailable';
export const insaneAbilityLimit = 0;

export function createInitialInsaneSheet(): InsaneSheetState {
  return {
    basic: {
      name: '',
      player: '',
      age: '',
      gender: '',
      occupation: '',
      merit: 0,
      color: '',
      imageUrl: '',
      extraImageUrls: [],
      standingImages: [],
    },
    vitals: {
      life: {
        current: 0,
        max: 0,
        incapacitated: false,
        dead: false,
      },
      sanity: {
        current: 0,
        max: 0,
        confused: false,
      },
    },
    curiosity: '',
    fear: '',
    skills: {},
    relationships: [],
    items: {
      painkiller: 0,
      weapon: 0,
      charm: 0,
      scpEnabled: false,
      scpNetLauncher: 0,
      scpMemoryErase: 0,
      scpDetonator: 0,
    },
    abilities: [],
    sessions: [],
    memo: '',
  };
}

export function normalizeInsaneSheet(): InsaneSheetState {
  return createInitialInsaneSheet();
}

export function buildInsaneChatPalette(): string {
  return '';
}

export function buildInsaneCcfoliaCharacter(sheet: InsaneSheetState): InsaneCcfoliaCharacter {
  return {
    kind: 'character',
    data: {
      name: sheet.basic.name.trim(),
      iconUrl: sheet.basic.imageUrl.trim(),
      faces: [],
      status: [],
      params: [],
      color: sheet.basic.color.trim(),
      commands: '',
    },
  };
}

export function serializeInsaneCcfoliaCharacter(sheet: InsaneSheetState): string {
  return JSON.stringify(buildInsaneCcfoliaCharacter(sheet));
}

export function rollInsaneRandomSetup(sheet: InsaneSheetState): InsaneSheetState {
  return sheet;
}

export function calculateInsaneSpecialtyTarget(): number {
  return 12;
}

export function calculateInsaneSanityPenalty(): number {
  return 0;
}

export function calculateInsaneEffectiveSanity(sheet: InsaneSheetState): number {
  return sheet.vitals.sanity.current;
}

export function calculateInsaneEffectiveSanityMax(sheet: InsaneSheetState): number {
  return sheet.vitals.sanity.max;
}

export function getInsaneFearNames(): string[] {
  return [];
}

export function appendInsaneFear(currentValue: string): string {
  return currentValue;
}

export function isDefaultInsaneAbility(): boolean {
  return false;
}

export function getInsanePaletteCopyError(): string | null {
  return insanePaletteRequiredMessage;
}
