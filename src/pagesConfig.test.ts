import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('vite GitHub Pages config', () => {
  it('serves assets from the cclog_sheet repository path', () => {
    const source = readFileSync(resolve(process.cwd(), 'vite.config.ts'), 'utf8');

    expect(source).toContain("base: '/cclog_sheet/'");
  });
});
