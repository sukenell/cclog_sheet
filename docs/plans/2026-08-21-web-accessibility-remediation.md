# Web Accessibility Remediation Implementation Plan

한국어판: [웹 접근성 결함 수정 구현 계획](./2026-08-21-web-accessibility-remediation-ko.md)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Resolve the confirmed KWCAG 2.2 and WCAG 2.2 AA defects without changing the application's core information architecture or dark visual identity.

**Architecture:** Keep the current single-page React structure, but introduce small reusable accessibility primitives for dialogs, status messages, and focus restoration. Add DOM and browser-level accessibility tests before changing behavior, then remediate names/relationships, keyboard focus, dynamic messages, and visual contrast in that order.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, Testing Library, axe-core, Playwright, CSS.

---

## Chosen approach

Use a **minimal accessibility retrofit**:

- Preserve the sidebar, top toolbar, collapsible sections, tables, and dark theme.
- Preserve the existing field model and input types. `occupation` remains a free-text value, and this accessibility work does not introduce occupation, nationality, or birthplace lookup data.
- Add semantic relationships and keyboard behavior instead of visually redesigning workflows.
- Create only the reusable primitives needed by more than one defect: `ModalDialog`, `LiveMessage`, and focus helpers.
- Treat the generated mockup as a visual direction, not a pixel-perfect specification.

Alternatives not selected:

- A full layout redesign would address density but adds unnecessary product and regression risk.
- A CSS/ARIA-only patch would be faster, but would leave modal lifecycle, dynamic focus, and regression coverage fragile.

## Definition of done

- Every rendered form control has a stable accessible name that includes its row/group context.
- Closed navigation contains no focusable descendants.
- Modal dialogs receive initial focus, contain keyboard focus, close with Escape, and restore the invoking control.
- All interactive elements show a visible keyboard focus indicator, including forced-colors mode.
- Selection, error, and status states are understandable without color.
- Placeholder and non-text control boundaries meet minimum contrast requirements.
- Page reflows at 320 CSS px without document-level horizontal scrolling; data tables may use labeled internal scrolling.
- Automated accessibility checks report no serious or critical violations, and the manual screen-reader checklist passes.
- `npm test`, `npm run typecheck`, `npm run build`, and `npm run test:a11y` all exit with code 0.

## Phase 1 — Regression safety and shared primitives

### Task 1: Add DOM and browser accessibility test infrastructure

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `vite.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/App.a11y.test.tsx`
- Create: `playwright.config.ts`
- Create: `e2e/accessibility.spec.ts`

**Step 1: Install test-only dependencies**

Run:

```bash
npm install --save-dev @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom axe-core @playwright/test @axe-core/playwright
npx playwright install chromium
```

Expected: dependencies are added only to `devDependencies`, and Chromium installs successfully.

**Step 2: Configure Vitest DOM setup**

Add `setupFiles: ['./src/test/setup.ts']` to the existing Vitest configuration. Keep existing source-string tests in the Node environment; annotate only `App.a11y.test.tsx` with `// @vitest-environment jsdom`.

In `src/test/setup.ts`, import `@testing-library/jest-dom/vitest`, call Testing Library cleanup after each test, clear `localStorage`, and provide deterministic `matchMedia`, `scrollIntoView`, and `HTMLDialogElement.showModal/close` shims.

**Step 3: Write the initial failing smoke test**

Render `<App />`, open all sheet sections, run `axe.run(document)`, and assert that serious/critical violations are empty. Add focused tests that query the skill search by label and the combat controls by role.

Run:

```bash
npm test -- src/App.a11y.test.tsx
```

Expected: FAIL on missing labels, tab semantics, or invalid hidden focus targets.

**Step 4: Add Playwright configuration**

Configure Vite as the `webServer`, use the project base URL `/cclog_sheet/`, and add desktop `1280×720`, narrow `320×800`, and short `1280×320` projects.

Add script:

```json
"test:a11y": "playwright test e2e/accessibility.spec.ts"
```

**Step 5: Commit the red test baseline**

```bash
git add package.json package-lock.json vite.config.ts src/test/setup.ts src/App.a11y.test.tsx playwright.config.ts e2e/accessibility.spec.ts
git commit -m "test: add accessibility regression harness"
```

