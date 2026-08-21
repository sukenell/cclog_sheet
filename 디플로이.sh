#!/usr/bin/env bash
set -euo pipefail

root_dir="$(git rev-parse --show-toplevel)"
cd "$root_dir"

echo "커밋 종류를 선택하세요."
echo "1) feat: 새로운 기능 추가"
echo "2) fix: 버그 및 오류 수정"
echo "3) docs: 문서 수정 (README 파일 등)"
echo "4) style: 코드 포맷팅, 들여쓰기 변경 등 (코드 로직 변경 없음)"
echo "5) refactor: 코드 리팩토링 (기능 추가나 버그 수정 제외)"
echo "6) test: 테스트 코드 추가 또는 수정"
echo "7) chore: 빌드 업무 수정, 패키지 매니저 설정 등 프로덕션 코드에 영향을 주지 않는 기타 변경"
printf "번호를 입력하세요: "
read -r commit_type_number

case "$commit_type_number" in
  1) commit_type="feat" ;;
  2) commit_type="fix" ;;
  3) commit_type="docs" ;;
  4) commit_type="style" ;;
  5) commit_type="refactor" ;;
  6) commit_type="test" ;;
  7) commit_type="chore" ;;
  *)
    echo "잘못된 번호입니다. 1부터 7까지의 번호를 입력하세요."
    exit 1
    ;;
esac

printf "커밋 내용을 입력하세요: "
read -r commit_title

if [[ -z "${commit_title//[[:space:]]/}" ]]; then
  echo "커밋 내용은 비워둘 수 없습니다."
  exit 1
fi

commit_message="${commit_type}. ${commit_title}"

if git show-ref --verify --quiet refs/heads/dev; then
  git switch dev
else
  git switch -c dev
fi

git add -A

if git diff --cached --quiet; then
  echo "커밋할 변경사항이 없습니다. dev 브랜치 푸쉬를 계속합니다."
else
  git commit -m "$commit_message"
fi

git push -u origin dev

npm run build

pages_worktree="$(mktemp -d "${TMPDIR:-/tmp}/cclog-sheet-pages.XXXXXX")"
cleanup_pages_worktree() {
  git worktree remove --force "$pages_worktree" >/dev/null 2>&1 || true
}
trap cleanup_pages_worktree EXIT

git worktree prune
git fetch origin +gh-pages:refs/remotes/origin/gh-pages >/dev/null 2>&1 || true

if git show-ref --verify --quiet refs/remotes/origin/gh-pages; then
  git worktree add --detach "$pages_worktree" origin/gh-pages
elif git show-ref --verify --quiet refs/heads/gh-pages; then
  git worktree add --detach "$pages_worktree" gh-pages
else
  git worktree add --detach "$pages_worktree" HEAD
  git -C "$pages_worktree" switch --orphan gh-pages
  git -C "$pages_worktree" reset --hard
fi

rsync -a --delete --exclude ".git" dist/ "$pages_worktree"/
git -C "$pages_worktree" add -A

if git -C "$pages_worktree" diff --cached --quiet; then
  echo "GitHub Pages에 반영할 변경사항이 없습니다."
else
  git -C "$pages_worktree" commit -m "$commit_message"
fi

git -C "$pages_worktree" push origin HEAD:gh-pages

echo "배포가 완료되었습니다."
