import { describe, expect, it } from 'vitest';
import {
  createInitialSidebarOpenState,
  responsiveSidebarMediaQuery,
  shouldRevealSidebarAtPageTop,
  toggleSidebarOpen,
} from './sidebar';

describe('sidebar state', () => {
  it('starts open', () => {
    expect(createInitialSidebarOpenState()).toBe(true);
  });

  it('toggles open and closed', () => {
    const closed = toggleSidebarOpen(true);
    const open = toggleSidebarOpen(closed);

    expect(closed).toBe(false);
    expect(open).toBe(true);
  });

  it('uses the stacked sidebar breakpoint shared with the stylesheet', () => {
    expect(responsiveSidebarMediaQuery).toBe('(max-width: 1120px)');
  });

  it('reveals the sidebar at the page top only when opening in the stacked layout', () => {
    expect(shouldRevealSidebarAtPageTop(false, true)).toBe(true);
    expect(shouldRevealSidebarAtPageTop(false, false)).toBe(false);
    expect(shouldRevealSidebarAtPageTop(true, true)).toBe(false);
  });
});
