export type AppPage = 'sheet' | 'usage';

export function normalizeAppBasePath(basePath: string): string {
  const trimmedBasePath = basePath.trim();
  if (!trimmedBasePath || trimmedBasePath === '/') return '';

  return `/${trimmedBasePath.replace(/^\/+|\/+$/g, '')}`;
}

export function createAppPath(basePath: string, page: AppPage): string {
  const normalizedBasePath = normalizeAppBasePath(basePath);

  if (page === 'usage') {
    return `${normalizedBasePath}/help`;
  }

  return normalizedBasePath ? `${normalizedBasePath}/` : '/';
}

export function getAppPageFromPath(pathname: string, basePath: string): AppPage {
  const normalizedPath = normalizePath(pathname);
  const helpPath = normalizePath(createAppPath(basePath, 'usage'));

  return normalizedPath === helpPath || normalizedPath === '/help' ? 'usage' : 'sheet';
}

function normalizePath(pathname: string): string {
  const trimmedPathname = pathname.trim();
  if (!trimmedPathname || trimmedPathname === '/') return '/';

  return `/${trimmedPathname.replace(/^\/+|\/+$/g, '')}`;
}
