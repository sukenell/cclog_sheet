# Roll20 CoC 7 Attribute Reuse Design

## Goal

Export the web sheet's values into Roll20 while using the official Call of Cthulhu 7th Edition sheet's existing attribute names. Only skills that do not exist in the official 1920s sheet may use custom `otherskillN` or generated attributes.

## Root cause

The project currently keeps two independent maps for the same built-in skills. The full-sheet export uses official numeric attributes such as `sleight_of_hand`, while the secret-roll export incorrectly uses the translation-label stem `sleightofhand` as the numeric attribute. Importing both paths therefore creates two logical values for one skill.

The official Roll20 sheet deliberately uses separate names for the translated label and numeric value:

```text
label: @{sleightofhand_txt}
value: @{sleight_of_hand}
```

This pattern also applies to Credit Rating, Cthulhu Mythos, Drive Auto, Electrical Repair, Fast Talk, Firearms, First Aid, Library Use, Mechanical Repair, Natural World, Spot Hidden, and other built-in skills.

## Design

Replace the two string maps with one canonical descriptor map:

```ts
interface Roll20SkillBinding {
  valueAttribute: string;
  labelAttribute: string;
}

const roll20Coc7SkillBindings: Record<string, Roll20SkillBinding> = {
  'sleight-of-hand': {
    valueAttribute: 'sleight_of_hand',
    labelAttribute: 'sleightofhand_txt',
  },
};
```

Both export paths consume the same binding:

- Full-sheet attributes write the calculated total to `valueAttribute`.
- Secret-roll attributes write the same calculated total to `valueAttribute`.
- Secret-roll macros display `@{labelAttribute}` and roll against `@{valueAttribute}`.

The value remains present in the secret-roll payload so that copying a secret roll continues to transfer the web sheet's current value. This is intentional and does not create a second logical skill because both paths now use the same official name.

## Custom skills

This change does not alter custom-skill behavior. Skills absent from the official 1920s Roll20 sheet continue to use the existing custom fallback. A later change may unify `otherskillN` allocation between the two export paths, but that is outside this bug fix.

## Verification

Regression tests will cover every built-in skill whose label stem differs from its numeric attribute, including the reported Sleight of Hand case. Existing full-sheet assertions and the complete test/build suites must remain green.