### Task 2: Add reusable dialog and live-message primitives

**Files:**

- Create: `src/components/ModalDialog.tsx`
- Create: `src/components/LiveMessage.tsx`
- Create: `src/components/ModalDialog.test.tsx`
- Create: `src/components/LiveMessage.test.tsx`

**Step 1: Write failing dialog lifecycle tests**

Test that opening the dialog:

- calls native `showModal()`;
- moves focus to an explicitly supplied initial target or the first focusable control;
- handles the native `cancel` event as Escape;
- restores focus to the captured invoker after close.

**Step 2: Write failing live-message tests**

Verify that informational messages use `role="status"` and errors use `role="alert"`, both with `aria-atomic="true"`.

**Step 3: Implement minimal primitives**

`ModalDialog` should render a native `<dialog>`, accept `labelledBy`, `describedBy`, `initialFocusRef`, and `onClose`, and keep the close request controlled by the parent. Do not duplicate manual focus trapping; rely on `showModal()` to make the document outside the dialog inert.

`LiveMessage` should remain mounted when practical so repeated state changes are announced reliably.

**Step 4: Verify and commit**

```bash
npm test -- src/components/ModalDialog.test.tsx src/components/LiveMessage.test.tsx
git add src/components
git commit -m "feat: add accessible dialog and live-message primitives"
```

## Phase 2 — Names, relationships, and keyboard structure

### Task 3: Give every form control a contextual accessible name

**Files:**

- Modify: `src/App.tsx`
- Modify: `src/App.a11y.test.tsx`

**Step 1: Add failing name assertions**

Test representative controls from every repeated structure:

- skill search;
- skill growth checkbox and occupation/interest/growth number cells;
- weapon, armor, and spell row inputs;
- InSane portrait URL, specialty, vitals, relationship, session, and ability inputs;
- hidden JSON file input behavior.

Use role/name queries rather than CSS selectors.

**Step 2: Add persistent labels**

- Give the search field a visible `<label htmlFor="skill-search">기능치 검색</label>`.
- Mark the programmatically opened file input as `hidden`; keep the visible Load button as the only keyboard stop.
- Add `aria-label` values combining row and column context, for example `"권총 피해"` and `"심리학 성장 체크"`.
- Split labels that currently contain two controls into `fieldset/legend` or independent labels.
- Give repeated delete controls the item name, for example `"권총 무기 삭제"`.

**Step 3: Repair table relationships**

Add hidden captions, `scope="col"` to column headers, and `scope="row"` to row names where the first cell identifies the record. Do not rely on a column header alone to name an editable input.

**Step 4: Verify all rendered controls**

Add a test that gathers `input`, `select`, and `textarea` elements and fails when Testing Library cannot resolve a stable accessible name, excluding only genuinely hidden inputs.

Run:

```bash
npm test -- src/App.a11y.test.tsx
npm run typecheck
```

Expected: all name/relationship assertions pass.

**Step 5: Commit**

```bash
git add src/App.tsx src/App.a11y.test.tsx
git commit -m "fix: name form controls and editable tables"
```

### Task 4: Remove hidden focus targets and add reliable page navigation

**Files:**

- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Modify: `src/App.a11y.test.tsx`
- Modify: `e2e/accessibility.spec.ts`

**Step 1: Write failing keyboard tests**

Assert that:

- the first Tab exposes a `본문으로 바로가기` link;
- a closed sidebar has no tabbable descendants;
- activating a sidebar section link moves focus to the section heading;
- the heading remains visible below the sticky topbar.

**Step 2: Implement navigation fixes**

- Insert a skip link as the first focusable element and target `#main-content`.
- Give `<main>` an ID and `tabIndex={-1}`.
- Apply `inert={!isSidebarOpen}` to the sidebar while retaining `aria-hidden` for compatibility.
- When navigating to a section, open it, wait for render, then focus its `tabIndex={-1}` heading.
- Add `scroll-margin-top` matching the sticky header height.
- Set sidebar `overflow-y:auto`; remove document `min-width:320px`.

**Step 3: Verify at all viewports**

```bash
npm run test:a11y -- --grep "navigation|reflow"
```

