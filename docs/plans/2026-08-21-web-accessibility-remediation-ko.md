# 웹 접근성 결함 수정 구현 계획

영문 원본: [Web Accessibility Remediation Implementation Plan](./2026-08-21-web-accessibility-remediation.md)

> **Claude 실행 지침:** 이 계획을 작업 단위로 구현할 때 `superpowers:executing-plans` 스킬을 반드시 사용합니다.

**목표:** 애플리케이션의 핵심 정보 구조와 어두운 시각 테마를 바꾸지 않으면서, 검수에서 확인된 KWCAG 2.2 및 WCAG 2.2 AA 결함을 수정합니다.

**구조:** 현재의 단일 페이지 React 구조를 유지하면서 대화상자, 상태 메시지, 포커스 복구에 필요한 소규모 공용 접근성 컴포넌트를 도입합니다. 동작을 바꾸기 전에 DOM 및 브라우저 수준의 접근성 테스트를 먼저 추가하고, 접근 가능한 이름과 관계, 키보드 포커스, 동적 메시지, 시각적 대비 순서로 수정합니다.

**기술 스택:** React 18, TypeScript, Vite, Vitest, Testing Library, axe-core, Playwright, CSS.

---

## 선택한 접근 방식

기존 UI를 유지하는 **최소 접근성 보강 방식**을 사용합니다.

- 사이드바, 상단 도구 모음, 접이식 섹션, 표, 어두운 테마를 유지합니다.
- 기존 필드 모델과 입력 방식을 유지합니다. `occupation`은 자유 입력 문자열로 남기며, 이번 접근성 작업에서는 직업·국적·출생지 조회 데이터나 외부 API를 추가하지 않습니다.
- 화면 흐름을 새로 디자인하는 대신 의미 구조와 키보드 동작을 보강합니다.
- 둘 이상의 결함에서 실제로 재사용되는 `ModalDialog`, `LiveMessage`, 포커스 유틸리티만 공용화합니다.
- 생성된 시안은 시각적 방향을 설명하는 참고 자료이며 픽셀 단위 구현 명세가 아닙니다.

선택하지 않은 방식:

- 전면적인 레이아웃 재설계는 정보 밀도를 개선할 수 있지만 제품 범위와 회귀 위험을 불필요하게 키웁니다.
- CSS와 ARIA 속성만 빠르게 덧붙이는 방식은 대화상자 수명주기, 동적 포커스, 회귀 테스트를 취약한 상태로 남깁니다.

## 완료 조건

- 화면에 렌더링되는 모든 폼 컨트롤에 행·그룹 맥락을 포함하는 안정적인 접근 가능한 이름이 있습니다.
- 닫힌 사이드바에는 포커스를 받을 수 있는 하위 요소가 없습니다.
- 모달 대화상자는 열릴 때 내부로 포커스가 이동하고, 포커스를 내부에 유지하며, Escape로 닫히고, 닫힌 뒤 호출 버튼으로 포커스가 돌아갑니다.
- 강제 색상 모드를 포함해 모든 상호작용 요소에 명확한 키보드 포커스 표시가 있습니다.
- 선택·오류·상태를 색상 없이도 이해할 수 있습니다.
- placeholder와 컨트롤 경계선이 최소 대비 기준을 충족합니다.
- 320 CSS px 화면에서 문서 전체의 가로 스크롤 없이 재배치됩니다. 데이터 표에는 이름이 있는 내부 가로 스크롤을 허용합니다.
- 자동 접근성 검사에서 serious 또는 critical 위반이 없고, 수동 스크린리더 점검표가 통과합니다.
- `npm test`, `npm run typecheck`, `npm run build`, `npm run test:a11y`가 모두 종료 코드 0으로 끝납니다.

## 1단계 — 회귀 방지 기반과 공용 컴포넌트

### 작업 1: DOM 및 브라우저 접근성 테스트 기반 추가

**대상 파일:**

