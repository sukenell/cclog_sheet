import { describe, expect, it } from 'vitest';
import { createInitialSidebarOpenState, toggleSidebarOpen } from './sidebar';

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
});
