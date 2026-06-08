import { describe, expect, it } from 'vitest';
import {
  createDefaultBasicInfo,
  createDefaultSanityInfo,
  normalizeBasicInfo,
  normalizeSanityInfo,
  syncSanityWithPow,
} from './sheet';

describe('basic investigator info', () => {
  it('defaults the player name to an empty value', () => {
    expect(createDefaultBasicInfo()).toEqual({
      name: '새로운 탐사자',
      player: '',
      occupation: '',
      age: '',
      gender: '',
      color: '',
      birthplace: '',
      imageUrl: '',
    });
  });

  it('migrates a missing player name to an empty value', () => {
    expect(normalizeBasicInfo({ name: '이름' })).toMatchObject({
      name: '이름',
      player: '',
    });
  });

  it('does not reuse the old reading alias field as the player name', () => {
    expect(normalizeBasicInfo({ name: '이름', reading: '이전 별칭' })).toEqual({
      name: '이름',
      player: '',
      occupation: '',
      age: '',
      gender: '',
      color: '',
      birthplace: '',
      imageUrl: '',
    });
  });

  it('keeps a portrait image URL in basic info', () => {
    expect(normalizeBasicInfo({ imageUrl: 'https://example.com/portrait.png' })).toMatchObject({
      imageUrl: 'https://example.com/portrait.png',
    });
  });

  it('clears the previously injected player default value', () => {
    expect(normalizeBasicInfo({ player: 'player' }).player).toBe('');
  });
});

describe('sanity info', () => {
  it('starts the current sanity from POW', () => {
    expect(createDefaultSanityInfo(60)).toEqual({
      current: 60,
      temporaryInsanity: false,
      indefiniteInsanity: false,
    });
  });

  it('normalizes saved sanity without replacing an edited current value', () => {
    expect(normalizeSanityInfo({ current: 34, temporaryInsanity: true }, 55)).toEqual({
      current: 34,
      temporaryInsanity: true,
      indefiniteInsanity: false,
    });
  });

  it('syncs current sanity to POW only while it still matches the previous start value', () => {
    expect(
      syncSanityWithPow(
        { current: 50, temporaryInsanity: false, indefiniteInsanity: false },
        50,
        70,
      ),
    ).toMatchObject({ current: 70 });

    expect(
      syncSanityWithPow(
        { current: 31, temporaryInsanity: false, indefiniteInsanity: false },
        50,
        70,
      ),
    ).toMatchObject({ current: 31 });
  });
});