- 수정: `package.json`
- 수정: `package-lock.json`
- 수정: `vite.config.ts`
- 생성: `src/test/setup.ts`
- 생성: `src/App.a11y.test.tsx`
- 생성: `playwright.config.ts`
- 생성: `e2e/accessibility.spec.ts`

**1. 테스트 전용 의존성 설치**

실행:

```bash
npm install --save-dev @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom axe-core @playwright/test @axe-core/playwright
npx playwright install chromium
```

예상 결과: 새 패키지는 `devDependencies`에만 추가되고 Chromium 설치가 완료됩니다.

**2. Vitest DOM 환경 구성**

기존 Vitest 설정에 `setupFiles: ['./src/test/setup.ts']`를 추가합니다. 현재의 소스 문자열 테스트는 Node 환경에 그대로 두고, `App.a11y.test.tsx`에만 `// @vitest-environment jsdom`을 선언합니다.

`src/test/setup.ts`에서는 `@testing-library/jest-dom/vitest`를 불러오고, 각 테스트 후 cleanup을 실행하고, `localStorage`를 비우고, `matchMedia`, `scrollIntoView`, `HTMLDialogElement.showModal/close`를 테스트에 맞게 고정합니다.

**3. 최초 실패 스모크 테스트 작성**

`<App />`을 렌더링하고 모든 시트 섹션을 펼친 뒤 `axe.run(document)`를 실행합니다. serious/critical 위반이 없어야 한다고 단언하고, 기능치 검색은 레이블로, 전투 컨트롤은 역할로 조회하는 집중 테스트를 추가합니다.

실행:

```bash
npm test -- src/App.a11y.test.tsx
```

예상 결과: 누락된 레이블, 잘못된 탭 의미 구조 또는 숨은 포커스 대상 때문에 실패합니다.

**4. Playwright 구성 추가**

Vite를 `webServer`로 설정하고 프로젝트 기본 URL `/cclog_sheet/`를 사용합니다. 데스크톱 `1280×720`, 좁은 화면 `320×800`, 낮은 높이 `1280×320` 프로젝트를 추가합니다.

다음 스크립트를 추가합니다.

```json
"test:a11y": "playwright test e2e/accessibility.spec.ts"
```

**5. 실패 테스트 기준선 커밋**

```bash
git add package.json package-lock.json vite.config.ts src/test/setup.ts src/App.a11y.test.tsx playwright.config.ts e2e/accessibility.spec.ts
git commit -m "test: add accessibility regression harness"
```

### 작업 2: 공용 대화상자와 라이브 메시지 컴포넌트 추가

**대상 파일:**

- 생성: `src/components/ModalDialog.tsx`
- 생성: `src/components/LiveMessage.tsx`
- 생성: `src/components/ModalDialog.test.tsx`
- 생성: `src/components/LiveMessage.test.tsx`

**1. 실패하는 대화상자 수명주기 테스트 작성**

대화상자를 열었을 때 다음을 검증합니다.

- 네이티브 `showModal()`이 호출됩니다.
- 명시한 최초 포커스 대상 또는 첫 번째 포커스 가능 요소로 포커스가 이동합니다.
- 네이티브 `cancel` 이벤트를 Escape 닫기로 처리합니다.
- 닫은 뒤 열기 전에 포커스되어 있던 호출 요소로 돌아갑니다.

**2. 실패하는 라이브 메시지 테스트 작성**

정보 메시지는 `role="status"`, 오류는 `role="alert"`를 사용하고 둘 다 `aria-atomic="true"`인지 검증합니다.

**3. 최소 컴포넌트 구현**

`ModalDialog`는 네이티브 `<dialog>`를 렌더링하고 `labelledBy`, `describedBy`, `initialFocusRef`, `onClose`를 받습니다. 닫기 여부는 부모 상태가 제어합니다. 포커스 트랩을 직접 중복 구현하지 않고, `showModal()`이 문서의 나머지 부분을 비활성화하도록 맡깁니다.

