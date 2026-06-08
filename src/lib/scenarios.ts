export interface SheetScenario {
  id: string;
  rule: string;
  title: string;
  keeper: string;
  result: string;
  reward: string;
}

export type ScenarioDraft = Omit<SheetScenario, 'id'>;

export interface ScenarioCompletionResult {
  scenarios: SheetScenario[];
  draft: ScenarioDraft;
  completed: boolean;
}

export function createEmptyScenarioDraft(): ScenarioDraft {
  return {
    rule: '',
    title: '',
    keeper: '',
    result: '',
    reward: '',
  };
}

export function isScenarioDraftEmpty(draft: ScenarioDraft): boolean {
  return Object.values(draft).every((value) => value.trim() === '');
}

export function completeScenarioDraft(
  scenarios: SheetScenario[],
  draft: ScenarioDraft,
  id: string,
): ScenarioCompletionResult {
  if (isScenarioDraftEmpty(draft)) {
    return {
      scenarios,
      draft,
      completed: false,
    };
  }

  const completedScenario: SheetScenario = {
    id,
    rule: draft.rule.trim(),
    title: draft.title.trim(),
    keeper: draft.keeper.trim(),
    result: draft.result.trim(),
    reward: draft.reward.trim(),
  };

  return {
    scenarios: [completedScenario, ...scenarios],
    draft: createEmptyScenarioDraft(),
    completed: true,
  };
}

export function normalizeScenarios(value: unknown): SheetScenario[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((scenario) => normalizeScenario(scenario))
    .filter((scenario): scenario is SheetScenario => Boolean(scenario));
}

function normalizeScenario(value: unknown): SheetScenario | null {
  if (typeof value !== 'object' || value === null) return null;
  const scenario = value as Partial<SheetScenario>;

  return {
    id: typeof scenario.id === 'string' ? scenario.id : '',
    rule: typeof scenario.rule === 'string' ? scenario.rule : '',
    title: typeof scenario.title === 'string' ? scenario.title : '',
    keeper: typeof scenario.keeper === 'string' ? scenario.keeper : '',
    result: typeof scenario.result === 'string' ? scenario.result : '',
    reward: typeof scenario.reward === 'string' ? scenario.reward : '',
  };
}
