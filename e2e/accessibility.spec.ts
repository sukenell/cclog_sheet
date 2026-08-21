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
});
