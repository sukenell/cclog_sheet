// @vitest-environment jsdom

import './test/setup';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe, { type Result as AxeViolation } from 'axe-core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

afterEach(() => {
  window.history.replaceState(null, '', '/cclog_sheet/');
});

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

    await user.click(screen.getByRole('tab', { name: '주문' }));
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

    await user.click(screen.getByRole('tab', { name: '방어구' }));
    await user.click(screen.getByRole('button', { name: '방어구 추가' }));
    const armorTable = screen.getByRole('table', { name: '방어구 목록' });
    expect(within(armorTable).getByRole('rowheader', { name: '방어구 1' })).toBeInTheDocument();
    expect(within(armorTable).getByRole('textbox', { name: '방어구 1 머리' })).toBeInTheDocument();
    expect(within(armorTable).getByRole('textbox', { name: '방어구 1 몸' })).toBeInTheDocument();
    expect(within(armorTable).getByRole('textbox', { name: '방어구 1 방어 데이터' })).toBeInTheDocument();
    expect(within(armorTable).getByRole('button', { name: '방어구 1 삭제' })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: '주문' }));
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

  it('connects each combat tab to its labelled panel with a single roving tab stop', async () => {
    await renderOpenCocSheet();

    const tablist = screen.getByRole('tablist', { name: '전투 분류' });
    const tabs = within(tablist).getAllByRole('tab');

    expect(tabs).toHaveLength(3);
    expect(tablist.querySelectorAll(':scope > [role="tab"]')).toHaveLength(3);
    expect(tabs.map((tab) => tab.id)).toEqual([
      'combat-tab-weapons',
      'combat-tab-armor',
      'combat-tab-spells',
    ]);
    expect(tabs.filter((tab) => tab.getAttribute('aria-selected') === 'true')).toEqual([
      tabs[0],
    ]);
    expect(tabs.filter((tab) => tab.tabIndex === 0)).toEqual([tabs[0]]);

    for (const [index, tab] of tabs.entries()) {
      const panelId = tab.getAttribute('aria-controls');
      expect(panelId).toBe(`combat-panel-${['weapons', 'armor', 'spells'][index]}`);

      const panel = document.getElementById(panelId ?? '');
      expect(panel).not.toBeNull();
      expect(panel).toHaveAttribute('role', 'tabpanel');
      expect(panel).toHaveAttribute('aria-labelledby', tab.id);
      expect(panel?.hasAttribute('hidden')).toBe(index !== 0);
      if (index === 0) expect(panel).toHaveAccessibleName(tab.textContent ?? '');
    }
  });

  it('moves combat selection and focus with arrow, Home, and End keys including wraparound', async () => {
    const user = await renderOpenCocSheet();
    const tablist = screen.getByRole('tablist', { name: '전투 분류' });
    const weaponTab = within(tablist).getByRole('tab', { name: '무기' });
    const armorTab = within(tablist).getByRole('tab', { name: '방어구' });
    const spellTab = within(tablist).getByRole('tab', { name: '주문' });

    weaponTab.focus();
    await user.keyboard('{ArrowRight}');
    expect(armorTab).toHaveFocus();
    expect(armorTab).toHaveAttribute('aria-selected', 'true');
    expect(armorTab).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tabpanel', { name: '방어구' })).not.toHaveAttribute('hidden');

    await user.keyboard('{End}');
    expect(spellTab).toHaveFocus();
    expect(spellTab).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{Home}');
    expect(weaponTab).toHaveFocus();
    expect(weaponTab).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{ArrowLeft}');
    expect(spellTab).toHaveFocus();
    expect(spellTab).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{ArrowRight}');
    expect(weaponTab).toHaveFocus();
    expect(weaponTab).toHaveAttribute('aria-selected', 'true');
  });

  it('exposes skill and weapon filters as pressed button groups rather than tabs', async () => {
    const user = await renderOpenCocSheet();
    const skillFilters = screen.getByRole('group', { name: '기능치 유형' });
    const allSkillsButton = within(skillFilters).getByRole('button', { name: '전체' });
    const combatSkillsButton = within(skillFilters).getByRole('button', { name: '전투' });

    expect(within(skillFilters).queryAllByRole('tab')).toEqual([]);
    expect(allSkillsButton).toHaveAttribute('aria-pressed', 'true');
    expect(combatSkillsButton).toHaveAttribute('aria-pressed', 'false');
    await user.click(combatSkillsButton);
    expect(allSkillsButton).toHaveAttribute('aria-pressed', 'false');
    expect(combatSkillsButton).toHaveAttribute('aria-pressed', 'true');

    const weaponFilters = screen.getByRole('group', { name: '무기 종류' });
    const meleeButton = within(weaponFilters).getByRole('button', { name: '근거리' });
    const handgunButton = within(weaponFilters).getByRole('button', { name: '권총' });

    expect(within(weaponFilters).queryAllByRole('tab')).toEqual([]);
    expect(meleeButton).toHaveAttribute('aria-pressed', 'true');
    expect(handgunButton).toHaveAttribute('aria-pressed', 'false');
    await user.click(handgunButton);
    expect(meleeButton).toHaveAttribute('aria-pressed', 'false');
    expect(handgunButton).toHaveAttribute('aria-pressed', 'true');
  });

  it.each([
    {
      invokerName: '세이브',
      dialogName: 'COC 세이브',
      open: async (user: ReturnType<typeof userEvent.setup>) => {
        await user.click(screen.getByRole('button', { name: '세이브' }));
      },
    },
    {
      invokerName: '비밀 주사위 복사',
      dialogName: '비밀 주사위 복사',
      open: async (user: ReturnType<typeof userEvent.setup>) => {
        await user.click(screen.getByRole('button', { name: '비밀 주사위 복사' }));
      },
    },
    {
      invokerName: '초기화',
      dialogName: '시트 초기화',
      open: async (user: ReturnType<typeof userEvent.setup>) => {
        await user.click(screen.getByRole('button', { name: '초기화' }));
      },
    },
  ])(
    'opens the $dialogName flow as a native modal and restores focus to $invokerName after Escape',
    async ({ invokerName, dialogName, open }) => {
      const user = userEvent.setup();
      render(<App />);
      const invoker = screen.getByRole('button', { name: invokerName });

      await open(user);

      const dialog = screen.getByRole<HTMLDialogElement>('dialog', { name: dialogName });
      expect(dialog.tagName).toBe('DIALOG');
      expect(dialog).toHaveAttribute('open');
      expect(dialog).toHaveAccessibleDescription();
      expect(dialog.contains(document.activeElement)).toBe(true);

      const cancelEvent = new Event('cancel', { cancelable: true });
      fireEvent(dialog, cancelEvent);

      expect(cancelEvent.defaultPrevented).toBe(true);
      await waitFor(() => expect(dialog).not.toHaveAttribute('open'));
      expect(invoker).toHaveFocus();
    },
  );

  it('opens the InSane password flow as a native modal and restores focus after Escape', async () => {
    const user = userEvent.setup();
    render(<App />);
    const systemSelect = screen.getByRole('combobox', { name: '룰 선택' });

    await user.selectOptions(systemSelect, 'insan');

    const dialog = screen.getByRole<HTMLDialogElement>('dialog', {
      name: 'InSane 어빌리티 잠금',
    });
    expect(dialog.tagName).toBe('DIALOG');
    expect(dialog).toHaveAttribute('open');
    expect(dialog).toHaveAccessibleDescription();
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(screen.getByLabelText(/룰북 구매확인 비밀번호/)).toHaveFocus();

    fireEvent(dialog, new Event('cancel', { cancelable: true }));

    await waitFor(() => expect(dialog).not.toHaveAttribute('open'));
    expect(systemSelect).toHaveFocus();
  });

  it('protects COC reset with cancel, one-use snapshot undo, and mutation invalidation', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', '/cclog_sheet/');
    render(<App />);
    const nameInput = screen.getByRole('textbox', { name: '이름' });
    const resetButton = screen.getByRole('button', { name: '초기화' });
    await user.clear(nameInput);
    await user.type(nameInput, '되돌릴 탐사자');

    await user.click(resetButton);
    let dialog = screen.getByRole('dialog', { name: '시트 초기화' });
    expect(dialog).toHaveAccessibleDescription(/COC 7판.*브라우저.*대체/);
    const cancelButton = within(dialog).getByRole('button', { name: '취소' });
    const confirmButton = within(dialog).getByRole('button', { name: '초기화 확인' });
    expect(cancelButton).toHaveFocus();
    expect(confirmButton).not.toHaveFocus();
    await user.click(cancelButton);
    expect(nameInput).toHaveValue('되돌릴 탐사자');
    expect(resetButton).toHaveFocus();

    await user.click(resetButton);
    dialog = screen.getByRole('dialog', { name: '시트 초기화' });
    await user.click(within(dialog).getByRole('button', { name: '초기화 확인' }));
    expect(nameInput).toHaveValue('새로운 탐사자');

    const undoButton = screen.getByRole('button', { name: '초기화 실행 취소' });
    await user.click(undoButton);
    expect(nameInput).toHaveValue('되돌릴 탐사자');
    expect(screen.queryByRole('button', { name: '초기화 실행 취소' })).not.toBeInTheDocument();
    await waitFor(() => expect(resetButton).toHaveFocus());
    expect(screen.getByText('초기화를 실행 취소했습니다.')).toHaveAttribute('role', 'status');

    await user.click(resetButton);
    dialog = screen.getByRole('dialog', { name: '시트 초기화' });
    await user.click(within(dialog).getByRole('button', { name: '초기화 확인' }));
    expect(screen.getByRole('button', { name: '초기화 실행 취소' })).toBeInTheDocument();
    await user.clear(nameInput);
    await user.type(nameInput, '새 탐사자');
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: '초기화 실행 취소' })).not.toBeInTheDocument(),
    );
    expect(
      screen.queryByText('시트를 초기화했습니다. 다음 수정 전까지 실행 취소할 수 있습니다.'),
    ).not.toBeInTheDocument();

    await user.click(resetButton);
    dialog = screen.getByRole('dialog', { name: '시트 초기화' });
    await user.click(within(dialog).getByRole('button', { name: '초기화 확인' }));
    expect(screen.getByRole('button', { name: '초기화 실행 취소' })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: '메모' }));
    expect(screen.queryByRole('button', { name: '초기화 실행 취소' })).not.toBeInTheDocument();
    expect(
      screen.queryByText('시트를 초기화했습니다. 다음 수정 전까지 실행 취소할 수 있습니다.'),
    ).not.toBeInTheDocument();
  });

  it('restores an InSane sheet from the reset snapshot', async () => {
    const user = await renderOpenInsaneSheet();
    const nameInput = screen.getByRole('textbox', { name: '이름' });
    await user.type(nameInput, '되돌릴 봉마인');

    await user.click(screen.getByRole('button', { name: '초기화' }));
    const dialog = screen.getByRole('dialog', { name: '시트 초기화' });
    expect(dialog).toHaveAccessibleDescription(/InSane.*브라우저.*대체/);
    await user.click(within(dialog).getByRole('button', { name: '초기화 확인' }));
    expect(nameInput).toHaveValue('');

    await user.click(screen.getByRole('button', { name: '초기화 실행 취소' }));
    expect(nameInput).toHaveValue('되돌릴 봉마인');
  });

  it('announces an invalid import as an alert beside Load without replacing the growth result', async () => {
    const user = await renderOpenCocSheet();

    await user.click(screen.getByRole('button', { name: /^성장 굴림/ }));
    const growthStatus = screen.getByRole('status', { name: '성장 결과' });
    expect(growthStatus).toHaveTextContent('성장 체크된 기능치가 없습니다.');

    const importInput = document.querySelector<HTMLInputElement>('input[type="file"]');
    if (!importInput) throw new Error('Missing JSON import input');
    fireEvent.change(importInput, {
      target: { files: [new File(['not-json'], 'broken.json', { type: 'application/json' })] },
    });

    const alert = screen.getByRole('alert', { name: '로드 오류' });
    await waitFor(() => expect(alert).toHaveTextContent('로드 파일을 읽지 못했습니다.'));
    expect(growthStatus).toHaveTextContent('성장 체크된 기능치가 없습니다.');

    await user.click(screen.getByRole('button', { name: '로드' }));
    expect(alert).toBeEmptyDOMElement();

    fireEvent.change(importInput, {
      target: {
        files: [new File(['{"gameSystem":"insan"}'], 'valid.json', { type: 'application/json' })],
      },
    });

    await waitFor(() => {
      expect(alert).toBeEmptyDOMElement();
      expect(screen.getByRole('combobox', { name: '룰 선택' })).toHaveValue('insan');
      expect(screen.getByRole('status', { name: '작업 상태' })).toHaveTextContent(
        '시트를 불러왔습니다.',
      );
    });
    await act(async () => Promise.resolve());
    expect(screen.getByRole('status', { name: '작업 상태' })).toHaveTextContent(
      '시트를 불러왔습니다.',
    );

    const taskStatus = screen.getByRole('status', { name: '작업 상태' });
    const firstLoadMessage = taskStatus.firstChild;
    fireEvent.change(importInput, {
      target: {
        files: [new File(['{"gameSystem":"insan"}'], 'valid.json', { type: 'application/json' })],
      },
    });
    await waitFor(() => expect(taskStatus.firstChild).not.toBe(firstLoadMessage));
    expect(taskStatus).toHaveTextContent('시트를 불러왔습니다.');
  });

  it('announces a FileReader failure through the import alert', async () => {
    const readSpy = vi
      .spyOn(FileReader.prototype, 'readAsText')
      .mockImplementation(function (this: FileReader) {
        this.onerror?.call(
          this,
          new ProgressEvent('error') as ProgressEvent<FileReader>,
        );
      });
    render(<App />);
    const importInput = document.querySelector<HTMLInputElement>('input[type="file"]');
    if (!importInput) throw new Error('Missing JSON import input');

    await act(async () => {
      fireEvent.change(importInput, {
        target: { files: [new File(['unreadable'], 'unreadable.json')] },
      });
    });

    await waitFor(() =>
      expect(screen.getByRole('alert', { name: '로드 오류' })).toHaveTextContent(
        '로드 파일을 읽지 못했습니다.',
      ),
    );
    readSpy.mockRestore();
  });

  it('keeps the password dialog open and exposes an alert-linked invalid field on failure', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.selectOptions(screen.getByRole('combobox', { name: '룰 선택' }), 'insan');
    const dialog = screen.getByRole('dialog', { name: 'InSane 어빌리티 잠금' });
    const passwordInput = within(dialog).getByLabelText(/룰북 구매확인 비밀번호/);
    await user.type(passwordInput, 'incorrect');
    await user.click(within(dialog).getByRole('button', { name: '확인' }));

    expect(dialog).toHaveAttribute('open');
    expect(passwordInput).toHaveAttribute('aria-invalid', 'true');
    const errorId = passwordInput.getAttribute('aria-errormessage');
    expect(errorId).toBeTruthy();
    const alert = within(dialog).getByRole('alert');
    expect(alert).toHaveAttribute('id', errorId);
    expect(alert).toHaveTextContent('비밀번호가 일치하지 않습니다.');
    const firstPasswordError = alert.firstChild;

    await user.click(within(dialog).getByRole('button', { name: '확인' }));
    expect(alert.firstChild).not.toBe(firstPasswordError);

    await user.type(passwordInput, '1');
    expect(passwordInput).not.toHaveAttribute('aria-invalid', 'true');
    expect(passwordInput).not.toHaveAttribute('aria-errormessage');
    expect(alert).toBeEmptyDOMElement();
  });

  it('announces repeated completed actions through a persistent polite live region', async () => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:test'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const user = await renderOpenCocSheet();

    const taskStatus = screen.getByRole('status', { name: '작업 상태' });
    const growthStatus = screen.getByRole('status', { name: '성장 결과' });
    expect(growthStatus).toBeEmptyDOMElement();
    const save = async () => {
      await user.click(screen.getByRole('button', { name: '세이브' }));
      await user.click(within(screen.getByRole('dialog', { name: 'COC 세이브' })).getByRole('button', { name: '전체 세이브' }));
    };

    await save();
    expect(taskStatus).toHaveTextContent('시트를 저장했습니다.');
    const firstAnnouncement = taskStatus.firstChild;
    await save();
    expect(taskStatus).toHaveTextContent('시트를 저장했습니다.');
    expect(taskStatus.firstChild).not.toBe(firstAnnouncement);

    await user.click(screen.getByRole('button', { name: /^성장 굴림/ }));
    const firstGrowthAnnouncement = growthStatus.firstChild;
    await user.click(screen.getByRole('button', { name: /^성장 굴림/ }));
    expect(growthStatus.firstChild).not.toBe(firstGrowthAnnouncement);

    const budget = document.querySelector('.budget-pill');
    expect(budget).not.toBeNull();
    expect(budget?.closest('[role="status"], [role="alert"]')).toBeNull();
  });

  it('re-announces repeated dice, copy, and delete completions', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    const user = await renderOpenCocSheet();
    const taskStatus = screen.getByRole('status', { name: '작업 상태' });

    const randomDice = screen.getByRole('button', { name: '랜덤 다이스' });
    await user.click(randomDice);
    const firstDiceMessage = taskStatus.firstChild;
    await user.click(randomDice);
    expect(taskStatus).toHaveTextContent('랜덤 다이스 결과를 적용했습니다.');
    expect(taskStatus.firstChild).not.toBe(firstDiceMessage);

    const copy = screen.getByRole('button', { name: '코코포 팔레트 복사' });
    await user.click(copy);
    await waitFor(() => expect(taskStatus).toHaveTextContent('코코포 팔레트를 복사했습니다.'));
    const firstCopyMessage = taskStatus.firstChild;
    await user.click(copy);
    await waitFor(() => expect(taskStatus.firstChild).not.toBe(firstCopyMessage));

    await user.click(screen.getByRole('tab', { name: '방어구' }));
    const addArmor = screen.getByRole('button', { name: '방어구 추가' });
    await user.click(addArmor);
    await user.click(addArmor);
    await user.click(screen.getByRole('button', { name: '방어구 1 삭제' }));
    const firstDeleteMessage = taskStatus.firstChild;
    await user.click(screen.getByRole('button', { name: '방어구 1 삭제' }));
    expect(taskStatus).toHaveTextContent('방어구 1을 삭제했습니다.');
    expect(taskStatus.firstChild).not.toBe(firstDeleteMessage);
  });

  it('restores focus after clipboard fallback and reports the completed copy', async () => {
    const user = userEvent.setup();
    let fallbackHost: HTMLElement | null = null;
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: vi.fn(() => {
        fallbackHost = document.activeElement?.parentElement ?? null;
        return true;
      }),
    });
    render(<App />);

    const copyButton = screen.getByRole('button', { name: '코코포 팔레트 복사' });
    await user.click(copyButton);

    await waitFor(() => expect(copyButton).toHaveFocus());
    expect(screen.getByRole('status', { name: '작업 상태' })).toHaveTextContent(
      '코코포 팔레트를 복사했습니다.',
    );
    expect(document.querySelector('textarea[readonly]')).toBeNull();
    expect(fallbackHost).toBe(document.body);
  });

  it('does not announce copy completion when the fallback reports failure', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: vi.fn(() => false),
    });
    render(<App />);

    await user.click(screen.getByRole('button', { name: '코코포 팔레트 복사' }));

    expect(screen.getByRole('alert', { name: '작업 오류' })).toHaveTextContent(
      '클립보드에 복사하지 못했습니다.',
    );
    expect(screen.queryByText('코코포 팔레트를 복사했습니다.')).not.toBeInTheDocument();
  });

  it('closes the secret-dice modal before exposing a topbar copy error', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: vi.fn(() => false),
    });
    render(<App />);

    await user.click(screen.getByRole('button', { name: '비밀 주사위 복사' }));
    const dialog = screen.getByRole('dialog', { name: '비밀 주사위 복사' });
    await user.click(within(dialog).getByRole('button', { name: '일반 주사위 복사' }));

    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    expect(screen.getByRole('alert', { name: '작업 오류' })).toHaveTextContent(
      '클립보드에 복사하지 못했습니다.',
    );
  });

  it('keeps a completed mutation announcement when reset undo is invalidated', async () => {
    const user = await renderOpenCocSheet();
    await user.click(screen.getByRole('button', { name: '초기화' }));
    await user.click(
      within(screen.getByRole('dialog', { name: '시트 초기화' })).getByRole('button', {
        name: '초기화 확인',
      }),
    );

    await user.click(screen.getByRole('button', { name: '랜덤 다이스' }));

    await waitFor(() =>
      expect(screen.getByRole('status', { name: '작업 상태' })).toHaveTextContent(
        '랜덤 다이스 결과를 적용했습니다.',
      ),
    );
    expect(screen.queryByRole('button', { name: '초기화 실행 취소' })).not.toBeInTheDocument();
  });

  it('moves focus to the next, previous, or Add target after COC row deletion', async () => {
    const user = await renderOpenCocSheet();
    const addWeapon = screen.getByRole('button', { name: '무기 추가' });
    await user.click(addWeapon);
    await user.click(addWeapon);
    await user.click(addWeapon);
    await user.type(
      screen.getByRole('textbox', { name: '근거리 무기 3 이름' }),
      '단검',
    );

    await user.click(screen.getByRole('button', { name: '근거리 무기 3 삭제' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '근거리 무기 3 삭제' })).toHaveFocus(),
    );
    expect(screen.getByRole('status', { name: '작업 상태' })).toHaveTextContent(
      '단검을 삭제했습니다.',
    );

    await user.click(screen.getByRole('button', { name: '근거리 무기 3 삭제' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '근거리 무기 2 삭제' })).toHaveFocus(),
    );

    await user.click(screen.getByRole('tab', { name: '방어구' }));
    const addArmor = screen.getByRole('button', { name: '방어구 추가' });
    await user.click(addArmor);
    await user.click(screen.getByRole('button', { name: '방어구 1 삭제' }));
    await waitFor(() => expect(addArmor).toHaveFocus());
    expect(screen.getByRole('status', { name: '작업 상태' })).toHaveTextContent(
      '방어구 1을 삭제했습니다.',
    );
  });

  it('announces stable row context when a blank custom skill is deleted', async () => {
    const user = await renderOpenCocSheet();
    await user.click(screen.getAllByRole('button', { name: '기능치 추가' })[0]);
    const skillTable = screen.getByRole('table', { name: '기능치 목록 (모바일)' });
    const nameInput = within(skillTable).getByDisplayValue('새 기능치');
    const skillRow = nameInput.closest('tr');
    if (!skillRow) throw new Error('Missing custom skill row');
    await user.clear(nameInput);

    await user.click(within(skillRow).getByRole('button', { name: /기능치 삭제$/ }));

    expect(screen.getByRole('status', { name: '작업 상태' })).toHaveTextContent(
      '1번째 사용자 기능치를 삭제했습니다.',
    );
  });

  it('does not steal focus when it moves before a scheduled deletion restore', async () => {
    const scheduledFrames: FrameRequestCallback[] = [];
    const frameSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        scheduledFrames.push(callback);
        return scheduledFrames.length;
      });
    const user = await renderOpenCocSheet();
    await user.click(screen.getByRole('tab', { name: '방어구' }));
    await user.click(screen.getByRole('button', { name: '방어구 추가' }));
    await user.click(screen.getByRole('button', { name: '방어구 추가' }));
    const deleteButton = screen.getByRole('button', { name: '방어구 1 삭제' });
    deleteButton.focus();

    fireEvent.click(deleteButton);
    const resetButton = screen.getByRole('button', { name: '초기화' });
    resetButton.focus();
    act(() => scheduledFrames.splice(0).forEach((callback) => callback(0)));

    expect(resetButton).toHaveFocus();
    frameSpy.mockRestore();
  });

  it('moves focus through InSane repeated rows and announces the deleted item', async () => {
    const user = await renderOpenInsaneSheet();
    const addRelationship = screen.getByRole('button', { name: '인물 추가' });
    await user.click(addRelationship);
    await user.click(addRelationship);
    await user.click(addRelationship);

    await user.click(screen.getByRole('button', { name: '인물 2 삭제' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '인물 2 삭제' })).toHaveFocus(),
    );
    expect(screen.getByRole('status', { name: '작업 상태' })).toHaveTextContent(
      '인물 2을 삭제했습니다.',
    );

    await user.click(screen.getByRole('button', { name: '인물 2 삭제' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '인물 1 삭제' })).toHaveFocus(),
    );
    await user.click(screen.getByRole('button', { name: '인물 1 삭제' }));
    await waitFor(() => expect(addRelationship).toHaveFocus());
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
