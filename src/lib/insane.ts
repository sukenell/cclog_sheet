export interface InsaneSkillCategory {
  id: string;
  name: string;
  skills: string[];
}

export interface InsaneSpecialtyState {
  checked: boolean;
  target: number;
}

export interface InsaneAbility {
  id: string;
  name: string;
  type: string;
  specialty: string;
  effect: string;
}

export interface InsaneRelationship {
  id: string;
  name: string;
  place: string;
  secret: string;
  emotion: string;
  emotionSign: '＋' | '－';
}

export interface InsaneSession {
  id: string;
  date: string;
  title: string;
  pcNumber: string;
  merit: string;
  note: string;
}

export interface InsaneScpAbility {
  id: string;
  name: string;
  effect: string;
}

export interface InsaneStandingImage {
  label: string;
  imageUrl: string;
}

export interface InsaneCcfoliaCharacter {
  kind: 'character';
  data: {
    name: string;
    iconUrl: string;
    faces: {
      label: string;
      iconUrl: string;
    }[];
    status: {
      label: string;
      value: number;
      max: number;
    }[];
    params: {
      label: string;
      value: string;
    }[];
    color: string;
    commands: string;
  };
}

export interface InsaneSheetState {
  basic: {
    name: string;
    player: string;
    age: string;
    gender: string;
    occupation: string;
    merit: number;
    color: string;
    imageUrl: string;
    extraImageUrls: string[];
    standingImages: InsaneStandingImage[];
  };
  vitals: {
    life: {
      current: number;
      max: number;
      incapacitated: boolean;
      dead: boolean;
    };
    sanity: {
      current: number;
      max: number;
      confused: boolean;
    };
  };
  curiosity: string;
  fear: string;
  skills: Record<string, InsaneSpecialtyState>;
  relationships: InsaneRelationship[];
  items: {
    painkiller: number;
    weapon: number;
    charm: number;
    scpAbilities: InsaneScpAbility[];
  };
  abilities: InsaneAbility[];
  sessions: InsaneSession[];
  memo: string;
}

export const insaneSkillCategories: InsaneSkillCategory[] = [
  {
    id: 'violence',
    name: '1. 폭력',
    skills: ['소각', '고문', '포박', '협박', '파괴', '구타', '절단', '찌르기', '사격', '전쟁', '매장'],
  },
  {
    id: 'emotion',
    name: '2. 정서',
    skills: ['연심', '기쁨', '걱정', '부끄러움', '웃음', '인내', '놀람', '노여움', '원한', '슬픔', '친애'],
  },
  {
    id: 'perception',
    name: '3. 지각',
    skills: ['고통', '관능', '촉감', '냄새', '맛', '소리', '풍경', '추적', '예술', '제육감', '그늘'],
  },
  {
    id: 'technology',
    name: '4. 기술',
    skills: ['분해', '전자기기', '정리', '약품', '효율', '미디어', '카메라', '탈것', '기계', '함정', '병기'],
  },
  {
    id: 'knowledge',
    name: '5. 지식',
    skills: ['물리학', '수학', '화학', '생물학', '의학', '교양', '인류학', '역사', '민속학', '고고학', '천문학'],
  },
  {
    id: 'mystery',
    name: '6. 괴이',
    skills: ['시간', '혼돈', '심해', '죽음', '영혼', '마술', '암흑', '종말', '꿈', '지저', '우주'],
  },
];

export const insaneSpecialtyNames = insaneSkillCategories.flatMap((category) => category.skills);
export const insanePaletteRequiredMessage = '내용을 작성한 뒤에 복사해주세요';

const defaultScpAbilityNames = ['네트런처', '기억소거', '기폭장치'];
const defaultInsaneAbilityIds = new Set(['ability-basic-attack', 'ability-battle-move']);
const insaneSpecialtyPositions = new Map(
  insaneSkillCategories.flatMap((category, categoryIndex) =>
    category.skills.map((name, rowIndex) => [
      name,
      {
        categoryIndex,
        categoryName: category.name,
        rowIndex,
      },
    ]),
  ),
);

