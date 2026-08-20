import { sortSkillsByKoreanName } from '../data/skills';
import {
  calculateDerivedStats,
  calculateSkillTotal,
  type CocEdition,
  isSkillGroup,
  statLabels,
  type InvestigatorStats,
  type SheetSkill,
  type StatKey,
  fourFifths,
} from './character';
import type { SanityInfo } from './sheet';

export interface ClipboardWeapon {
  name: string;
  damage: string;
}

export interface ClipboardFace {
  label: string;
  iconUrl: string;
}

export interface CharacterClipboardSource {
  name: string;
  player?: string;
  occupation?: string;
  age?: string;
  gender?: string;
  birthplace?: string;
  stats: InvestigatorStats;
  sanity: SanityInfo;
  skills: SheetSkill[];
  weapons: ClipboardWeapon[];
  edition?: CocEdition;
  iconUrl?: string;
  faces?: ClipboardFace[];
}

export interface CharacterClipboardPayload {
  kind: 'character';
  data: {
    name: string;
    initiative: number;
    status: Array<{ label: string; value: number; max: number }>;
    params: Array<{ label: string; value: string }>;
    iconUrl: string;
    faces: ClipboardFace[];
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
  current: number | string;
  max: number | string;
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

interface Roll20SkillBinding {
  valueAttribute: string;
  labelAttribute: string;
}

const roll20Coc7SkillBindings: Record<string, Roll20SkillBinding> = {
  accounting: { valueAttribute: 'accounting', labelAttribute: 'accounting_txt' },
  anthropology: { valueAttribute: 'anthropology', labelAttribute: 'anthropology_txt' },
  appraise: { valueAttribute: 'appraise', labelAttribute: 'appraise_txt' },
  archaeology: { valueAttribute: 'archaeology', labelAttribute: 'archaeology_txt' },
  charm: { valueAttribute: 'charm', labelAttribute: 'charm_txt' },
  climb: { valueAttribute: 'climb', labelAttribute: 'climb_txt' },
  'credit-rating': {
    valueAttribute: 'credit_rating',
    labelAttribute: 'creditrating_txt',
  },
  'cthulhu-mythos': {
    valueAttribute: 'cthulhu_mythos',
    labelAttribute: 'cthulhumythos_txt',
  },
  disguise: { valueAttribute: 'disguise', labelAttribute: 'disguise_txt' },
  dodge: { valueAttribute: 'dodge', labelAttribute: 'dodge_txt' },
  'drive-auto': { valueAttribute: 'drive_auto', labelAttribute: 'driveauto_txt' },
  'elec-repair': { valueAttribute: 'elec_repair', labelAttribute: 'elecrepair_txt' },
  'fast-talk': { valueAttribute: 'fast_talk', labelAttribute: 'fasttalk_txt' },
  'fighting-brawl': {
    valueAttribute: 'fighting_brawl',
    labelAttribute: 'fighting_brawl_txt',
  },
  'firearms-handgun': {
    valueAttribute: 'firearms_handgun',
    labelAttribute: 'firearms_hg_txt',
  },
  'firearms-rifle': {
    valueAttribute: 'firearms_rifle',
    labelAttribute: 'firearms_rs_txt',
  },
  'first-aid': { valueAttribute: 'first_aid', labelAttribute: 'firstaid_txt' },
  history: { valueAttribute: 'history', labelAttribute: 'history_txt' },
  intimidate: { valueAttribute: 'intimidate', labelAttribute: 'intimidate_txt' },
  jump: { valueAttribute: 'jump', labelAttribute: 'jump_txt' },
  'language-own': {
    valueAttribute: 'language_own',
    labelAttribute: 'language_own_txt',
  },
  law: { valueAttribute: 'law', labelAttribute: 'law_txt' },
  'library-use': { valueAttribute: 'library_use', labelAttribute: 'libraryuse_txt' },
  listen: { valueAttribute: 'listen', labelAttribute: 'listen_txt' },
  locksmith: { valueAttribute: 'locksmith', labelAttribute: 'locksmith_txt' },
  'mechanical-repair': {
    valueAttribute: 'mech_repair',
    labelAttribute: 'mechrepair_txt',
  },
  medicine: { valueAttribute: 'medicine', labelAttribute: 'medicine_txt' },
  'natural-world': {
    valueAttribute: 'natural_world',
    labelAttribute: 'naturalworld_txt',
  },
  navigate: { valueAttribute: 'navigate', labelAttribute: 'navigate_txt' },
  occult: { valueAttribute: 'occult', labelAttribute: 'occult_txt' },
  persuade: { valueAttribute: 'persuade', labelAttribute: 'persuade_txt' },
  psychoanalysis: {
    valueAttribute: 'psychoanalysis',
    labelAttribute: 'psychoanalysis_txt',
  },
  psychology: { valueAttribute: 'psychology', labelAttribute: 'psychology_txt' },
  ride: { valueAttribute: 'ride', labelAttribute: 'ride_txt' },
  'sleight-of-hand': {
    valueAttribute: 'sleight_of_hand',
    labelAttribute: 'sleightofhand_txt',
  },
  'spot-hidden': { valueAttribute: 'spot_hidden', labelAttribute: 'spothidden_txt' },
  stealth: { valueAttribute: 'stealth', labelAttribute: 'stealth_txt' },
  swim: { valueAttribute: 'swim', labelAttribute: 'swim_txt' },
  throw: { valueAttribute: 'throw', labelAttribute: 'throw_txt' },
  track: { valueAttribute: 'track', labelAttribute: 'track_txt' },
};

export function buildCharacterClipboardPayload(
  source: CharacterClipboardSource,
): CharacterClipboardPayload {
  const edition = source.edition ?? 'coc7';
  const derived = calculateDerivedStats(source.stats, edition);
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
        { label: '행운', value: derived.luck, max: derived.luck },
      ],
      params: [
        { label: '이동력', value: String(derived.move) },
        { label: '체구', value: String(derived.build) },
        { label: 'DB', value: derived.damageBonus },
      ],
      iconUrl: source.iconUrl?.trim() ?? '',
      faces: normalizeClipboardFaces(source.faces),
      commands: buildCharacterCommands(source, edition),
    },
  };
}

