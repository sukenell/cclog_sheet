import { describe, expect, it } from 'vitest';
import {
  completeScenarioDraft,
  createEmptyScenarioDraft,
  normalizeScenarios,
  type SheetScenario,
} from './scenarios';

describe('completeScenarioDraft', () => {
  it('prepends a filled draft to the completed scenario list and clears the draft', () => {
    const previous: SheetScenario[] = [
      {
        id: 'old',
        rule: 'CoC 7판',
        title: '오래된 시나리오',
        keeper: 'KP',
        result: '생환',
        reward: '성장',
      },
    ];

    const result = completeScenarioDraft(
      previous,
      {
        rule: ' CoC 7판 ',
        title: '  새 시나리오  ',
        keeper: ' Keeper ',
        result: ' 다인 ',
        reward: ' 보상 ',
      },
      'new',
    );

    expect(result.completed).toBe(true);
    expect(result.scenarios).toEqual([
      {
        id: 'new',
        rule: 'CoC 7판',
        title: '새 시나리오',
        keeper: 'Keeper',
        result: '다인',
        reward: '보상',
      },
      previous[0],
    ]);
    expect(result.draft).toEqual(createEmptyScenarioDraft());
  });

  it('does not create an empty completed scenario', () => {
    const previous: SheetScenario[] = [];
    const result = completeScenarioDraft(previous, createEmptyScenarioDraft(), 'new');

    expect(result.completed).toBe(false);
    expect(result.scenarios).toEqual(previous);
  });
});

describe('normalizeScenarios', () => {
  it('fills the added rule field for older saved scenarios', () => {
    expect(
      normalizeScenarios([
        {
          id: 'old',
          title: '기존 시나리오',
          keeper: '참여자',
          result: '타이만',
          reward: '보상',
        },
      ]),
    ).toEqual([
      {
        id: 'old',
        rule: '',
        title: '기존 시나리오',
        keeper: '참여자',
        result: '타이만',
        reward: '보상',
      },
    ]);
  });
});