export function createInitialInsaneSheet(): InsaneSheetState {
  return {
    basic: {
      name: '',
      player: '',
      age: '',
      gender: '',
      occupation: '',
      merit: 0,
      color: '',
      imageUrl: '',
      extraImageUrls: [],
      standingImages: [],
    },
    vitals: {
      life: {
        current: 6,
        max: 6,
        incapacitated: false,
        dead: false,
      },
      sanity: {
        current: 6,
        max: 6,
        confused: false,
      },
    },
    curiosity: '',
    fear: '',
    skills: Object.fromEntries(
      insaneSpecialtyNames.map((name) => [name, { checked: false, target: 12 }]),
    ),
    relationships: [],
    items: {
      painkiller: 0,
      weapon: 0,
      charm: 0,
      scpAbilities: defaultScpAbilityNames.map((name, index) => ({
        id: `scp-ability-${index + 1}`,
        name,
        effect: '',
      })),
    },
    abilities: [
      {
        id: 'ability-basic-attack',
        name: '기본공격',
        type: '공격',
        specialty: '소각',
        effect:
          '목표 1명을 선택해서 명중판정을 한다. 명중판정이 성공하고 목표가 회피판정에 실패하면 1D6점 대미지',
      },
      {
        id: 'ability-battle-move',
        name: '전장이동',
        type: '서포트',
        specialty: '',
        effect:
          '지원행동. 이 어빌리티를 사용하면 전투에 참가한 캐릭터 전원은 다음 라운드의 「라운드 시작」에 플롯을 한다.',
      },
    ],
    sessions: [],
    memo: '',
  };
}

export function normalizeInsaneSheet(value: unknown): InsaneSheetState {
  const fallback = createInitialInsaneSheet();

  if (!isRecord(value)) return fallback;

  const basic = isRecord(value.basic) ? value.basic : {};
  const extraImageUrls = stringArrayValue(basic.extraImageUrls);
  const vitals = isRecord(value.vitals) ? value.vitals : {};
  const life = isRecord(vitals.life) ? vitals.life : {};
  const sanity = isRecord(vitals.sanity) ? vitals.sanity : {};

  return {
    ...fallback,
    basic: {
      name: stringValue(basic.name),
      player: stringValue(basic.player),
      age: stringValue(basic.age),
      gender: stringValue(basic.gender),
      occupation: stringValue(basic.occupation),
      merit: nonNegativeNumber(basic.merit, fallback.basic.merit),
      color: stringValue(basic.color),
      imageUrl: stringValue(basic.imageUrl),
      extraImageUrls,
      standingImages: normalizeInsaneStandingImages(basic.standingImages, extraImageUrls),
    },
    vitals: {
      life: {
        current: nonNegativeNumber(life.current, fallback.vitals.life.current),
        max: nonNegativeNumber(life.max, fallback.vitals.life.max),
        incapacitated: Boolean(life.incapacitated),
        dead: Boolean(life.dead),
      },
      sanity: {
        current: nonNegativeNumber(sanity.current, fallback.vitals.sanity.current),
        max: nonNegativeNumber(sanity.max, fallback.vitals.sanity.max),
        confused: Boolean(sanity.confused),
      },
    },
    curiosity: stringValue(value.curiosity),
    fear: stringValue(value.fear),
    skills: normalizeSpecialties(value.skills, fallback.skills),
    relationships: Array.isArray(value.relationships)
      ? value.relationships.map(normalizeRelationship)
      : fallback.relationships,
    items: isRecord(value.items)
      ? {
          painkiller: nonNegativeNumber(value.items.painkiller, fallback.items.painkiller),
          weapon: nonNegativeNumber(value.items.weapon, fallback.items.weapon),
          charm: nonNegativeNumber(value.items.charm, fallback.items.charm),
          scpAbilities: Array.isArray(value.items.scpAbilities)
            ? value.items.scpAbilities.map(normalizeScpAbility)
            : fallback.items.scpAbilities,
        }
      : fallback.items,
    abilities: Array.isArray(value.abilities) ? value.abilities.map(normalizeAbility) : fallback.abilities,
    sessions: Array.isArray(value.sessions) ? value.sessions.map(normalizeSession) : fallback.sessions,
    memo: stringValue(value.memo),
  };
}

