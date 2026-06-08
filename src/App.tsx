import {
  BookOpen,
  Check,
  ChevronDown,
  Clipboard,
  Dice6,
  Download,
  FileInput,
  FileText,
  ImagePlus,
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
import { ChangeEvent, Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  createInitialSkills,
  createSpecialtySkill,
  normalizeStoredSkills,
  skillCategories,
  sortSkillsByKoreanName,
} from './data/skills';
import {
  buildCharacterClipboardPayload,
  serializeCharacterClipboardPayload,
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
  BasicInfo,
  createDefaultBasicInfo,
  createDefaultSanityInfo,
  normalizeBasicInfo,
  normalizeSanityInfo,
  SanityInfo,
  syncSanityWithPow,
} from './lib/sheet';
import { parseSheetArchive, serializeSheetArchive } from './lib/sheetArchive';
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

const storageKey = 'cclog-sheet:v1';
const statOrder: StatKey[] = ['STR', 'CON', 'POW', 'DEX', 'APP', 'SIZ', 'INT', 'EDU'];

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

function createInitialSheet(): SheetState {
  const stats = defaultStats;
  return {
    basic: createDefaultBasicInfo(),
    stats,
    sanity: createDefaultSanityInfo(stats.POW),
    skills: createInitialSkills(stats),
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
  const [sheet, setSheet] = useState<SheetState>(() => loadSheet());
  const [skillSearch, setSkillSearch] = useState('');
  const [skillCategory, setSkillCategory] = useState('전체');
  const [growthMessage, setGrowthMessage] = useState('');
  const [growthResults, setGrowthResults] = useState<GrowthResult[]>([]);
  const [sectionOpen, setSectionOpen] = useState(createInitialSectionOpenState);
  const [isSidebarOpen, setIsSidebarOpen] = useState(createInitialSidebarOpenState);
  const [activeSkillGroupId, setActiveSkillGroupId] = useState<string | null>(null);
  const [specialtyDraft, setSpecialtyDraft] = useState('');
  const [isScenarioDraftOpen, setIsScenarioDraftOpen] = useState(false);
  const [scenarioDraft, setScenarioDraft] = useState<ScenarioDraft>(createEmptyScenarioDraft);
  const [combatTab, setCombatTab] = useState<CombatTab>('weapons');
  const [weaponCategory, setWeaponCategory] = useState<WeaponCategory>('melee');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const derived = useMemo(() => calculateDerivedStats(sheet.stats), [sheet.stats]);
  const sanity = useMemo(
    () => normalizeSanityInfo(sheet.sanity, sheet.stats.POW),
    [sheet.sanity, sheet.stats.POW],
  );
  const budget = useMemo(
    () =>
      calculateSkillBudget(
        sheet.skills,
        sheet.stats,
        sheet.occupationFormula,
        sheet.manualOccupationTotal,
      ),
    [sheet.manualOccupationTotal, sheet.occupationFormula, sheet.skills, sheet.stats],
  );
  const checkedSkillCount = sheet.skills.filter(
    (skill) => skill.checked && !isSkillGroup(skill),
  ).length;

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

  function updateBasic(key: keyof BasicInfo, value: string) {
    setSheet((current) => ({ ...current, basic: { ...current.basic, [key]: value } }));
  }

  function toggleSection(sectionId: SheetSectionId) {
    setSectionOpen((current) => toggleSectionOpen(current, sectionId));
  }

  function toggleSidebar() {
    setIsSidebarOpen((current) => toggleSidebarOpen(current));
  }

  function updateStat(key: StatKey | 'luck', value: string) {
    setSheet((current) => {
      const stats = normalizeStats({
        ...current.stats,
        [key]: Number(value),
      } as InvestigatorStats);
      const sanity =
        key === 'POW'
          ? syncSanityWithPow(current.sanity, current.stats.POW, stats.POW)
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
    const stats = rollInvestigatorStats();
    setSheet((current) => ({
      ...current,
      stats,
      sanity: syncSanityWithPow(current.sanity, current.stats.POW, stats.POW),
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

  function uploadPortrait(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setSheet((current) => ({ ...current, portrait: String(reader.result) }));
    };
    reader.readAsDataURL(file);
  }

  function exportJson() {
    const blob = new Blob([serializeSheetArchive(sheet)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${sheet.basic.name || 'investigator'}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function importJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = parseSheetArchive<SheetStateArchive>(String(reader.result));
        setSheet(normalizeSheetState(imported));
      } catch {
        setGrowthMessage('가져오기 파일을 읽지 못했습니다.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  async function copyCharacterToClipboard() {
    const payload = buildCharacterClipboardPayload({
      name: sheet.basic.name,
      stats: sheet.stats,
      sanity,
      skills: sheet.skills,
      weapons: sheet.weapons,
    });
    const text = serializeCharacterClipboardPayload(payload);

    await writeClipboardText(text);
  }

  function resetSheet() {
    setSheet(createInitialSheet());
    setGrowthMessage('');
    setGrowthResults([]);
  }

  return (
    <div className={`app-shell ${isSidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
      <aside className="sidebar" aria-label="시트 섹션" aria-hidden={!isSidebarOpen}>
        <div className="brand">
          <div className="brand-mark">CC</div>
          <div>
            <strong>CCLog Sheet</strong>
            <span>7판 탐사자 빌더</span>
          </div>
        </div>
        <nav>
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
              <h1>{sheet.basic.name || '새로운 탐사자'}</h1>
              <p>{sheet.basic.occupation || '직업 미정'} · SAN {sanity.current}</p>
            </div>
          </div>
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
            <button type="button" className="icon-button" onClick={() => void copyCharacterToClipboard()} title="캐릭터 데이터를 복사">
              <Clipboard size={18} />
              <span>데이터 복사</span>
            </button>
            {/* 저장됨 버튼은 기능치 확정 전까지 숨김. */}
            <button type="button" className="icon-button danger" onClick={resetSheet} title="초기화">
              <RotateCcw size={18} />
            </button>
          </div>
        </header>

        <div className="content-grid">
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
                {sheet.portrait ? (
                  <img src={sheet.portrait} alt="캐릭터 초상" />
                ) : (
                  <div className="portrait-placeholder">
                    <UserRound size={42} />
                    <span>Portrait</span>
                  </div>
                )}
                <Fragment>
                  <button type="button" className="portrait-button" onClick={() => fileInputRef.current?.click()}>
                    <ImagePlus size={17} />
                    이미지
                  </button>
                  <input ref={fileInputRef} className="sr-only" type="file" accept="image/*" onChange={uploadPortrait} />
                </Fragment>
              </div>
              <div className="field-grid">
                <TextField label="이름" value={sheet.basic.name} onChange={(value) => updateBasic('name', value)} />
                <TextField label="플레이어 이름" value={sheet.basic.player} onChange={(value) => updateBasic('player', value)} />
                <TextField label="직업" value={sheet.basic.occupation} onChange={(value) => updateBasic('occupation', value)} />
                <TextField label="나이" value={sheet.basic.age} onChange={(value) => updateBasic('age', value)} />
                <TextField label="성별" value={sheet.basic.gender} onChange={(value) => updateBasic('gender', value)} />
                <TextField label="출생지" value={sheet.basic.birthplace} onChange={(value) => updateBasic('birthplace', value)} />
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            sectionId="stats"
            className="stat-panel"
            icon={<Sparkles size={20} />}
            title="특성치"
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
                  onChange={(value) => updateStat(key, value)}
                />
              ))}
              <StatInput
                code="LUK"
                label="행운"
                value={sheet.stats.luck}
                onChange={(value) => updateStat('luck', value)}
              />
            </div>
            <div className="derived-grid">
              <Metric label="체력" value={derived.hp} />
              <Metric label="마력" value={derived.mp} />
              <Metric label="피해 보너스" value={derived.damageBonus} />
              <PairedMetric
                label="이동력 · 체구"
                primaryLabel="이동력"
                primaryValue={derived.move}
                secondaryLabel="체구"
                secondaryValue={derived.build}
              />
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
              <div className="interest-point-note">관심 포인트 INT×2</div>
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
                  {Object.entries(occupationFormulaLabels).map(([value, label]) => (
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
            title="완료 시나리오 목록"
            action={<button type="button" onClick={addScenario}><Plus size={16} /> 추가</button>}
            isOpen={sectionOpen.scenarios}
            onToggle={toggleSection}
          >
            <div className="scenario-list">
              {sheet.scenarios.length === 0 && !isScenarioDraftOpen && <p className="empty-line">기록된 시나리오가 없습니다.</p>}
              {sheet.scenarios.map((scenario) => (
                <div className="scenario-item" key={scenario.id}>
                  <ScenarioSummary label="룰" value={scenario.rule || '-'} />
                  <ScenarioSummary label="제목" value={scenario.title || '제목 없음'} strong />
                  <ScenarioSummary label="참여자" value={scenario.keeper || '-'} />
                  <ScenarioSummary label="종류" value={scenario.result || '-'} />
                  <ScenarioSummary label="보상" value={scenario.reward || '-'} />
                  <button type="button" className="icon-only danger" onClick={() => removeScenario(scenario.id)} title="시나리오 삭제">
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
        </div>
      </main>
    </div>
  );
}

function loadSheet(): SheetState {
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return createInitialSheet();
    const parsed = JSON.parse(saved) as SheetStateArchive;
    return normalizeSheetState(parsed);
  } catch {
    return createInitialSheet();
  }
}

function normalizeSheetState(parsed: SheetStateArchive): SheetState {
  const fallback = createInitialSheet();
  const { armor: legacyArmor, ...sheetValues } = parsed;
  const stats = normalizeStats({ ...fallback.stats, ...parsed.stats } as InvestigatorStats);

  return {
    ...fallback,
    ...sheetValues,
    basic: normalizeBasicInfo(parsed.basic),
    stats,
    sanity: normalizeSanityInfo(parsed.sanity, stats.POW),
    skills: parsed.skills?.length ? normalizeStoredSkills(parsed.skills, stats) : fallback.skills,
    backstory: { ...fallback.backstory, ...parsed.backstory },
    weapons: normalizeWeapons(parsed.weapons),
    armors: normalizeArmors(parsed.armors ?? legacyArmor),
    spells: normalizeSpells(parsed.spells),
    scenarios: normalizeScenarios(parsed.scenarios),
  };
}

async function writeClipboardText(text: string) {
  if (copyTextWithTextarea(text)) return;

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
  }
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
  onChange,
  readOnly,
}: {
  code: string;
  label: string;
  value: number;
  onChange: (value: string) => void;
  readOnly?: boolean;
}) {
  return (
    <label className="stat-card">
      <span>{code}</span>
      <strong>{label}</strong>
      <input type="number" min={0} max={99} value={value} readOnly={readOnly} onChange={(event) => onChange(event.target.value)} />
      <small>
        {half(value)} / {fifth(value)}
      </small>
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
