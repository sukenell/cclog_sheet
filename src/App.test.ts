import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('topbar archive controls', () => {
  it('keeps JSON import and export controls visible in the toolbar', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    const jsxCommentBlocks = [...source.matchAll(/\{\/\*[\s\S]*?\*\/\}/g)].map(
      ([block]) => block,
    );

    expect(source).toContain('onClick={exportJson}');
    expect(source).toContain('onClick={() => importInputRef.current?.click()}');
    expect(source).toContain('onChange={importJson}');
    expect(
      jsxCommentBlocks.some(
        (block) => block.includes('JSON 내보내기') || block.includes('JSON 가져오기'),
      ),
    ).toBe(false);
  });
});