export function buildInsaneChatPalette(sheet: InsaneSheetState): string {
  const abilityLines = sheet.abilities
    .filter((ability) => ability.name.trim())
    .map((ability) => {
      const specialty = ability.specialty.trim() ? ` 《${ability.specialty.trim()}》` : '';
      return `【${ability.name.trim()}】 ${ability.type.trim()}${specialty}   「${ability.effect.trim()}」 #어빌`;
    });

  const rollLines = insaneSpecialtyNames.map((name) => `2D6>={${name}} - 🎲 ${name} ROLL`);

  return [
    `『• • • ✎ 호기심: ${sheet.curiosity} • • •』`,
    `✥﹤┈┈ 공포심: ${sheet.fear} ┈┈﹥✥`,
    '',
    '▁ ▂ ▃ ▄ ▅ ▆ ▇ ▌　Ability 목록　 ▌ ▇ ▆ ▅ ▄ ▃ ▂ ▁',
    ...abilityLines,
    '',
    '2D6 - 🎲  ROLL',
    ...rollLines,
  ].join('\n');
}

export function buildInsaneCcfoliaCharacter(sheet: InsaneSheetState): InsaneCcfoliaCharacter {
  return {
    kind: 'character',
    data: {
      name: sheet.basic.name.trim() || '새로운 봉마인',
      iconUrl: sheet.basic.imageUrl.trim(),
      faces: normalizeInsaneCcfoliaFaces(sheet.basic.standingImages),
      status: [
        { label: '생명력', value: sheet.vitals.life.current, max: sheet.vitals.life.max },
        { label: '이성치', value: calculateInsaneEffectiveSanity(sheet), max: sheet.vitals.sanity.max },
      ],
      params: insaneSpecialtyNames.map((name) => ({
        label: name,
        value: String(calculateInsaneSpecialtyTarget(sheet, name)),
      })),
      color: sheet.basic.color.trim(),
      commands: buildInsaneChatPalette(sheet),
    },
  };
}

export function serializeInsaneCcfoliaCharacter(sheet: InsaneSheetState): string {
  return JSON.stringify(buildInsaneCcfoliaCharacter(sheet));
}

function normalizeInsaneCcfoliaFaces(
  standingImages: InsaneStandingImage[],
): Array<{ label: string; iconUrl: string }> {
  return standingImages
    .map((image) => ({
      label: image.label.trim(),
      iconUrl: image.imageUrl.trim(),
    }))
    .filter((image) => image.label && image.iconUrl);
}

export function rollInsaneRandomSetup(
  sheet: InsaneSheetState,
  rng: () => number = Math.random,
): InsaneSheetState {
  const curiosity = pickOne(insaneSkillCategories, rng).name;
  const fear = pickOne(insaneSpecialtyNames, rng);
  const checkedNames = pickMany(insaneSpecialtyNames, 6, rng);

  return {
    ...sheet,
    curiosity,
    fear,
    skills: Object.fromEntries(
      insaneSpecialtyNames.map((name) => [
        name,
        {
          ...sheet.skills[name],
          checked: checkedNames.includes(name),
        },
      ]),
    ),
  };
}

export function calculateInsaneSpecialtyTarget(
  sheet: InsaneSheetState,
  name: string,
): number {
  const position = insaneSpecialtyPositions.get(name);
  if (!position) return 12;

  const checkedPositions = insaneSpecialtyNames
    .filter((specialtyName) => sheet.skills[specialtyName]?.checked)
    .map((specialtyName) => insaneSpecialtyPositions.get(specialtyName))
    .filter((checkedPosition): checkedPosition is NonNullable<typeof checkedPosition> =>
      Boolean(checkedPosition),
    );

  const baseTarget =
    checkedPositions.length === 0
      ? 12
      : Math.min(
          12,
          5 +
            Math.min(
              ...checkedPositions.map(
                (checkedPosition) =>
                  Math.abs(checkedPosition.categoryIndex - position.categoryIndex) +
                  Math.abs(checkedPosition.rowIndex - position.rowIndex),
              ),
            ),
        );
  const curiosityModifier = position.categoryName === sheet.curiosity ? -1 : 0;
  const fearModifier = name === sheet.fear ? 2 : 0;

  return Math.min(12, Math.max(5, baseTarget + curiosityModifier + fearModifier));
}

export function calculateInsaneSanityPenalty(sheet: InsaneSheetState): number {
  const mysteryCategory = insaneSkillCategories.find((category) => category.id === 'mystery');
  const checkedMysteryCount =
    mysteryCategory?.skills.filter((name) => sheet.skills[name]?.checked).length ?? 0;

  return Math.min(6, checkedMysteryCount);
}

