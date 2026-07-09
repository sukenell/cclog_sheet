export const responsiveSidebarMediaQuery = '(max-width: 1120px)';

export function createInitialSidebarOpenState(): boolean {
  return true;
}

export function toggleSidebarOpen(isOpen: boolean): boolean {
  return !isOpen;
}

export function shouldRevealSidebarAtPageTop(
  isOpen: boolean,
  isResponsiveLayout: boolean,
): boolean {
  return !isOpen && isResponsiveLayout;
}
