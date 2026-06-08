import { describe, expect, it } from 'vitest';
import {
  createInitialSectionOpenState,
  sheetSectionIds,
  toggleSectionOpen,
} from './sections';

describe('section open state', () => {
  it('starts the top sheet cards and characteristics open while the other sheet sections stay collapsed', () => {
    const state = createInitialSectionOpenState();

    expect(sheetSectionIds).toHaveLength(8);
    expect(state.basic).toBe(true);
    expect(state.insaneBasic2).toBe(true);
    expect(state.stats).toBe(true);
    expect(state.skills).toBe(false);
    expect(state.combat).toBe(false);
    expect(state.story).toBe(false);
    expect(state.scenarios).toBe(false);
    expect(state.memo).toBe(false);
  });

  it('toggles one section without changing the others', () => {
    const collapsed = createInitialSectionOpenState();
    const opened = toggleSectionOpen(collapsed, 'skills');

    expect(opened.skills).toBe(true);
    expect(opened.basic).toBe(true);
    expect(toggleSectionOpen(opened, 'skills').skills).toBe(false);
  });
});
