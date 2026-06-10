import { sortSkillsByKoreanName } from '../data/skills';
import {
  calculateDerivedStats,
  calculateSkillTotal,
  isSkillGroup,
  statLabels,
  type InvestigatorStats,
  type SheetSkill,
  type StatKey,
} from './character';
import type { SanityInfo } from './sheet';

export interface ClipboardWeapon {
  name: string;
  damage: string;
}

export interface CharacterClipboardSource {
  name: string;
  stats: InvestigatorStats;
  sanity: SanityInfo;
  skills: SheetSkill[];
  weapons: ClipboardWeapon[];
}

export interface CharacterClipboardPayload {
  kind: 'character';
  data: {
    name: string;
    initiative: number;
    status: Array<{ label: string; value: number; max: number }>;
    params: Array<{ label: string; value: string }>;
    commands: string;
  };
}

export type SecretDiceTemplateKind = 'normal' | 'bonus';

export interface SecretDiceRollOption {
  id: string;
  kind: 'stat' | 'skill';
  label: string;
  value: number;
  attributeName: string;
  templateName: string;
}

interface Roll20Attribute {
  current: number;
  max: number | '';
}

interface SecretDiceImportPayload {
  character: string;
  attributes: Record<string, Roll20Attribute>;
  abilities: Record<string, string>;
}

const statCommandLabels: Record<StatKey, string> = {
  STR: '근력',
  CON: '건강',
  POW: '정신력',
  DEX: '민첩성',
  APP: '외모',
  SIZ: '크기',
  INT: '지능',
  EDU: '교육',
};

const secretDiceStatDefinitions: Array<{
  id: string;
  key: StatKey | 'SAN' | 'LUCK';
  label: string;
  attributeKey: string;
  templateName: string;
  getValue: (source: CharacterClipboardSource) => number;
}> = [
  {
    id: 'stat:STR',
    key: 'STR',
    label: statCommandLabels.STR,
    attributeKey: 'str',
    templateName: '@{str_txt}',
    getValue: (source) => source.stats.STR,
  },
  {
    id: 'stat:CON',
    key: 'CON',
    label: statCommandLabels.CON,
    attributeKey: 'con',
    templateName: '@{con_txt}',
    getValue: (source) => source.stats.CON,
  },
  {
    id: 'stat:POW',
    key: 'POW',
    label: statCommandLabels.POW,
    attributeKey: 'pow',
    templateName: '@{pow_txt}',
    getValue: (source) => source.stats.POW,
  },
  {
    id: 'stat:DEX',
    key: 'DEX',
    label: statCommandLabels.DEX,
    attributeKey: 'dex',
    templateName: '@{dex_txt}',
    getValue: (source) => source.stats.DEX,
  },
  {
    id: 'stat:APP',
    key: 'APP',
    label: statCommandLabels.APP,
    attributeKey: 'app',
    templateName: '@{app_txt}',
    getValue: (source) => source.stats.APP,
  },
  {
    id: 'stat:SIZ',
    key: 'SIZ',
    label: statCommandLabels.SIZ,
    attributeKey: 'siz',
    templateName: '@{siz_txt}',
    getValue: (source) => source.stats.SIZ,
  },
  {
    id: 'stat:INT',
    key: 'INT',
    label: statCommandLabels.INT,
    attributeKey: 'int',
    templateName: '@{int_txt}',
    getValue: (source) => source.stats.INT,
  },
  {
    id: 'stat:EDU',
    key: 'EDU',
    label: statCommandLabels.EDU,
    attributeKey: 'edu',
    templateName: '@{edu_txt}',
    getValue: (source) => source.stats.EDU,
  },
  {
    id: 'stat:SAN',
    key: 'SAN',
    label: '이성',
    attributeKey: 'san',
    templateName: '@{san_txt}',
    getValue: (source) => source.sanity.current,
  },
  {
    id: 'stat:LUCK',
    key: 'LUCK',
    label: '행운',
    attributeKey: 'luck',
    templateName: '@{luck_txt}',
    getValue: (source) => source.stats.luck,
  },
];

