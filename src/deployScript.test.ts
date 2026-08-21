import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('deploy script', () => {
  const scriptPath = resolve(process.cwd(), '디플로이.sh');

  it('asks for a commit type number and title, then builds the required commit message', async () => {
    const script = await readFile(scriptPath, 'utf8');

    expect(script).toContain('1) feat: 새로운 기능 추가');
    expect(script).toContain('2) fix: 버그 및 오류 수정');
    expect(script).toContain('3) docs: 문서 수정 (README 파일 등)');
    expect(script).toContain('4) style: 코드 포맷팅, 들여쓰기 변경 등 (코드 로직 변경 없음)');
    expect(script).toContain('5) refactor: 코드 리팩토링 (기능 추가나 버그 수정 제외)');
    expect(script).toContain('6) test: 테스트 코드 추가 또는 수정');
    expect(script).toContain(
      '7) chore: 빌드 업무 수정, 패키지 매니저 설정 등 프로덕션 코드에 영향을 주지 않는 기타 변경',
    );
    expect(script).toContain('read -r commit_type_number');
    expect(script).toContain('read -r commit_title');
    expect(script).toContain('commit_message="${commit_type}. ${commit_title}"');
  });

  it('commits all current changes, pushes dev, then publishes dist to GitHub Pages', async () => {
    const script = await readFile(scriptPath, 'utf8');

    expect(script).toContain('git switch -c dev');
    expect(script).toContain('git add -A');
    expect(script).toContain('git commit -m "$commit_message"');
    expect(script).toContain('git push -u origin dev');
    expect(script).toContain('npm run build');
    expect(script).toContain('git worktree add');
    expect(script).toContain('gh-pages');
    expect(script).toMatch(/git(?: -C "\$pages_worktree")? push origin .*gh-pages/);
  });
});
