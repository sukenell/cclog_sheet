import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

type RgbaColor = {
  red: number;
  green: number;
  blue: number;
  alpha: number;
};

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

async function focusWithKeyboard(page: Page, target: Locator) {
  const markerId = `focus-marker-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  await target.evaluate((element, id) => {
    const marker = document.createElement('button');
    marker.id = id;
    marker.type = 'button';
    marker.setAttribute('aria-hidden', 'true');
    marker.style.position = 'fixed';
    marker.style.inset = '0 auto auto 0';
    marker.style.opacity = '0';
    (element.closest('label') ?? element).before(marker);
    marker.focus();
  }, markerId);
  await page.keyboard.press('Tab');
  await expect(target).toBeFocused();
  await page.locator(`#${markerId}`).evaluate((element) => element.remove());
}

function parseCssColor(value: string): RgbaColor {
  const channels = value.match(/[\d.]+/g)?.map(Number);
  if (!channels || channels.length < 3) {
    throw new Error(`Unsupported computed color: ${value}`);
  }

  return {
    red: channels[0],
    green: channels[1],
    blue: channels[2],
    alpha: channels[3] ?? 1,
  };
}

function compositeColor(foreground: RgbaColor, background: RgbaColor): RgbaColor {
  const alpha = foreground.alpha + background.alpha * (1 - foreground.alpha);
  if (alpha === 0) return { red: 0, green: 0, blue: 0, alpha: 0 };

  return {
    red:
      (foreground.red * foreground.alpha +
        background.red * background.alpha * (1 - foreground.alpha)) /
      alpha,
    green:
      (foreground.green * foreground.alpha +
        background.green * background.alpha * (1 - foreground.alpha)) /
      alpha,
    blue:
      (foreground.blue * foreground.alpha +
        background.blue * background.alpha * (1 - foreground.alpha)) /
      alpha,
    alpha,
  };
}

function relativeLuminance(color: RgbaColor) {
  const linearize = (channel: number) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };

  return (
    0.2126 * linearize(color.red) +
    0.7152 * linearize(color.green) +
    0.0722 * linearize(color.blue)
  );
}