const roll20SkillAttributeNames: Record<string, string> = {
  accounting: 'accounting',
  anthropology: 'anthropology',
  appraise: 'appraise',
  archaeology: 'archaeology',
  charm: 'charm',
  climb: 'climb',
  'credit-rating': 'creditrating',
  'cthulhu-mythos': 'cthulhumythos',
  disguise: 'disguise',
  dodge: 'dodge',
  'drive-auto': 'driveauto',
  'elec-repair': 'elecrepair',
  'fast-talk': 'fasttalk',
  'fighting-brawl': 'fighting_brawl',
  'firearms-handgun': 'firearms_hg',
  'firearms-rifle': 'firearms_rs',
  'first-aid': 'firstaid',
  history: 'history',
  intimidate: 'intimidate',
  jump: 'jump',
  'language-own': 'language_own',
  law: 'law',
  'library-use': 'libraryuse',
  listen: 'listen',
  locksmith: 'locksmith',
  'mechanical-repair': 'mechrepair',
  medicine: 'medicine',
  'natural-world': 'naturalworld',
  navigate: 'navigate',
  occult: 'occult',
  persuade: 'persuade',
  psychoanalysis: 'psychoanalysis',
  ride: 'ride',
  'sleight-of-hand': 'sleightofhand',
  'spot-hidden': 'spothidden',
  stealth: 'stealth',
  swim: 'swim',
  throw: 'throw',
  track: 'track',
};

export function buildCharacterClipboardPayload(
  source: CharacterClipboardSource,
): CharacterClipboardPayload {
  const derived = calculateDerivedStats(source.stats);
  const name = source.name.trim() || '새로운 탐사자';

  return {
    kind: 'character',
    data: {
      name,
      initiative: source.stats.DEX,
      status: [
        { label: 'HP', value: derived.hp, max: derived.hp },
        { label: 'MP', value: derived.mp, max: derived.mp },
        { label: '이성', value: source.sanity.current, max: derived.san },
        { label: '행운', value: source.stats.luck, max: source.stats.luck },
      ],
      params: [
        { label: '이동력', value: String(derived.move) },
        { label: '체구', value: String(derived.build) },
        { label: 'DB', value: derived.damageBonus },
      ],
      commands: buildCharacterCommands(source),
    },
  };
}

export function serializeCharacterClipboardPayload(
  payload: CharacterClipboardPayload,
): string {
  return JSON.stringify(payload, null, 2);
}

export function buildSecretDiceRollOptions(
  source: CharacterClipboardSource,
): SecretDiceRollOption[] {
  const usedAttributeNames = new Set([
    'hp',
    'mp',
    ...secretDiceStatDefinitions.map((definition) => definition.attributeKey),
  ]);
  const statOptions = secretDiceStatDefinitions.map((definition) => ({
    id: definition.id,
    kind: 'stat' as const,
    label: definition.label,
    value: clampRollValue(definition.getValue(source)),
    attributeName: definition.attributeKey,
    templateName: definition.templateName,
  }));
  const skillOptions = sortSkillsByKoreanName(source.skills)
    .filter((skill) => !isSkillGroup(skill))
    .map((skill) => {
      const roll20AttributeName = roll20SkillAttributeNames[skill.id];
      const attributeName = roll20AttributeName
        ? createUniqueAttributeName(roll20AttributeName, usedAttributeNames)
        : createUniqueAttributeName(createSkillAttributeName(skill.id), usedAttributeNames);

      return {
        id: `skill:${skill.id}`,
        kind: 'skill' as const,
        label: skill.name.trim() || '이름 없는 기능치',
        value: calculateSkillTotal(skill, source.stats),
        attributeName,
        templateName: roll20AttributeName
          ? `@{${roll20AttributeName}_txt}`
          : skill.name.trim() || '이름 없는 기능치',
      };
    });

  return [...statOptions, ...skillOptions];
}

export function serializeSecretDiceImport(
  source: CharacterClipboardSource,
  selectedOptionIds: string[],
  templateKind: SecretDiceTemplateKind,
): string {
  const payload = buildSecretDiceImportPayload(source, selectedOptionIds, templateKind);

  return ['[R20JE:COC7_IMPORT:1]', JSON.stringify(payload, null, 2), '[/R20JE]'].join('\n');
}