`LiveMessage`는 동일 영역의 반복적인 상태 변경도 안정적으로 공지되도록 가능한 한 DOM에 계속 유지합니다.

**4. 검증 및 커밋**

```bash
npm test -- src/components/ModalDialog.test.tsx src/components/LiveMessage.test.tsx
git add src/components
git commit -m "feat: add accessible dialog and live-message primitives"
```

## 2단계 — 이름, 관계, 키보드 구조

### 작업 3: 모든 폼 컨트롤에 맥락이 포함된 이름 제공

**대상 파일:**

- 수정: `src/App.tsx`
- 수정: `src/App.a11y.test.tsx`

**1. 실패하는 이름 검사 추가**

모든 반복 구조에서 대표 컨트롤을 검사합니다.

- 기능치 검색
- 기능치 성장 체크박스와 직업·관심·성장 숫자 입력
- 무기·방어구·주문 행의 입력
- InSane 초상 URL, 하위 기능치, 생명력·이성치, 인물, 세션, 어빌리티 입력
- 숨겨진 JSON 파일 입력의 동작

CSS 선택자 대신 역할과 이름을 사용해 조회합니다.

**2. 지속적으로 보이는 레이블 추가**

- 검색 입력에 `<label htmlFor="skill-search">기능치 검색</label>`을 제공합니다.
- 프로그램으로 여는 파일 입력에는 `hidden`을 적용하고, 보이는 `로드` 버튼만 키보드 탭 순서에 둡니다.
- 반복 입력의 `aria-label`에 행과 열의 맥락을 함께 넣습니다. 예: `"권총 피해"`, `"심리학 성장 체크"`.
- 하나의 label 안에 두 컨트롤이 들어간 부분을 `fieldset/legend` 또는 서로 독립된 label로 분리합니다.
- 삭제 버튼에는 대상 항목명을 포함합니다. 예: `"권총 무기 삭제"`.

**3. 표 관계 수정**

숨김 caption을 추가하고, 열 머리글에는 `scope="col"`, 첫 번째 셀이 행을 식별하는 경우에는 `scope="row"`를 사용합니다. 편집 입력의 이름을 열 머리글만으로 대신하지 않습니다.

**4. 렌더링된 전체 컨트롤 검증**

실제로 숨겨진 입력을 제외한 `input`, `select`, `textarea`를 수집하고, Testing Library에서 안정적인 접근 가능한 이름을 찾을 수 없으면 실패하는 테스트를 추가합니다.

실행:

```bash
npm test -- src/App.a11y.test.tsx
npm run typecheck
```

예상 결과: 모든 이름과 관계 검사가 통과합니다.

**5. 커밋**

```bash
git add src/App.tsx src/App.a11y.test.tsx
git commit -m "fix: name form controls and editable tables"
```

### 작업 4: 숨은 포커스 대상 제거 및 페이지 내부 이동 보완

**대상 파일:**

- 수정: `src/App.tsx`
- 수정: `src/styles.css`
- 수정: `src/App.a11y.test.tsx`
- 수정: `e2e/accessibility.spec.ts`

**1. 실패하는 키보드 테스트 작성**

다음을 검증합니다.

- 첫 번째 Tab에서 `본문으로 바로가기` 링크가 나타납니다.
- 닫힌 사이드바에는 탭으로 이동 가능한 하위 요소가 없습니다.
- 사이드바 섹션 링크를 실행하면 해당 섹션 제목으로 포커스가 이동합니다.
- 포커스된 섹션 제목이 고정 상단 바 아래에 가려지지 않습니다.

**2. 페이지 이동 수정**

- 첫 번째 포커스 가능 요소로 본문 바로가기 링크를 추가하고 `#main-content`로 연결합니다.
- `<main>`에 ID와 `tabIndex={-1}`을 지정합니다.
- 닫힌 사이드바에 `inert={!isSidebarOpen}`를 적용하고 호환성을 위해 `aria-hidden`도 유지합니다.
- 섹션으로 이동할 때 먼저 섹션을 펼치고 렌더를 기다린 뒤 `tabIndex={-1}`인 제목에 포커스를 줍니다.
- 고정 상단 바 높이에 맞는 `scroll-margin-top`을 추가합니다.
- 사이드바에는 `overflow-y:auto`를 사용하고, 문서의 `min-width:320px`는 제거합니다.

