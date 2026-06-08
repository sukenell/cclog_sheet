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
