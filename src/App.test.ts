import { existsSync, readFileSync } from 'node:fs';
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

  it('switches to the available archive system before importing JSON data', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    const importStart = source.indexOf('function importJson');
    const copyStart = source.indexOf('async function copyCharacterToClipboard', importStart);
    const importBlock = source.slice(importStart, copyStart);

    expect(source).toContain('detectSheetArchiveSystem');
    expect(importBlock).toContain('const parsedArchive = parseSheetArchive<unknown>(String(reader.result));');
    expect(importBlock).toContain('const importedSystem = detectSheetArchiveSystem(parsedArchive);');
    expect(importBlock).toContain('const targetSystem = resolveAvailableGameSystem(importedSystem, gameSystem);');
    expect(importBlock).toContain('setGameSystem(targetSystem);');
    expect(importBlock).toContain("if (targetSystem === 'insan')");
    expect(importBlock).not.toContain("if (gameSystem === 'insan')");
  });

  it('keeps COC 6th edition commented out while keeping InSane behind the development build gate', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    const jsxCommentBlocks = [...source.matchAll(/\{\/\*[\s\S]*?\*\/\}/g)].map(
      ([block]) => block,
    );
    const systemSelectStart = source.indexOf('className="game-system-select"');
    const systemSelectEnd = source.indexOf('</select>', systemSelectStart);
    const systemSelectBlock = source.slice(systemSelectStart, systemSelectEnd);
    const visibleSystemSelectBlock = systemSelectBlock.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

    expect(source).toContain('className="game-system-select"');
    expect(source).toContain("type GameSystem = 'coc7' | 'coc6' | 'insan';");
    expect(source).toContain("const isInsaneEnabled = import.meta.env.DEV || import.meta.env.VITE_ENABLE_INSANE === 'true';");
    expect(visibleSystemSelectBlock).toContain('7판 시트');
    expect(visibleSystemSelectBlock).not.toContain('<option value="coc6">COC 6판</option>');
    expect(visibleSystemSelectBlock).toContain('{isInsaneEnabled && <option value="insan">InSane 시트</option>}');
    expect(
      jsxCommentBlocks.some(
        (block) => block.includes('value="coc6"') && block.includes('COC 6판'),
      ),
    ).toBe(true);
    expect(source).toContain('handleGameSystemChange');
    expect(source).toContain('convertCocSheetEdition');
    expect(source).toContain('<strong>CCLog Sheet</strong>');
    expect(source).toContain('className="brand-title-row"');
    expect(source).not.toContain('<span>{systemLabel}</span>');
  });

  it('falls back to COC 7 when InSane is unavailable in a production build', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    const loadGameSystemStart = source.indexOf('function loadGameSystem');
    const loadInsaneSheetStart = source.indexOf('function loadInsaneSheet', loadGameSystemStart);
    const loadGameSystemBlock = source.slice(loadGameSystemStart, loadInsaneSheetStart);
    const resolveStart = source.indexOf('function resolveAvailableGameSystem');
    const resolveEnd = source.indexOf('function getCocEdition', resolveStart);
    const resolveBlock = source.slice(resolveStart, resolveEnd);
    const changeStart = source.indexOf('function handleGameSystemChange');
    const openInsaneStart = source.indexOf('function openInsaneSheetWithAbilityLock', changeStart);
    const changeBlock = source.slice(changeStart, openInsaneStart);

    expect(loadGameSystemBlock).toContain("return resolveAvailableGameSystem(saved, 'coc7');");
    expect(resolveBlock).toContain("if ((system === 'insan' || system === 'insane') && isInsaneEnabled) return 'insan';");
    expect(resolveBlock).toContain("// if (system === 'coc6') return 'coc6';");
    expect(changeBlock).toContain("if (nextSystem === 'coc6') return;");
    expect(resolveBlock).toContain('return fallback === \'insan\' && !isInsaneEnabled ? \'coc7\' : fallback;');
    expect(changeBlock).toContain("if (nextSystem === 'insan' && !isInsaneEnabled) return;");
  });

  it('keeps the usage guide entry point commented out', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    const jsxCommentBlocks = [...source.matchAll(/\{\/\*[\s\S]*?\*\/\}/g)].map(
      ([block]) => block,
    );
    const visibleSource = source.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

    expect(source).toContain('HelpCircle');
    expect(source).toContain(
      'const [activePage, setActivePage] = useState<AppPage>(() => getAppPageFromPath(window.location.pathname, appBasePath));',
    );
    expect(source).toContain('const helpPath = createAppPath(appBasePath, \'usage\');');
    expect(
      jsxCommentBlocks.some(
        (block) =>
          block.includes('className="brand-help-button"') &&
          block.includes('aria-label="사용방법 보기"') &&
          block.includes('onClick={showUsagePage}'),
      ),
    ).toBe(true);
    expect(
      jsxCommentBlocks.some((block) => block.includes('<UsageGuidePage />')),
    ).toBe(true);
    expect(visibleSource).not.toContain('aria-label="사용방법 보기"');
    expect(visibleSource).not.toContain('onClick={showUsagePage}');
    expect(visibleSource).not.toContain('<UsageGuidePage />');
    expect(source).toContain('UsageGuidePage');
    expect(source).toContain('사용방법');
    expect(source).not.toContain('세부 내용은 여기에 작성하세요.');
  });

  it('routes sidebar section links back to the sheet from the usage guide page', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');

    expect(source).toContain('createSheetSectionPath');
    expect(source).toContain('function showSheetSection(event: MouseEvent<HTMLAnchorElement>, sectionId: SheetSectionId)');
    expect(source).toContain("navigateToPage('sheet', sectionId);");
    expect(source).toContain('href={createSheetSectionPath(appBasePath, sectionId)}');
    expect(source).toContain("renderSidebarLink('skills'");
    expect(source).toContain("renderSidebarLink('basic'");
    expect(source).not.toContain('<a href="#skills">');
    expect(source).not.toContain('<a href="#basic">');
  });

  it('scrolls back to the top when opening the responsive sidebar menu', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');

    expect(source).toContain('responsiveSidebarMediaQuery');
    expect(source).toContain('shouldRevealSidebarAtPageTop');
    expect(source).toContain('window.matchMedia(responsiveSidebarMediaQuery).matches');
    expect(source).toContain('window.requestAnimationFrame(() => {');
    expect(source).toContain("window.scrollTo({ top: 0, behavior: 'smooth' });");
  });

  it('renders usage guide cards with individual copy and images', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');

    expect(source).toContain('const usageGuideSections = [');
    expect(source).toContain('title: \'1. 시트 작성하기\'');
    expect(source).toContain('title: \'3.비밀 주사위 복사\'');
    expect(source).toContain('...(isInsaneEnabled');
    expect(source).toContain('description:');
    expect(source).toContain('type UsageGuideImages =');
    expect(source).toContain('images: [');
    expect(source).not.toContain('imageSrc:');
    expect(source).not.toContain('imageAlt:');
    expect(source).toContain('usage-guide/usage-guide-basic-flow.png');
    expect(source).toContain('usage-guide/usage-guide-inputs.png');
    expect(source).toContain('usage-guide/usage-guide-export-import.png');
    expect(source).toContain('usage-guide/usage-guide-faq.png');
    expect(source).toContain('usage-guide/usage-guide-basic-flow.jpg');
    expect(source).toContain('usage-guide/usage-guide-inputs.jpg');
    expect(source).toContain('usage-guide/usage-guide-export-import.jpg');
    expect(source).toContain('usage-guide/usage-guide-faq.jpg');
    expect(source).not.toContain('usage-guide/usage-guide-basic-flow.svg');
    expect(source).toContain('<img');
    expect(source).toContain('className="usage-guide-image"');
    expect(source).toContain('section.images.map((image)');
    expect(source).toContain('src={image.src}');
    expect(source).toContain('onError={(event) => {');
    expect(source).toContain("event.currentTarget.dataset.fallbackApplied = 'true';");
    expect(source).toContain('event.currentTarget.src = image.fallbackSrc;');
    expect(source).toContain('alt={image.alt}');
    expect(source).toContain('{section.description}');
    expect(source).not.toContain('guideSections.map((title)');
    expect(source).not.toContain('기능치와 특성치를 입력후, \'팔레트 복사\'');
  });

  it('names every external link by destination and visibly warns that it opens a new window', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    const secretDiceGuideStart = source.indexOf("title: '3.비밀 주사위 복사'");
    const nextGuideStart = source.indexOf("title: '4.어빌리티 자동화(인세인)'", secretDiceGuideStart);
    const secretDiceGuideBlock = source.slice(secretDiceGuideStart, nextGuideStart);

    expect(source).toContain(
      "const r20JsonExporterUrl = 'https://chromewebstore.google.com/detail/r20-jsonexporter/galgbmfkkpehcijjfcaffifmfjbmlfbo?utm_source=item-share-cb';",
    );
    expect(secretDiceGuideBlock).toContain('href={r20JsonExporterUrl}');
    expect(secretDiceGuideBlock).toContain('target="_blank"');
    expect(secretDiceGuideBlock).toContain('rel="noopener noreferrer"');
    expect(secretDiceGuideBlock).toContain('R20 JSONExporter 확장 프로그램(새 창)');
    expect(source.match(/target="_blank"/g)).toHaveLength(1);
  });

  it('keeps usage guide image assets together in the public usage-guide directory', () => {
    const imageBaseNames = [
      'usage-guide-basic-flow',
      'usage-guide-inputs',
      'usage-guide-export-import',
      'usage-guide-faq',
    ];
    const imageDir = resolve(process.cwd(), 'public', 'usage-guide');
    const pngSignature = [0x89, 0x50, 0x4e, 0x47];
    const jpgSignature = [0xff, 0xd8, 0xff];

    expect(existsSync(imageDir)).toBe(true);

    imageBaseNames.forEach((baseName) => {
      const pngPath = resolve(imageDir, `${baseName}.png`);
      const jpgPath = resolve(imageDir, `${baseName}.jpg`);

      expect(existsSync(pngPath) || existsSync(jpgPath)).toBe(true);
      expect(existsSync(resolve(imageDir, `${baseName}.svg`))).toBe(false);
      expect(existsSync(resolve(process.cwd(), 'public', `${baseName}.png`))).toBe(false);
      expect(existsSync(resolve(process.cwd(), 'public', `${baseName}.jpg`))).toBe(false);

      if (existsSync(pngPath)) {
        const fileBuffer = readFileSync(pngPath);
        expect([...fileBuffer.subarray(0, pngSignature.length)]).toEqual(pngSignature);
        const width = fileBuffer.readUInt32BE(16);
        const height = fileBuffer.readUInt32BE(20);
        expect(width / height).toBeCloseTo(16 / 9, 2);
      }

      if (existsSync(jpgPath)) {
        const fileBuffer = readFileSync(jpgPath);
        expect([...fileBuffer.subarray(0, jpgSignature.length)]).toEqual(jpgSignature);
      }
    });
  });

  it('prompts for an InSane ability password when choosing InSane from the system dropdown', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');

    expect(source).toContain('insaneAbilityPresetPassword');
    expect(source).toContain('VITE_INSANE_ABILITY_PASSWORD');
    expect(source).toContain('isInsaneAbilityPasswordDialogOpen');
    expect(source).toContain('InsaneAbilityPasswordDialog');
    expect(source).toContain('confirmInsaneAbilityPassword');
    expect(source).toContain('closeInsaneAbilityPassword');
    expect(source).toContain('method="dialog"');
    expect(source).toContain('labelledBy="insane-password-title"');
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
    expect(source).toContain('전체 세이브');
    expect(source).toContain('투자 기능치만 세이브');
    expect(source).toContain('특성치만 세이브');
    expect(source).toContain('createCocExportArchive');
  });

  it('orders CoC characteristic cards by the requested sheet layout', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');

    expect(source).toContain("const statOrder: StatKey[] = ['STR', 'DEX', 'POW', 'CON', 'APP', 'EDU', 'SIZ', 'INT'];");
  });

  it('renames topbar save, load, and Ccfolia palette copy actions', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');

    expect(source).toContain('title="세이브"');
    expect(source).toContain('<span>세이브</span>');
    expect(source).toContain('title="로드"');
    expect(source).toContain('<span>로드</span>');
    expect(source).toContain('title="코코포 팔레트를 복사"');
    expect(source).toContain('<span>코코포 팔레트 복사</span>');
    expect(source).not.toContain('<span>내보내기</span>');
    expect(source).not.toContain('<span>가져오기</span>');
    expect(source).not.toContain('<span>팔레트 복사</span>');
  });

  it('copies the InSane palette only from the toolbar after required fields are filled', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');

    expect(source).toContain('getInsanePaletteCopyError(insaneSheet)');
    expect(source).toContain('serializeInsaneCcfoliaCharacter(insaneSheet)');
    expect(source).toContain('<span>코코포 팔레트 복사</span>');
    expect(source).toContain('title="코코포 팔레트를 복사"');
    expect(source).not.toContain('데이터 복사');
    expect(source).not.toContain('TextArea label="코코포리아 API / 채팅팔레트"');
  });

  it('opens a CoC secret dice copy dialog from the toolbar', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    const paletteButtonIndex = source.indexOf('<span>코코포 팔레트 복사</span>');
    const secretDiceButtonIndex = source.indexOf('<span>비밀 주사위 복사</span>');

    expect(source).toContain('buildSecretDiceRollOptions');
    expect(source).toContain('serializeSecretDiceImport');
    expect(secretDiceButtonIndex).toBeGreaterThan(paletteButtonIndex);
    expect(source).toContain('title="비밀 주사위 복사"');
    expect(source).toContain('labelledBy="secret-dice-title"');
    expect(source).toContain('describedBy="secret-dice-description"');
    expect(source).toContain('전체 선택');
    expect(source).toContain('전체 해제');
    expect(source).toContain('characterName={topbarTitle}');
    expect(source).toContain('복사 대상');
    expect(source).toContain("copySecretDiceToClipboard('normal')");
    expect(source).toContain('일반 주사위 복사');
    expect(source).toContain("copySecretDiceToClipboard('bonus')");
    expect(source).toContain('보정 주사위 복사');
  });

  it('copies Roll20 COC sheet attributes from the toolbar without opening the secret dice dialog', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    const paletteButtonIndex = source.indexOf('<span>코코포 팔레트 복사</span>');
    const roll20SheetButtonIndex = source.indexOf('<span>Roll20 시트 복사</span>');
    const secretDiceButtonIndex = source.indexOf('<span>비밀 주사위 복사</span>');

    expect(source).toContain('serializeRoll20CocSheetImport');
    expect(source).toContain('copyRoll20CocSheetToClipboard');
    expect(roll20SheetButtonIndex).toBeGreaterThan(paletteButtonIndex);
    expect(roll20SheetButtonIndex).toBeLessThan(secretDiceButtonIndex);
    expect(source).toContain('title="Roll20 COC 시트 특성치를 복사"');
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

  it('lets InSane sheets keep labeled standing images beside the main portrait', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    const styles = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');
    const basicStart = source.indexOf('title="봉마인 정보"');
    const basic2Start = source.indexOf('title="봉마인 정보2"');
    const basicBlock = source.slice(basicStart, basic2Start);

    expect(source).toContain('addInsaneStandingImage');
    expect(source).toContain('updateInsaneStandingImage');
    expect(source).toContain('removeInsaneStandingImage');
    expect(basicBlock).toContain('표정별 이미지');
    expect(basicBlock).toContain('aria-label={`인세인 표정 라벨 ${index + 1}`}');
    expect(basicBlock).toContain('aria-label={`인세인 표정 이미지 주소 ${index + 1}`}');
    expect(basicBlock).toContain('insane-portrait-strip');
    expect(basicBlock).toContain('sheet.basic.standingImages.map');
    expect(styles).toContain('.insane-portrait-strip');
    expect(styles).toContain('.standing-image-row');
    expect(styles).toContain('overflow-x: auto;');
  });

  it('marks the selected curiosity column with a gap class', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    const styles = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');

    expect(source).toContain('curiosity-gap-column');
    expect(source).toContain('fear-specialty-cell');
    expect(source).toContain('getInsaneFearNames(sheet.fear).includes(name)');
    expect(source).toContain('appendInsaneFear(current.fear, event.target.value)');
    expect(source).toContain('className="insane-fear-controls"');
    expect(source).toContain('aria-label="공포심 직접 입력"');
    expect(source).toContain('calculateInsaneSpecialtyTarget(sheet, name)');
    expect(source).toContain('calculateInsaneEffectiveSanity(sheet)');
    expect(source).toContain('calculateInsaneEffectiveSanityMax(sheet)');
    expect(styles).toContain('.insane-specialty-cell {\n  margin-inline: 5px;');
    expect(styles).toContain('.insane-specialty-table th.curiosity-gap-column {\n  padding-inline: 18px;');
    expect(styles).toContain('.fear-specialty-cell');
    expect(styles).toContain('.insane-fear-controls');
  });

  it('shows fixed numeric SCP items only when the InSane item toggle is enabled', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    const itemStart = source.indexOf('title="아이템"');
    const abilityStart = source.indexOf('title="어빌리티"', itemStart);
    const itemBlock = source.slice(itemStart, abilityStart);

    expect(itemBlock).toContain('checked={sheet.items.scpEnabled}');
    expect(itemBlock).toContain('onChange={(event) => updateScpEnabled(event.target.checked)}');
    expect(itemBlock).toContain('{sheet.items.scpEnabled && (');
    expect(itemBlock).toContain('NumberField label="네트런처"');
    expect(itemBlock).toContain('NumberField label="기억소거"');
    expect(itemBlock).toContain('NumberField label="기폭장치"');
    expect(itemBlock).toContain("updateItem('scpNetLauncher', value)");
    expect(itemBlock).toContain("updateItem('scpMemoryErase', value)");
    expect(itemBlock).toContain("updateItem('scpDetonator', value)");
    expect(itemBlock).not.toContain('SCP 추가');
    expect(itemBlock).not.toContain('insane-scp-table');
    expect(source).not.toContain('{/* SCP 능력치');
    expect(source).toContain('rollInsaneRandomSetup(current');
    expect(source).toContain('랜덤 다이스');
  });

  it('uses a shared session card section for CoC and InSane', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    const cocNavStart = source.indexOf('{isInsaneMode ?');
    const cocBranchStart = source.indexOf(') : (', cocNavStart);
    const cocBranchEnd = source.indexOf('</nav>', cocBranchStart);
    const cocNav = source.slice(cocBranchStart, cocBranchEnd);
    const cocSessionStart = source.indexOf('sectionId="scenarios"', cocBranchEnd);
    const cocMemoStart = source.indexOf('title="메모"', cocSessionStart);
    const cocSessionBlock = source.slice(cocSessionStart, cocMemoStart);
    const insaneSessionStart = source.indexOf('title="세션"', cocMemoStart);
    const insaneMemoStart = source.indexOf('title="메모"', insaneSessionStart);
    const insaneSessionBlock = source.slice(insaneSessionStart, insaneMemoStart);

    expect(cocNav).toContain("renderSidebarLink('scenarios'");
    expect(cocNav).toContain('세션');
    expect(cocNav).toContain("renderSidebarLink('memo'");
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

  it('limits InSane ability additions to eight total cards', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    const abilityStart = source.indexOf('title="어빌리티"');
    const relationshipStart = source.indexOf('title="인물란"', abilityStart);
    const abilityBlock = source.slice(abilityStart, relationshipStart);

    expect(source).toContain('insaneAbilityLimit');
    expect(source).toContain('const canAddAbility = sheet.abilities.length < insaneAbilityLimit;');
    expect(source).toContain('if (!canAddAbility) return current;');
    expect(abilityBlock).toContain('disabled={!canAddAbility}');
    expect(abilityBlock).toContain('title={canAddAbility ? \'어빌리티 추가\' : \'어빌리티는 8개까지 추가할 수 있습니다\'}');
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

  it('lets COC sheets add labeled expression standing images below the image URL', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    const cocBasicStart = source.indexOf('title="탐사자정보"');
    const cocStatsStart = source.indexOf('title="특성치"', cocBasicStart);
    const cocBasicBlock = source.slice(cocBasicStart, cocStatsStart);

    expect(cocBasicBlock).toContain('표정별 이미지');
    expect(cocBasicBlock).toContain('addStandingImage');
    expect(cocBasicBlock).toContain('updateStandingImage');
    expect(cocBasicBlock).toContain('removeStandingImage');
    expect(cocBasicBlock).toContain('aria-label={`표정 라벨 ${index + 1}`}');
    expect(cocBasicBlock).toContain('aria-label={`표정 이미지 주소 ${index + 1}`}');
    expect(source).toContain('faces: sheet.basic.standingImages.map');
  });

  it('does not send a referrer when previewing external portrait images', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    const cocBasicStart = source.indexOf('title="탐사자정보"');
    const cocStatsStart = source.indexOf('title="특성치"', cocBasicStart);
    const cocBasicBlock = source.slice(cocBasicStart, cocStatsStart);
    const insaneBasicStart = source.indexOf('title="봉마인 정보"');
    const insaneStatsStart = source.indexOf('title="특기"', insaneBasicStart);
    const insaneBasicBlock = source.slice(insaneBasicStart, insaneStatsStart);

    expect(cocBasicBlock).toContain('<img src={sheet.basic.imageUrl} alt="캐릭터 초상" referrerPolicy="no-referrer" />');
    expect(insaneBasicBlock).toContain('<img src={item.imageUrl} alt={item.alt} referrerPolicy="no-referrer" />');
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
