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
});