function buildSecretDiceImportPayload(
  source: CharacterClipboardSource,
  selectedOptionIds: string[],
  templateKind: SecretDiceTemplateKind,
): SecretDiceImportPayload {
  const selectedIds = new Set(selectedOptionIds);
  const template = templateKind === 'bonus' ? 'coc' : 'coc-1';
  const usedAbilityNames = new Set<string>();
  const selectedOptions = buildSecretDiceRollOptions(source).filter((option) =>
    selectedIds.has(option.id),
  );
  const abilities = selectedOptions.reduce<Record<string, string>>((acc, option) => {
    acc[createUniqueSecretDiceAbilityName(option.label, usedAbilityNames)] =
      buildSecretDiceMacro(option, template);
    return acc;
  }, {});

  return {
    character: source.name.trim() || '새로운 탐사자',
    attributes: buildSecretDiceAttributes(source, selectedOptions),
    abilities,
  };
}

function buildSecretDiceAttributes(
  source: CharacterClipboardSource,
  selectedOptions: SecretDiceRollOption[],
): Record<string, Roll20Attribute> {
  const derived = calculateDerivedStats(source.stats);
  const attributes: Record<string, Roll20Attribute> = {
    hp: { current: derived.hp, max: derived.hp },
    mp: { current: derived.mp, max: derived.mp },
  };

  selectedOptions.forEach((option) => {
    attributes[option.attributeName] = {
      current: option.value,
      max: option.id === 'stat:SAN' || option.id === 'stat:LUCK' ? 99 : '',
    };
  });

  return attributes;
}

function buildSecretDiceMacro(option: SecretDiceRollOption, template: string): string {
  const attributeReference = `@{${option.attributeName}}`;

  return [
    `/w gm &{template:${template}}`,
    `{{name=${option.templateName}}}`,
    `{{success=[[${attributeReference}]]}}`,
    `{{hard=[[floor(${attributeReference} /2)]]}}`,
    `{{extreme=[[floor(${attributeReference}/5)]]}}`,
    '{{roll1=[[1d100]]}}',
  ].join('');
}

function createUniqueSecretDiceAbilityName(label: string, usedNames: Set<string>): string {
  const baseName = `${label.trim() || '이름 없는 판정'}_비밀`;
  let name = baseName;
  let suffix = 2;

  while (usedNames.has(name)) {
    name = `${baseName}_${suffix}`;
    suffix += 1;
  }

  usedNames.add(name);
  return name;
}

function createSkillAttributeName(id: string): string {
  const normalizedId = id
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return `skill_${normalizedId || 'custom'}`;
}

function createUniqueAttributeName(baseName: string, usedNames: Set<string>): string {
  let name = baseName;
  let suffix = 2;

  while (usedNames.has(name)) {
    name = `${baseName}_${suffix}`;
    suffix += 1;
  }

  usedNames.add(name);
  return name;
}

function buildCharacterCommands(source: CharacterClipboardSource): string {
  const statCommands = buildStatCommands(source.stats);
  const skillCommands = buildSkillCommands(source.skills, source.stats);
  const weaponCommands = buildWeaponCommands(source.weapons);

  return [
    '특성치 판정',
    ...statCommands,
    'CC<={이성}  이성',
    'CC<={행운}  행운',
    '',
    '기능치 판정',
    ...skillCommands,
    '',
    '무기',
    ...weaponCommands,
  ].join('\n');
}

function buildStatCommands(stats: InvestigatorStats): string[] {
  return Object.keys(statLabels)
    .filter((key): key is StatKey => key in stats)
    .map((key) => `CC<=${stats[key]}  ${statCommandLabels[key] ?? statLabels[key]}`);
}

function buildSkillCommands(skills: SheetSkill[], stats: InvestigatorStats): string[] {
  return sortSkillsByKoreanName(skills)
    .filter((skill) => !isSkillGroup(skill))
    .map((skill) => `CC<=${calculateSkillTotal(skill, stats)}  ${skill.name}`);
}

function buildWeaponCommands(weapons: ClipboardWeapon[]): string[] {
  return weapons
    .filter((weapon) => weapon.name.trim() && weapon.damage.trim())
    .map((weapon) => `${formatWeaponDamage(weapon.damage)}  ${weapon.name.trim()}`);
}

function formatWeaponDamage(damage: string): string {
  return damage
    .trim()
    .replace(/\s+/g, '')
    .replace(/DB/gi, '{DB}')
    .replace(/(\d)D/gi, '$1d');
}

function clampRollValue(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(99, Math.round(value)));
}
