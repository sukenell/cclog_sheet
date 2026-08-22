# Input Border and Expression Image Limit Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Restore the legacy input border color and cap COC/InSane expression-image registration at six entries.

**Architecture:** Share one maximum constant across UI and normalization so buttons, local state, saved JSON, and imported data cannot disagree. Keep the accessible focus ring and high-contrast button borders while documenting the intentionally restored input-border contrast exception.

**Tech Stack:** React 18, TypeScript, Vitest, Testing Library, Playwright, CSS, Vite.

---

### Task 1: Cap normalized expression-image data

**Files:**
- Create: `src/lib/standingImages.ts`
- Modify: `src/lib/sheet.ts`
- Modify: `src/lib/insane.ts`
- Test: `src/lib/sheet.test.ts`
- Test: `src/lib/insane.test.ts`

**Step 1: Write failing tests**

- Build seven valid COC standing images and expect only the first six after `normalizeBasicInfo`.
- Build seven valid InSane standing images and seven legacy fallback URLs and expect only the first six valid entries.

**Step 2: Verify RED**

Run: `npm test -- src/lib/sheet.test.ts src/lib/insane.test.ts`

Expected: the new length assertions fail with seven items.

**Step 3: Implement the shared maximum**

Create `MAX_STANDING_IMAGES = 6`. Stop each normalizer after six valid entries and slice the InSane legacy fallback after filtering.

**Step 4: Verify GREEN**

Run: `npm test -- src/lib/sheet.test.ts src/lib/insane.test.ts`

Expected: both test files pass.

**Step 5: Commit**

```bash
git add src/lib/standingImages.ts src/lib/sheet.ts src/lib/insane.ts src/lib/sheet.test.ts src/lib/insane.test.ts
git commit -m "fix(sheet): 표정 이미지 등록 수 제한"
```

### Task 2: Enforce and explain the six-image UI limit

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.a11y.test.tsx`

**Step 1: Write failing UI tests**

- Add six COC rows and verify the Add button is disabled, the count reads `6/6`, and no seventh row appears.
- Repeat through the InSane system selector.
- Verify removing one row enables Add again.

**Step 2: Verify RED**

Run: `npm test -- src/App.a11y.test.tsx`

Expected: Add stays enabled or a seventh row appears.

**Step 3: Implement minimal UI guards**

Import `MAX_STANDING_IMAGES`, guard both add handlers, bind `disabled` at the maximum, and add a persistent visible hint containing the current count and maximum.

**Step 4: Verify GREEN**

Run: `npm test -- src/App.a11y.test.tsx`

Expected: all UI limit and accessibility tests pass.

**Step 5: Commit**

```bash
git add src/App.tsx src/App.a11y.test.tsx
git commit -m "feat(sheet): 표정 이미지 여섯 개 제한 표시"
```

### Task 3: Restore the legacy input border and document the exception

**Files:**
- Modify: `src/styles.css`
- Modify: `e2e/accessibility.spec.ts`
- Modify: `docs/accessibility-test-checklist.md`
- Modify: `README.md`

**Step 1: Write the failing computed-style test**

Expect input, textarea/select, and `.search-field` borders to equal `#444b56`; keep button border ratio at least 3:1, placeholder at least 4.5:1, and focus outline at least 3px.

**Step 2: Verify RED**

Run: `npm run test:a11y -- --grep "legacy input border"`

Expected: input border is still `#8795aa`.

**Step 3: Restore the legacy border**

Add an input-border token set to `#444b56`, apply it only to input-like controls and search wrapper, and retain system colors in forced-colors mode.

**Step 4: Record the known conformance result**

Update the checklist distribution and WCAG 1.4.11 row to `미통과`, including the measured ratio. Add a concise README known-exception note.

**Step 5: Verify and commit**

Run:

```bash
npm test
npm run typecheck
npm run build
npm run test:a11y
git diff --check
```

Expected: all commands exit zero, with the test explicitly documenting rather than concealing the requested contrast exception.

Commit:

```bash
git add src/styles.css e2e/accessibility.spec.ts docs/accessibility-test-checklist.md README.md
git commit -m "style(ui): 기존 입력 보더 대비 복원"
```

### Task 4: Review, synchronize branches, and redeploy Pages

**Files:**
- Verify all changed files and commit history.
- Deploy generated `dist/` to `gh-pages`.

**Step 1:** Run independent specification and code-quality review; fix all Critical/Important findings.

**Step 2:** Re-run the complete verification suite from a clean worktree.

**Step 3:** Push the same HEAD to `dev` first and `main` second, then verify equal SHA and commit counts.

**Step 4:** Build and push `dist/` to `gh-pages`, wait for the Pages build, and verify HTTP 200 plus new asset hashes.