Expected: no invisible tab stops, no obscured target heading, and no document-level horizontal overflow.

**Step 4: Commit**

```bash
git add src/App.tsx src/styles.css src/App.a11y.test.tsx e2e/accessibility.spec.ts
git commit -m "fix: make sidebar and section navigation keyboard safe"
```

### Task 5: Implement correct tabs and filter states

**Files:**

- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Modify: `src/App.a11y.test.tsx`

**Step 1: Write failing interaction tests**

- Combat tabs expose `role="tab"`, `aria-selected`, `aria-controls`, and matching `tabpanel` IDs.
- Left/Right, Home, and End move and activate the correct tab.
- Skill and weapon category filters expose `aria-pressed` instead of pretending to be tabs.
- Every selected state has a non-color cue such as bold text, a neutral underline, or a pressed/connected shape. Do not add colored rails, dots, or check icons beside tabs.

**Step 2: Implement the WAI-ARIA patterns**

Use a roving `tabIndex` for combat tabs. Keep category filters as regular toggle buttons because they filter one panel rather than switch between separate tab panels.

Use `font-weight: 700`, a 3px `currentColor` underline, and a pressed/connected tab shape for the selected visual state. Keep the existing navigation icons unchanged; do not add a colored rail, dot, or check icon.

**Step 3: Verify and commit**

```bash
npm test -- src/App.a11y.test.tsx
git add src/App.tsx src/styles.css src/App.a11y.test.tsx
git commit -m "fix: expose tab and filter selection semantics"
```

## Phase 3 — Dialogs, errors, and dynamic focus

### Task 6: Migrate all modal flows to `ModalDialog`

**Files:**

- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Modify: `src/App.a11y.test.tsx`
- Modify: `e2e/accessibility.spec.ts`

**Step 1: Write failing end-to-end tests**

Cover the COC export, secret dice, InSane password, and reset confirmation dialogs. For each dialog, assert:

- focus enters the dialog on open;
- background controls cannot be reached with Tab;
- Escape closes it;
- focus returns to the exact invoking button.

**Step 2: Replace overlay containers**

Wrap each dialog body in `ModalDialog`. Retain unique heading IDs and descriptions. Store refs for all invoker buttons and choose safe initial focus targets; avoid initial focus on destructive confirmation actions.

**Step 3: Add reset protection**

Replace immediate reset with a confirmation dialog stating what local data will be replaced. After confirmation, provide an undo action backed by the pre-reset in-memory snapshot until the next modifying action or page unload.

**Step 4: Verify and commit**

```bash
npm test -- src/components/ModalDialog.test.tsx src/App.a11y.test.tsx
npm run test:a11y -- --grep "dialog"
git add src/App.tsx src/styles.css src/App.a11y.test.tsx e2e/accessibility.spec.ts
git commit -m "fix: make modal and reset flows focus safe"
```

### Task 7: Announce errors and state changes without disrupting typing

**Files:**

- Modify: `src/App.tsx`
- Modify: `src/App.a11y.test.tsx`

**Step 1: Write failing announcement tests**

Verify that invalid imports and passwords use alerts, while save, copy, growth, dice, and deletion results use polite status messages. Ensure each message is announced once after its triggering action.

**Step 2: Separate messages by purpose**

- Add `importError` next to the Load control instead of reusing `growthMessage`.
- Keep the password dialog open on invalid input; set `aria-invalid` and connect an error with `aria-errormessage`.
- Render growth and dice summaries through `LiveMessage`.
- Do not put continuously recalculated budget numbers in a live region; announce only explicit over-budget validation or completed actions.

**Step 3: Restore focus after destructive/detached actions**

- After deleting a row, focus the next row's equivalent control, otherwise the previous row, otherwise the Add button.
- Preserve and restore `document.activeElement` around clipboard fallback textareas.
- Announce the deleted item by name.

**Step 4: Verify and commit**

```bash
npm test -- src/App.a11y.test.tsx
git add src/App.tsx src/App.a11y.test.tsx
git commit -m "fix: announce errors and preserve focus after updates"
```

## Phase 4 — Visual accessibility and responsive hardening

### Task 8: Replace low-contrast and invisible-focus CSS

