import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('vite GitHub Pages config', () => {
  it('serves assets from the cclog_sheet repository path', () => {
    const source = readFileSync(resolve(process.cwd(), 'vite.config.ts'), 'utf8');

    expect(source).toContain("base: '/cclog_sheet/'");
  });

  it('keeps InSane out of the default production bundle while allowing dev builds to opt in', () => {
    const config = readFileSync(resolve(process.cwd(), 'vite.config.ts'), 'utf8');
    const insaneStub = readFileSync(resolve(process.cwd(), 'src/lib/insane.production.ts'), 'utf8');
    const insaneAbilityStub = readFileSync(
      resolve(process.cwd(), 'src/lib/insaneAbilities.production.ts'),
      'utf8',
    );

    expect(config).toContain("command === 'serve' || process.env.VITE_ENABLE_INSANE === 'true'");
    expect(config).toContain('insane.production.ts');
    expect(config).toContain('insaneAbilities.production.ts');
    expect(insaneStub).toContain('export const insaneSkillCategories: InsaneSkillCategory[] = [];');
    expect(insaneStub).toContain('export const insaneSpecialtyNames: string[] = [];');
    expect(insaneStub).toContain('abilities: []');
    expect(insaneAbilityStub).toContain('return setInsaneAbilityPresets();');
  });

  it('prepares a static help route for GitHub Pages direct links', () => {
    const packageJson = readFileSync(resolve(process.cwd(), 'package.json'), 'utf8');
    const script = readFileSync(resolve(process.cwd(), 'scripts/prepare-pages.mjs'), 'utf8');

    expect(packageJson).toContain('vite build && node scripts/prepare-pages.mjs');
    expect(script).toContain("mkdir(resolve(distDir, 'help'), { recursive: true })");
    expect(script).toContain("copyFile(indexFile, resolve(distDir, 'help', 'index.html'))");
  });

  it('sets the public preview description metadata', () => {
    const source = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    const previewDescription = '코코포리용 자동화 API 시트 - by Reha';

    expect(source).toContain(`name="description"\n      content="${previewDescription}"`);
    expect(source).toContain(`property="og:description" content="${previewDescription}"`);
    expect(source).toContain(`name="twitter:description" content="${previewDescription}"`);
  });
});