export function calculateInsaneEffectiveSanity(sheet: InsaneSheetState): number {
  return Math.max(0, sheet.vitals.sanity.current - calculateInsaneSanityPenalty(sheet));
}

export function isDefaultInsaneAbility(ability: InsaneAbility): boolean {
  return defaultInsaneAbilityIds.has(ability.id);
}

function pickOne<T>(values: T[], rng: () => number): T {
  const index = Math.min(values.length - 1, Math.floor(rng() * values.length));

  return values[index];
}

function pickMany<T>(values: T[], count: number, rng: () => number): T[] {
  const remaining = [...values];
  const picked: T[] = [];

  while (picked.length < count && remaining.length > 0) {
    const index = Math.min(remaining.length - 1, Math.floor(rng() * remaining.length));
    const [value] = remaining.splice(index, 1);
    picked.push(value);
  }

  return picked;
}

export function getInsanePaletteCopyError(sheet: InsaneSheetState): string | null {
  const hasCheckedSpecialty = Object.values(sheet.skills).some((specialty) => specialty.checked);

  if (!hasCheckedSpecialty || !sheet.curiosity.trim() || !sheet.fear.trim()) {
    return insanePaletteRequiredMessage;
  }

  return null;
}

function normalizeSpecialties(
  value: unknown,
  fallback: Record<string, InsaneSpecialtyState>,
): Record<string, InsaneSpecialtyState> {
  if (!isRecord(value)) return fallback;

  return Object.fromEntries(
    insaneSpecialtyNames.map((name) => {
      const stored = isRecord(value[name]) ? value[name] : {};
      return [
        name,
        {
          checked: Boolean(stored.checked),
          target: nonNegativeNumber(stored.target, fallback[name].target),
        },
      ];
    }),
  );
}

function normalizeScpAbility(value: unknown, index: number): InsaneScpAbility {
  const record = isRecord(value) ? value : {};

  return {
    id: stringValue(record.id) || `scp-ability-${index + 1}`,
    name: stringValue(record.name),
    effect: stringValue(record.effect),
  };
}

function normalizeRelationship(value: unknown, index: number): InsaneRelationship {
  const record = isRecord(value) ? value : {};

  return {
    id: stringValue(record.id) || `relationship-${index + 1}`,
    name: stringValue(record.name),
    place: stringValue(record.place),
    secret: stringValue(record.secret),
    emotion: stringValue(record.emotion),
    emotionSign: record.emotionSign === '－' ? '－' : '＋',
  };
}

function normalizeAbility(value: unknown, index: number): InsaneAbility {
  const record = isRecord(value) ? value : {};

  return {
    id: stringValue(record.id) || `ability-${index + 1}`,
    name: stringValue(record.name),
    type: stringValue(record.type),
    specialty: stringValue(record.specialty),
    effect: stringValue(record.effect),
  };
}

function normalizeSession(value: unknown, index: number): InsaneSession {
  const record = isRecord(value) ? value : {};

  return {
    id: stringValue(record.id) || `session-${index + 1}`,
    date: stringValue(record.date),
    title: stringValue(record.title),
    pcNumber: stringValue(record.pcNumber),
    merit: stringValue(record.merit),
    note: stringValue(record.note),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function stringArrayValue(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function normalizeInsaneStandingImages(
  value: unknown,
  fallbackImageUrls: string[] = [],
): InsaneStandingImage[] {
  const standingImages: InsaneStandingImage[] = [];

  if (Array.isArray(value)) {
    value.forEach((item) => {
      if (!isRecord(item)) return;

      const label = stringValue(item.label).trim();
      const imageUrl = stringValue(item.imageUrl).trim();
      if (!label || !imageUrl) return;

      standingImages.push({ label, imageUrl });
    });
  }

  if (standingImages.length > 0) return standingImages;

  return fallbackImageUrls
    .map((imageUrl, index) => ({
      label: `추가 ${index + 1}`,
      imageUrl: imageUrl.trim(),
    }))
    .filter((item) => item.imageUrl);
}

function nonNegativeNumber(value: unknown, fallback: number): number {
  const number = Number(value);

  return Number.isFinite(number) && number >= 0 ? number : fallback;
}
