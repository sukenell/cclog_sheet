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
      standingImages: [],
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
      standingImages: [],
    });
  });

  it('keeps a portrait image URL in basic info', () => {
    expect(normalizeBasicInfo({ imageUrl: 'https://example.com/portrait.png' })).toMatchObject({
      imageUrl: 'https://example.com/portrait.png',
    });
  });

  it('keeps expression standing image labels and URLs in basic info', () => {
    expect(
      normalizeBasicInfo({
        standingImages: [
          { label: ' @미소 ', imageUrl: ' https://example.com/smile.png ' },
          { label: '펌블', imageUrl: 'https://example.com/fumble.png' },
          { label: '무효', imageUrl: 10 as unknown as string },
        ],
      }),
    ).toMatchObject({
      standingImages: [
        { label: ' @미소 ', imageUrl: ' https://example.com/smile.png ' },
        { label: '펌블', imageUrl: 'https://example.com/fumble.png' },
      ],
    });
  });

  it('keeps only the first six valid standing images', () => {
    const validStandingImages = Array.from({ length: 7 }, (_, index) => ({
      label: `표정 ${index + 1}`,
      imageUrl: `https://example.com/expression-${index + 1}.png`,
    }));
    const standingImages = [
      validStandingImages[0],
      { label: '무효', imageUrl: 10 as unknown as string },
      ...validStandingImages.slice(1),
    ];

    expect(normalizeBasicInfo({ standingImages }).standingImages).toEqual(
      validStandingImages.slice(0, 6),
    );
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