**3. 모든 화면 크기에서 검증**

```bash
npm run test:a11y -- --grep "navigation|reflow"
```

예상 결과: 보이지 않는 탭 정지점, 가려진 제목, 문서 전체의 가로 넘침이 없습니다.

**4. 커밋**

```bash
git add src/App.tsx src/styles.css src/App.a11y.test.tsx e2e/accessibility.spec.ts
git commit -m "fix: make sidebar and section navigation keyboard safe"
```

### 작업 5: 올바른 탭 및 필터 상태 구현

**대상 파일:**

- 수정: `src/App.tsx`
- 수정: `src/styles.css`
- 수정: `src/App.a11y.test.tsx`

**1. 실패하는 상호작용 테스트 작성**

- 무기·방어구·주문 탭을 `role="tab"`으로 조회할 수 있습니다.
- 선택된 탭에만 `aria-selected="true"`와 `tabIndex=0`이 있습니다.
- 탭과 `tabpanel`의 `aria-controls` 및 `aria-labelledby`가 서로 연결됩니다.
- Left/Right, Home, End 키로 포커스와 선택을 이동할 수 있습니다.
- 기능치 및 무기 종류 필터는 탭처럼 위장하지 않고 일반 버튼과 `aria-pressed`를 사용합니다.
- 모든 선택 상태는 굵은 글씨, 중립색 밑줄, 눌리거나 패널과 이어지는 모양 등 색상 외 단서를 가집니다. 탭 옆에 색상 막대·점·체크 아이콘을 추가하지 않습니다.

**2. WAI-ARIA 패턴 구현**

전투 탭에는 roving `tabIndex` 방식을 적용합니다. 기능치와 무기 종류는 별도 탭 패널을 바꾸는 것이 아니라 하나의 목록을 필터링하므로 일반 토글 버튼으로 유지합니다.

선택된 탭에는 `font-weight:700`, 3px `currentColor` 밑줄, 눌리거나 패널과 연결된 형태를 사용합니다. 현재 사이드바 아이콘은 그대로 두고, 선택 표시를 위한 색상 막대·점·체크 아이콘을 새로 추가하지 않습니다.

**3. 검증 및 커밋**

```bash
npm test -- src/App.a11y.test.tsx
git add src/App.tsx src/styles.css src/App.a11y.test.tsx
git commit -m "fix: expose tab and filter selection semantics"
```

## 3단계 — 대화상자, 오류, 동적 포커스

### 작업 6: 모든 모달 흐름을 `ModalDialog`로 이전

**대상 파일:**

- 수정: `src/App.tsx`
- 수정: `src/styles.css`
- 수정: `src/App.a11y.test.tsx`
- 수정: `e2e/accessibility.spec.ts`

**1. 실패하는 E2E 테스트 작성**

COC 내보내기, 비밀 주사위, InSane 비밀번호, 초기화 확인 대화상자를 검사합니다. 각 대화상자에서 다음을 단언합니다.

- 열리면 포커스가 대화상자 내부로 이동합니다.
- Tab 키로 배경 컨트롤에 접근할 수 없습니다.
- Escape로 닫힙니다.
- 닫은 뒤 정확한 호출 버튼으로 포커스가 돌아갑니다.

**2. 기존 오버레이 교체**

각 대화상자 본문을 `ModalDialog`로 감쌉니다. 고유 제목 ID와 설명을 유지하고 모든 호출 버튼의 ref를 저장합니다. 안전한 최초 포커스 대상을 선택하며, 파괴적 확인 버튼에는 최초 포커스를 주지 않습니다.

**3. 초기화 보호 추가**

