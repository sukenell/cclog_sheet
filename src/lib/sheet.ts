import { clampPercent } from './character';

export interface BasicInfo {
  name: string;
  player: string;
  occupation: string;
  age: string;
  gender: string;
  birthplace: string;
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
    birthplace: '',
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
    birthplace: value?.birthplace ?? fallback.birthplace,
  };
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
