import { describe, expect, it } from 'vitest';
import {
  createAppPath,
  createSheetSectionPath,
  getAppPageFromPath,
  normalizeAppBasePath,
} from './appRoutes';

describe('app route helpers', () => {
  it('builds sheet and disabled usage guide paths under the GitHub Pages base path', () => {
    const basePath = normalizeAppBasePath('/cclog_sheet/');

    expect(createAppPath(basePath, 'sheet')).toBe('/cclog_sheet/');
    expect(createAppPath(basePath, 'usage')).toBe('/cclog_sheet/help');
    expect(createSheetSectionPath(basePath, 'skills')).toBe('/cclog_sheet/#skills');
  });

  it('keeps the sheet open when the disabled usage guide path is requested', () => {
    const basePath = normalizeAppBasePath('/cclog_sheet/');

    expect(getAppPageFromPath('/cclog_sheet/help', basePath)).toBe('sheet');
    expect(getAppPageFromPath('/help', basePath)).toBe('sheet');
    expect(getAppPageFromPath('/cclog_sheet/', basePath)).toBe('sheet');
  });
});
