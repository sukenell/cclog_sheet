// @vitest-environment jsdom

import './test/setup';
import { act, render, screen, waitFor, within } from '@testing-library/react';
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

const insaneSectionNames = [
  '봉마인 정보',
  '봉마인 정보2',
  '특기',
  '아이템',
  '어빌리티',
  '인물란',
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

  return user;
}

async function renderOpenInsaneSheet() {
  const user = userEvent.setup();
  render(<App />);

  await user.selectOptions(screen.getByRole('combobox', { name: '룰 선택' }), 'insan');
  const abilityDialog = await screen.findByRole('dialog', { name: 'InSane 어빌리티 잠금' });
  await user.click(within(abilityDialog).getByRole('button', { name: '취소' }));

  for (const sectionName of insaneSectionNames) {
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

  return user;
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

function getVisibleFormControls() {
  return Array.from(
    document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      'input, select, textarea',
    ),
  ).filter(
    (control) =>
      !control.hidden &&
      control.type !== 'hidden' &&
      control.getAttribute('aria-hidden') !== 'true' &&
      !control.closest('[hidden]'),
  );
}

describe('App accessibility smoke', () => {
  it('renders the sheet main landmark and primary heading', async () => {
    await act(async () => {
      render(<App />);
    });

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: '새로운 탐사자' })).toBeInTheDocument();
  });

  it('starts keyboard navigation with a skip link targeting the focusable main landmark', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.tab();

    const skipLink = screen.getByRole('link', { name: '본문으로 바로가기' });
    expect(skipLink).toHaveFocus();
    expect(skipLink).toHaveAttribute('href', '#main-content');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
    expect(screen.getByRole('main')).toHaveAttribute('tabindex', '-1');
  });

  it('makes the closed sidebar inert and removes its descendants from keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<App />);

    const sidebar = screen.getByRole('complementary', { name: '시트 섹션' });
    const menuButton = screen.getByRole('button', { name: '사이드바 닫기' });
    const sidebarId = sidebar.id;

    expect(sidebarId).not.toBe('');
    expect(menuButton).toHaveAttribute('aria-controls', sidebarId);

    await user.click(menuButton);

    expect(sidebar).toHaveAttribute('inert');
    expect(sidebar).toHaveAttribute('aria-hidden', 'true');

    await user.tab();
    expect(document.activeElement).not.toBe(
      sidebar.querySelector('[tabindex], a, button, input, select, textarea'),
    );
    expect(sidebar.contains(document.activeElement)).toBe(false);
  });

  it('opens and focuses a requested sheet section while keeping the URL hash in sync', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', '/cclog_sheet/');
    render(<App />);

    const memoToggle = screen
      .getAllByRole('button', { name: '메모' })
      .find((button) => button.hasAttribute('aria-expanded'));
    if (!memoToggle) throw new Error('Missing memo disclosure button');
    expect(memoToggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(screen.getByRole('link', { name: '메모' }));

    await waitFor(() => {
      expect(memoToggle).toHaveAttribute('aria-expanded', 'true');
      expect(memoToggle).toHaveFocus();
    });
    expect(window.location.hash).toBe('#memo');
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
    expect(searchInput).toHaveAttribute('type', 'search');
    expect(searchInput).toBe(screen.queryByRole('searchbox', { name: '기능치 검색' }));
  });

  it('keeps the programmatically opened JSON input out of the accessibility tree and tab order', async () => {
    await act(async () => {
      render(<App />);
    });

    const importInput = document.querySelector<HTMLInputElement>('input[type="file"]');

    expect(importInput).not.toBeNull();
    expect(importInput).toHaveAttribute('hidden');
    expect(screen.getByRole('button', { name: '로드' })).toBeVisible();
  });

  it('names a repeated standing-image delete button by its item number', async () => {
    const user = await renderOpenCocSheet();

    await user.click(screen.getByRole('button', { name: '추가' }));

    expect(screen.getByRole('button', { name: '표정 이미지 1 삭제' })).toBeInTheDocument();
  });

  it('names COC skill controls by row and column and distinguishes every skill table', async () => {
    await renderOpenCocSheet();

    const tables = screen.getAllByRole('table', { name: /기능치 목록/ });
    const tableNames = [
      '기능치 목록 (모바일)',
      '기능치 목록 (왼쪽)',
      '기능치 목록 (오른쪽)',
    ];

    expect(tables).toHaveLength(tableNames.length);
    tables.forEach((table, index) => expect(table).toHaveAccessibleName(tableNames[index]));

    for (const table of tables) {
      expect(table.querySelectorAll('thead th:not([scope="col"])')).toHaveLength(0);
      expect(table.querySelector('tbody th[scope="row"]')).not.toBeNull();
    }

    expect(screen.getAllByRole('checkbox', { name: '감정 성장 선택' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('spinbutton', { name: '감정 직업' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('spinbutton', { name: '감정 관심' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('spinbutton', { name: '감정 성장' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('spinbutton', { name: '감정 기타' }).length).toBeGreaterThan(0);
  });

  it('keeps repeated custom skill names unique and stable while their values are edited', async () => {
    const user = await renderOpenCocSheet();

    const addSkillButtons = screen.getAllByRole('button', { name: '기능치 추가' });
    await user.click(addSkillButtons[0]);
    await user.click(addSkillButtons[0]);

    const mobileSkillTable = screen.getByRole('table', { name: '기능치 목록 (모바일)' });
    const customNameInputs = within(mobileSkillTable).getAllByDisplayValue('새 기능치');
    const initialNames = customNameInputs.map((input) => input.getAttribute('aria-label'));

    expect(new Set(initialNames).size).toBe(customNameInputs.length);
    initialNames.forEach((name) => expect(name).toMatch(/^사용자 기능치 \d+ 기능치명$/));

    const customContexts = initialNames.map((name) => name?.replace(/ 기능치명$/, '') ?? '');
    const repeatedControls = customContexts.map((context) => [
      within(mobileSkillTable).getByRole('checkbox', { name: `${context} 성장 선택` }),
      within(mobileSkillTable).getByRole('spinbutton', { name: `${context} 직업` }),
      within(mobileSkillTable).getByRole('spinbutton', { name: `${context} 관심` }),
      within(mobileSkillTable).getByRole('spinbutton', { name: `${context} 성장` }),
      within(mobileSkillTable).getByRole('spinbutton', { name: `${context} 기타` }),
      within(mobileSkillTable).getByRole('button', { name: `${context} 기능치 삭제` }),
    ]);
    const initialRepeatedNames = repeatedControls.map((controls) =>
      controls.map((control) => control.getAttribute('aria-label')),
    );

    for (let columnIndex = 0; columnIndex < repeatedControls[0].length; columnIndex += 1) {
      expect(
        new Set(initialRepeatedNames.map((rowNames) => rowNames[columnIndex])).size,
      ).toBe(repeatedControls.length);
    }

    await user.clear(customNameInputs[0]);
    await user.type(customNameInputs[0], '고고학');

    expect(customNameInputs[0]).toHaveAccessibleName(initialNames[0] ?? '');
    expect(
      repeatedControls.map((controls) =>
        controls.map((control) => control.getAttribute('aria-label')),
      ),
    ).toEqual(initialRepeatedNames);
  });

  it('keeps duplicate weapon and spell row controls unique and stable while names are edited', async () => {
    const user = await renderOpenCocSheet();

    await user.click(screen.getByRole('button', { name: '무기 추가' }));
    await user.click(screen.getByRole('button', { name: '무기 추가' }));
    const weaponTable = screen.getByRole('table', { name: '근거리 무기 목록' });
    const weaponNameInputs = [2, 3].map((rowNumber) =>
      within(weaponTable).getByRole('textbox', { name: `근거리 무기 ${rowNumber} 이름` }),
    );
    const weaponDamageInputs = [2, 3].map((rowNumber) =>
      within(weaponTable).getByRole('textbox', { name: `근거리 무기 ${rowNumber} 피해` }),
    );
    const weaponDeleteButtons = [2, 3].map((rowNumber) =>
      within(weaponTable).getByRole('button', { name: `근거리 무기 ${rowNumber} 삭제` }),
    );
    const initialWeaponNames = [weaponNameInputs, weaponDamageInputs, weaponDeleteButtons].map(
      (controls) => controls.map((control) => control.getAttribute('aria-label')),
    );

    for (const input of weaponNameInputs) await user.type(input, '단검');

    expect(
      [weaponNameInputs, weaponDamageInputs, weaponDeleteButtons].map((controls) =>
        controls.map((control) => control.getAttribute('aria-label')),
      ),
    ).toEqual(initialWeaponNames);
    initialWeaponNames.forEach((names) => expect(new Set(names).size).toBe(2));

    await user.click(screen.getByRole('button', { name: '주문' }));
    await user.click(screen.getByRole('button', { name: '주문 추가' }));
    await user.click(screen.getByRole('button', { name: '주문 추가' }));
    const spellTable = screen.getByRole('table', { name: '주문 목록' });
    const spellNameInputs = [1, 2].map((rowNumber) =>
      within(spellTable).getByRole('textbox', { name: `주문 ${rowNumber} 주문 이름` }),
    );
    const spellDescriptionInputs = [1, 2].map((rowNumber) =>
      within(spellTable).getByRole('textbox', { name: `주문 ${rowNumber} 설명` }),
    );
    const spellDeleteButtons = [1, 2].map((rowNumber) =>
      within(spellTable).getByRole('button', { name: `주문 ${rowNumber} 삭제` }),
    );
    const initialSpellNames = [spellNameInputs, spellDescriptionInputs, spellDeleteButtons].map(
      (controls) => controls.map((control) => control.getAttribute('aria-label')),
    );

    for (const input of spellNameInputs) await user.type(input, '불꽃');

    expect(
      [spellNameInputs, spellDescriptionInputs, spellDeleteButtons].map((controls) =>
        controls.map((control) => control.getAttribute('aria-label')),
      ),
    ).toEqual(initialSpellNames);
    initialSpellNames.forEach((names) => expect(new Set(names).size).toBe(2));
  });

  it('names COC combat fields and delete buttons by row context and exposes table captions', async () => {
    const user = await renderOpenCocSheet();

    await user.click(screen.getByRole('button', { name: '무기 추가' }));
    const weaponTable = screen.getByRole('table', { name: '근거리 무기 목록' });
    expect(within(weaponTable).getByRole('rowheader', { name: '근거리 무기 2' })).toBeInTheDocument();
    expect(within(weaponTable).getByRole('textbox', { name: '근거리 무기 2 이름' })).toBeInTheDocument();
    expect(within(weaponTable).getByRole('textbox', { name: '근거리 무기 2 기능치' })).toBeInTheDocument();
    expect(within(weaponTable).getByRole('textbox', { name: '근거리 무기 2 피해' })).toBeInTheDocument();
    expect(within(weaponTable).getByRole('button', { name: '근거리 무기 2 삭제' })).toBeInTheDocument();
    expect(weaponTable.querySelectorAll('thead th:not([scope="col"])')).toHaveLength(0);
    expect(weaponTable.querySelector('tbody th[scope="row"]')).not.toBeNull();

    const weaponNameInput = within(weaponTable).getByRole('textbox', { name: '근거리 무기 2 이름' });
    await user.type(weaponNameInput, '단검');
    expect(weaponNameInput).toHaveAccessibleName('근거리 무기 2 이름');
    expect(within(weaponTable).getByRole('rowheader', { name: '근거리 무기 2' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '권총' }));
    await user.click(screen.getByRole('button', { name: '무기 추가' }));
    const handgunTable = screen.getByRole('table', { name: '권총 무기 목록' });
    expect(within(handgunTable).getByRole('rowheader', { name: '권총 무기 1' })).toBeInTheDocument();
    expect(within(handgunTable).getByRole('textbox', { name: '권총 무기 1 사거리' })).toBeInTheDocument();
    expect(within(handgunTable).getByRole('textbox', { name: '권총 무기 1 공격 횟수' })).toBeInTheDocument();
    expect(within(handgunTable).getByRole('textbox', { name: '권총 무기 1 탄환수' })).toBeInTheDocument();
    expect(within(handgunTable).getByRole('textbox', { name: '권총 무기 1 고장' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '방어구' }));
    await user.click(screen.getByRole('button', { name: '방어구 추가' }));
    const armorTable = screen.getByRole('table', { name: '방어구 목록' });
    expect(within(armorTable).getByRole('rowheader', { name: '방어구 1' })).toBeInTheDocument();
    expect(within(armorTable).getByRole('textbox', { name: '방어구 1 머리' })).toBeInTheDocument();
    expect(within(armorTable).getByRole('textbox', { name: '방어구 1 몸' })).toBeInTheDocument();
    expect(within(armorTable).getByRole('textbox', { name: '방어구 1 방어 데이터' })).toBeInTheDocument();
    expect(within(armorTable).getByRole('button', { name: '방어구 1 삭제' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '주문' }));
    await user.click(screen.getByRole('button', { name: '주문 추가' }));
    const spellTable = screen.getByRole('table', { name: '주문 목록' });
    expect(within(spellTable).getByRole('rowheader', { name: '주문 1' })).toBeInTheDocument();
    expect(within(spellTable).getByRole('textbox', { name: '주문 1 주문 이름' })).toBeInTheDocument();
    expect(within(spellTable).getByRole('textbox', { name: '주문 1 비용' })).toBeInTheDocument();
    expect(within(spellTable).getByRole('textbox', { name: '주문 1 시전시간' })).toBeInTheDocument();
    expect(within(spellTable).getByRole('textbox', { name: '주문 1 설명' })).toBeInTheDocument();
    expect(within(spellTable).getByRole('button', { name: '주문 1 삭제' })).toBeInTheDocument();

    const spellNameInput = within(spellTable).getByRole('textbox', { name: '주문 1 주문 이름' });
    await user.type(spellNameInput, '불꽃');
    expect(spellNameInput).toHaveAccessibleName('주문 1 주문 이름');
    expect(within(spellTable).getByRole('rowheader', { name: '주문 1' })).toBeInTheDocument();
  });

  it('names each saved COC session delete button by its item number', async () => {
    const user = await renderOpenCocSheet();

    for (const title of ['첫 세션', '둘째 세션']) {
      await user.click(screen.getByRole('button', { name: '세션 추가' }));
      await user.type(screen.getByRole('textbox', { name: '제목' }), title);
      await user.click(screen.getByRole('button', { name: '입력 완료' }));
    }

    expect(screen.getByRole('button', { name: '세션 1 둘째 세션 삭제' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '세션 2 첫 세션 삭제' })).toBeInTheDocument();
  });

  it('gives every rendered COC form control an accessible name', async () => {
    await renderOpenCocSheet();

    expect(screen.getByRole('spinbutton', { name: 'STR 근력' })).toBeInTheDocument();

    getVisibleFormControls().forEach((control) => expect(control).toHaveAccessibleName());
  });

  it('names InSane image, vital, fear, and specialty controls with their group context', async () => {
    await renderOpenInsaneSheet();

    expect(screen.getByRole('textbox', { name: '이미지 주소' })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: '생명력 현재' })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: '생명력 최대' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: '생명력 행동불능' })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: '이성치 현재' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: '이성치 착란' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: '공포심' })).toBeInTheDocument();

    const specialtyTable = screen.getByRole('table', { name: '인세인 특기 목록' });
    expect(within(specialtyTable).getByRole('checkbox', { name: '1. 폭력 소각 선택' })).toBeInTheDocument();
    expect(within(specialtyTable).getByRole('spinbutton', { name: '1. 폭력 소각 목표치' })).toBeInTheDocument();
    expect(specialtyTable.querySelectorAll('thead th:not([scope="col"])')).toHaveLength(0);
  });

  it('names InSane repeated controls by item number while preserving their visible labels', async () => {
    const user = await renderOpenInsaneSheet();

    await user.click(screen.getByRole('button', { name: '어빌리티 추가' }));
    await user.click(screen.getByRole('button', { name: '인물 추가' }));
    await user.click(screen.getByRole('button', { name: '세션 추가' }));

    const abilityName = screen.getByRole('textbox', { name: '어빌리티 1 어빌리티명' });
    expect(abilityName).toHaveAccessibleName(/어빌리티명/);
    expect(screen.getByRole('combobox', { name: '어빌리티 1 타입' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '어빌리티 1 특기' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '어빌리티 1 효과' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '어빌리티 3 어빌리티명' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '어빌리티 3 삭제' })).toBeInTheDocument();

    const relationshipName = screen.getByRole('textbox', { name: '인물 1 인물란' });
    expect(relationshipName).toHaveAccessibleName(/인물란/);
    expect(screen.getByRole('textbox', { name: '인물 1 거처' })).toBeInTheDocument();
    const emotionSign = screen.getByRole('combobox', { name: '인물 1 ＋/－ 감정 부호' });
    expect(emotionSign).toHaveAccessibleName(/＋\/－/);
    expect(screen.getByRole('button', { name: '인물 1 삭제' })).toBeInTheDocument();

    expect(screen.getByRole('textbox', { name: '세션 1 날짜' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '세션 1 시나리오명' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '세션 1 PC번호' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '세션 1 삭제' })).toBeInTheDocument();
  });

  it('keeps labels one-to-one and gives every rendered InSane form control an accessible name', async () => {
    await renderOpenInsaneSheet();

    const labelsWithMultipleControls = Array.from(document.querySelectorAll('label')).filter(
      (label) => label.querySelectorAll('input, select, textarea').length > 1,
    );
    expect(labelsWithMultipleControls.map((label) => label.outerHTML)).toEqual([]);
    getVisibleFormControls().forEach((control) => expect(control).toHaveAccessibleName());
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
