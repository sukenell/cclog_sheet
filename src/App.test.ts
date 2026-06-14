import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('topbar archive controls', () => {
  it('keeps JSON import and export controls visible in the toolbar', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    const jsxCommentBlocks = [...source.matchAll(/\{\/\*[\s\S]*?\*\/\}/g)].map(
      ([block]) => block,
    );

    expect(source).toContain('onClick={exportJson}');
    expect(source).toContain('onClick={() => importInputRef.current?.click()}');
    expect(source).toContain('onChange={importJson}');
    expect(
      jsxCommentBlocks.some(
        (block) => block.includes('JSON 내보내기') || block.includes('JSON 가져오기'),
      ),
    ).toBe(false);
  });

  it('switches to the archive system before importing JSON data', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    const importStart = source.indexOf('function importJson');
    const copyStart = source.indexOf('async function copyCharacterToClipboard', importStart);
    const importBlock = source.slice(importStart, copyStart);

    expect(source).toContain('detectSheetArchiveSystem');
    expect(importBlock).toContain('const parsedArchive = parseSheetArchive<unknown>(String(reader.result));');
    expect(importBlock).toContain('const importedSystem = detectSheetArchiveSystem(parsedArchive);');
    expect(importBlock).toContain("const targetSystem = importedSystem === 'unknown' ? gameSystem : importedSystem;");
    expect(importBlock).toContain('setGameSystem(targetSystem);');
    expect(importBlock).toContain("if (targetSystem === 'insan')");
    expect(importBlock).not.toContain("if (gameSystem === 'insan')");
  });

  it('offers COC 7th edition, COC 6th edition, and InSane as selectable sheet systems', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');

    expect(source).toContain('className="game-system-select"');
    expect(source).toContain("type GameSystem = 'coc7' | 'coc6' | 'insan';");
    expect(source).toContain('COC 7판');
    expect(source).toContain('COC 6판');
    expect(source).toContain('InSane');
    expect(source).toContain('value="insan"');
    expect(source).toContain('handleGameSystemChange');
    expect(source).toContain('convertCocSheetEdition');
    expect(source).toContain('<strong>CCLog Sheet</strong>');
    expect(source).toContain('className="brand-title-row"');
    expect(source).not.toContain('<span>{systemLabel}</span>');
  });

  it('opens a usage guide page from the CCLog Sheet brand help icon', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');

    expect(source).toContain('HelpCircle');
    expect(source).toContain("const [activePage, setActivePage] = useState<AppPage>('sheet');");
    expect(source).toContain('aria-label="사용방법 보기"');
    expect(source).toContain('onClick={() => setActivePage(\'usage\')}');
    expect(source).toContain('title="사용방법"');
    expect(source).toContain('UsageGuidePage');
    expect(source).toContain('사용방법');
    expect(source).toContain('세부 내용은 여기에 작성하세요.');
  });

  it('prompts for an InSane ability password when choosing InSane from the system dropdown', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');

    expect(source).toContain('insaneAbilityPresetPassword');
    expect(source).toContain('VITE_INSANE_ABILITY_PASSWORD');
    expect(source).toContain('isInsaneAbilityPasswordDialogOpen');
    expect(source).toContain('InsaneAbilityPasswordDialog');
    expect(source).toContain('confirmInsaneAbilityPassword');
    expect(source).toContain('cancelInsaneAbilityPassword');
    expect(source).toContain('type="password"');
    expect(source).toContain('어빌리티 자동 불러오기 활성화(취소를 누르면 비활성화 됩니다.)');
    expect(source).toContain(
      '룰북 구매확인 비밀번호(*룰북 92p 주석에 적힌 숫자와 + 블데 룰북 40P 플레이어 1명 기준 리미트 숫자를 합산한 문장을 적어주세요)',
    );
    expect(source).toContain('취소');
    expect(source).toContain('확인');
    expect(source).not.toContain('프리셋 불러오기 비밀번호');
  });

  it('locks InSane ability preset imports until the password is accepted', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    const updateAbilityStart = source.indexOf('function updateAbilityName');
    const updateAbilityEnd = source.indexOf('function updateAbility(', updateAbilityStart);
    const updateAbilityBlock = source.slice(updateAbilityStart, updateAbilityEnd);
    const abilitySectionStart = source.indexOf('title="어빌리티"');
    const relationshipStart = source.indexOf('title="인물란"', abilitySectionStart);
    const abilityBlock = source.slice(abilitySectionStart, relationshipStart);

    expect(source).toContain('isInsaneAbilityPresetUnlocked');
    expect(source).toContain('isAbilityPresetImportLocked');
    expect(source).toContain('abilityPresetImportLocked={isAbilityPresetImportLocked}');
    expect(updateAbilityBlock).toContain('!abilityPresetImportLocked');
    expect(abilityBlock).toContain('{!abilityPresetImportLocked && (');
    expect(abilityBlock).toContain("list={abilityPresetImportLocked ? undefined : 'insane-ability-presets'}");
  });

  it('opens a COC export option dialog from the toolbar', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');

    expect(source).toContain('isCocExportDialogOpen');
    expect(source).toContain('CocExportDialog');
    expect(source).toContain('전체 내보내기');
    expect(source).toContain('투자 기능치만 내보내기');
    expect(source).toContain('특성치만 내보내기');
    expect(source).toContain('createCocExportArchive');
  });

  it('orders CoC characteristic cards by the requested sheet layout', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');

    expect(source).toContain("const statOrder: StatKey[] = ['STR', 'DEX', 'POW', 'CON', 'APP', 'EDU', 'SIZ', 'INT'];");
  });

  it('copies the InSane palette only from the toolbar after required fields are filled', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');

    expect(source).toContain('getInsanePaletteCopyError(insaneSheet)');
    expect(source).toContain('serializeInsaneCcfoliaCharacter(insaneSheet)');
    expect(source).toContain('<span>팔레트 복사</span>');
    expect(source).toContain('title="팔레트를 복사"');
    expect(source).not.toContain('데이터 복사');
    expect(source).not.toContain('TextArea label="코코포리아 API / 채팅팔레트"');
  });

  it('opens a CoC secret dice copy dialog from the toolbar', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    const paletteButtonIndex = source.indexOf('<span>팔레트 복사</span>');
    const secretDiceButtonIndex = source.indexOf('<span>비밀 주사위 복사</span>');

    expect(source).toContain('buildSecretDiceRollOptions');
    expect(source).toContain('serializeSecretDiceImport');
    expect(secretDiceButtonIndex).toBeGreaterThan(paletteButtonIndex);
    expect(source).toContain('title="비밀 주사위를 복사"');
    expect(source).toContain('role="dialog"');
    expect(source).toContain('전체 선택');
    expect(source).toContain('전체 해제');
    expect(source).toContain('characterName={topbarTitle}');
    expect(source).toContain('복사 대상');
    expect(source).toContain("copySecretDiceToClipboard('normal')");
    expect(source).toContain('일반 주사위 복사');
    expect(source).toContain("copySecretDiceToClipboard('bonus')");
    expect(source).toContain('보정 주사위 복사');
  });

  it('splits InSane basic information into the CoC two-card top layout', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    const basicStart = source.indexOf('title="봉마인 정보"');
    const basic2Start = source.indexOf('title="봉마인 정보2"');
    const statsStart = source.indexOf('title="특기"', basic2Start);
    const basicBlock = source.slice(basicStart, basic2Start);
    const basic2Block = source.slice(basic2Start, statsStart);

    expect(source).toContain('title="봉마인 정보2"');
    expect(source).toContain('className="basic-panel insane-basic-panel"');
    expect(source).toContain('className="stat-panel insane-basic-details-panel"');
    expect(basicBlock).toContain('TextField label="나이"');
    expect(basicBlock).toContain('TextField label="플레이어 이름"');
    expect(basicBlock).toContain('<span>이미지 주소</span>');
    expect(basicBlock).not.toContain('NumberField label="공적점"');
    expect(basicBlock).not.toContain('TextField label="연령"');
    expect(basic2Block).toContain('NumberField label="공적점"');
  });

  it('lets InSane sheets keep additional portrait URLs beside the main portrait', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    const styles = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');
    const basicStart = source.indexOf('title="봉마인 정보"');
    const basic2Start = source.indexOf('title="봉마인 정보2"');
    const basicBlock = source.slice(basicStart, basic2Start);

    expect(source).toContain('addInsanePortrait');
    expect(source).toContain('updateInsaneExtraImageUrl');
    expect(source).toContain('removeInsanePortrait');
    expect(basicBlock).toContain('+add');
    expect(basicBlock).toContain('insane-portrait-strip');
    expect(basicBlock).toContain('sheet.basic.extraImageUrls.map');
    expect(styles).toContain('.insane-portrait-strip');
    expect(styles).toContain('overflow-x: auto;');
  });

  it('marks the selected curiosity column with a gap class', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    const styles = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');

    expect(source).toContain('curiosity-gap-column');
    expect(source).toContain('fear-specialty-cell');
    expect(source).toContain('calculateInsaneSpecialtyTarget(sheet, name)');
    expect(source).toContain('calculateInsaneEffectiveSanity(sheet)');
    expect(styles).toContain('.insane-specialty-cell {\n  margin-inline: 5px;');
    expect(styles).toContain('.insane-specialty-table th.curiosity-gap-column {\n  padding-inline: 18px;');
    expect(styles).toContain('.fear-specialty-cell');
  });

  it('keeps SCP abilities commented out and offers random InSane setup dice', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');

    expect(source).toContain('{/* SCP 능력치');
    expect(source).toContain('rollInsaneRandomSetup(current');
    expect(source).toContain('랜덤 다이스');
  });

  it('uses a shared session card section for CoC and InSane', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    const cocNavStart = source.indexOf("{gameSystem === 'insan' ?");
    const cocBranchStart = source.indexOf(') : (', cocNavStart);
    const cocBranchEnd = source.indexOf('</nav>', cocBranchStart);
    const cocNav = source.slice(cocBranchStart, cocBranchEnd);
    const cocSessionStart = source.indexOf('sectionId="scenarios"', cocBranchEnd);
    const cocMemoStart = source.indexOf('title="메모"', cocSessionStart);
    const cocSessionBlock = source.slice(cocSessionStart, cocMemoStart);
    const insaneSessionStart = source.indexOf('title="세션"', cocMemoStart);
    const insaneMemoStart = source.indexOf('title="메모"', insaneSessionStart);
    const insaneSessionBlock = source.slice(insaneSessionStart, insaneMemoStart);

    expect(cocNav).toContain('href="#scenarios"');
    expect(cocNav).toContain('세션');
    expect(cocNav).toContain('href="#memo"');
    expect(cocNav).toContain('메모');
    expect(source).not.toContain('완료 시나리오');
    expect(cocSessionBlock).toContain('title="세션"');
    expect(cocSessionBlock).toContain('className="scenario-list"');
    expect(cocSessionBlock).toContain('className="scenario-item"');
    expect(cocSessionBlock).toContain('ScenarioSummary label="보상"');
    expect(insaneSessionBlock).toContain('className="scenario-list"');
    expect(insaneSessionBlock).toContain('className="scenario-item"');
    expect(insaneSessionBlock).toContain('TextField label="공적점"');
    expect(insaneSessionBlock).not.toContain('insane-session-table');
  });

  it('uses the same card CSS for InSane relationships as sessions', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    const relationshipStart = source.indexOf('title="인물란"');
    const sessionStart = source.indexOf('title="세션"', relationshipStart);
    const relationshipBlock = source.slice(relationshipStart, sessionStart);

    expect(relationshipBlock).toContain('className="scenario-list"');
    expect(relationshipBlock).toContain('className="scenario-item"');
    expect(relationshipBlock).toContain('TextField label="인물란"');
    expect(relationshipBlock).not.toContain('insane-relationship-table');
  });

  it('offers immediate InSane ability autocomplete from internal preset data', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    const presetSource = readFileSync(resolve(process.cwd(), 'src/lib/insaneAbilities.ts'), 'utf8');
    const gitignore = readFileSync(resolve(process.cwd(), '.gitignore'), 'utf8');
    const abilityStart = source.indexOf('title="어빌리티"');
    const relationshipStart = source.indexOf('title="인물란"', abilityStart);
    const abilityBlock = source.slice(abilityStart, relationshipStart);

    expect(source).toContain('loadInsaneAbilityPresets');
    expect(source).toContain('renameInsaneAbilityWithPreset');
    expect(abilityBlock).toContain('id="insane-ability-presets"');
    expect(abilityBlock).toContain("list={abilityPresetImportLocked ? undefined : 'insane-ability-presets'}");
    expect(abilityBlock).toContain('className="scenario-list"');
    expect(abilityBlock).toContain('className="scenario-item insane-ability-item"');
    expect(abilityBlock).toContain("ability.name.trim() === '기본공격'");
    expect(abilityBlock).toContain('insaneSpecialtyNames.map((specialtyName)');
    expect(abilityBlock).toContain('!isDefaultInsaneAbility(ability) ? (');
    expect(abilityBlock).toContain('className="icon-only-placeholder"');
    expect(abilityBlock).not.toContain('insane-ability-table');
    expect(source).toContain('updateAbilityName(ability.id, event.target.value)');
    expect(source).toContain('isDefaultInsaneAbility(ability)');
    expect(source).toContain('current.abilities.filter((ability) => ability.id !== id || isDefaultInsaneAbility(ability))');
    expect(source).not.toContain('window.setTimeout');
    expect(source).not.toContain('3000');
    expect(presetSource).not.toContain("from '../data/insaneAbilities.json'");
    expect(presetSource).toContain('/src/data/insaneAbilities.json');
    expect(gitignore).toContain('src/data/insaneAbilities.json');
  });

  it('widens InSane ability effects while narrowing the leading controls', () => {
    const styles = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');

    expect(styles).toContain(
      '.insane-ability-item {\n  grid-template-columns: minmax(120px, 0.75fr) minmax(96px, 0.55fr) minmax(120px, 0.75fr) minmax(260px, 2fr) 40px;',
    );
  });

  it('uses a color picker instead of the CoC birthplace field', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');

    expect(source).toContain('ColorField label="캐릭터 색상"');
    expect(source).not.toContain('TextField label="출생지"');
  });

  it('uses an image URL input instead of a file picker for the CoC portrait', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    const cocBasicStart = source.indexOf('title="탐사자정보"');
    const cocStatsStart = source.indexOf('title="특성치"', cocBasicStart);
    const cocBasicBlock = source.slice(cocBasicStart, cocStatsStart);

    expect(cocBasicBlock).toContain('sheet.basic.imageUrl ? (');
    expect(cocBasicBlock).toContain('TextField label="이미지 주소"');
    expect(cocBasicBlock).toContain("updateBasic('imageUrl', value)");
    expect(source).not.toContain('fileInputRef');
    expect(source).not.toContain('uploadPortrait');
    expect(source).not.toContain('ImagePlus');
    expect(source).not.toContain('accept="image/*"');
  });

  it('uses the Clipboard API before the textarea fallback', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    const clipboardIndex = source.indexOf('navigator.clipboard?.writeText');
    const fallbackIndex = source.indexOf('copyTextWithTextarea(text)');

    expect(clipboardIndex).toBeGreaterThan(-1);
    expect(fallbackIndex).toBeGreaterThan(-1);
    expect(clipboardIndex).toBeLessThan(fallbackIndex);
  });
});
