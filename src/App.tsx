import {
  BookOpen,
  Check,
  ChevronDown,
  Clipboard,
  Dice6,
  Download,
  FileInput,
  FileText,
  HelpCircle,
  Menu,
  Plus,
  RotateCcw,
  Search,
  Shield,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
  X,
} from 'lucide-react';
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  createInitialSkills,
  createSpecialtySkill,
  normalizeStoredSkills,
  skillCategories,
  sortSkillsByKoreanName,
} from './data/skills';
import {
  buildCharacterClipboardPayload,
  buildSecretDiceRollOptions,
  serializeCharacterClipboardPayload,
  serializeSecretDiceImport,
  type SecretDiceRollOption,
  type SecretDiceTemplateKind,
} from './lib/clipboardExport';
import {
  CombatArmor,
  CombatSpell,
  CombatWeapon,
  createDefaultArmor,
  createDefaultSpell,
  createDefaultWeapon,
  createDefaultWeapons,
  normalizeArmors,
  normalizeSpells,
  normalizeWeapons,
  WeaponCategory,
  weaponCategories,
  weaponCategoryLabels,
} from './lib/combat';
import {
  applyGrowthRolls,
  calculateDerivedStats,
  calculateSkillBudget,
  calculateSkillTotal,
  clampPercent,
  CocEdition,
  convertInvestigatorStats,
  defaultStats,
  fifth,
  fourFifths,
  half,
  InvestigatorStats,
  isSkillGroup,
  normalizeStats,
  occupationFormulaLabels,
  OccupationFormula,
  positiveNumber,
  resolveSkillBase,
  GrowthResult,
  SheetSkill,
  StatKey,
  statLabels,
} from './lib/character';
import { rollInvestigatorStats } from './lib/character';
import { createCocExportArchive, type CocExportMode } from './lib/cocExport';
import {
  createInitialSectionOpenState,
  SheetSectionId,
  toggleSectionOpen,
} from './lib/sections';
import { createInitialSidebarOpenState, toggleSidebarOpen } from './lib/sidebar';
import {
  completeScenarioDraft,
  createEmptyScenarioDraft,
  isScenarioDraftEmpty,
  normalizeScenarios,
  type ScenarioDraft,
  type SheetScenario,
} from './lib/scenarios';
import {
  calculateInsaneEffectiveSanity,
  calculateInsaneSanityPenalty,
  calculateInsaneSpecialtyTarget,
  createInitialInsaneSheet,
  getInsanePaletteCopyError,
  insaneSkillCategories,
  insaneSpecialtyNames,
  isDefaultInsaneAbility,
  normalizeInsaneSheet,
  rollInsaneRandomSetup,
  serializeInsaneCcfoliaCharacter,
  type InsaneAbility,
  type InsaneRelationship,
  type InsaneScpAbility,
  type InsaneSession,
  type InsaneSheetState,
} from './lib/insane';
import {
  loadInsaneAbilityPresets,
  renameInsaneAbilityWithPreset,
  type InsaneAbilityPreset,
} from './lib/insaneAbilities';
import {
  BasicInfo,
  createDefaultBasicInfo,
  createDefaultSanityInfo,
  normalizeBasicInfo,
  normalizeSanityInfo,
  SanityInfo,
  syncSanityWithPow,
} from './lib/sheet';
import { detectSheetArchiveSystem, parseSheetArchive, serializeSheetArchive } from './lib/sheetArchive';
import { splitSkillsIntoColumns } from './lib/skillColumns';

interface SheetState {
  basic: BasicInfo;
  stats: InvestigatorStats;
  sanity: SanityInfo;
  skills: SheetSkill[];
  weapons: CombatWeapon[];
  armors: CombatArmor[];
  spells: CombatSpell[];
  inventory: string;
  cash: string;
  backstory: Record<string, string>;
  scenarios: SheetScenario[];
  memo: string;
  portrait?: string;
  occupationFormula: OccupationFormula;
  manualOccupationTotal: number;
}

type SheetStateArchive = Partial<Omit<SheetState, 'weapons' | 'armors' | 'spells'>> & {
  weapons?: unknown;
  armors?: unknown;
  spells?: unknown;
  armor?: unknown;
};

type CombatTab = 'weapons' | 'armor' | 'spells';
type GameSystem = 'coc7' | 'coc6' | 'insan';
type AppPage = 'sheet' | 'usage';

const storageKey = 'cclog-sheet:v1';
const systemStorageKey = 'cclog-sheet:system';
const insaneStorageKey = 'cclog-sheet:insane:v1';
const colorPickerFallback = '#68c870';
const insaneAbilityPresetPassword =
  ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
    ?.VITE_INSANE_ABILITY_PASSWORD ?? '').trim();
const statOrder: StatKey[] = ['STR', 'DEX', 'POW', 'CON', 'APP', 'EDU', 'SIZ', 'INT'];
const coc6OccupationFormulaLabels: Record<OccupationFormula, string> = {
  edu4: 'EDU x 20',
  str2edu2: 'STR x 10 + EDU x 10',
  con2edu2: 'CON x 10 + EDU x 10',
  pow2edu2: 'POW x 10 + EDU x 10',
  dex2edu2: 'DEX x 10 + EDU x 10',
  app2edu2: 'APP x 10 + EDU x 10',
  siz2edu2: 'SIZ x 10 + EDU x 10',
  int2edu2: 'INT x 10 + EDU x 10',
  manual: '직접 입력',
};

const backstoryFields = [
  ['appearance', '외형'],
  ['ideology', '사상/신념'],
  ['people', '소중한 사람'],
  ['places', '의미 있는 장소'],
  ['possessions', '소중한 물건'],
  ['traits', '성격'],
  ['injuries', '부상과 흉터 / 공포증과 집착증'],
  ['tomes', '신화서&유물 / 기이한 존재들과의 만남'],
];

