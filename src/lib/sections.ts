export const sheetSectionIds = [
  'basic',
  'stats',
  'skills',
  'combat',
  'story',
  'scenarios',
  'memo',
] as const;

export type SheetSectionId = (typeof sheetSectionIds)[number];
export type SectionOpenState = Record<SheetSectionId, boolean>;

export function createInitialSectionOpenState(): SectionOpenState {
  return {
    basic: true,
    stats: true,
    skills: false,
    combat: false,
    story: false,
    scenarios: false,
    memo: false,
  };
}

export function toggleSectionOpen(
  state: SectionOpenState,
  sectionId: SheetSectionId,
): SectionOpenState {
  return {
    ...state,
    [sectionId]: !state[sectionId],
  };
}
