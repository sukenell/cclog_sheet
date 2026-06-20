import { describe, expect, it } from 'vitest';
import { createAppPath, getAppPageFromPath, normalizeAppBasePath } from './appRoutes';

describe('app route helpers', () => {
  it('builds sheet and usage guide paths under the GitHub Pages base path', () => {
    const basePath = normalizeAppBasePath('/cclog_sheet/');

    expect(createAppPath(basePath, 'sheet')).toBe('/cclog_sheet/');
    expect(createAppPath(basePath, 'usage')).toBe('/cclog_sheet/help');
  });

  it('opens the usage guide when the current path is /help', () => {
    const basePath = normalizeAppBasePath('/cclog_sheet/');

    expect(getAppPageFromPath('/cclog_sheet/help', basePath)).toBe('usage');
    expect(getAppPageFromPath('/help', basePath)).toBe('usage');
    expect(getAppPageFromPath('/cclog_sheet/', basePath)).toBe('sheet');
  });
});
