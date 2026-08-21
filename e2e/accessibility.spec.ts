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

    const positions = await page.evaluate(() => {
      const target = document.getElementById('skills');
      const topbar = document.querySelector('.topbar');
      if (!target || !topbar) return null;

      return {
        targetTop: target.getBoundingClientRect().top,
        topbarBottom: topbar.getBoundingClientRect().bottom,
        scrollMarginTop: Number.parseFloat(getComputedStyle(target).scrollMarginTop),
      };
    });

    expect(positions).not.toBeNull();
    expect(positions?.scrollMarginTop).toBeGreaterThan(0);
    expect(positions?.targetTop).toBeGreaterThanOrEqual((positions?.topbarBottom ?? 0) - 1);
  });

  test('reflows without document-level horizontal overflow in narrow and short viewports', async ({ page }) => {
    const layout = await page.evaluate(() => {
      const sidebar = document.querySelector('.sidebar');
      return {
        bodyMinWidth: getComputedStyle(document.body).minWidth,
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        sidebarOverflowY: sidebar ? getComputedStyle(sidebar).overflowY : '',
      };
    });

    expect(layout.bodyMinWidth).not.toBe('320px');
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
    expect(layout.sidebarOverflowY).toBe('auto');
  });
});