function contrastRatio(foreground: string, background: string) {
  const backgroundColor = parseCssColor(background);
  const foregroundColor = compositeColor(parseCssColor(foreground), backgroundColor);
  const foregroundLuminance = relativeLuminance(foregroundColor);
  const backgroundLuminance = relativeLuminance(backgroundColor);

  return (
    (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
  );
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

  test('computed control boundaries and placeholder text meet contrast targets', async ({ page }) => {
    const nameInput = page.getByRole('textbox', { name: '이름', exact: true });
    const menuButton = page.getByRole('button', { name: '사이드바 닫기' });

    const [inputColors, buttonColors] = await Promise.all([
      nameInput.evaluate((element) => {
        const style = getComputedStyle(element);
        return { border: style.borderTopColor, background: style.backgroundColor };
      }),
      menuButton.evaluate((element) => {
        const style = getComputedStyle(element);
        return { border: style.borderTopColor, background: style.backgroundColor };
      }),
    ]);

    expect(contrastRatio(inputColors.border, inputColors.background)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(buttonColors.border, buttonColors.background)).toBeGreaterThanOrEqual(3);

    await page.getByRole('link', { name: '세션' }).click();
    await page.getByRole('button', { name: '세션 추가' }).click();
    const placeholderInput = page.getByRole('textbox', { name: '종류' });
    const placeholderColors = await placeholderInput.evaluate((element) => {
      const inputStyle = getComputedStyle(element);
      return {
        placeholder: getComputedStyle(element, '::placeholder').color,
        background: inputStyle.backgroundColor,
      };
    });

    expect(contrastRatio(placeholderColors.placeholder, placeholderColors.background)).toBeGreaterThanOrEqual(4.5);
    await expect(placeholderInput).toHaveAttribute('placeholder', '다인 & 타이만');
    await expect(nameInput).toBeAttached();
    await expect(menuButton).toBeAttached();
  });

  test('every core control type exposes a three-pixel keyboard focus indicator', async ({ page }) => {
    const samples = [
      page.getByRole('button', { name: '사이드바 닫기' }),
      page.getByRole('link', { name: '탐사자정보' }),
      page.getByRole('textbox', { name: '이름', exact: true }),
      page.getByRole('combobox', { name: '룰 선택' }),
    ];

    const expectFocusIndicator = async (control: Locator) => {
      await focusWithKeyboard(page, control);
      const focusStyle = await control.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          color: style.outlineColor,
          offset: Number.parseFloat(style.outlineOffset),
          style: style.outlineStyle,
          width: Number.parseFloat(style.outlineWidth),
        };
      });

      expect(focusStyle.width).toBeGreaterThanOrEqual(3);
      expect(focusStyle.style).toBe('solid');
      expect(parseCssColor(focusStyle.color).alpha).toBeGreaterThan(0);
      expect(focusStyle.offset).toBeGreaterThanOrEqual(2);
    };

    for (const control of samples) {
      await expectFocusIndicator(control);
    }

    await page.getByRole('link', { name: '메모' }).click();
    await expectFocusIndicator(page.getByRole('textbox', { name: '내용' }));
  });

  test('the custom search wrapper visibly follows keyboard focus', async ({ page }) => {
    await page.getByRole('link', { name: '기능치' }).click();
    const searchInput = page.getByRole('searchbox', { name: '기능치 검색' });
    await searchInput.focus();

    const focusStyles = await page.locator('.search-field').evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        color: style.outlineColor,
        offset: Number.parseFloat(style.outlineOffset),
        style: style.outlineStyle,
        width: Number.parseFloat(style.outlineWidth),
      };
    });

    expect(focusStyles.width).toBeGreaterThanOrEqual(3);
    expect(focusStyles.style).toBe('solid');
    expect(parseCssColor(focusStyles.color).alpha).toBeGreaterThan(0);
    expect(focusStyles.offset).toBeGreaterThanOrEqual(2);
  });

  test('forced colors preserves focus and selected-state shape without decorative markers', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    const systemColors = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.cssText = [
        'position:fixed',
        'inset:auto',
        'color:CanvasText',
        'background:Canvas',
        'border:1px solid ButtonText',
        'outline:3px solid Highlight',
        'forced-color-adjust:none',
      ].join(';');
      document.body.append(probe);
      const style = getComputedStyle(probe);
      const colors = {
        buttonText: style.borderTopColor,
        canvas: style.backgroundColor,
        canvasText: style.color,
        highlight: style.outlineColor,
      };
      probe.remove();
      return colors;
    });
    await page.getByRole('link', { name: '전투' }).click();

    const menuButton = page.getByRole('button', { name: '사이드바 닫기' });
    await focusWithKeyboard(page, menuButton);
    const focusStyle = await menuButton.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        color: style.outlineColor,
        style: style.outlineStyle,
        width: Number.parseFloat(style.outlineWidth),
      };
    });
    expect(focusStyle.width).toBeGreaterThanOrEqual(3);
    expect(focusStyle.style).toBe('solid');
    expect(focusStyle.color).toBe(systemColors.highlight);

    const selectedTab = page.getByRole('tab', { name: '무기' });
    const pressedFilter = page.getByRole('button', { name: '근거리', pressed: true });
    for (const selectedControl of [selectedTab, pressedFilter]) {
      const selectedStyle = await selectedControl.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          background: style.backgroundColor,
          borderBottomColor: style.borderBottomColor,
          borderBottomStyle: style.borderBottomStyle,
          borderBottomWidth: Number.parseFloat(style.borderBottomWidth),
          color: style.color,
          fontWeight: Number.parseInt(style.fontWeight, 10),
          markerAfter: getComputedStyle(element, '::after').content,
          markerBefore: getComputedStyle(element, '::before').content,
        };
      });

      expect(selectedStyle.borderBottomWidth).toBeGreaterThanOrEqual(3);
      expect(selectedStyle.borderBottomStyle).toBe('solid');
      expect(selectedStyle.borderBottomColor).toBe(systemColors.highlight);
      expect(selectedStyle.background).toBe(systemColors.canvas);
      expect(selectedStyle.color).toBe(systemColors.canvasText);
      expect(selectedStyle.fontWeight).toBeGreaterThanOrEqual(700);
      expect(['none', 'normal']).toContain(selectedStyle.markerBefore);
      expect(['none', 'normal']).toContain(selectedStyle.markerAfter);
    }

    const systemSelect = page.getByRole('combobox', { name: '룰 선택' });
    await systemSelect.selectOption('insan');
    const passwordDialog = page.getByRole('dialog', { name: 'InSane 어빌리티 잠금' });
    const passwordInput = passwordDialog.getByLabel(/룰북 구매확인 비밀번호/);
    await passwordDialog.getByRole('button', { name: '취소' }).focus();
    const [dialogBoundary, inputBoundary] = await Promise.all([
      passwordDialog.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          background: style.backgroundColor,
          borderColor: style.borderTopColor,
          borderStyle: style.borderTopStyle,
          borderWidth: Number.parseFloat(style.borderTopWidth),
        };
      }),
      passwordInput.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          borderColor: style.borderTopColor,
          borderStyle: style.borderTopStyle,
          borderWidth: Number.parseFloat(style.borderTopWidth),
        };
      }),
    ]);

    expect(dialogBoundary.background).toBe(systemColors.canvas);
    expect(dialogBoundary.borderColor).toBe(systemColors.buttonText);
    expect(dialogBoundary.borderStyle).toBe('solid');
    expect(dialogBoundary.borderWidth).toBeGreaterThanOrEqual(1);
    expect(inputBoundary.borderColor).toBe(systemColors.buttonText);
    expect(inputBoundary.borderStyle).toBe('solid');
    expect(inputBoundary.borderWidth).toBeGreaterThanOrEqual(1);
  });

  test('reduced motion removes smooth scrolling and non-essential transitions', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });

    const motionStyles = await page.evaluate(() => {
      const shell = document.querySelector('.app-shell');
      const chevron = document.querySelector('.section-chevron');
      if (!shell || !chevron) throw new Error('Missing motion samples');

      return {
        scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
        shellAnimation: getComputedStyle(shell).animationName,
        shellTransition: getComputedStyle(shell).transitionDuration,
        chevronTransition: getComputedStyle(chevron).transitionDuration,
      };
    });

    expect(motionStyles.scrollBehavior).toBe('auto');
    expect(motionStyles.shellAnimation).toBe('none');
    expect(motionStyles.shellTransition).toBe('0s');
    expect(motionStyles.chevronTransition).toBe('0s');
  });

  test('closed native dialogs stay hidden and open dialogs use the intended grid layout', async ({ page }) => {
    await page.getByRole('button', { name: '초기화' }).click();
    const resetDialog = page.getByRole('dialog', { name: '시트 초기화' });
    await expect(resetDialog).toHaveClass(/\bmodal-dialog\b/);
    await page.keyboard.press('Escape');

    const dialogDisplays = await page.evaluate(() => {
      const dialog = document.createElement('dialog');
      dialog.className = 'modal-dialog secret-dice-dialog';
      document.body.append(dialog);
      const closed = getComputedStyle(dialog).display;
      dialog.setAttribute('open', '');
      const open = getComputedStyle(dialog).display;
      dialog.remove();
      return { closed, open };
    });

    expect(dialogDisplays.closed).toBe('none');
    expect(dialogDisplays.open).toBe('grid');
  });

  test('toolbar labels and primary targets remain visible and usable', async ({ page }) => {
    const toolbar = page.getByLabel('시트 도구');
    const toolbarButtons = toolbar.getByRole('button');
    expect(await toolbarButtons.count()).toBeGreaterThan(0);

    for (let index = 0; index < (await toolbarButtons.count()); index += 1) {
      const button = toolbarButtons.nth(index);
      const visibleLabel = button.locator('span');
      await expect(visibleLabel).toBeVisible();
      expect((await visibleLabel.textContent())?.trim()).not.toBe('');

      const geometry = await button.evaluate((element) => ({
        clientWidth: element.clientWidth,
        height: element.getBoundingClientRect().height,
        right: element.getBoundingClientRect().right,
        scrollWidth: element.scrollWidth,
      }));
      expect(geometry.height).toBeGreaterThanOrEqual(44);
      expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
      expect(geometry.right).toBeLessThanOrEqual((page.viewportSize()?.width ?? 0) + 1);
    }

    const primaryTargets = [
      page.getByRole('combobox', { name: '룰 선택' }),
      page.getByRole('link', { name: '탐사자정보' }),
      page.getByRole('textbox', { name: '이름', exact: true }),
    ];
    for (const target of primaryTargets) {
      expect(await target.evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    }
  });

  test('long dice labels wrap instead of truncating', async ({ page }) => {
    await page.getByRole('button', { name: '비밀 주사위 복사' }).click();
    const optionLabel = page.locator('.secret-dice-option strong').first();
    const labelStyle = await optionLabel.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        overflow: style.overflow,
        overflowWrap: style.overflowWrap,
        textOverflow: style.textOverflow,
        whiteSpace: style.whiteSpace,
      };
    });

    expect(labelStyle.overflowWrap).toBe('anywhere');
    expect(labelStyle.whiteSpace).not.toBe('nowrap');
    expect(labelStyle.textOverflow).not.toBe('ellipsis');
    expect(labelStyle.overflow).not.toBe('hidden');
  });

  test('secret dice dialog keeps every core region inside its bounds', async ({ page }) => {
    await page.getByRole('button', { name: '비밀 주사위 복사' }).click();
    const dialog = page.getByRole('dialog', { name: '비밀 주사위 복사' });

    const geometry = await dialog.evaluate((element) => {
      const dialogRect = element.getBoundingClientRect();
      const coreSelectors = [
        '.secret-dice-header',
        '.dialog-description',
        '.secret-dice-controls',
        '.secret-dice-option-groups',
        '.secret-dice-group',
        '.secret-dice-option',
        '.secret-dice-actions',
        '.secret-dice-actions button',
      ];
      const coreRegions = coreSelectors.flatMap((selector) =>
        Array.from(element.querySelectorAll<HTMLElement>(selector)).map((region) => {
          const rect = region.getBoundingClientRect();
          return {
            selector,
            clientWidth: region.clientWidth,
            scrollWidth: region.scrollWidth,
            left: rect.left,
            right: rect.right,
          };
        }),
      );
      const firstCheckboxRect = element
        .querySelector<HTMLInputElement>('.secret-dice-option input')
        ?.getBoundingClientRect();
      const minWidthSelectors = [
        '.secret-dice-header > div',
        '.secret-dice-option-groups',
        '.secret-dice-list',
        '.secret-dice-option',
        '.secret-dice-actions',
      ];

      return {
        dialog: {
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
          left: dialogRect.left,
          right: dialogRect.right,
        },
        coreRegions,
        firstCheckbox: firstCheckboxRect
          ? { left: firstCheckboxRect.left, right: firstCheckboxRect.right }
          : null,
        minWidths: minWidthSelectors.flatMap((selector) =>
          Array.from(element.querySelectorAll<HTMLElement>(selector)).map((region) => ({
            selector,
            minWidth: getComputedStyle(region).minWidth,
          })),
        ),
        footerButtonStyles: Array.from(
          element.querySelectorAll<HTMLButtonElement>('.secret-dice-actions button'),
        ).map((button) => {
          const style = getComputedStyle(button);
          return {
            minWidth: style.minWidth,
            overflowWrap: style.overflowWrap,
            whiteSpace: style.whiteSpace,
          };
        }),
        viewportWidth: window.innerWidth,
      };
    });

    expect.soft(geometry.dialog.scrollWidth, 'dialog horizontally overflows').toBeLessThanOrEqual(
      geometry.dialog.clientWidth,
    );
    expect.soft(geometry.dialog.left).toBeGreaterThanOrEqual(0);
    expect.soft(geometry.dialog.right).toBeLessThanOrEqual(geometry.viewportWidth);
    expect.soft(geometry.firstCheckbox).not.toBeNull();
    expect.soft(geometry.firstCheckbox?.left).toBeGreaterThanOrEqual(geometry.dialog.left - 1);
    expect.soft(geometry.firstCheckbox?.right).toBeLessThanOrEqual(geometry.dialog.right + 1);

    for (const region of geometry.coreRegions) {
      expect
        .soft(region.scrollWidth, `${region.selector} horizontally overflows`)
        .toBeLessThanOrEqual(region.clientWidth + 1);
      expect
        .soft(region.left, `${region.selector} starts outside the dialog`)
        .toBeGreaterThanOrEqual(geometry.dialog.left - 1);
      expect
        .soft(region.right, `${region.selector} ends outside the dialog`)
        .toBeLessThanOrEqual(geometry.dialog.right + 1);
    }

    for (const child of geometry.minWidths) {
      expect(child.minWidth, `${child.selector} must be shrinkable`).toBe('0px');
    }
    for (const button of geometry.footerButtonStyles) {
      expect(button.minWidth).toBe('0px');
      expect(button.overflowWrap).toBe('anywhere');
      expect(button.whiteSpace).toBe('normal');
    }
  });

  test('secret dice options remain operable without overlapping the footer', async ({ page }) => {
    await page.getByRole('button', { name: '비밀 주사위 복사' }).click();
    const dialog = page.getByRole('dialog', { name: '비밀 주사위 복사' });
    const optionRegion = dialog.locator('.secret-dice-option-groups');
    const footer = dialog.locator('.secret-dice-actions');
    const firstCheckbox = dialog.locator('.secret-dice-option input').first();

    const readGeometry = () =>
      dialog.evaluate((element) => {
        const dialogRect = element.getBoundingClientRect();
        const options = element.querySelector<HTMLElement>('.secret-dice-option-groups');
        const footerElement = element.querySelector<HTMLElement>('.secret-dice-actions');
        const checkbox = element.querySelector<HTMLInputElement>('.secret-dice-option input');
        if (!options || !footerElement || !checkbox) {
          throw new Error('Missing secret dice dialog region');
        }

        const optionsRect = options.getBoundingClientRect();
        const footerRect = footerElement.getBoundingClientRect();
        const checkboxRect = checkbox.getBoundingClientRect();
        return {
          dialog: {
            bottom: dialogRect.bottom,
            clientHeight: element.clientHeight,
            overflowY: getComputedStyle(element).overflowY,
            scrollHeight: element.scrollHeight,
            top: dialogRect.top,
          },
          options: {
            bottom: optionsRect.bottom,
            clientHeight: options.clientHeight,
            scrollHeight: options.scrollHeight,
            top: optionsRect.top,
          },
          footer: { top: footerRect.top },
          checkbox: { bottom: checkboxRect.bottom, top: checkboxRect.top },
        };
      });

    const beforeInteraction = await readGeometry();
    expect
      .soft(beforeInteraction.options.bottom, 'option region overlaps the footer')
      .toBeLessThanOrEqual(beforeInteraction.footer.top + 1);
    if (beforeInteraction.dialog.scrollHeight > beforeInteraction.dialog.clientHeight) {
      expect.soft(['auto', 'scroll']).toContain(beforeInteraction.dialog.overflowY);
    }

    await expect(firstCheckbox).toBeChecked();
    await firstCheckbox.click({ timeout: 2_000 });
    await expect(firstCheckbox).not.toBeChecked();

    await focusWithKeyboard(page, firstCheckbox);
    await page.keyboard.press('Space');
    await expect(firstCheckbox).toBeChecked();

    const afterInteraction = await readGeometry();
    expect(afterInteraction.options.bottom).toBeLessThanOrEqual(afterInteraction.footer.top + 1);
    expect(afterInteraction.checkbox.top).toBeGreaterThanOrEqual(afterInteraction.dialog.top - 1);
    expect(afterInteraction.checkbox.bottom).toBeLessThanOrEqual(
      afterInteraction.dialog.bottom + 1,
    );
    await expect(optionRegion).toBeVisible();
    await expect(footer).toBeVisible();
  });

  test('non-table field actions keep a 44-pixel target', async ({ page }) => {
    const addPortrait = page.locator('.field-label-row').getByRole('button', { name: '추가' });

    await expect(addPortrait).toBeVisible();
    expect(
      await addPortrait.evaluate((element) => element.getBoundingClientRect().height),
    ).toBeGreaterThanOrEqual(44);
  });

  test('text spacing overrides do not create document overflow or hide toolbar labels', async ({ page }) => {
    await page.addStyleTag({
      content: `
        * {
          letter-spacing: 0.12em !important;
          line-height: 1.5 !important;
          word-spacing: 0.16em !important;
        }
        p { margin-bottom: 2em !important; }
      `,
    });
    await page.getByRole('link', { name: '기능치' }).click();

    const layout = await page.evaluate(() => {
      const toolbarLabels = Array.from(document.querySelectorAll('.toolbar .icon-button span'));
      return {
        bodyClientWidth: document.body.clientWidth,
        bodyScrollWidth: document.body.scrollWidth,
        documentClientWidth: document.documentElement.clientWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
        toolbarLabelsVisible: toolbarLabels.every((label) => {
          const rect = label.getBoundingClientRect();
          return getComputedStyle(label).display !== 'none' && rect.width > 0 && rect.height > 0;
        }),
      };
    });

    expect(layout.documentScrollWidth).toBeLessThanOrEqual(layout.documentClientWidth);
    expect(layout.bodyScrollWidth).toBeLessThanOrEqual(layout.bodyClientWidth);
    expect(layout.toolbarLabelsVisible).toBe(true);
  });
});
