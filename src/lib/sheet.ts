import { clampPercent } from './character';

export interface StandingImage {
  label: string;
  imageUrl: string;
}

export interface BasicInfo {
  name: string;
  player: string;
  occupation: string;
  age: string;
  gender: string;
  color: string;
  birthplace: string;
  imageUrl: string;
  standingImages: StandingImage[];
}

export interface SanityInfo {
  current: number;
  temporaryInsanity: boolean;
  indefiniteInsanity: boolean;
}

export function createDefaultBasicInfo(): BasicInfo {
  return {
    name: '새로운 탐사자',
    player: '',
    occupation: '',
    age: '',
    gender: '',
    color: '',
    birthplace: '',
    imageUrl: '',
    standingImages: [],
  };
}

export function normalizeBasicInfo(
  value?: Partial<BasicInfo> & { reading?: string },
): BasicInfo {
  const fallback = createDefaultBasicInfo();
  const player = value?.player?.trim() === 'player' ? '' : value?.player;

  return {
    name: value?.name ?? fallback.name,
    player: player?.trim() ? player : fallback.player,
    occupation: value?.occupation ?? fallback.occupation,
    age: value?.age ?? fallback.age,
    gender: value?.gender ?? fallback.gender,
    color: value?.color ?? fallback.color,
    birthplace: value?.birthplace ?? fallback.birthplace,
    imageUrl: value?.imageUrl ?? fallback.imageUrl,
    standingImages: normalizeStandingImages(value?.standingImages),
  };
}

function normalizeStandingImages(value: unknown): StandingImage[] {
  if (!Array.isArray(value)) return [];

  const standingImages: StandingImage[] = [];

  value.forEach((item) => {
    if (!isRecord(item)) return;
    if (typeof item.label !== 'string' || typeof item.imageUrl !== 'string') return;

    standingImages.push({
      label: item.label,
      imageUrl: item.imageUrl,
    });
  });

  return standingImages;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function createDefaultSanityInfo(pow: number): SanityInfo {
  return {
    current: clampPercent(pow),
    temporaryInsanity: false,
    indefiniteInsanity: false,
  };
}

export function normalizeSanityInfo(
  value: Partial<SanityInfo> | undefined,
  pow: number,
): SanityInfo {
  const fallback = createDefaultSanityInfo(pow);

  return {
    current: value?.current === undefined ? fallback.current : clampPercent(value.current),
    temporaryInsanity: Boolean(value?.temporaryInsanity),
    indefiniteInsanity: Boolean(value?.indefiniteInsanity),
  };
}

export function syncSanityWithPow(
  sanity: Partial<SanityInfo> | undefined,
  previousPow: number,
  nextPow: number,
): SanityInfo {
  const previousStart = clampPercent(previousPow);
  const nextStart = clampPercent(nextPow);
  const current = normalizeSanityInfo(sanity, previousStart);

  return {
    ...current,
    current: current.current === previousStart ? nextStart : current.current,
  };
}
