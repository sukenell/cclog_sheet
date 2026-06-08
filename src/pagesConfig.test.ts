import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('vite GitHub Pages config', () => {
  it('serves assets from the cclog_sheet repository path', () => {
    const source = readFileSync(resolve(process.cwd(), 'vite.config.ts'), 'utf8');

    expect(source).toContain("base: '/cclog_sheet/'");
  });

  it('sets the public preview description metadata', () => {
    const source = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    const previewDescription = '코코포리용 자동화 API 시트 - by Reha';

    expect(source).toContain(`name="description"\n      content="${previewDescription}"`);
    expect(source).toContain(`property="og:description" content="${previewDescription}"`);
    expect(source).toContain(`name="twitter:description" content="${previewDescription}"`);
  });
});