즉시 초기화하는 현재 동작을 어떤 로컬 데이터가 대체되는지 설명하는 확인 대화상자로 바꿉니다. 확인 후에는 다음 수정 동작 또는 페이지 종료 전까지 초기화 직전 메모리 스냅샷으로 실행 취소할 수 있게 합니다.

**4. 검증 및 커밋**

```bash
npm test -- src/components/ModalDialog.test.tsx src/App.a11y.test.tsx
npm run test:a11y -- --grep "dialog"
git add src/App.tsx src/styles.css src/App.a11y.test.tsx e2e/accessibility.spec.ts
git commit -m "fix: make modal and reset flows focus safe"
```

### 작업 7: 입력을 방해하지 않으면서 오류와 상태 변화 공지

**대상 파일:**

- 수정: `src/App.tsx`
- 수정: `src/App.a11y.test.tsx`

**1. 실패하는 공지 테스트 작성**

잘못된 가져오기와 비밀번호 오류는 alert로, 저장·복사·성장·주사위·삭제 결과는 polite 상태 메시지로 전달되는지 확인합니다. 각 메시지가 해당 동작 이후 한 번만 공지되는지도 검증합니다.

**2. 목적별 메시지 분리**

- 파일 가져오기 오류에 `growthMessage`를 재사용하지 않고 로드 컨트롤 가까이에 `importError`를 둡니다.
- InSane 비밀번호가 틀리면 대화상자를 닫지 않고 `aria-invalid`를 설정하며 오류를 `aria-errormessage`로 연결합니다.
- 성장 및 주사위 결과를 `LiveMessage`로 렌더링합니다.
- 입력할 때마다 계속 바뀌는 포인트 합계는 live region에 넣지 않습니다. 명시적인 예산 초과나 완료된 동작만 공지합니다.

**3. 삭제·임시 요소 처리 후 포커스 복원**

- 행을 삭제하면 다음 행의 같은 컨트롤, 다음 행이 없으면 이전 행, 둘 다 없으면 추가 버튼으로 포커스를 이동합니다.
- 클립보드 fallback textarea를 만들기 전에 `document.activeElement`를 저장하고 제거 후 복원합니다.
- 삭제한 항목명을 상태 메시지로 알립니다.

**4. 검증 및 커밋**

```bash
npm test -- src/App.a11y.test.tsx
git add src/App.tsx src/App.a11y.test.tsx
git commit -m "fix: announce errors and preserve focus after updates"
```

## 4단계 — 시각적 접근성과 반응형 보강

### 작업 8: 낮은 대비와 보이지 않는 포커스 CSS 교체

**대상 파일:**

- 수정: `src/styles.css`
- 수정: `e2e/accessibility.spec.ts`

**1. 실패하는 계산 스타일 검사 작성**

검색 입력의 포커스 outline, placeholder 색상, 컨트롤 경계색, 강제 색상 모드의 포커스, 단색 선택 표시를 검사합니다.

**2. 디자인 토큰과 상태 업데이트**

시안의 방향을 다음처럼 적용합니다.

```css
:root {
  --control-border: #8491a2;
  --focus-ring: #8df0c1;
  --placeholder: #aeb8c5;
}

:where(button, a, input, select, textarea):focus-visible {
  outline: 3px solid var(--focus-ring);
  outline-offset: 3px;
}

.search-field:focus-within {
  outline: 3px solid var(--focus-ring);
  outline-offset: 3px;
}

::placeholder {
  color: var(--placeholder);
  opacity: 1;
}
```

병합 전 실제 운영 색상을 대비 계산기로 다시 검증합니다. 위 색상값은 예시이며, 토큰의 목적과 최소 대비 비율이 실제 요구사항입니다.

**3. 플랫폼별 보완 추가**