export function serializeCharacterClipboardPayload(
  payload: CharacterClipboardPayload,
): string {
  return JSON.stringify(payload, null, 2);
}

function normalizeClipboardFaces(faces: ClipboardFace[] | undefined): ClipboardFace[] {
  return (faces ?? [])
    .map((face) => ({
      label: face.label.trim(),
      iconUrl: face.iconUrl.trim(),
    }))
    .filter((face) => face.label && face.iconUrl);
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
      const roll20Binding = roll20Coc7SkillBindings[skill.id];
      const attributeName = roll20Binding
        ? createUniqueAttributeName(roll20Binding.valueAttribute, usedAttributeNames)
        : createUniqueAttributeName(createSkillAttributeName(skill.id), usedAttributeNames);

      return {
        id: `skill:${skill.id}`,
        kind: 'skill' as const,
        label: skill.name.trim() || '이름 없는 기능치',
        value: calculateSkillTotal(skill, source.stats),
        attributeName,
        templateName: roll20Binding
          ? `@{${roll20Binding.labelAttribute}}`
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

export function serializeRoll20CocSheetImport(source: CharacterClipboardSource): string {
  const payload: SecretDiceImportPayload = {
    character: source.name.trim() || '새로운 탐사자',
    attributes: buildRoll20CocSheetAttributes(source),
    abilities: {},
  };

  return ['[R20JE:COC7_IMPORT:1]', JSON.stringify(payload, null, 2), '[/R20JE]'].join('\n');
}

function buildSecretDiceImportPayload(
  source: CharacterClipboardSource,
  selectedOptionIds: string[],
  templateKind: SecretDiceTemplateKind,
): SecretDiceImportPayload {
  const selectedIds = new Set(selectedOptionIds);
  const usedAbilityNames = new Set<string>();
  const selectedOptions = buildSecretDiceRollOptions(source).filter((option) =>
    selectedIds.has(option.id),
  );
  const abilities = selectedOptions.reduce<Record<string, string>>((acc, option) => {
    acc[createUniqueSecretDiceAbilityName(option.label, usedAbilityNames)] =
      buildSecretDiceMacro(option, templateKind);
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
  const attributes = buildRoll20CocVitalsAttributes(source);

  selectedOptions.forEach((option) => {
    attributes[option.attributeName] = createRoll20Attribute(option.value);
  });

  return attributes;
}

function buildRoll20CocSheetAttributes(
  source: CharacterClipboardSource,
): Record<string, Roll20Attribute> {
  const attributes: Record<string, Roll20Attribute> = {
    name: createRoll20Attribute(source.name.trim() || '새로운 탐사자'),
    player: createRoll20Attribute(source.player?.trim() ?? ''),
    occupation: createRoll20Attribute(source.occupation?.trim() ?? ''),
    age: createRoll20Attribute(source.age?.trim() ?? ''),
    sex: createRoll20Attribute(source.gender?.trim() ?? ''),
    birthplace: createRoll20Attribute(source.birthplace?.trim() ?? ''),
    ...buildRoll20CocVitalsAttributes(source),
  };

  secretDiceStatDefinitions.forEach((definition) => {
    attributes[definition.attributeKey] = createRoll20Attribute(
      clampRollValue(definition.getValue(source)),
    );
  });

  appendRoll20CocSheetSkills(attributes, source.skills, source.stats);

  return attributes;
}

function buildRoll20CocVitalsAttributes(
  source: CharacterClipboardSource,
): Record<string, Roll20Attribute> {
  const derived = calculateDerivedStats(source.stats, source.edition ?? 'coc7');
  const sanityStart = derived.san;

  return {
    hp: createRoll20Attribute(derived.hp),
    hp_max: createRoll20Attribute(derived.hp),
    mp: createRoll20Attribute(derived.mp),
    mp_max: createRoll20Attribute(derived.mp),
    san: createRoll20Attribute(clampRollValue(source.sanity.current)),
    san_thresh: createRoll20Attribute(fourFifths(sanityStart)),
    san_max: createRoll20Attribute(derived.san),
    san_start: createRoll20Attribute(sanityStart),
    luck: createRoll20Attribute(derived.luck),
  };
}

function appendRoll20CocSheetSkills(
  attributes: Record<string, Roll20Attribute>,
  skills: SheetSkill[],
  stats: InvestigatorStats,
) {
  let otherSkillIndex = 1;

  sortSkillsByKoreanName(skills)
    .filter((skill) => !isSkillGroup(skill))
    .forEach((skill) => {
      const total = calculateSkillTotal(skill, stats);
      const roll20Binding = roll20Coc7SkillBindings[skill.id];

      if (roll20Binding) {
        attributes[roll20Binding.valueAttribute] = createRoll20Attribute(total);
        return;
      }

      if (otherSkillIndex > 6) return;

      attributes[`otherskill${otherSkillIndex}_name`] = createRoll20Attribute(
        skill.name.trim() || '이름 없는 기능치',
      );
      attributes[`otherskill${otherSkillIndex}`] = createRoll20Attribute(total);
      otherSkillIndex += 1;
    });
}

function createRoll20Attribute(current: number | string): Roll20Attribute {
  return {
    current,
    max: '',
  };
}

function buildSecretDiceMacro(
  option: SecretDiceRollOption,
  templateKind: SecretDiceTemplateKind,
): string {
  const attributeReference = `@{${option.attributeName}}`;
  const isBonusDice = templateKind === 'bonus';
  const template = isBonusDice ? 'coc' : 'coc-1';
  const hardExpression = isBonusDice
    ? `floor(${attributeReference}/2)`
    : `floor(${attributeReference} /2)`;
  const rolls = isBonusDice
    ? ['{{roll1=[[1d100]]}}', '{{roll2=[[1d100]]}}', ' {{roll3=[[1d100]]}}']
    : ['{{roll1=[[1d100]]}}'];

  return [
    `/w gm &{template:${template}}`,
    `{{name=${option.templateName}}}`,
    `{{success=[[${attributeReference}]]}}`,
    `{{hard=[[${hardExpression}]]}}`,
    `{{extreme=[[floor(${attributeReference}/5)]]}}`,
    ...rolls,
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

function buildCharacterCommands(source: CharacterClipboardSource, edition: CocEdition): string {
  const statCommands = buildStatCommands(source.stats, edition);
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

function buildStatCommands(stats: InvestigatorStats, edition: CocEdition): string[] {
  return Object.keys(statLabels)
    .filter((key): key is StatKey => key in stats)
    .map((key) => {
      const value = edition === 'coc6' ? clampRollValue(stats[key] * 5) : stats[key];
      return `CC<=${value}  ${statCommandLabels[key] ?? statLabels[key]}`;
    });
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