**Files:**

- Modify: `src/styles.css`
- Modify: `e2e/accessibility.spec.ts`

**Step 1: Write failing computed-style checks**

Check the search field's focused outline, placeholder color, control boundary colors, forced-colors focus, and monochrome selected-state indicators.

**Step 2: Update design tokens and states**

Use the mockup direction:

```css
:root {
  --control-border: #8491a2;
  --focus-ring: #8df0c1;
  --placeholder: #aeb8c5;
}

:where(button, a, input, select, textarea):focus-visible {
  outline: 3px solid var(--focus-ring);
  outline-offset: 3px;
}

.search-field:focus-within {
  outline: 3px solid var(--focus-ring);
  outline-offset: 3px;
}

::placeholder {
  color: var(--placeholder);
  opacity: 1;
}
```

Verify exact production colors with a contrast calculator before merging; token names and minimum ratios are the requirement, not the illustrative hex values.

**Step 3: Add platform accommodations**

- Add `@media (forced-colors: active)` focus and selected-state rules using system colors.
- Keep active tabs and sidebar items monochrome: bold text plus underline/pressed geometry and ARIA state, without an accent strip or extra selected icon.
- Add `@media (prefers-reduced-motion: reduce)` to disable smooth scrolling and non-essential transitions.
- Allow long secret-dice labels to wrap using `overflow-wrap:anywhere`; remove required `nowrap`/ellipsis.
- Keep toolbar text visible at narrow widths or provide distinct persistent short labels.
- Maintain at least 44px preferred interactive targets without breaking dense tables.

**Step 4: Verify and commit**

```bash
npm run test:a11y -- --grep "focus|contrast|forced colors|text spacing"
git add src/styles.css e2e/accessibility.spec.ts
git commit -m "fix: strengthen focus, contrast, and adaptive styles"
```

### Task 9: Complete automated and manual acceptance testing

**Files:**

- Create: `docs/accessibility-test-checklist.md`
- Modify: `e2e/accessibility.spec.ts`
- Modify: `README.md`

**Step 1: Run the full automated gate**

```bash
npm test
npm run typecheck
npm run build
npm run test:a11y
```

Expected: all commands exit 0. Record test counts and axe results in the checklist.

**Step 2: Run viewport and preference combinations**

- `1280×720` desktop, sidebar open and closed.
- `320×800` mobile with all sections opened.
- `1280×320` short viewport with sidebar navigation.
- 200% browser zoom.
- forced-colors and reduced-motion emulation.
- WCAG text-spacing overrides.

**Step 3: Run assistive-technology checks**

- VoiceOver + Safari/Chrome on macOS.
- NVDA + Firefox/Chrome on Windows.
- TalkBack + Chrome on Android.

For each, verify landmarks/headings, control names, table context, dialog lifecycle, live messages, errors, and dynamic deletion focus. Record browser, screen reader, version, result, and any exception.

**Step 4: Re-run the KWCAG 2.2 checklist**

Reclassify every one of the 33 checkpoints with evidence. Do not claim formal conformance while any applicable checkpoint is failing or untested.

**Step 5: Update project documentation and commit**

Document `npm run test:a11y`, the manual test matrix, and the known limitations in `README.md`.

```bash
git add docs/accessibility-test-checklist.md e2e/accessibility.spec.ts README.md
git commit -m "docs: add accessibility verification procedure"
```

## Recommended execution order and estimate

1. Test infrastructure and primitives — 0.5 to 1 day.
2. Names, tables, sidebar, and navigation — 1 to 1.5 days.
3. Tabs, dialogs, status messages, and focus restoration — 1.5 to 2 days.
4. Contrast, responsive hardening, and automated browser tests — 1 day.
5. Multi-screen-reader manual verification and fixes — 0.5 to 1 day.

Estimated engineering effort: **4.5 to 6.5 working days**, excluding external WA certification review.

## Implementation checkpoints

- Checkpoint A: after Task 4, no unnamed controls or hidden focus stops remain.
- Checkpoint B: after Task 7, all keyboard and dynamic-state defects are resolved.
- Checkpoint C: after Task 9, the complete KWCAG/WCAG evidence matrix is ready for review.