- `@media (forced-colors: active)`에서 시스템 색상을 사용한 포커스와 선택 상태 규칙을 추가합니다.
- 활성 탭과 사이드바 항목은 단색을 유지합니다. 굵은 글씨, 밑줄, 눌린 형태, ARIA 상태를 사용하고 강조색 막대나 별도 선택 아이콘은 추가하지 않습니다.
- `@media (prefers-reduced-motion: reduce)`에서 부드러운 스크롤과 필수적이지 않은 전환 효과를 끕니다.
- 비밀 주사위의 긴 레이블이 `overflow-wrap:anywhere`로 줄바꿈되게 하고 강제 `nowrap`과 말줄임을 제거합니다.
- 좁은 화면에서도 툴바 텍스트를 유지하거나 서로 구별되는 짧은 상시 레이블을 제공합니다.
- 조밀한 표를 깨뜨리지 않는 범위에서 상호작용 대상의 권장 크기 44px를 유지합니다.

**4. 검증 및 커밋**

```bash
npm run test:a11y -- --grep "focus|contrast|forced colors|text spacing"
git add src/styles.css e2e/accessibility.spec.ts
git commit -m "fix: strengthen focus, contrast, and adaptive styles"
```

### 작업 9: 자동 및 수동 인수 테스트 완료

**대상 파일:**

- 생성: `docs/accessibility-test-checklist.md`
- 수정: `e2e/accessibility.spec.ts`
- 수정: `README.md`

**1. 전체 자동 검증 실행**

```bash
npm test
npm run typecheck
npm run build
npm run test:a11y
```

예상 결과: 모든 명령이 종료 코드 0으로 끝납니다. 테스트 개수와 axe 결과를 점검표에 기록합니다.

**2. 화면 크기 및 사용자 설정 조합 검사**

- `1280×720` 데스크톱, 사이드바 열림과 닫힘
- `320×800` 모바일, 모든 섹션 펼침
- `1280×320` 낮은 화면, 사이드바 탐색
- 브라우저 200% 확대
- 강제 색상 및 모션 감소 에뮬레이션
- WCAG 텍스트 간격 재정의

**3. 보조기술 검사**

- macOS VoiceOver + Safari/Chrome
- Windows NVDA + Firefox/Chrome
- Android TalkBack + Chrome

각 조합에서 랜드마크와 제목, 컨트롤 이름, 표 맥락, 대화상자 수명주기, 라이브 메시지, 오류, 동적 삭제 후 포커스를 검증합니다. 브라우저, 스크린리더, 버전, 결과, 예외를 기록합니다.

**4. KWCAG 2.2 점검표 재검수**

33개 검사항목을 모두 증거와 함께 다시 판정합니다. 적용 대상인 항목 중 하나라도 실패하거나 검수하지 않았다면 공식 준수를 주장하지 않습니다.

**5. 프로젝트 문서 업데이트 및 커밋**

`README.md`에 `npm run test:a11y`, 수동 테스트 조합, 알려진 한계를 기록합니다.

```bash
git add docs/accessibility-test-checklist.md e2e/accessibility.spec.ts README.md
git commit -m "docs: add accessibility verification procedure"
```

## 권장 실행 순서 및 예상 기간

1. 테스트 기반과 공용 컴포넌트 — 0.5~1일
2. 레이블, 표, 사이드바, 페이지 내부 이동 — 1~1.5일
3. 탭, 대화상자, 상태 메시지, 포커스 복원 — 1.5~2일
4. 대비, 반응형 보강, 브라우저 자동화 테스트 — 1일
5. 여러 스크린리더 수동 검증 및 후속 수정 — 0.5~1일

외부 WA 인증 심사 기간을 제외한 예상 개발 기간은 **4.5~6.5일**입니다.

## 구현 검토 지점

- 검토 지점 A: 작업 4 완료 후 이름 없는 컨트롤과 숨은 포커스 정지점이 없어야 합니다.
- 검토 지점 B: 작업 7 완료 후 키보드 및 동적 상태 관련 결함이 모두 해결되어야 합니다.
- 검토 지점 C: 작업 9 완료 후 전체 KWCAG/WCAG 근거표를 검토할 수 있어야 합니다.
