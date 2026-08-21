import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const automatedWcagTags = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22a',
  'wcag22aa',
];

async function openSheet(page: Page) {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1, name: '새로운 탐사자' })).toBeVisible();
}

function summarizeViolations(
  violations: Awaited<ReturnType<AxeBuilder['analyze']>>['violations'],
) {
  return violations.map(({ id, impact, nodes }) => ({
    id,
    impact,
    nodeCount: nodes.length,
  }));
}

test.describe('accessibility smoke', () => {
  test.beforeEach(async ({ page }) => {
    await openSheet(page);
  });

  test('initial sheet has no serious or critical axe violations', async ({ page }) => {
    const results = await new AxeBuilder({ page }).withTags(automatedWcagTags).analyze();
    const seriousOrCritical = results.violations.filter(
      ({ impact }) => impact === 'serious' || impact === 'critical',
    );

    expect(summarizeViolations(seriousOrCritical)).toEqual([]);
  });

  test('exposes the core page landmarks and named sheet controls', async ({ page }) => {
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('complementary', { name: '시트 섹션' })).toBeVisible();
    await expect(page.getByRole('button', { name: '사이드바 닫기' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: '룰 선택' })).toBeVisible();
  });

  test('starts keyboard navigation at the skip link and keeps closed navigation inert', async ({ page }) => {
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: '본문으로 바로가기' })).toBeFocused();

    const sidebar = page.locator('#sheet-sidebar');
    await expect(sidebar).toHaveAttribute('aria-label', '시트 섹션');
    const sidebarId = await sidebar.getAttribute('id');
    const closeButton = page.getByRole('button', { name: '사이드바 닫기' });
    await expect(closeButton).toHaveAttribute('aria-controls', sidebarId ?? '');
    await closeButton.click();

    await expect(sidebar).toHaveAttribute('inert', '');
    await expect(sidebar).toHaveAttribute('aria-hidden', 'true');

    await page.keyboard.press('Tab');
    expect(
      await page.evaluate(() =>
        document.querySelector('[aria-label="시트 섹션"]')?.contains(document.activeElement),
      ),
    ).toBe(false);
  });

  test('section navigation opens and focuses its target below the sticky header', async ({ page }) => {
    await page.getByRole('link', { name: '기능치' }).click();

    const sectionToggle = page.locator('#skills .section-toggle');
    await expect(sectionToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(sectionToggle).toBeFocused();
    await expect(page).toHaveURL(/#skills$/);

    const readPositions = () =>
      page.evaluate(() => {
        const section = document.getElementById('skills');
        const target = section?.querySelector('.section-toggle');
        const topbar = document.querySelector('.topbar');
        if (!section || !target || !topbar) return null;

        const targetRect = target.getBoundingClientRect();

        return {
          targetTop: targetRect.top,
          targetBottom: targetRect.bottom,
          topbarBottom: topbar.getBoundingClientRect().bottom,
          viewportHeight: window.innerHeight,
          scrollMarginTop: Number.parseFloat(getComputedStyle(section).scrollMarginTop),
        };
      });

    await expect
      .poll(async () => {
        const position = await readPositions();
        if (!position) return false;

        return (
          position.targetTop >= Math.max(position.topbarBottom, 0) - 1 &&
          position.targetTop < position.viewportHeight - 8 &&
          position.targetBottom > 8 &&
          position.targetBottom <= position.viewportHeight - 8
        );
      })
      .toBe(true);

    const positions = await readPositions();

    expect(positions).not.toBeNull();
    expect(positions?.scrollMarginTop).toBeGreaterThan(0);
    expect(positions?.targetTop).toBeGreaterThanOrEqual(
      Math.max(positions?.topbarBottom ?? 0, 0) - 1,
    );
    expect(positions?.targetTop).toBeLessThan((positions?.viewportHeight ?? 0) - 8);
    expect(positions?.targetBottom).toBeGreaterThan(8);
    expect(positions?.targetBottom).toBeLessThanOrEqual((positions?.viewportHeight ?? 0) - 8);
  });

  test('custom skill deletion focuses the next visible delete control', async ({ page }) => {
    await page.getByRole('link', { name: '기능치' }).click();
    const addSkill = page.getByRole('button', { name: '기능치 추가' }).first();
    await addSkill.click();
    await addSkill.click();
    await addSkill.click();

    const addedRows = page.locator('tr').filter({
      has: page.locator('input[value="새 기능치"]:visible'),
    });
    const focusMarkers = await addedRows
      .getByRole('button', { name: /기능치 삭제$/ })
      .evaluateAll((buttons) => buttons.map((button) => button.getAttribute('data-row-focus')));
    expect(focusMarkers).toHaveLength(3);
    expect(focusMarkers.every(Boolean)).toBe(true);

    for (const [marker, name] of [
      [focusMarkers[0], '다'],
      [focusMarkers[1], '가'],
      [focusMarkers[2], '나'],
    ] as const) {
      await page
        .locator(`[data-row-focus="${marker}"]:visible`)
        .locator('xpath=ancestor::tr')
        .getByRole('textbox')
        .fill(name);
    }

    await page.locator(`[data-row-focus="${focusMarkers[2]}"]:visible`).click();

    await expect(
      page.locator(`[data-row-focus="${focusMarkers[0]}"]:visible`),
    ).toBeFocused();
    await expect(page.getByRole('status', { name: '작업 상태' })).toContainText(
      '나을 삭제했습니다.',
    );
  });

  test('reflows without document-level horizontal overflow in narrow and short viewports', async ({ page }) => {
    await page.getByRole('link', { name: '기능치' }).click();
    await expect(page.locator('#skills .section-toggle')).toHaveAttribute('aria-expanded', 'true');
    const skillTableName =
      (page.viewportSize()?.width ?? 0) > 1120
        ? '기능치 목록 (왼쪽)'
        : '기능치 목록 (모바일)';
    await expect(page.getByRole('table', { name: skillTableName })).toBeVisible();

    await page.getByRole('link', { name: '전투' }).click();
    await expect(page.locator('#combat .section-toggle')).toHaveAttribute('aria-expanded', 'true');
    await page.getByRole('button', { name: '권총', pressed: false }).click();
    await page.getByRole('button', { name: '무기 추가' }).click();

    const handgunTable = page.getByRole('table', { name: '권총 무기 목록' });
    await expect(handgunTable).toHaveAccessibleName('권총 무기 목록');
    const combatTableScrollRegion = handgunTable.locator('..');
    await expect(combatTableScrollRegion).toHaveCSS('overflow-x', 'auto');

    const layout = await page.evaluate(() => {
      const sidebar = document.querySelector('.sidebar');
      const handgunTableElement = Array.from(document.querySelectorAll('table')).find(
        (table) => table.querySelector('caption')?.textContent?.trim() === '권총 무기 목록',
      );
      const tableScrollRegion = handgunTableElement?.parentElement;

      return {
        bodyMinWidth: getComputedStyle(document.body).minWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
        documentClientWidth: document.documentElement.clientWidth,
        bodyScrollWidth: document.body.scrollWidth,
        bodyClientWidth: document.body.clientWidth,
        viewportWidth: window.innerWidth,
        sidebarOverflowY: sidebar ? getComputedStyle(sidebar).overflowY : '',
        combatTableRegion: tableScrollRegion
          ? {
              scrollWidth: tableScrollRegion.scrollWidth,
              clientWidth: tableScrollRegion.clientWidth,
            }
          : null,
      };
    });

    expect(layout.bodyMinWidth).not.toBe('320px');
    expect(layout.documentScrollWidth).toBeLessThanOrEqual(layout.documentClientWidth);
    expect(layout.bodyScrollWidth).toBeLessThanOrEqual(layout.bodyClientWidth);
    expect(layout.documentClientWidth).toBeLessThanOrEqual(layout.viewportWidth);
    expect(layout.sidebarOverflowY).toBe('auto');
    expect(layout.combatTableRegion).not.toBeNull();
    if (!layout.combatTableRegion) throw new Error('Missing named combat table scroll region');

    if (layout.viewportWidth <= 1120) {
      expect(layout.combatTableRegion.scrollWidth).toBeGreaterThan(
        layout.combatTableRegion.clientWidth,
      );
    } else {
      expect(layout.combatTableRegion.scrollWidth).toBeGreaterThanOrEqual(
        layout.combatTableRegion.clientWidth,
      );
    }
  });

  test('dialog flows keep focus modal, close with Escape, and restore each invoker', async ({ page }) => {
    const cases = [
      { invoker: '세이브', dialog: 'COC 세이브' },
      { invoker: '비밀 주사위 복사', dialog: '비밀 주사위 복사' },
      { invoker: '초기화', dialog: '시트 초기화' },
    ];

    for (const testCase of cases) {
      const invoker = page.getByRole('button', { name: testCase.invoker });
      await invoker.click();
      const dialog = page.getByRole('dialog', { name: testCase.dialog });

      await expect(dialog).toBeVisible();
      await expect(dialog).toHaveAttribute('aria-describedby', /.+/);
      expect(await dialog.evaluate((element) => element.matches(':modal'))).toBe(true);
      expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);

      for (let tabIndex = 0; tabIndex < 8; tabIndex += 1) {
        await page.keyboard.press('Tab');
        expect(
          await dialog.evaluate(
            (element) =>
              element.contains(document.activeElement) || document.activeElement === document.body,
          ),
        ).toBe(true);
      }

      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      await expect(invoker).toBeFocused();
    }
  });

  test('dialog native form close stays controlled and can reopen', async ({ page }) => {
    const systemSelect = page.getByRole('combobox', { name: '룰 선택' });
    await systemSelect.focus();
    await systemSelect.selectOption('insan');
    let dialog = page.getByRole('dialog', { name: 'InSane 어빌리티 잠금' });

    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate((element) => element.matches(':modal'))).toBe(true);
    const passwordInput = dialog.getByLabel(/룰북 구매확인 비밀번호/);
    await expect(passwordInput).toBeFocused();
    await passwordInput.fill('incorrect');
    await dialog.getByRole('button', { name: '확인' }).click();
    await expect(dialog).toBeVisible();
    await expect(passwordInput).toHaveAttribute('aria-invalid', 'true');
    const passwordErrorId = await passwordInput.getAttribute('aria-errormessage');
    expect(passwordErrorId).toBeTruthy();
    const passwordError = dialog.getByRole('alert');
    await expect(passwordError).toHaveAttribute('id', passwordErrorId ?? '');
    await expect(passwordError).toContainText(
      '비밀번호가 일치하지 않습니다.',
    );

    await passwordInput.fill('e2e-test-password');
    await expect(passwordInput).not.toHaveAttribute('aria-invalid', 'true');
    await dialog.evaluate((element) => {
      element.addEventListener(
        'close',
        () => {
          document.documentElement.dataset.nativeDialogClose = 'fired';
        },
        { once: true },
      );
    });
    await dialog.getByRole('button', { name: '확인' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.locator('html')).toHaveAttribute('data-native-dialog-close', 'fired');
    await expect(systemSelect).toHaveValue('insan');

    await systemSelect.selectOption('coc7');
    await systemSelect.focus();
    await systemSelect.selectOption('insan');
    dialog = page.getByRole('dialog', { name: 'InSane 어빌리티 잠금' });
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate((element) => element.matches(':modal'))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(systemSelect).toBeFocused();
  });

  test('dialog reset cancel, confirm, undo, and later mutation have the expected lifecycle', async ({ page }) => {
    const nameInput = page.getByRole('textbox', { name: '이름', exact: true });
    const resetButton = page.getByRole('button', { name: '초기화' });
    await nameInput.fill('되돌릴 탐사자');

    await resetButton.click();
    let dialog = page.getByRole('dialog', { name: '시트 초기화' });
    await expect(dialog.getByRole('button', { name: '취소' })).toBeFocused();
    await expect(dialog.getByRole('button', { name: '초기화 확인' })).not.toBeFocused();
    await dialog.getByRole('button', { name: '취소' }).click();
    await expect(nameInput).toHaveValue('되돌릴 탐사자');

    await resetButton.click();
    dialog = page.getByRole('dialog', { name: '시트 초기화' });
    await dialog.getByRole('button', { name: '초기화 확인' }).click();
    await expect(nameInput).toHaveValue('새로운 탐사자');
    const undoButton = page.getByRole('button', { name: '초기화 실행 취소' });
    await expect(undoButton).toBeVisible();
    await undoButton.click();
    await expect(nameInput).toHaveValue('되돌릴 탐사자');
    await expect(resetButton).toBeFocused();
    await expect
      .poll(() =>
        page.evaluate(() => {
          const stored = window.localStorage.getItem('cclog-sheet:v1');
          return stored ? JSON.parse(stored).basic?.name : null;
        }),
      )
      .toBe('되돌릴 탐사자');
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: '되돌릴 탐사자' })).toBeVisible();
    await expect(nameInput).toHaveValue('되돌릴 탐사자');
    await expect(page.getByRole('button', { name: '초기화 실행 취소' })).toBeHidden();

    await resetButton.click();
    dialog = page.getByRole('dialog', { name: '시트 초기화' });
    await dialog.getByRole('button', { name: '초기화 확인' }).click();
    await expect(page.getByRole('button', { name: '초기화 실행 취소' })).toBeVisible();
    await nameInput.fill('새 탐사자');
    await expect(page.getByRole('button', { name: '초기화 실행 취소' })).toBeHidden();
  });

  test('clipboard fallback copies from the active modal top layer and restores focus', async ({
    context,
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-1280x720', 'System clipboard is tested once.');
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
      origin: new URL(page.url()).origin,
    });
    await page.evaluate(() => navigator.clipboard.writeText('clipboard sentinel'));
    await page.evaluate(() => {
      const originalExecCommand = document.execCommand.bind(document);
      Object.defineProperty(navigator.clipboard, 'writeText', {
        configurable: true,
        value: () => Promise.reject(new DOMException('Forced fallback', 'NotAllowedError')),
      });
      document.execCommand = (commandId: string) => {
        const fallback = document.activeElement;
        document.documentElement.dataset.fallbackHost =
          fallback?.parentElement?.matches('dialog:modal') ? 'modal' : 'body';
        document.documentElement.dataset.fallbackHidden = String(
          fallback instanceof HTMLTextAreaElement &&
            fallback.readOnly &&
            fallback.style.position === 'fixed' &&
            fallback.style.left === '-9999px',
        );
        const copied = originalExecCommand(commandId);
        queueMicrotask(() => {
          const activeDialog = document.querySelector('dialog:modal');
          document.documentElement.dataset.fallbackRemoved = String(
            !document.querySelector('textarea[readonly][style*="-9999px"]'),
          );
          document.documentElement.dataset.fallbackFocus =
            document.activeElement?.textContent?.trim() ?? '';
          document.documentElement.dataset.fallbackDialogOpen = String(Boolean(activeDialog));
        });
        return copied;
      };
    });

    const invoker = page.getByRole('button', { name: '비밀 주사위 복사' });
    await invoker.click();
    const dialog = page.getByRole('dialog', { name: '비밀 주사위 복사' });
    const copyButton = dialog.getByRole('button', { name: '일반 주사위 복사' });
    await copyButton.click();

    await expect(page.locator('html')).toHaveAttribute('data-fallback-host', 'modal');
    await expect(page.locator('html')).toHaveAttribute('data-fallback-hidden', 'true');
    await expect(page.locator('html')).toHaveAttribute('data-fallback-removed', 'true');
    await expect(page.locator('html')).toHaveAttribute(
      'data-fallback-focus',
      '일반 주사위 복사',
    );
    await expect(page.locator('html')).toHaveAttribute('data-fallback-dialog-open', 'true');
    await expect(dialog).toBeHidden();
    await expect(invoker).toBeFocused();
    await expect(page.getByRole('status', { name: '작업 상태' })).toContainText(
      '일반 비밀 주사위를 복사했습니다.',
    );

    const copiedText = await page.evaluate(() => navigator.clipboard.readText());
    expect(copiedText).not.toBe('clipboard sentinel');
    expect(copiedText).toContain('[R20JE:COC7_IMPORT:1]');
    expect(copiedText).toContain('"character": "새로운 탐사자"');
  });
});
