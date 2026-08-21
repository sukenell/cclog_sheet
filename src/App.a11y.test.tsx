// @vitest-environment jsdom

import './test/setup';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe, { type Result as AxeViolation } from 'axe-core';
import { describe, expect, it } from 'vitest';
import App from './App';

const cocSectionNames = [
  '탐사자정보',
  '특성치',
  '기능치',
  '전투',
  '백스토리',
  '세션',
  '메모',
] as const;

async function renderOpenCocSheet() {
  const user = userEvent.setup();
  render(<App />);

  for (const sectionName of cocSectionNames) {
    const sectionToggle = screen
      .getAllByRole('button', { name: sectionName })
      .find((button) => button.hasAttribute('aria-expanded'));

    if (!sectionToggle) {
      throw new Error(`Missing section disclosure button: ${sectionName}`);
    }

    if (sectionToggle.getAttribute('aria-expanded') === 'false') {
      await user.click(sectionToggle);
    }
  }
}

function describeViolations(violations: AxeViolation[]) {
  return violations
    .map(
      ({ help, id, impact, nodes }) =>
        `${impact ?? 'unknown'} ${id}: ${help}\n${nodes
          .slice(0, 4)
          .map(({ target }) => `  ${target.join(' ')}`)
          .join('\n')}${nodes.length > 4 ? `\n  … ${nodes.length - 4} more` : ''}`,
    )
    .join('\n');
}

function summarizeViolations(violations: AxeViolation[]) {
  return violations.map(({ id, impact, nodes }) => ({
    id,
    impact,
    nodeCount: nodes.length,
  }));
}

describe('App accessibility smoke', () => {
  it('renders the sheet main landmark and primary heading', async () => {
    await act(async () => {
      render(<App />);
    });

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: '새로운 탐사자' })).toBeInTheDocument();
  });

  it('exposes the skill search through its visible label', async () => {
    await renderOpenCocSheet();

    const searchLabel = document.querySelector<HTMLLabelElement>(
      'label[for="skill-search"]',
    );
    const searchInput = document.getElementById('skill-search');

    expect(searchLabel).not.toBeNull();
    expect(searchLabel).toBeVisible();
    expect(searchLabel).not.toHaveClass('sr-only');
    expect(searchLabel).toHaveTextContent('기능치 검색');
    expect(searchInput).toBeInstanceOf(HTMLInputElement);
    expect(searchLabel?.control).toBe(searchInput);
    expect(searchInput).toBe(screen.queryByRole('textbox', { name: '기능치 검색' }));
  });

  it('exposes combat mode controls with tab roles and names', async () => {
    await renderOpenCocSheet();

    const combatTabs = screen.getByRole('tablist', { name: '전투 분류' });
    expect(
      within(combatTabs).queryByRole('tab', { name: '무기', selected: true }),
    ).not.toBeNull();
    expect(
      within(combatTabs).queryByRole('tab', { name: '방어구', selected: false }),
    ).not.toBeNull();
    expect(
      within(combatTabs).queryByRole('tab', { name: '주문', selected: false }),
    ).not.toBeNull();
  });

  it('has no serious or critical axe violations with every sheet section open', async () => {
    await renderOpenCocSheet();

    document.documentElement.lang = 'ko';
    document.title = 'CCLog Sheet';

    const results = await axe.run(document, {
      rules: {
        // jsdom does not provide the canvas/layout APIs needed by this rule.
        'color-contrast': { enabled: false },
      },
    });
    const seriousOrCritical = results.violations.filter(
      ({ impact }) => impact === 'serious' || impact === 'critical',
    );

    expect(summarizeViolations(seriousOrCritical), describeViolations(seriousOrCritical)).toEqual(
      [],
    );
  });
});
