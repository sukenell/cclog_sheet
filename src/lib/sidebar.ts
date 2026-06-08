export function createInitialSidebarOpenState(): boolean {
  return true;
}

export function toggleSidebarOpen(isOpen: boolean): boolean {
  return !isOpen;
}
