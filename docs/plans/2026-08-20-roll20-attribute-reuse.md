# Roll20 CoC 7 Attribute Reuse Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make full-sheet and secret-roll exports reuse the official Roll20 CoC 7 attribute names for every built-in skill.

**Architecture:** Replace the two parallel skill-name maps with one descriptor map containing the official numeric value attribute and translated label attribute. Both serializers will resolve their data from that shared map; custom skill fallback behavior remains unchanged.

**Tech Stack:** TypeScript, Vitest, React/Vite

---

### Task 1: Add regression coverage for official Roll20 bindings

**Files:**
- Modify: `src/lib/clipboardExport.test.ts`

**Step 1: Write the failing tests**

Update the secret-roll option expectations so that Sleight of Hand uses the official pair:

```ts
expect.objectContaining({
  id: 'skill:sleight-of-hand',
  attributeName: 'sleight_of_hand',
  templateName: '@{sleightofhand_txt}',
})
```

Add a table-driven serialization test for the thirteen known divergent bindings:

```ts
const expectedBindings = [
  ['credit-rating', 'credit_rating', 'creditrating_txt'],
  ['cthulhu-mythos', 'cthulhu_mythos', 'cthulhumythos_txt'],
  ['drive-auto', 'drive_auto', 'driveauto_txt'],
  ['elec-repair', 'elec_repair', 'elecrepair_txt'],
  ['fast-talk', 'fast_talk', 'fasttalk_txt'],
  ['firearms-handgun', 'firearms_handgun', 'firearms_hg_txt'],
  ['firearms-rifle', 'firearms_rifle', 'firearms_rs_txt'],
  ['first-aid', 'first_aid', 'firstaid_txt'],
  ['library-use', 'library_use', 'libraryuse_txt'],
  ['mechanical-repair', 'mech_repair', 'mechrepair_txt'],
  ['natural-world', 'natural_world', 'naturalworld_txt'],
  ['sleight-of-hand', 'sleight_of_hand', 'sleightofhand_txt'],
  ['spot-hidden', 'spot_hidden', 'spothidden_txt'],
] as const;
```

For each row, assert that the secret import contains the official numeric attribute, the ability uses the official label attribute, and the obsolete numeric label stem is absent when it differs.

**Step 2: Run the focused test and verify RED**

Run: `npm test -- src/lib/clipboardExport.test.ts`

Expected: FAIL because secret-roll options and macros still use `sleightofhand`, `spothidden`, and the other label stems as numeric attributes.

### Task 2: Consolidate the Roll20 skill mapping

**Files:**
- Modify: `src/lib/clipboardExport.ts`

**Step 1: Add the canonical binding type and table**

Replace `roll20SkillAttributeNames` and `roll20CocSheetSkillAttributeNames` with:

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
  // Include all existing built-in mappings.
};
```

**Step 2: Use the binding in secret-roll options**

Resolve `attributeName` from `binding.valueAttribute` and `templateName` from `binding.labelAttribute`. Keep the current generated custom attribute and literal label fallback.

**Step 3: Use the binding in full-sheet attributes**

Update `appendRoll20CocSheetSkills` to write built-in values to `binding.valueAttribute`. Keep `otherskillN` behavior unchanged.

**Step 4: Run the focused test and verify GREEN**

Run: `npm test -- src/lib/clipboardExport.test.ts`

Expected: all clipboard export tests pass.

**Step 5: Refactor only after GREEN**

Remove obsolete map names and confirm no old built-in numeric aliases remain in production code.

### Task 3: Verify the complete application

**Files:**
- No production changes expected

**Step 1: Run all tests**

Run: `npm test`

Expected: 16 test files and all tests pass.

**Step 2: Run the production build**

Run: `npm run build`

Expected: TypeScript checking and Vite build succeed.

**Step 3: Review the diff**

Confirm that only the design/plan, clipboard-export test, and clipboard-export implementation changed, and that custom skills still use their existing fallback.