function createId(prefix: string): string {
  if ('crypto' in window && 'randomUUID' in window.crypto) {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createInitialSheet(edition: CocEdition = 'coc7'): SheetState {
  const stats =
    edition === 'coc6' ? convertInvestigatorStats(defaultStats, 'coc7', 'coc6') : defaultStats;
  const derived = calculateDerivedStats(stats, edition);

  return {
    basic: createDefaultBasicInfo(),
    stats,
    sanity: createDefaultSanityInfo(derived.san),
    skills: createInitialSkills(stats, edition),
    weapons: createDefaultWeapons(),
    armors: [],
    spells: [],
    inventory: '',
    cash: '',
    backstory: Object.fromEntries(backstoryFields.map(([key]) => [key, ''])),
    scenarios: [],
    memo: '',
    occupationFormula: 'edu4',
    manualOccupationTotal: 0,
  };
}

function App() {
  const [activePage, setActivePage] = useState<AppPage>('sheet');
  const [gameSystem, setGameSystem] = useState<GameSystem>(() => loadGameSystem());
  const [sheet, setSheet] = useState<SheetState>(() => loadSheet());
  const [insaneSheet, setInsaneSheet] = useState<InsaneSheetState>(() => loadInsaneSheet());
  const [skillSearch, setSkillSearch] = useState('');
  const [skillCategory, setSkillCategory] = useState('전체');
  const [growthMessage, setGrowthMessage] = useState('');
  const [growthResults, setGrowthResults] = useState<GrowthResult[]>([]);
  const [toolbarMessage, setToolbarMessage] = useState('');
  const [sectionOpen, setSectionOpen] = useState(createInitialSectionOpenState);
  const [isSidebarOpen, setIsSidebarOpen] = useState(createInitialSidebarOpenState);
  const [activeSkillGroupId, setActiveSkillGroupId] = useState<string | null>(null);
  const [specialtyDraft, setSpecialtyDraft] = useState('');
  const [isScenarioDraftOpen, setIsScenarioDraftOpen] = useState(false);
  const [scenarioDraft, setScenarioDraft] = useState<ScenarioDraft>(createEmptyScenarioDraft);
  const [combatTab, setCombatTab] = useState<CombatTab>('weapons');
  const [weaponCategory, setWeaponCategory] = useState<WeaponCategory>('melee');
  const [isSecretDiceDialogOpen, setIsSecretDiceDialogOpen] = useState(false);
  const [isCocExportDialogOpen, setIsCocExportDialogOpen] = useState(false);
  const [isInsaneAbilityPasswordDialogOpen, setIsInsaneAbilityPasswordDialogOpen] =
    useState(false);
  const [insaneAbilityPasswordDraft, setInsaneAbilityPasswordDraft] = useState('');
  const [isInsaneAbilityPresetUnlocked, setIsInsaneAbilityPresetUnlocked] = useState(false);
  const [insaneAbilityPresets, setLoadedInsaneAbilityPresets] = useState<InsaneAbilityPreset[]>([]);
  const [secretDiceSelection, setSecretDiceSelection] = useState<string[]>([]);
  const importInputRef = useRef<HTMLInputElement>(null);

  const cocEdition = getCocEdition(gameSystem);
  const isAbilityPresetImportLocked = gameSystem === 'insan' && !isInsaneAbilityPresetUnlocked;
  const derived = useMemo(
    () => calculateDerivedStats(sheet.stats, cocEdition),
    [cocEdition, sheet.stats],
  );
  const sanity = useMemo(
    () => normalizeSanityInfo(sheet.sanity, derived.san),
    [derived.san, sheet.sanity],
  );
  const budget = useMemo(
    () =>
      calculateSkillBudget(
        sheet.skills,
        sheet.stats,
        sheet.occupationFormula,
        sheet.manualOccupationTotal,
        cocEdition,
      ),
    [cocEdition, sheet.manualOccupationTotal, sheet.occupationFormula, sheet.skills, sheet.stats],
  );
  const checkedSkillCount = sheet.skills.filter(
    (skill) => skill.checked && !isSkillGroup(skill),
  ).length;
  const characterClipboardSource = useMemo(
    () => ({
      name: sheet.basic.name,
      stats: sheet.stats,
      sanity,
      skills: sheet.skills,
      weapons: sheet.weapons,
      edition: cocEdition,
    }),
    [cocEdition, sanity, sheet.basic.name, sheet.skills, sheet.stats, sheet.weapons],
  );
  const secretDiceOptions = useMemo(
    () => buildSecretDiceRollOptions(characterClipboardSource),
    [characterClipboardSource],
  );

  const filteredSkills = sortSkillsByKoreanName(
    sheet.skills.filter((skill) => {
      const matchesSearch = skill.name.toLowerCase().includes(skillSearch.toLowerCase());
      const matchesCategory = skillCategory === '전체' || skill.category === skillCategory;
      return matchesSearch && matchesCategory;
    }),
  );
  const skillColumns = useMemo(() => splitSkillsIntoColumns(filteredSkills), [filteredSkills]);
  const visibleWeapons = useMemo(
    () => sheet.weapons.filter((weapon) => weapon.category === weaponCategory),
    [sheet.weapons, weaponCategory],
  );

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(sheet));
  }, [sheet]);

  useEffect(() => {
    window.localStorage.setItem(insaneStorageKey, JSON.stringify(insaneSheet));
  }, [insaneSheet]);

  useEffect(() => {
    window.localStorage.setItem(systemStorageKey, gameSystem);
  }, [gameSystem]);

  useEffect(() => {
    let isMounted = true;

    void loadInsaneAbilityPresets().then((presets) => {
      if (isMounted) {
        setLoadedInsaneAbilityPresets(presets);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setToolbarMessage('');
    setIsSecretDiceDialogOpen(false);
    setIsCocExportDialogOpen(false);
    setIsInsaneAbilityPasswordDialogOpen(false);
  }, [gameSystem]);

  function updateBasic(key: keyof BasicInfo, value: string) {
    setSheet((current) => ({ ...current, basic: { ...current.basic, [key]: value } }));
  }

  function toggleSection(sectionId: SheetSectionId) {
    setSectionOpen((current) => toggleSectionOpen(current, sectionId));
  }

  function toggleSidebar() {
    setIsSidebarOpen((current) => toggleSidebarOpen(current));
  }

  function handleGameSystemChange(nextSystem: GameSystem) {
    if (nextSystem === gameSystem) return;

    if (nextSystem === 'insan' && !isInsaneAbilityPresetUnlocked) {
      setInsaneAbilityPasswordDraft('');
      setIsInsaneAbilityPasswordDialogOpen(true);
      return;
    }

    if (isCocGameSystem(gameSystem) && isCocGameSystem(nextSystem)) {
      setSheet((current) => convertCocSheetEdition(current, gameSystem, nextSystem));
      setSkillCategory('전체');
    }

    if (nextSystem !== 'insan') {
      setIsInsaneAbilityPresetUnlocked(false);
    }

    setGameSystem(nextSystem);
  }

  function openInsaneSheetWithAbilityLock(isUnlocked: boolean) {
    setIsInsaneAbilityPresetUnlocked(isUnlocked);
    setInsaneAbilityPasswordDraft('');
    setIsInsaneAbilityPasswordDialogOpen(false);
    setGameSystem('insan');
  }

  function confirmInsaneAbilityPassword() {
    const isPasswordAccepted =
      Boolean(insaneAbilityPresetPassword) &&
      insaneAbilityPasswordDraft.trim() === insaneAbilityPresetPassword;

    openInsaneSheetWithAbilityLock(isPasswordAccepted);
  }

  function cancelInsaneAbilityPassword() {
    openInsaneSheetWithAbilityLock(false);
  }

  function updateStat(key: StatKey | 'luck', value: string) {
    setSheet((current) => {
      const stats = normalizeStats({
        ...current.stats,
        [key]: Number(value),
      } as InvestigatorStats);
      const previousSanStart = calculateDerivedStats(current.stats, cocEdition).san;
      const nextSanStart = calculateDerivedStats(stats, cocEdition).san;
      const sanity =
        key === 'POW'
          ? syncSanityWithPow(current.sanity, previousSanStart, nextSanStart)
          : current.sanity;

      return { ...current, stats, sanity };
    });
  }

  function updateSanity(key: keyof SanityInfo, value: number | boolean) {
    setSheet((current) => ({
      ...current,
      sanity: {
        ...normalizeSanityInfo(current.sanity, current.stats.POW),
        [key]: typeof value === 'number' ? clampPercent(value) : value,
      },
    }));
  }

  function updateSkill(id: string, key: keyof SheetSkill, value: number | boolean | string) {
    setSheet((current) => ({
      ...current,
      skills: current.skills.map((skill) =>
        skill.id === id
          ? {
              ...skill,
              [key]: typeof value === 'number' ? positiveNumber(value) : value,
            }
          : skill,
      ),
    }));
  }

  function addSkill() {
    const id = createId('skill');
    setSheet((current) => ({
      ...current,
      skills: [
        ...current.skills,
        {
          id,
          name: '새 기능치',
          base: 1,
          occupation: 0,
          interest: 0,
          other: 0,
          growth: 0,
          checked: false,
          category: '사용자',
          custom: true,
          dynamicBase: 'none',
        },
      ],
    }));
  }

  function startSpecialtySkill(parentId: string) {
    setActiveSkillGroupId(parentId);
    setSpecialtyDraft('');
  }

  function confirmSpecialtySkill(parentSkill: SheetSkill) {
    const specialtyName = specialtyDraft.trim();
    if (!specialtyName) return;

    const specialtySkill = createSpecialtySkill(
      parentSkill,
      specialtyName,
      createId('skill'),
    );

    setSheet((current) => ({
      ...current,
      skills: sortSkillsByKoreanName([...current.skills, specialtySkill]),
    }));
    setActiveSkillGroupId(null);
    setSpecialtyDraft('');
  }

  function cancelSpecialtySkill() {
    setActiveSkillGroupId(null);
    setSpecialtyDraft('');
  }

  function removeSkill(id: string) {
    setSheet((current) => ({
      ...current,
      skills: current.skills.filter((skill) => skill.id !== id || !skill.custom),
    }));
  }

  function rollStats() {
    const stats = rollInvestigatorStats(cocEdition);
    setSheet((current) => ({
      ...current,
      stats,
      sanity: syncSanityWithPow(
        current.sanity,
        calculateDerivedStats(current.stats, cocEdition).san,
        calculateDerivedStats(stats, cocEdition).san,
      ),
      skills: normalizeStoredSkills(current.skills, stats, cocEdition),
    }));
  }

  function growCheckedSkills() {
    const result = applyGrowthRolls(sheet.skills, sheet.stats);

    setSheet((current) => ({
      ...current,
      skills: result.skills,
    }));
    setGrowthResults(result.growthResults);
    setGrowthMessage(
      result.rolledCount === 0
        ? '성장 체크된 기능치가 없습니다.'
        : `${result.rolledCount}개 기능치를 굴려 ${result.growthResults.length}개 기능치가 성장했습니다.`,
    );
  }

  function updateWeapon(id: string, key: keyof CombatWeapon, value: string) {
    setSheet((current) => ({
      ...current,
      weapons: current.weapons.map((weapon) =>
        weapon.id === id ? { ...weapon, [key]: value } : weapon,
      ),
    }));
  }

  function addWeapon() {
    setSheet((current) => ({
      ...current,
      weapons: [
        ...current.weapons,
        createDefaultWeapon(weaponCategory, createId('weapon')),
      ],
    }));
  }

  function removeWeapon(id: string) {
    setSheet((current) => ({
      ...current,
      weapons: current.weapons.filter((weapon) => weapon.id !== id || weapon.isDefault),
    }));
  }

  function updateArmor(id: string, key: keyof CombatArmor, value: string) {
    setSheet((current) => ({
      ...current,
      armors: current.armors.map((armor) =>
        armor.id === id ? { ...armor, [key]: value } : armor,
      ),
    }));
  }

  function addArmor() {
    setSheet((current) => ({
      ...current,
      armors: [...current.armors, createDefaultArmor(createId('armor'))],
    }));
  }

  function removeArmor(id: string) {
    setSheet((current) => ({
      ...current,
      armors: current.armors.filter((armor) => armor.id !== id),
    }));
  }

  function updateSpell(id: string, key: keyof CombatSpell, value: string) {
    setSheet((current) => ({
      ...current,
      spells: current.spells.map((spell) =>
        spell.id === id ? { ...spell, [key]: value } : spell,
      ),
    }));
  }

  function addSpell() {
    setSheet((current) => ({
      ...current,
      spells: [...current.spells, createDefaultSpell(createId('spell'))],
    }));
  }

  function removeSpell(id: string) {
    setSheet((current) => ({
      ...current,
      spells: current.spells.filter((spell) => spell.id !== id),
    }));
  }

  function addScenario() {
    setIsScenarioDraftOpen(true);
  }

  function updateScenarioDraft(key: keyof ScenarioDraft, value: string) {
    setScenarioDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function completeScenario() {
    if (isScenarioDraftEmpty(scenarioDraft)) return;

    setSheet((current) => {
      const result = completeScenarioDraft(current.scenarios, scenarioDraft, createId('scenario'));

      return {
        ...current,
        scenarios: result.scenarios,
      };
    });
    setScenarioDraft(createEmptyScenarioDraft());
    setIsScenarioDraftOpen(false);
  }

  function cancelScenarioDraft() {
    setScenarioDraft(createEmptyScenarioDraft());
    setIsScenarioDraftOpen(false);
  }

  function removeScenario(id: string) {
    setSheet((current) => ({
      ...current,
      scenarios: current.scenarios.filter((scenario) => scenario.id !== id),
    }));
  }

  function exportJson() {
    if (gameSystem !== 'insan') {
      setIsCocExportDialogOpen(true);
      return;
    }

    downloadJsonArchive(
      { ...insaneSheet, gameSystem: 'insan' },
      insaneSheet.basic.name || 'insan-character',
    );
  }

  function exportCocJson(mode: CocExportMode) {
    const archive = createCocExportArchive(sheet, mode, cocEdition);
    downloadJsonArchive(archive, sheet.basic.name || 'investigator');
    setIsCocExportDialogOpen(false);
  }

  function downloadJsonArchive(activeSheet: unknown, activeName: string) {
    const blob = new Blob([serializeSheetArchive(activeSheet)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${activeName}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function importJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsedArchive = parseSheetArchive<unknown>(String(reader.result));
        const importedSystem = detectSheetArchiveSystem(parsedArchive);
        const targetSystem = importedSystem === 'unknown' ? gameSystem : importedSystem;

        setGameSystem(targetSystem);

        if (targetSystem === 'insan') {
          setInsaneSheet(normalizeInsaneSheet(parsedArchive));
        } else {
          const targetEdition = targetSystem === 'coc6' ? 'coc6' : 'coc7';
          setSheet(normalizeSheetState(parsedArchive as SheetStateArchive, targetEdition));
        }
      } catch {
        setGrowthMessage('가져오기 파일을 읽지 못했습니다.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  async function copyCharacterToClipboard() {
    if (gameSystem === 'insan') {
      const copyError = getInsanePaletteCopyError(insaneSheet);
      if (copyError) {
        setToolbarMessage(copyError);
        return;
      }

      await writeClipboardText(serializeInsaneCcfoliaCharacter(insaneSheet));
      setToolbarMessage('');
      return;
    }

    const payload = buildCharacterClipboardPayload(characterClipboardSource);
    const text = serializeCharacterClipboardPayload(payload);

    await writeClipboardText(text);
    setToolbarMessage('');
  }

  function openSecretDiceDialog() {
    if (gameSystem !== 'coc7') return;

    setSecretDiceSelection(secretDiceOptions.map((option) => option.id));
    setIsSecretDiceDialogOpen(true);
    setToolbarMessage('');
  }

  function selectAllSecretDice() {
    setSecretDiceSelection(secretDiceOptions.map((option) => option.id));
  }

  function clearSecretDiceSelection() {
    setSecretDiceSelection([]);
  }

  function toggleSecretDiceOption(id: string) {
    setSecretDiceSelection((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id],
    );
  }

  async function copySecretDiceToClipboard(templateKind: SecretDiceTemplateKind) {
    const text = serializeSecretDiceImport(
      characterClipboardSource,
      secretDiceSelection,
      templateKind,
    );

    await writeClipboardText(text);
    setIsSecretDiceDialogOpen(false);
    setToolbarMessage('');
  }

  function resetSheet() {
    if (gameSystem === 'insan') {
      setInsaneSheet(createInitialInsaneSheet());
      setToolbarMessage('');
      return;
    }

    setSheet(createInitialSheet(cocEdition));
    setGrowthMessage('');
    setGrowthResults([]);
    setToolbarMessage('');
  }

  const topbarTitle =
    gameSystem === 'insan'
      ? insaneSheet.basic.name || '새로운 봉마인'
      : sheet.basic.name || '새로운 탐사자';
  const insaneTopbarSanity = calculateInsaneEffectiveSanity(insaneSheet);
  const topbarSubtitle =
    gameSystem === 'insan'
      ? `${insaneSheet.basic.occupation || '직업 미정'} · 생명력 ${insaneSheet.vitals.life.current}/${insaneSheet.vitals.life.max} · 이성치 ${insaneTopbarSanity}/${insaneSheet.vitals.sanity.max}`
      : `${sheet.basic.occupation || '직업 미정'} · ${gameSystem === 'coc6' ? 'COC 6판' : 'COC 7판'} · SAN ${sanity.current}`;
  const pageTitle = activePage === 'usage' ? '사용방법' : topbarTitle;
  const pageSubtitle = activePage === 'usage' ? 'CCLog Sheet 안내' : topbarSubtitle;
  const brandMark = gameSystem === 'insan' ? 'IN' : gameSystem === 'coc6' ? 'C6' : 'CC';
  const activeOccupationFormulaLabels =
    cocEdition === 'coc6' ? coc6OccupationFormulaLabels : occupationFormulaLabels;

  return (
    <div className={`app-shell ${isSidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
      <aside className="sidebar" aria-label="시트 섹션" aria-hidden={!isSidebarOpen}>
        <div className="brand">
          <div className="brand-mark">{brandMark}</div>
          <div className="brand-copy">
            <div className="brand-title-row">
              <strong>CCLog Sheet</strong>
              <button
                type="button"
                className="brand-help-button"
                aria-label="사용방법 보기"
                title="사용방법"
                onClick={() => setActivePage('usage')}
              >
                <HelpCircle size={16} />
              </button>
            </div>
            <select
              className="game-system-select"
              aria-label="룰 선택"
              value={gameSystem}
              onChange={(event) => handleGameSystemChange(event.target.value as GameSystem)}
            >
              <option value="coc7">COC 7판</option>
              <option value="coc6">COC 6판</option>
              <option value="insan">InSane</option>
            </select>
          </div>
        </div>
        <nav>
          {gameSystem === 'insan' ? (
            <>
              <a href="#basic">
                <UserRound size={17} /> 봉마인정보
              </a>
              <a href="#insaneBasic2">
                <Sparkles size={17} /> 봉마인정보2
              </a>
              <a href="#stats">
                <Sparkles size={17} /> 특기
              </a>
              <a href="#skills">
                <BookOpen size={17} /> 아이템
              </a>
              <a href="#combat">
                <Shield size={17} /> 어빌리티
              </a>
              <a href="#story">
                <FileText size={17} /> 인물란
              </a>
              <a href="#scenarios">
                <Upload size={17} /> 세션
              </a>
              <a href="#memo">
                <FileText size={17} /> 메모
              </a>
            </>
          ) : (
            <>
              <a href="#basic">
                <UserRound size={17} /> 탐사자정보
              </a>
              <a href="#stats">
                <Sparkles size={17} /> 특성치
              </a>
              <a href="#skills">
                <BookOpen size={17} /> 기능치
              </a>
              <a href="#combat">
                <Shield size={17} /> 전투
              </a>
              <a href="#story">
                <FileText size={17} /> 백스토리
              </a>
              <a href="#scenarios">
                <Upload size={17} /> 세션
              </a>
              <a href="#memo">
                <FileText size={17} /> 메모
              </a>
            </>
          )}
        </nav>
      </aside>

      <main className="sheet-main">
        <header className="topbar">
          <div className="topbar-title">
            <button
              type="button"
              className="menu-toggle"
              aria-label={isSidebarOpen ? '사이드바 닫기' : '사이드바 열기'}
              aria-expanded={isSidebarOpen}
              onClick={toggleSidebar}
            >
              <Menu size={21} />
            </button>
            <div>
              <h1>{pageTitle}</h1>
              <p>{pageSubtitle}</p>
            </div>
          </div>
          {activePage === 'sheet' ? (
            <div className="toolbar" aria-label="시트 도구">
            {/*
            <button type="button" className="icon-button" onClick={rollStats} title="초기 특성치 굴림">
              <Dice6 size={18} />
              <span>굴림</span>
            </button>
            */}
            <button type="button" className="icon-button" onClick={exportJson} title="JSON 내보내기">
              <Download size={18} />
              <span>내보내기</span>
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={() => importInputRef.current?.click()}
              title="JSON 가져오기"
            >
              <FileInput size={18} />
              <span>가져오기</span>
            </button>
            <input ref={importInputRef} className="sr-only" type="file" accept="application/json" onChange={importJson} />
            <button
              type="button"
              className="icon-button"
              onClick={() => void copyCharacterToClipboard()}
              title="팔레트를 복사"
            >
              <Clipboard size={18} />
              <span>팔레트 복사</span>
            </button>
            {gameSystem === 'coc7' && (
              <button
                type="button"
                className="icon-button"
                onClick={openSecretDiceDialog}
                title="비밀 주사위를 복사"
              >
                <Dice6 size={18} />
                <span>비밀 주사위 복사</span>
              </button>
            )}
            {/* 저장됨 버튼은 기능치 확정 전까지 숨김. */}
            <button type="button" className="icon-button danger" onClick={resetSheet} title="초기화">
              <RotateCcw size={18} />
            </button>
            </div>
          ) : (
            <div className="toolbar" aria-label="사용방법 도구">
              <button type="button" className="icon-button" onClick={() => setActivePage('sheet')} title="시트로 돌아가기">
                <FileText size={18} />
                <span>시트로 돌아가기</span>
              </button>
            </div>
          )}
          {toolbarMessage && (
            <p className="topbar-message" role="status">
              {toolbarMessage}
            </p>
          )}
        </header>

        {isSecretDiceDialogOpen && (
          <SecretDiceDialog
            characterName={topbarTitle}
            options={secretDiceOptions}
            selectedIds={secretDiceSelection}
            onToggleOption={toggleSecretDiceOption}
            onSelectAll={selectAllSecretDice}
            onClearAll={clearSecretDiceSelection}
            onCopyNormal={() => void copySecretDiceToClipboard('normal')}
            onCopyBonus={() => void copySecretDiceToClipboard('bonus')}
            onClose={() => setIsSecretDiceDialogOpen(false)}
          />
        )}

        {isCocExportDialogOpen && (
          <CocExportDialog
            characterName={topbarTitle}
            editionLabel={gameSystem === 'coc6' ? 'COC 6판' : 'COC 7판'}
            onExportFull={() => exportCocJson('full')}
            onExportInvestedSkills={() => exportCocJson('investedSkills')}
            onExportCharacteristicsOnly={() => exportCocJson('characteristicsOnly')}
            onClose={() => setIsCocExportDialogOpen(false)}
          />
        )}

        {isInsaneAbilityPasswordDialogOpen && (
          <InsaneAbilityPasswordDialog
            value={insaneAbilityPasswordDraft}
            onChange={setInsaneAbilityPasswordDraft}
            onConfirm={confirmInsaneAbilityPassword}
            onCancel={cancelInsaneAbilityPassword}
          />
        )}

        {activePage === 'usage' ? (
          <UsageGuidePage />
        ) : (
        <div className="content-grid">
          {gameSystem === 'insan' ? (
            <InsaneSheetView
              sheet={insaneSheet}
              setSheet={setInsaneSheet}
              sectionOpen={sectionOpen}
              onToggle={toggleSection}
              abilityPresetImportLocked={isAbilityPresetImportLocked}
              insaneAbilityPresets={insaneAbilityPresets}
            />
          ) : (
            <>
          <CollapsibleSection
            sectionId="basic"
            className="basic-panel"
            icon={<UserRound size={20} />}
            title="탐사자정보"
            isOpen={sectionOpen.basic}
            onToggle={toggleSection}
          >
            <div className="basic-grid">
              <div className="portrait-box">
                {sheet.basic.imageUrl ? (
                  <img src={sheet.basic.imageUrl} alt="캐릭터 초상" />
                ) : (
                  <div className="portrait-placeholder">
                    <UserRound size={42} />
                    <span>Portrait</span>
                  </div>
                )}
              </div>
              <div className="field-grid">
                <TextField label="이름" value={sheet.basic.name} onChange={(value) => updateBasic('name', value)} />
                <TextField label="플레이어 이름" value={sheet.basic.player} onChange={(value) => updateBasic('player', value)} />
                <TextField label="직업" value={sheet.basic.occupation} onChange={(value) => updateBasic('occupation', value)} />
                <TextField label="나이" value={sheet.basic.age} onChange={(value) => updateBasic('age', value)} />
                <TextField label="성별" value={sheet.basic.gender} onChange={(value) => updateBasic('gender', value)} />
                <ColorField label="캐릭터 색상" value={sheet.basic.color} onChange={(value) => updateBasic('color', value)} />
                <TextField label="이미지 주소" value={sheet.basic.imageUrl} onChange={(value) => updateBasic('imageUrl', value)} wide />
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            sectionId="stats"
            className="stat-panel"
            icon={<Sparkles size={20} />}
            title={gameSystem === 'coc6' ? '특성치 (COC 6판)' : '특성치'}
            action={<button type="button" onClick={rollStats}><Dice6 size={16} /> 랜덤 다이스</button>}
            isOpen={sectionOpen.stats}
            onToggle={toggleSection}
          >
            <div className="stats-grid">
              {statOrder.map((key) => (
                <StatInput
                  key={key}
                  code={key}
                  label={statLabels[key]}
                  value={sheet.stats[key]}
                  edition={cocEdition}
                  onChange={(value) => updateStat(key, value)}
                />
              ))}
              <StatInput
                code="LUK"
                label="행운"
                value={sheet.stats.luck}
                edition={cocEdition}
                onChange={(value) => updateStat('luck', value)}
              />
            </div>
            <div className="derived-grid">
              <Metric label="체력" value={derived.hp} />
              <Metric label="마력" value={derived.mp} />
              {cocEdition === 'coc6' && <Metric label="행운" value={derived.luck} />}
              <Metric label="피해 보너스" value={derived.damageBonus} />
              {cocEdition === 'coc6' ? (
                <PairedMetric
                  label="아이디어 · 지식"
                  primaryLabel="아이디어"
                  primaryValue={clampPercent(sheet.stats.INT * 5)}
                  secondaryLabel="지식"
                  secondaryValue={clampPercent(sheet.stats.EDU * 5)}
                />
              ) : (
                <PairedMetric
                  label="이동력 · 체구"
                  primaryLabel="이동력"
                  primaryValue={derived.move}
                  secondaryLabel="체구"
                  secondaryValue={derived.build}
                />
              )}
            </div>
            <SanityMetric
              current={sanity.current}
              start={derived.san}
              temporaryInsanity={sanity.temporaryInsanity}
              indefiniteInsanity={sanity.indefiniteInsanity}
              onCurrentChange={(value) => updateSanity('current', value)}
              onTemporaryChange={(value) => updateSanity('temporaryInsanity', value)}
              onIndefiniteChange={(value) => updateSanity('indefiniteInsanity', value)}
            />
          </CollapsibleSection>

          <CollapsibleSection
            sectionId="skills"
            className="wide-panel"
            icon={<BookOpen size={20} />}
            title="기능치"
            action={<button type="button" onClick={addSkill}><Plus size={16} /> 기능치 추가</button>}
            isOpen={sectionOpen.skills}
            onToggle={toggleSection}
          >
            <div className="budget-row">
              <div className="interest-point-note">
                관심 포인트 {cocEdition === 'coc6' ? 'INT×10' : 'INT×2'}
              </div>
              <label>
                직업 포인트
                <select
                  value={sheet.occupationFormula}
                  onChange={(event) =>
                    setSheet((current) => ({
                      ...current,
                      occupationFormula: event.target.value as OccupationFormula,
                    }))
                  }
                >
                  {Object.entries(activeOccupationFormulaLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              {sheet.occupationFormula === 'manual' && (
                <label>
                  총점
                  <input
                    type="number"
                    value={sheet.manualOccupationTotal}
                    onChange={(event) =>
                      setSheet((current) => ({
                        ...current,
                        manualOccupationTotal: positiveNumber(Number(event.target.value)),
                      }))
                    }
                  />
                </label>
              )}
              <BudgetPill label="직업" total={budget.occupationTotal} spent={budget.occupationSpent} remaining={budget.occupationRemaining} />
              <BudgetPill label="관심" total={budget.interestTotal} spent={budget.interestSpent} remaining={budget.interestRemaining} />
              <button type="button" className="ghost-button" onClick={growCheckedSkills}>
                <Sparkles size={16} />
                성장 굴림 {checkedSkillCount > 0 ? checkedSkillCount : ''}
              </button>
            </div>
            {growthMessage && (
              <div className="growth-summary">
                <p className="status-line">{growthMessage}</p>
                {growthResults.length > 0 && (
                  <ul className="growth-results" aria-label="성장한 기능치 목록">
                    {growthResults.map((result) => (
                      <li key={result.id}>
                        <strong>{result.name}</strong>
                        <span>+{result.increase}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <div className="filter-row">
              <div className="search-field">
                <Search size={17} />
                <input value={skillSearch} placeholder="기능치 검색" onChange={(event) => setSkillSearch(event.target.value)} />
              </div>
              <div className="category-tabs">
                {skillCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    className={skillCategory === category ? 'active' : ''}
                    onClick={() => setSkillCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
            <div className="skill-table-mobile">
              <SkillTable
                skills={filteredSkills}
                stats={sheet.stats}
                onUpdateSkill={updateSkill}
                onRemoveSkill={removeSkill}
                activeSkillGroupId={activeSkillGroupId}
                specialtyDraft={specialtyDraft}
                onStartSpecialtySkill={startSpecialtySkill}
                onSpecialtyDraftChange={setSpecialtyDraft}
                onConfirmSpecialtySkill={confirmSpecialtySkill}
                onCancelSpecialtySkill={cancelSpecialtySkill}
              />
            </div>
            <div className="skill-table-desktop">
              {skillColumns.map((skills, index) => (
                <SkillTable
                  key={`skill-column-${index}`}
                  skills={skills}
                  stats={sheet.stats}
                  onUpdateSkill={updateSkill}
                  onRemoveSkill={removeSkill}
                  activeSkillGroupId={activeSkillGroupId}
                  specialtyDraft={specialtyDraft}
                  onStartSpecialtySkill={startSpecialtySkill}
                  onSpecialtyDraftChange={setSpecialtyDraft}
                  onConfirmSpecialtySkill={confirmSpecialtySkill}
                  onCancelSpecialtySkill={cancelSpecialtySkill}
                />
              ))}
            </div>
            <div className="skill-bottom-actions">
              <button type="button" onClick={addSkill}>
                <Plus size={16} /> 기능치 추가
              </button>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            sectionId="combat"
            className="wide-panel"
            icon={<Shield size={20} />}
            title="전투"
            isOpen={sectionOpen.combat}
            onToggle={toggleSection}
          >
            <div className="combat-tabs" role="tablist" aria-label="전투 분류">
              {([
                ['weapons', '무기'],
                ['armor', '방어구'],
                ['spells', '주문'],
              ] as [CombatTab, string][]).map(([tabId, label]) => (
                <button
                  key={tabId}
                  type="button"
                  className={combatTab === tabId ? 'active' : ''}
                  onClick={() => setCombatTab(tabId)}
                >
                  {label}
                </button>
              ))}
            </div>

            {combatTab === 'weapons' && (
              <div className="combat-pane">
                <div className="combat-pane-toolbar">
                  <div className="category-tabs weapon-category-tabs" aria-label="무기 종류">
                    {weaponCategories.map((category) => (
                      <button
                        key={category}
                        type="button"
                        className={weaponCategory === category ? 'active' : ''}
                        onClick={() => setWeaponCategory(category)}
                      >
                        {weaponCategoryLabels[category]}
                      </button>
                    ))}
                  </div>
                  <button type="button" onClick={addWeapon}>
                    <Plus size={16} /> 무기 추가
                  </button>
                </div>
                {visibleWeapons.length === 0 ? (
                  <p className="empty-line">등록된 무기가 없습니다.</p>
                ) : (
                  <div className="table-wrap">
                    <table className="weapon-table">
                      <thead>
                        {weaponCategory === 'melee' ? (
                          <tr>
                            <th>무기</th>
                            <th>기능치</th>
                            <th>피해</th>
                            <th aria-label="삭제" />
                          </tr>
                        ) : (
                          <tr>
                            <th>무기</th>
                            <th>기능치</th>
                            <th>피해</th>
                            <th>사거리</th>
                            <th>공격 횟수</th>
                            <th>탄환수</th>
                            <th>고장</th>
                            <th aria-label="삭제" />
                          </tr>
                        )}
                      </thead>
                      <tbody>
                        {visibleWeapons.map((weapon) => (
                          <tr key={weapon.id}>
                            <td>
                              <input
                                value={weapon.name}
                                readOnly={weapon.isDefault}
                                onChange={(event) => updateWeapon(weapon.id, 'name', event.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                value={weapon.skill}
                                readOnly={weapon.isDefault}
                                onChange={(event) => updateWeapon(weapon.id, 'skill', event.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                value={weapon.damage}
                                readOnly={weapon.isDefault}
                                onChange={(event) => updateWeapon(weapon.id, 'damage', event.target.value)}
                              />
                            </td>
                            {weaponCategory !== 'melee' && (
                              <>
                                <td>
                                  <input value={weapon.range} onChange={(event) => updateWeapon(weapon.id, 'range', event.target.value)} />
                                </td>
                                <td>
                                  <input value={weapon.attacks} onChange={(event) => updateWeapon(weapon.id, 'attacks', event.target.value)} />
                                </td>
                                <td>
                                  <input value={weapon.ammo} onChange={(event) => updateWeapon(weapon.id, 'ammo', event.target.value)} />
                                </td>
                                <td>
                                  <input value={weapon.malfunction} onChange={(event) => updateWeapon(weapon.id, 'malfunction', event.target.value)} />
                                </td>
                              </>
                            )}
                            <td>
                              {!weapon.isDefault && (
                                <button type="button" className="icon-only danger" onClick={() => removeWeapon(weapon.id)} title="무기 삭제">
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {combatTab === 'armor' && (
              <div className="combat-pane">
                <div className="combat-pane-toolbar">
                  <button type="button" onClick={addArmor}>
                    <Plus size={16} /> 방어구 추가
                  </button>
                </div>
                {sheet.armors.length === 0 ? (
                  <p className="empty-line">등록된 방어구가 없습니다.</p>
                ) : (
                  <div className="table-wrap">
                    <table className="armor-table">
                      <thead>
                        <tr>
                          <th>머리</th>
                          <th>몸</th>
                          <th>방어 데이터</th>
                          <th aria-label="삭제" />
                        </tr>
                      </thead>
                      <tbody>
                        {sheet.armors.map((armor) => (
                          <tr key={armor.id}>
                            <td>
                              <input value={armor.head} onChange={(event) => updateArmor(armor.id, 'head', event.target.value)} />
                            </td>
                            <td>
                              <input value={armor.body} onChange={(event) => updateArmor(armor.id, 'body', event.target.value)} />
                            </td>
                            <td>
                              <input value={armor.defense} onChange={(event) => updateArmor(armor.id, 'defense', event.target.value)} />
                            </td>
                            <td>
                              <button type="button" className="icon-only danger" onClick={() => removeArmor(armor.id)} title="방어구 삭제">
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {combatTab === 'spells' && (
              <div className="combat-pane">
                <div className="combat-pane-toolbar">
                  <button type="button" onClick={addSpell}>
                    <Plus size={16} /> 주문 추가
                  </button>
                </div>
                {sheet.spells.length === 0 ? (
                  <p className="empty-line">등록된 주문이 없습니다.</p>
                ) : (
                  <div className="table-wrap">
                    <table className="spell-table">
                      <thead>
                        <tr>
                          <th>주문 이름</th>
                          <th>비용</th>
                          <th>시전시간</th>
                          <th>설명</th>
                          <th aria-label="삭제" />
                        </tr>
                      </thead>
                      <tbody>
                        {sheet.spells.map((spell) => (
                          <tr key={spell.id}>
                            <td>
                              <input value={spell.name} onChange={(event) => updateSpell(spell.id, 'name', event.target.value)} />
                            </td>
                            <td>
                              <input value={spell.cost} onChange={(event) => updateSpell(spell.id, 'cost', event.target.value)} />
                            </td>
                            <td>
                              <input value={spell.castTime} onChange={(event) => updateSpell(spell.id, 'castTime', event.target.value)} />
                            </td>
                            <td>
                              <textarea value={spell.description} onChange={(event) => updateSpell(spell.id, 'description', event.target.value)} />
                            </td>
                            <td>
                              <button type="button" className="icon-only danger" onClick={() => removeSpell(spell.id)} title="주문 삭제">
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </CollapsibleSection>

          <CollapsibleSection
            sectionId="story"
            className="wide-panel"
            icon={<FileText size={20} />}
            title="백스토리"
            isOpen={sectionOpen.story}
            onToggle={toggleSection}
          >
            <div className="story-grid">
              {backstoryFields.map(([key, label]) => (
                <TextArea
                  key={key}
                  label={label}
                  value={sheet.backstory[key] ?? ''}
                  onChange={(value) =>
                    setSheet((current) => ({
                      ...current,
                      backstory: { ...current.backstory, [key]: value },
                    }))
                  }
                />
              ))}
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            sectionId="scenarios"
            className="wide-panel"
            icon={<Upload size={20} />}
            title="세션"
            action={<button type="button" onClick={addScenario}><Plus size={16} /> 세션 추가</button>}
            isOpen={sectionOpen.scenarios}
            onToggle={toggleSection}
          >
            <div className="scenario-list">
              {sheet.scenarios.length === 0 && !isScenarioDraftOpen && <p className="empty-line">기록된 세션이 없습니다.</p>}
              {sheet.scenarios.map((scenario) => (
                <div className="scenario-item" key={scenario.id}>
                  <ScenarioSummary label="룰" value={scenario.rule || '-'} />
                  <ScenarioSummary label="제목" value={scenario.title || '제목 없음'} strong />
                  <ScenarioSummary label="참여자" value={scenario.keeper || '-'} />
                  <ScenarioSummary label="종류" value={scenario.result || '-'} />
                  <ScenarioSummary label="보상" value={scenario.reward || '-'} />
                  <button type="button" className="icon-only danger" onClick={() => removeScenario(scenario.id)} title="세션 삭제">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              {isScenarioDraftOpen && (
                <div className="scenario-row">
                  <TextField label="룰" value={scenarioDraft.rule} onChange={(value) => updateScenarioDraft('rule', value)} />
                  <TextField label="제목" value={scenarioDraft.title} onChange={(value) => updateScenarioDraft('title', value)} />
                  <TextField label="참여자" value={scenarioDraft.keeper} onChange={(value) => updateScenarioDraft('keeper', value)} />
                  <TextField label="종류" value={scenarioDraft.result} placeholder="다인 & 타이만" onChange={(value) => updateScenarioDraft('result', value)} />
                  <TextField label="보상" value={scenarioDraft.reward} onChange={(value) => updateScenarioDraft('reward', value)} />
                  <div className="scenario-draft-actions">
                    <button
                      type="button"
                      className="icon-only"
                      onClick={completeScenario}
                      disabled={isScenarioDraftEmpty(scenarioDraft)}
                      title="입력 완료"
                    >
                      <Check size={15} />
                    </button>
                    <button type="button" className="icon-only" onClick={cancelScenarioDraft} title="취소">
                      <X size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            sectionId="memo"
            className="wide-panel"
            icon={<FileText size={20} />}
            title="메모"
            isOpen={sectionOpen.memo}
            onToggle={toggleSection}
          >
            <div className="memo-body">
              <TextArea label="내용" value={sheet.memo} onChange={(value) => setSheet((current) => ({ ...current, memo: value }))} tall />
            </div>
          </CollapsibleSection>
            </>
          )}
        </div>
        )}
      </main>
    </div>
  );
}

function UsageGuidePage() {
  const guideSections = [
    '기본 흐름',
    '입력 항목',
    '내보내기 / 가져오기',
    '자주 묻는 질문',
  ];

  return (
    <section className="usage-page" aria-labelledby="usage-guide-title">
      <div className="usage-page-header">
        <HelpCircle size={24} aria-hidden="true" />
        <div>
          <h2 id="usage-guide-title">사용방법</h2>
          <p>세부적인 사용방법을 정리하는 공간입니다.</p>
        </div>
      </div>
      <div className="usage-guide-grid">
        {guideSections.map((title) => (
          <article className="usage-guide-card" key={title}>
            <h3>{title}</h3>
            <p>세부 내용은 여기에 작성하세요.</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function CocExportDialog({
  characterName,
  editionLabel,
  onExportFull,
  onExportInvestedSkills,
  onExportCharacteristicsOnly,
  onClose,
}: {
  characterName: string;
  editionLabel: string;
  onExportFull: () => void;
  onExportInvestedSkills: () => void;
  onExportCharacteristicsOnly: () => void;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="coc-export-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="coc-export-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="secret-dice-header">
          <div>
            <h2 id="coc-export-title">COC 내보내기</h2>
            <strong className="secret-dice-character">
              {editionLabel} · {characterName}
            </strong>
          </div>
          <button type="button" className="icon-only" onClick={onClose} title="닫기">
            <X size={16} />
          </button>
        </header>

        <div className="coc-export-options">
          <button type="button" onClick={onExportFull}>
            <Download size={17} />
            <span>전체 내보내기</span>
          </button>
          <button type="button" onClick={onExportInvestedSkills}>
            <BookOpen size={17} />
            <span>투자 기능치만 내보내기</span>
          </button>
          <button type="button" onClick={onExportCharacteristicsOnly}>
            <Sparkles size={17} />
            <span>특성치만 내보내기</span>
          </button>
        </div>
      </section>
    </div>
  );
}

function SecretDiceDialog({
  characterName,
  options,
  selectedIds,
  onToggleOption,
  onSelectAll,
  onClearAll,
  onCopyNormal,
  onCopyBonus,
  onClose,
}: {
  characterName: string;
  options: SecretDiceRollOption[];
  selectedIds: string[];
  onToggleOption: (id: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onCopyNormal: () => void;
  onCopyBonus: () => void;
  onClose: () => void;
}) {
  const selectedIdSet = new Set(selectedIds);
  const statOptions = options.filter((option) => option.kind === 'stat');
  const skillOptions = options.filter((option) => option.kind === 'skill');

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="secret-dice-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="secret-dice-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="secret-dice-header">
          <div>
            <h2 id="secret-dice-title">비밀 주사위 복사</h2>
            <strong className="secret-dice-character">복사 대상 {characterName}</strong>
            <p>
              {selectedIds.length}/{options.length} 선택
            </p>
          </div>
          <button type="button" className="icon-only" onClick={onClose} title="닫기">
            <X size={16} />
          </button>
        </header>

        <div className="secret-dice-controls">
          <button type="button" onClick={onSelectAll}>
            <Check size={16} />
            전체 선택
          </button>
          <button type="button" onClick={onClearAll}>
            <X size={16} />
            전체 해제
          </button>
        </div>

        <div className="secret-dice-option-groups">
          <SecretDiceOptionGroup
            title="특성치"
            options={statOptions}
            selectedIdSet={selectedIdSet}
            onToggleOption={onToggleOption}
          />
          <SecretDiceOptionGroup
            title="기능치"
            options={skillOptions}
            selectedIdSet={selectedIdSet}
            onToggleOption={onToggleOption}
          />
        </div>

        <footer className="secret-dice-actions">
          <button type="button" onClick={onCopyNormal}>
            <Dice6 size={16} />
            일반 주사위 복사
          </button>
          <button type="button" onClick={onCopyBonus}>
            <Dice6 size={16} />
            보정 주사위 복사
          </button>
        </footer>
      </section>
    </div>
  );
}

function InsaneAbilityPasswordDialog({
  value,
  onChange,
  onConfirm,
  onCancel,
}: {
  value: string;
  onChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form
        className="insane-password-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="insane-password-title"
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm();
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="secret-dice-header">
          <div>
            <h2 id="insane-password-title">InSane 어빌리티 잠금</h2>
            <strong className="secret-dice-character">
              어빌리티 자동 불러오기 활성화(취소를 누르면 비활성화 됩니다.)
            </strong>
          </div>
          <button type="button" className="icon-only" onClick={onCancel} title="닫기">
            <X size={16} />
          </button>
        </header>

        <div className="insane-password-body">
          <label className="field">
            <span>룰북 구매확인 비밀번호(*룰북 92p 주석에 적힌 숫자와 + 블데 룰북 40P 플레이어 1명 기준 리미트 숫자를 합산한 문장을 적어주세요)</span>
            <input
              type="password"
              value={value}
              autoFocus
              onChange={(event) => onChange(event.target.value)}
            />
          </label>
        </div>

        <footer className="insane-password-actions">
          <button type="button" onClick={onCancel}>
            취소
          </button>
          <button type="submit">
            확인
          </button>
        </footer>
      </form>
    </div>
  );
}

function SecretDiceOptionGroup({
  title,
  options,
  selectedIdSet,
  onToggleOption,
}: {
  title: string;
  options: SecretDiceRollOption[];
  selectedIdSet: Set<string>;
  onToggleOption: (id: string) => void;
}) {
  return (
    <div className="secret-dice-group">
      <h3>{title}</h3>
      <div className="secret-dice-list">
        {options.map((option) => (
          <label className="secret-dice-option" key={option.id}>
            <input
              type="checkbox"
              checked={selectedIdSet.has(option.id)}
              onChange={() => onToggleOption(option.id)}
            />
            <strong>{option.label}</strong>
            <span>{option.value}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function loadSheet(): SheetState {
  try {
    const edition = getCocEdition(loadGameSystem());
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return createInitialSheet(edition);
    const parsed = JSON.parse(saved) as SheetStateArchive;
    return normalizeSheetState(parsed, edition);
  } catch {
    return createInitialSheet();
  }
}

function loadGameSystem(): GameSystem {
  try {
    const saved = window.localStorage.getItem(systemStorageKey);

    if (saved === 'insan' || saved === 'insane') return 'insan';
    if (saved === 'coc6') return 'coc6';
    return 'coc7';
  } catch {
    return 'coc7';
  }
}

function loadInsaneSheet(): InsaneSheetState {
  try {
    const saved = window.localStorage.getItem(insaneStorageKey);
    if (!saved) return createInitialInsaneSheet();
    return normalizeInsaneSheet(JSON.parse(saved));
  } catch {
    return createInitialInsaneSheet();
  }
}

function normalizeSheetState(
  parsed: SheetStateArchive,
  edition: CocEdition = 'coc7',
): SheetState {
  const fallback = createInitialSheet(edition);
  const { armor: legacyArmor, ...sheetValues } = parsed;
  const stats = normalizeStats({ ...fallback.stats, ...parsed.stats } as InvestigatorStats);
  const derived = calculateDerivedStats(stats, edition);

  return {
    ...fallback,
    ...sheetValues,
    basic: normalizeBasicInfo(parsed.basic),
    stats,
    sanity: normalizeSanityInfo(parsed.sanity, derived.san),
    skills: parsed.skills?.length ? normalizeStoredSkills(parsed.skills, stats, edition) : fallback.skills,
    backstory: { ...fallback.backstory, ...parsed.backstory },
    weapons: normalizeWeapons(parsed.weapons),
    armors: normalizeArmors(parsed.armors ?? legacyArmor),
    spells: normalizeSpells(parsed.spells),
    scenarios: normalizeScenarios(parsed.scenarios),
  };
}

function getCocEdition(gameSystem: GameSystem): CocEdition {
  return gameSystem === 'coc6' ? 'coc6' : 'coc7';
}

function isCocGameSystem(gameSystem: GameSystem): gameSystem is CocEdition {
  return gameSystem === 'coc7' || gameSystem === 'coc6';
}

function convertCocSheetEdition(
  sheet: SheetState,
  fromEdition: CocEdition,
  toEdition: CocEdition,
): SheetState {
  const stats = convertInvestigatorStats(sheet.stats, fromEdition, toEdition);
  const previousSanStart = calculateDerivedStats(sheet.stats, fromEdition).san;
  const nextSanStart = calculateDerivedStats(stats, toEdition).san;

  return {
    ...sheet,
    stats,
    sanity: syncSanityWithPow(sheet.sanity, previousSanStart, nextSanStart),
    skills: normalizeStoredSkills(sheet.skills, stats, toEdition),
  };
}

async function writeClipboardText(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall back for browsers that expose Clipboard API but reject writes.
    }
  }

  copyTextWithTextarea(text);
}

function copyTextWithTextarea(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  const copied = document.execCommand('copy');
  document.body.removeChild(textarea);

  return copied;
}

function InsaneSheetView({
  sheet,
  setSheet,
  sectionOpen,
  onToggle,
  abilityPresetImportLocked,
  insaneAbilityPresets,
}: {
  sheet: InsaneSheetState;
  setSheet: React.Dispatch<React.SetStateAction<InsaneSheetState>>;
  sectionOpen: ReturnType<typeof createInitialSectionOpenState>;
  onToggle: (sectionId: SheetSectionId) => void;
  abilityPresetImportLocked: boolean;
  insaneAbilityPresets: InsaneAbilityPreset[];
}) {
  function updateBasic(key: keyof InsaneSheetState['basic'], value: string | number) {
    setSheet((current) => ({
      ...current,
      basic: {
        ...current.basic,
        [key]: typeof value === 'number' ? positiveNumber(value) : value,
      },
    }));
  }

  function addInsanePortrait() {
    setSheet((current) => ({
      ...current,
      basic: {
        ...current.basic,
        extraImageUrls: [...current.basic.extraImageUrls, ''],
      },
    }));
  }

  function updateInsaneExtraImageUrl(index: number, value: string) {
    setSheet((current) => ({
      ...current,
      basic: {
        ...current.basic,
        extraImageUrls: current.basic.extraImageUrls.map((imageUrl, imageIndex) =>
          imageIndex === index ? value : imageUrl,
        ),
      },
    }));
  }

  function removeInsanePortrait(index: number) {
    setSheet((current) => ({
      ...current,
      basic: {
        ...current.basic,
        extraImageUrls: current.basic.extraImageUrls.filter((_, imageIndex) => imageIndex !== index),
      },
    }));
  }

  function updateVital(
    group: keyof InsaneSheetState['vitals'],
    key: 'current' | 'max',
    value: number,
  ) {
    setSheet((current) => ({
      ...current,
      vitals: {
        ...current.vitals,
        [group]: {
          ...current.vitals[group],
          [key]: positiveNumber(value),
        },
      },
    }));
  }

  function updateLifeCondition(key: 'incapacitated' | 'dead', value: boolean) {
    setSheet((current) => ({
      ...current,
      vitals: {
        ...current.vitals,
        life: {
          ...current.vitals.life,
          [key]: value,
        },
      },
    }));
  }

  function updateSanityCondition(key: 'confused', value: boolean) {
    setSheet((current) => ({
      ...current,
      vitals: {
        ...current.vitals,
        sanity: {
          ...current.vitals.sanity,
          [key]: value,
        },
      },
    }));
  }

  function updateSpecialty(
    name: string,
    key: keyof InsaneSheetState['skills'][string],
    value: boolean | number,
  ) {
    setSheet((current) => ({
      ...current,
      skills: {
        ...current.skills,
        [name]: {
          ...current.skills[name],
          [key]: typeof value === 'number' ? Math.min(12, Math.max(5, positiveNumber(value))) : value,
        },
      },
    }));
  }

  function rollRandomInsaneSetup() {
    setSheet((current) => rollInsaneRandomSetup(current));
  }

  function addRelationship() {
    setSheet((current) => ({
      ...current,
      relationships: [
        ...current.relationships,
        {
          id: createId('relationship'),
          name: '',
          place: '',
          secret: '',
          emotion: '',
          emotionSign: '＋',
        },
      ],
    }));
  }

  function updateRelationship(
    id: string,
    key: keyof InsaneRelationship,
    value: string,
  ) {
    setSheet((current) => ({
      ...current,
      relationships: current.relationships.map((relationship) =>
        relationship.id === id ? { ...relationship, [key]: value } : relationship,
      ),
    }));
  }

  function removeRelationship(id: string) {
    setSheet((current) => ({
      ...current,
      relationships: current.relationships.filter((relationship) => relationship.id !== id),
    }));
  }

  function updateItem(key: 'painkiller' | 'weapon' | 'charm', value: number) {
    setSheet((current) => ({
      ...current,
      items: {
        ...current.items,
        [key]: positiveNumber(value),
      },
    }));
  }

  function addScpAbility() {
    setSheet((current) => ({
      ...current,
      items: {
        ...current.items,
        scpAbilities: [
          ...current.items.scpAbilities,
          {
            id: createId('scp-ability'),
            name: '',
            effect: '',
          },
        ],
      },
    }));
  }

  function updateScpAbility(id: string, key: keyof InsaneScpAbility, value: string) {
    setSheet((current) => ({
      ...current,
      items: {
        ...current.items,
        scpAbilities: current.items.scpAbilities.map((ability) =>
          ability.id === id ? { ...ability, [key]: value } : ability,
        ),
      },
    }));
  }

  function removeScpAbility(id: string) {
    setSheet((current) => ({
      ...current,
      items: {
        ...current.items,
        scpAbilities: current.items.scpAbilities.filter((ability) => ability.id !== id),
      },
    }));
  }

  function addAbility() {
    setSheet((current) => ({
      ...current,
      abilities: [
        ...current.abilities,
        {
          id: createId('ability'),
          name: '',
          type: '서포트',
          specialty: '',
          effect: '',
        },
      ],
    }));
  }

  function updateAbilityName(id: string, value: string) {
    setSheet((current) => ({
      ...current,
      abilities: current.abilities.map((ability) => {
        if (ability.id !== id) return ability;

        return renameInsaneAbilityWithPreset(ability, value, !abilityPresetImportLocked);
      }),
    }));
  }

  function updateAbility(id: string, key: keyof InsaneAbility, value: string) {
    setSheet((current) => ({
      ...current,
      abilities: current.abilities.map((ability) =>
        ability.id === id ? { ...ability, [key]: value } : ability,
      ),
    }));
  }

  function removeAbility(id: string) {
    setSheet((current) => ({
      ...current,
      abilities: current.abilities.filter((ability) => ability.id !== id || isDefaultInsaneAbility(ability)),
    }));
  }

  function addSession() {
    setSheet((current) => ({
      ...current,
      sessions: [
        ...current.sessions,
        {
          id: createId('session'),
          date: '',
          title: '',
          pcNumber: '',
          merit: '',
          note: '',
        },
      ],
    }));
  }

  function updateSession(id: string, key: keyof InsaneSession, value: string) {
    setSheet((current) => ({
      ...current,
      sessions: current.sessions.map((session) =>
        session.id === id ? { ...session, [key]: value } : session,
      ),
    }));
  }

  function removeSession(id: string) {
    setSheet((current) => ({
      ...current,
      sessions: current.sessions.filter((session) => session.id !== id),
    }));
  }

  const sanityPenalty = calculateInsaneSanityPenalty(sheet);
  const effectiveSanity = calculateInsaneEffectiveSanity(sheet);
  const insanePortraitItems = [
    ...(sheet.basic.imageUrl.trim()
      ? [{ imageUrl: sheet.basic.imageUrl.trim(), label: '대표', alt: '봉마인 대표 이미지' }]
      : []),
    ...sheet.basic.extraImageUrls
      .map((imageUrl, index) => ({
        imageUrl: imageUrl.trim(),
        label: `추가 ${index + 1}`,
        alt: `봉마인 추가 이미지 ${index + 1}`,
      }))
      .filter((item) => item.imageUrl),
  ];

  return (
    <>
      <CollapsibleSection
        sectionId="basic"
        className="basic-panel insane-basic-panel"
        icon={<UserRound size={20} />}
        title="봉마인 정보"
        isOpen={sectionOpen.basic}
        onToggle={onToggle}
      >
        <div className="basic-grid">
          <div className="portrait-box insane-portrait-box">
            {insanePortraitItems.length > 0 ? (
              <div className="insane-portrait-strip" aria-label="등록된 포트레이트">
                {insanePortraitItems.map((item, index) => (
                  <figure className="insane-portrait-frame" key={`${item.label}-${item.imageUrl}-${index}`}>
                    <img src={item.imageUrl} alt={item.alt} />
                    <figcaption>{item.label}</figcaption>
                  </figure>
                ))}
              </div>
            ) : (
              <div className="portrait-placeholder">
                <UserRound size={42} />
                <span>Portrait</span>
              </div>
            )}
          </div>
          <div className="field-grid">
            <TextField label="이름" value={sheet.basic.name} onChange={(value) => updateBasic('name', value)} />
            <TextField label="플레이어 이름" value={sheet.basic.player} onChange={(value) => updateBasic('player', value)} />
            <TextField label="직업" value={sheet.basic.occupation} onChange={(value) => updateBasic('occupation', value)} />
            <TextField label="나이" value={sheet.basic.age} onChange={(value) => updateBasic('age', value)} />
            <TextField label="성별" value={sheet.basic.gender} onChange={(value) => updateBasic('gender', value)} />
            <ColorField label="캐릭터 색상" value={sheet.basic.color} onChange={(value) => updateBasic('color', value)} />
            <div className="field insane-portrait-url-field wide">
              <div className="field-label-row">
                <span>이미지 주소</span>
                <button type="button" onClick={addInsanePortrait}>
                  +add
                </button>
              </div>
              <input value={sheet.basic.imageUrl} onChange={(event) => updateBasic('imageUrl', event.target.value)} />
              {sheet.basic.extraImageUrls.map((imageUrl, index) => (
                <div className="insane-extra-portrait-row" key={`extra-portrait-${index}`}>
                  <input
                    aria-label={`추가 이미지 주소 ${index + 1}`}
                    value={imageUrl}
                    onChange={(event) => updateInsaneExtraImageUrl(index, event.target.value)}
                  />
                  <button
                    type="button"
                    className="icon-only danger"
                    onClick={() => removeInsanePortrait(index)}
                    title="추가 이미지 주소 삭제"
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        sectionId="insaneBasic2"
        className="stat-panel insane-basic-details-panel"
        icon={<Sparkles size={20} />}
        title="봉마인 정보2"
        isOpen={sectionOpen.insaneBasic2}
        onToggle={onToggle}
      >
        <div className="insane-vitals-grid">
          <VitalField
            label="생명력"
            current={sheet.vitals.life.current}
            max={sheet.vitals.life.max}
            onCurrentChange={(value) => updateVital('life', 'current', value)}
            onMaxChange={(value) => updateVital('life', 'max', value)}
            checks={[
              {
                label: '행동불능',
                checked: sheet.vitals.life.incapacitated,
                onChange: (value) => updateLifeCondition('incapacitated', value),
              },
              {
                label: '사망',
                checked: sheet.vitals.life.dead,
                onChange: (value) => updateLifeCondition('dead', value),
              },
            ]}
          />
          <VitalField
            label="이성치"
            current={effectiveSanity}
            max={sheet.vitals.sanity.max}
            note={sanityPenalty > 0 ? `괴이 특기 -${sanityPenalty}` : undefined}
            onCurrentChange={(value) => updateVital('sanity', 'current', value + sanityPenalty)}
            onMaxChange={(value) => updateVital('sanity', 'max', value)}
            checks={[
              {
                label: '착란',
                checked: sheet.vitals.sanity.confused,
                onChange: (value) => updateSanityCondition('confused', value),
              },
            ]}
          />
        </div>
        <div className="insane-merit-row">
          <NumberField label="공적점" value={sheet.basic.merit} onChange={(value) => updateBasic('merit', value)} />
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        sectionId="stats"
        className="wide-panel"
        icon={<Sparkles size={20} />}
        title="특기"
        isOpen={sectionOpen.stats}
        onToggle={onToggle}
      >
        <div className="insane-specialty-controls">
          <label>
            <span>호기심</span>
            <select
              value={sheet.curiosity}
              onChange={(event) =>
                setSheet((current) => ({ ...current, curiosity: event.target.value }))
              }
            >
              <option value="">선택</option>
              {insaneSkillCategories.map((category) => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>공포심</span>
            <select
              value={sheet.fear}
              onChange={(event) => setSheet((current) => ({ ...current, fear: event.target.value }))}
            >
              <option value="">선택</option>
              {insaneSpecialtyNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="insane-roll-button" onClick={rollRandomInsaneSetup}>
            <Dice6 size={16} /> 랜덤 다이스
          </button>
        </div>
        <div className="table-wrap insane-specialty-wrap">
          <table className="insane-specialty-table">
            <thead>
              <tr>
                {insaneSkillCategories.map((category) => (
                  <th
                    key={category.id}
                    className={category.name === sheet.curiosity ? 'curiosity-gap-column' : undefined}
                  >
                    {category.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 11 }, (_, rowIndex) => (
                <tr key={`specialty-row-${rowIndex}`}>
                  {insaneSkillCategories.map((category) => {
                    const name = category.skills[rowIndex];
                    const specialty = sheet.skills[name];
                    const hasCuriosityGap = category.name === sheet.curiosity;
                    const hasFearMark = name === sheet.fear;
                    const target = calculateInsaneSpecialtyTarget(sheet, name);
                    const cellClassName = [
                      hasCuriosityGap ? 'curiosity-gap-column' : '',
                      hasFearMark ? 'fear-specialty-cell' : '',
                    ].filter(Boolean).join(' ');

                    return (
                      <td key={name} className={cellClassName || undefined}>
                        <label className="insane-specialty-cell">
                          <input
                            type="checkbox"
                            checked={specialty.checked}
                            onChange={(event) => updateSpecialty(name, 'checked', event.target.checked)}
                          />
                          <span>{name}</span>
                          <input
                            type="number"
                            min={5}
                            max={12}
                            value={target}
                            aria-label={`${name} 목표치`}
                            readOnly
                          />
                        </label>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        sectionId="skills"
        className="wide-panel"
        icon={<BookOpen size={20} />}
        title="아이템"
        isOpen={sectionOpen.skills}
        onToggle={onToggle}
      >
        <div className="insane-items-grid">
          <NumberField label="진통제" value={sheet.items.painkiller} onChange={(value) => updateItem('painkiller', value)} />
          <NumberField label="무기" value={sheet.items.weapon} onChange={(value) => updateItem('weapon', value)} />
          <NumberField label="부적" value={sheet.items.charm} onChange={(value) => updateItem('charm', value)} />
        </div>
        {/* SCP 능력치
        <div className="combat-pane">
          <div className="combat-pane-toolbar">
            <strong>SCP 능력치</strong>
            <button type="button" onClick={addScpAbility}>
              <Plus size={16} /> SCP 추가
            </button>
          </div>
          {sheet.items.scpAbilities.length === 0 ? (
            <p className="empty-line">등록된 SCP 능력치가 없습니다.</p>
          ) : (
            <div className="table-wrap">
              <table className="insane-scp-table">
                <thead>
                  <tr>
                    <th>이름</th>
                    <th>효과</th>
                    <th aria-label="삭제" />
                  </tr>
                </thead>
                <tbody>
                  {sheet.items.scpAbilities.map((ability) => (
                    <tr key={ability.id}>
                      <td>
                        <input
                          value={ability.name}
                          onChange={(event) => updateScpAbility(ability.id, 'name', event.target.value)}
                        />
                      </td>
                      <td>
                        <textarea
                          value={ability.effect}
                          onChange={(event) => updateScpAbility(ability.id, 'effect', event.target.value)}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="icon-only danger"
                          onClick={() => removeScpAbility(ability.id)}
                          title="SCP 능력치 삭제"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        */}
      </CollapsibleSection>

      <CollapsibleSection
        sectionId="combat"
        className="wide-panel"
        icon={<Shield size={20} />}
        title="어빌리티"
        action={<button type="button" onClick={addAbility}><Plus size={16} /> 어빌리티 추가</button>}
        isOpen={sectionOpen.combat}
        onToggle={onToggle}
      >
        <div className="scenario-list">
          {!abilityPresetImportLocked && (
            <datalist id="insane-ability-presets">
              {insaneAbilityPresets.map((preset) => (
                <option key={`${preset.category}-${preset.name}-${preset.id}`} value={preset.name}>
                  {preset.category} · {preset.type}
                </option>
              ))}
            </datalist>
          )}
          {sheet.abilities.map((ability) => (
            <div className="scenario-item insane-ability-item" key={ability.id}>
              <label className="field">
                <span>어빌리티명</span>
                <input
                  list={abilityPresetImportLocked ? undefined : 'insane-ability-presets'}
                  value={ability.name}
                  onChange={(event) => updateAbilityName(ability.id, event.target.value)}
                />
              </label>
              <label className="field">
                <span>타입</span>
                <select value={ability.type} onChange={(event) => updateAbility(ability.id, 'type', event.target.value)}>
                  <option value="">선택</option>
                  <option value="공격">공격</option>
                  <option value="서포트">서포트</option>
                  <option value="장비">장비</option>
                </select>
              </label>
              {ability.name.trim() === '기본공격' ? (
                <label className="field">
                  <span>특기</span>
                  <select
                    value={ability.specialty}
                    onChange={(event) => updateAbility(ability.id, 'specialty', event.target.value)}
                  >
                    <option value="">선택</option>
                    {insaneSpecialtyNames.map((specialtyName) => (
                      <option key={specialtyName} value={specialtyName}>
                        {specialtyName}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <TextField label="특기" value={ability.specialty} onChange={(value) => updateAbility(ability.id, 'specialty', value)} />
              )}
              <TextArea label="효과" value={ability.effect} onChange={(value) => updateAbility(ability.id, 'effect', value)} />
              {!isDefaultInsaneAbility(ability) ? (
                <button type="button" className="icon-only danger" onClick={() => removeAbility(ability.id)} title="어빌리티 삭제">
                  <Trash2 size={15} />
                </button>
              ) : (
                <span className="icon-only-placeholder" aria-hidden="true" />
              )}
            </div>
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        sectionId="story"
        className="wide-panel"
        icon={<FileText size={20} />}
        title="인물란"
        action={<button type="button" onClick={addRelationship}><Plus size={16} /> 인물 추가</button>}
        isOpen={sectionOpen.story}
        onToggle={onToggle}
      >
        <div className="scenario-list">
          {sheet.relationships.length === 0 && <p className="empty-line">등록된 인물이 없습니다.</p>}
          {sheet.relationships.map((relationship) => (
            <div className="scenario-item" key={relationship.id}>
              <TextField label="인물란" value={relationship.name} onChange={(value) => updateRelationship(relationship.id, 'name', value)} />
              <TextField label="거처" value={relationship.place} onChange={(value) => updateRelationship(relationship.id, 'place', value)} />
              <TextField label="비밀" value={relationship.secret} onChange={(value) => updateRelationship(relationship.id, 'secret', value)} />
              <TextField label="감정" value={relationship.emotion} onChange={(value) => updateRelationship(relationship.id, 'emotion', value)} />
              <label className="field">
                <span>＋/－</span>
                <select
                  value={relationship.emotionSign}
                  onChange={(event) => updateRelationship(relationship.id, 'emotionSign', event.target.value)}
                >
                  <option value="＋">＋</option>
                  <option value="－">－</option>
                </select>
              </label>
              <button type="button" className="icon-only danger" onClick={() => removeRelationship(relationship.id)} title="인물 삭제">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        sectionId="scenarios"
        className="wide-panel"
        icon={<Upload size={20} />}
        title="세션"
        action={<button type="button" onClick={addSession}><Plus size={16} /> 세션 추가</button>}
        isOpen={sectionOpen.scenarios}
        onToggle={onToggle}
      >
        <div className="scenario-list">
          {sheet.sessions.length === 0 && <p className="empty-line">기록된 세션이 없습니다.</p>}
          {sheet.sessions.map((session) => (
            <div className="scenario-item" key={session.id}>
              <TextField label="날짜" value={session.date} onChange={(value) => updateSession(session.id, 'date', value)} />
              <TextField label="시나리오명" value={session.title} onChange={(value) => updateSession(session.id, 'title', value)} />
              <TextField label="PC번호" value={session.pcNumber} onChange={(value) => updateSession(session.id, 'pcNumber', value)} />
              <TextField label="공적점" value={session.merit} onChange={(value) => updateSession(session.id, 'merit', value)} />
              <TextField label="비고" value={session.note} onChange={(value) => updateSession(session.id, 'note', value)} />
              <button type="button" className="icon-only danger" onClick={() => removeSession(session.id)} title="세션 삭제">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        sectionId="memo"
        className="wide-panel"
        icon={<FileText size={20} />}
        title="메모"
        isOpen={sectionOpen.memo}
        onToggle={onToggle}
      >
        <div className="memo-body">
          <TextArea
            label="내용"
            value={sheet.memo}
            onChange={(value) => setSheet((current) => ({ ...current, memo: value }))}
            tall
          />
        </div>
      </CollapsibleSection>
    </>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type="number" min={0} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function VitalField({
  label,
  current,
  max,
  note,
  checks,
  onCurrentChange,
  onMaxChange,
}: {
  label: string;
  current: number;
  max: number;
  note?: string;
  checks?: {
    label: string;
    checked: boolean;
    onChange: (value: boolean) => void;
  }[];
  onCurrentChange: (value: number) => void;
  onMaxChange: (value: number) => void;
}) {
  return (
    <div className="insane-vital-card">
      <span>{label}</span>
      <label>
        현재
        <input type="number" min={0} value={current} onChange={(event) => onCurrentChange(Number(event.target.value))} />
      </label>
      <label>
        최대
        <input type="number" min={0} value={max} onChange={(event) => onMaxChange(Number(event.target.value))} />
      </label>
      {note && <p className="insane-vital-note">{note}</p>}
      {checks && checks.length > 0 && (
        <div className="insane-vital-checks">
          {checks.map((check) => (
            <label key={check.label}>
              <input
                type="checkbox"
                checked={check.checked}
                onChange={(event) => check.onChange(event.target.checked)}
              />
              {check.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function CollapsibleSection({
  sectionId,
  className,
  icon,
  title,
  action,
  isOpen,
  onToggle,
  children,
}: {
  sectionId: SheetSectionId;
  className?: string;
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
  isOpen: boolean;
  onToggle: (sectionId: SheetSectionId) => void;
  children: React.ReactNode;
}) {
  const contentId = `${sectionId}-content`;

  return (
    <section
      className={`panel ${className ?? ''} ${isOpen ? 'is-open' : 'is-collapsed'}`}
      id={sectionId}
      data-section={sectionId}
    >
      <SectionTitle
        icon={icon}
        title={title}
        action={action}
        contentId={contentId}
        isOpen={isOpen}
        onToggle={() => onToggle(sectionId)}
      />
      {isOpen && (
        <div className="section-content" id={contentId}>
          {children}
        </div>
      )}
    </section>
  );
}

function SectionTitle({
  icon,
  title,
  action,
  contentId,
  isOpen,
  onToggle,
}: {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
  contentId: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="section-title">
      <h2>
        <button
          type="button"
          className="section-toggle"
          aria-expanded={isOpen}
          aria-controls={contentId}
          onClick={onToggle}
        >
          <span className="section-heading-label">
            {icon}
            {title}
          </span>
          <ChevronDown className="section-chevron" size={18} aria-hidden="true" />
        </button>
      </h2>
      {isOpen && action && <div className="section-actions">{action}</div>}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  readOnly,
  placeholder,
  wide,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  wide?: boolean;
}) {
  return (
    <label className={`field ${wide ? 'wide' : ''}`}>
      <span>{label}</span>
      <input
        value={value}
        readOnly={readOnly}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const pickerValue = normalizeColorPickerValue(value);

  return (
    <label className="field color-field">
      <span>{label}</span>
      <div className="color-field-control">
        <input value={value} placeholder={colorPickerFallback} onChange={(event) => onChange(event.target.value)} />
        <input
          type="color"
          aria-label={`${label} 선택`}
          value={pickerValue}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </label>
  );
}

function normalizeColorPickerValue(value: string): string {
  return /^#[0-9a-f]{6}$/i.test(value.trim()) ? value.trim() : colorPickerFallback;
}

function TextArea({
  label,
  value,
  onChange,
  readOnly,
  tall,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  tall?: boolean;
}) {
  return (
    <label className={`field textarea-field ${tall ? 'tall' : ''}`}>
      <span>{label}</span>
      <textarea value={value} readOnly={readOnly} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function ScenarioSummary({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="scenario-summary">
      <span>{label}</span>
      {strong ? <strong>{value}</strong> : <p>{value}</p>}
    </div>
  );
}

function StatInput({
  code,
  label,
  value,
  edition,
  onChange,
  readOnly,
}: {
  code: string;
  label: string;
  value: number;
  edition: CocEdition;
  onChange: (value: string) => void;
  readOnly?: boolean;
}) {
  return (
    <label className="stat-card">
      <span>{code}</span>
      <strong>{label}</strong>
      <input type="number" min={0} max={99} value={value} readOnly={readOnly} onChange={(event) => onChange(event.target.value)} />
      <small>{edition === 'coc6' ? `판정 ${clampPercent(value * 5)}` : `${half(value)} / ${fifth(value)}`}</small>
    </label>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PairedMetric({
  label,
  primaryLabel,
  primaryValue,
  secondaryLabel,
  secondaryValue,
}: {
  label: string;
  primaryLabel: string;
  primaryValue: number | string;
  secondaryLabel: string;
  secondaryValue: number | string;
}) {
  return (
    <div className="paired-metric">
      <span>{label}</span>
      <div className="paired-metric-values">
        <strong>
          <small>{primaryLabel}</small>
          {primaryValue}
        </strong>
        <strong>
          <small>{secondaryLabel}</small>
          {secondaryValue}
        </strong>
      </div>
    </div>
  );
}

function SkillTable({
  skills,
  stats,
  onUpdateSkill,
  onRemoveSkill,
  activeSkillGroupId,
  specialtyDraft,
  onStartSpecialtySkill,
  onSpecialtyDraftChange,
  onConfirmSpecialtySkill,
  onCancelSpecialtySkill,
}: {
  skills: SheetSkill[];
  stats: InvestigatorStats;
  onUpdateSkill: (id: string, key: keyof SheetSkill, value: number | boolean | string) => void;
  onRemoveSkill: (id: string) => void;
  activeSkillGroupId: string | null;
  specialtyDraft: string;
  onStartSpecialtySkill: (parentId: string) => void;
  onSpecialtyDraftChange: (value: string) => void;
  onConfirmSpecialtySkill: (parentSkill: SheetSkill) => void;
  onCancelSpecialtySkill: () => void;
}) {
  return (
    <div className="table-wrap skill-table-wrap">
      <table className="skill-table">
        <thead>
          <tr>
            <th>성장</th>
            <th>기능치명</th>
            <th>기본</th>
            <th>직업</th>
            <th>관심</th>
            <th>성장</th>
            <th>기타</th>
            <th>합계</th>
            <th aria-label="삭제" />
          </tr>
        </thead>
        <tbody>
          {skills.map((skill) => {
            if (isSkillGroup(skill)) {
              const isAddingSpecialty = activeSkillGroupId === skill.id;

              return (
                <tr key={skill.id} className="skill-group-row">
                  <td aria-hidden="true" />
                  <td>
                    <div className="skill-group-title">
                      <span>{skill.name}</span>
                      <button
                        type="button"
                        className="icon-only skill-group-add"
                        onClick={() => onStartSpecialtySkill(skill.id)}
                        title={`${skill.name} 하위 기능치 추가`}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    {isAddingSpecialty && (
                      <div className="skill-specialty-form">
                        <input
                          value={specialtyDraft}
                          placeholder="하위 기능치명"
                          onChange={(event) => onSpecialtyDraftChange(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              onConfirmSpecialtySkill(skill);
                            }
                            if (event.key === 'Escape') {
                              onCancelSpecialtySkill();
                            }
                          }}
                          autoFocus
                        />
                        <button
                          type="button"
                          className="icon-only"
                          onClick={() => onConfirmSpecialtySkill(skill)}
                          title="하위 기능치 추가"
                        >
                          <Check size={15} />
                        </button>
                        <button
                          type="button"
                          className="icon-only"
                          onClick={onCancelSpecialtySkill}
                          title="취소"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="skill-group-empty" colSpan={7} />
                </tr>
              );
            }

            const base = resolveSkillBase(skill, stats);
            const total = calculateSkillTotal(skill, stats);

            return (
              <tr key={skill.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={skill.checked}
                    onChange={(event) => onUpdateSkill(skill.id, 'checked', event.target.checked)}
                  />
                </td>
                <td>
                  {skill.custom && !skill.parentId ? (
                    <input value={skill.name} onChange={(event) => onUpdateSkill(skill.id, 'name', event.target.value)} />
                  ) : (
                    <span className={skill.parentId ? 'skill-child-name' : undefined}>{skill.name}</span>
                  )}
                </td>
                <td className="readonly-number">{base}</td>
                <td>
                  <NumberCell value={skill.occupation} onChange={(value) => onUpdateSkill(skill.id, 'occupation', value)} />
                </td>
                <td>
                  <NumberCell value={skill.interest} onChange={(value) => onUpdateSkill(skill.id, 'interest', value)} />
                </td>
                <td>
                  <NumberCell value={skill.growth} onChange={(value) => onUpdateSkill(skill.id, 'growth', value)} />
                </td>
                <td>
                  <NumberCell value={skill.other ?? 0} onChange={(value) => onUpdateSkill(skill.id, 'other', value)} />
                </td>
                <td className="total-cell">{total}</td>
                <td>
                  {skill.custom && (
                    <button type="button" className="icon-only danger" onClick={() => onRemoveSkill(skill.id)} title="기능치 삭제">
                      <Trash2 size={15} />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SanityMetric({
  current,
  start,
  temporaryInsanity,
  indefiniteInsanity,
  readOnly,
  onCurrentChange,
  onTemporaryChange,
  onIndefiniteChange,
}: {
  current: number;
  start: number;
  temporaryInsanity: boolean;
  indefiniteInsanity: boolean;
  readOnly?: boolean;
  onCurrentChange: (value: number) => void;
  onTemporaryChange: (value: boolean) => void;
  onIndefiniteChange: (value: boolean) => void;
}) {
  return (
    <div className="sanity-card">
      <div className="sanity-card-title">이성</div>
      <div className="sanity-values">
        <output aria-label="현재 이성의 4/5">{fourFifths(current)}</output>
        <input
          type="number"
          min={0}
          max={99}
          value={current}
          readOnly={readOnly}
          aria-label="현재 이성"
          onChange={(event) => onCurrentChange(Number(event.target.value))}
        />
        <span>현재</span>
        <output aria-label="시작 이성">{start}</output>
        <span>시작</span>
      </div>
      <div className="sanity-checks">
        <label>
          <input
            type="checkbox"
            checked={temporaryInsanity}
            disabled={readOnly}
            onChange={(event) => onTemporaryChange(event.target.checked)}
          />
          일시적
        </label>
        <label>
          <input
            type="checkbox"
            checked={indefiniteInsanity}
            disabled={readOnly}
            onChange={(event) => onIndefiniteChange(event.target.checked)}
          />
          장기적 광기
        </label>
      </div>
    </div>
  );
}

function BudgetPill({
  label,
  total,
  spent,
  remaining,
}: {
  label: string;
  total: number;
  spent: number;
  remaining: number;
}) {
  return (
    <div className={`budget-pill ${remaining < 0 ? 'over' : ''}`}>
      <span>{label}</span>
      <strong>
        {spent}/{total}
      </strong>
      <em>{remaining}</em>
    </div>
  );
}

function NumberCell({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <input
      type="number"
      min={0}
      max={99}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(clampPercent(Number(event.target.value)))}
    />
  );
}

export default App;
