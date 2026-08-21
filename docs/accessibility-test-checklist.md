# CCLog Sheet 웹 접근성 자체 검수 기록

- 검수 기준일: 2026-08-22 (Asia/Seoul)
- 대상: GitHub Pages용 React 단일 페이지 애플리케이션, COC 7판 및 개발 빌드의 InSane 화면
- 기준: [한국형 웹 콘텐츠 접근성 지침 2.2(KS X OT0003:2022)](https://www.webwatch.or.kr/pds/%28KS%20X%20OT0003%29%20%ED%95%9C%EA%B5%AD%ED%98%95%20%EC%9B%B9%20%EC%BD%98%ED%85%90%EC%B8%A0%20%EC%A0%91%EA%B7%BC%EC%84%B1%20%EC%A7%80%EC%B9%A8%202.2.pdf), [WCAG 2.2](https://www.w3.org/TR/WCAG22/)

## 판정의 범위

이 문서는 개발팀의 **자체 검수 기록**이며 웹 접근성 품질인증이나 공인 적합성 선언이 아니다. KWCAG 2.2의 33개 검사항목은 WCAG 2.1을 바탕으로 구성되어 WCAG 2.2 A/AA 성공기준과 정확히 일대일 대응하지 않는다. 따라서 KWCAG 33개 항목 표와 별도로 WCAG 2.2에서 강화된 리플로우, 텍스트 간격, 초점 비가림, 드래그 대체, 최소 대상 크기 및 접근 가능한 인증을 확인했다.

상태의 의미는 다음과 같다.

- `통과`: 현재 코드와 자동 검증에서 적용 범위가 충족됐다.
- `해당 없음`: 현재 제공하는 콘텐츠나 기능에 해당 유형이 없다. 기능 추가 시 다시 검사해야 한다.
- `수동 외부 환경 필요`: 자동화만으로 최종 판정할 수 없거나 정책 결정이 남아 있다. 이 상태가 하나라도 남아 있으므로 공식 준수를 주장하지 않는다.

현재 분포는 `통과 19`, `해당 없음 11`, `수동 외부 환경 필요 3`이다.

## 자동 검증 결과

아래 수치는 2026-08-22에 문서 커밋 직전 다시 실행한 결과를 기록하는 고정 스냅샷이다. 이후 테스트가 추가되면 수치가 달라질 수 있으며, 그때는 명령의 최신 출력이 우선한다.

| 명령 | 결과 | 확인 범위 |
| --- | --- | --- |
| `npm test` | `20`개 테스트 파일, `186`개 테스트 통과, 실패·보류 `0` | 데이터 로직, DOM 의미 구조, 이름·관계, 탭, 대화상자, 라이브 영역, 삭제 후 포커스, COC axe 검사, 테스트 mock 격리 |
| `npm run typecheck` | 종료 코드 `0` | 애플리케이션 및 Vite/Playwright TypeScript 설정 |
| `npm run build` | 종료 코드 `0` | TypeScript, Vite 프로덕션 번들, GitHub Pages 준비 스크립트 |
| `npm run test:a11y` | 총 `66`건 중 `64`건 통과, 의도적 skip `2`, 실패 `0` | Chromium, 세 viewport, COC/InSane, axe, 키보드, 모달, 리플로우, 대비 및 사용자 설정 |
| `git diff --check` | 종료 코드 `0` | 공백 오류와 충돌 표식 없음 |

Playwright의 `clipboard fallback copies from the active modal top layer and restores focus`는 실제 시스템 클립보드 접근을 수반하므로 `desktop-1280x720`에서 한 번만 실행한다. `narrow-320x800`과 `short-1280x320`의 같은 두 실행은 중복 및 클립보드 권한 차이를 피하기 위해 의도적으로 skip한다. 이 테스트가 끝난 뒤 운영체제 클립보드에 `[R20JE:COC7_IMPORT:1]` 테스트 페이로드가 남을 수 있다.

브라우저 axe 검사는 COC와 InSane의 모든 섹션을 펼친 상태를 세 viewport에서 각각 검사한다. 사용 태그는 `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22a`, `wcag22aa`이며 serious/critical 위반은 `0`이었다. axe 결과는 자동 탐지 가능한 규칙만 다루며 수동 검수를 대체하지 않는다.

## 화면 크기 및 사용자 설정 매트릭스

| 조건 | 상태 | 자동 증거와 남은 수동 범위 |
| --- | --- | --- |
| `1280×720`, 사이드바 열림/닫힘 | 통과 | `starts keyboard navigation at the skip link and keeps closed navigation inert`: 열린 상태, `aria-controls`, 닫힌 상태 `inert`/`aria-hidden`, 재열기를 검증 |
| `320×800`, COC/InSane 모든 섹션 | 통과 | `fully expanded COC and InSane...axe`, `reflows every COC and InSane section...`, named table 내부 스크롤 및 문서 가로 overflow 부재 |
| `1280×320`, 사이드바 탐색·대화상자 | 통과 | `section navigation opens and focuses...`, 대화상자 경계·옵션/고정 footer 비겹침, 포인터·키보드 조작과 footer 버튼 클릭/닫힘 |
| 200% 확대 대응 | 통과(동등 CSS viewport) | 데스크톱 테스트에서 `640×720` CSS viewport로 바꿔 1280px 레이아웃의 200% 확대와 동등한 리플로우를 검증. 브라우저 UI의 실제 200% zoom은 수동 재확인 권장 |
| 강제 색상 | 통과 | `forced colors preserves focus and selected-state shape without decorative markers`: 시스템 색, 3px 초점, 탭/필터 밑줄·굵기, 모달/입력 경계 |
| 모션 감소 | 통과 | `reduced motion removes smooth scrolling and non-essential transitions`: smooth scroll, 애니메이션, 비필수 transition 제거 |
| WCAG 텍스트 간격 | 통과 | 글자 `0.12em`, 단어 `0.16em`, 줄 `1.5`, 문단 뒤 `2em` override 후 문서 overflow 및 툴바 레이블 손실 없음 |

## KWCAG 2.2 33개 검사항목

증거 표기에서 `DOM`은 `src/App.a11y.test.tsx`, `E2E`는 `e2e/accessibility.spec.ts`의 테스트 이름을 뜻한다.

| 번호 | 검사항목 | 상태 | 코드·테스트 근거 |
| --- | --- | --- | --- |
| 1 | 5.1.1 적절한 대체 텍스트 제공 | 통과 | 사용자 초상과 사용 안내 이미지에 `alt`, 장식 아이콘에 `aria-hidden`; DOM 전체 이름 검사와 E2E axe |
| 2 | 5.2.1 자막 제공 | 해당 없음 | 오디오·동영상·실시간 멀티미디어를 제공하지 않음 (`rg '<(audio|video)' src`로 재확인 가능) |
| 3 | 5.3.1 표의 구성 | 통과 | `caption`, `scope="col"`, `scope="row"`, 행·열 맥락 이름; DOM `names COC combat fields...`, `names InSane image...`; E2E 양 시스템 named table |
| 4 | 5.3.2 콘텐츠의 선형구조 | 통과 | `aside` 뒤 `main`, 제목과 섹션 콘텐츠의 DOM 순서 유지; E2E landmark/heading 및 키보드 순서 |
| 5 | 5.3.3 명확한 지시사항 제공 | 통과 | 대화상자 설명, 비밀번호 오류, 초기화 결과가 텍스트로 제공되며 색·위치·소리만으로 지시하지 않음 |
| 6 | 5.4.1 색에 무관한 콘텐츠 인식 | 통과 | 선택 탭/필터는 ARIA 상태, 굵기와 `currentColor` 밑줄을 함께 사용; E2E forced-colors 검사, 별도 색 막대·점·체크 없음 |
| 7 | 5.4.2 자동 재생 금지 | 해당 없음 | 자동 재생 오디오가 없음 |
| 8 | 5.4.3 텍스트 콘텐츠의 명도 대비 | 통과 | E2E axe 색 대비 규칙과 `computed control boundaries and placeholder text...`의 4.5:1 placeholder 검사 |
| 9 | 5.4.4 콘텐츠 간의 구분 | 통과 | 3:1 이상 컨트롤 경계, 패널/표 경계, 선택 밑줄; E2E computed contrast 및 forced-colors 검사 |
| 10 | 6.1.1 키보드 사용 보장 | 통과 | skip link, disclosure, 탭 방향키, 모달 Escape/Tab, 좁고 낮은 모달의 checkbox/footer 버튼을 키보드로 실행 |
| 11 | 6.1.2 초점 이동과 표시 | 통과 | 3px `:focus-visible`, 검색 `:focus-within`, 섹션 이동, 대화상자 최초·복귀 초점, 삭제 후 다음/이전/추가 버튼 초점 |
| 12 | 6.1.3 조작 가능 | 수동 외부 환경 필요 | 자동 검사는 툴바·주요 필드·비표 액션의 44px 및 대화상자 포인터 조작을 통과. 조밀한 편집표를 실제 모바일 터치로 전수 확인해야 함 |
| 13 | 6.1.4 문자 단축키 | 해당 없음 | 단일 문자 전역 단축키를 제공하지 않음. 전투 탭 방향키는 해당 컴포넌트가 초점일 때만 작동 |
| 14 | 6.2.1 응답시간 조절 | 해당 없음 | 세션 만료, 입력 제한시간, 시간제한 작업이 없음 |
| 15 | 6.2.2 정지 기능 제공 | 해당 없음 | 자동 회전·스크롤·갱신 콘텐츠가 없음 |
| 16 | 6.3.1 깜빡임과 번쩍임 사용 제한 | 해당 없음 | 깜빡임·번쩍임 콘텐츠와 관련 CSS animation이 없음. reduced-motion에서는 비필수 동작도 제거 |
| 17 | 6.4.1 반복 영역 건너뛰기 | 통과 | 첫 Tab의 `본문으로 바로가기`가 `#main-content`로 연결되고 main이 프로그램 초점을 받을 수 있음 |
| 18 | 6.4.2 제목 제공 | 통과 | `<title>CCLog Sheet</title>`, 단일 H1, 각 패널 H2, 대화상자 H2와 `aria-labelledby`; DOM/E2E heading 검사 |
| 19 | 6.4.3 적절한 링크 텍스트 | 통과 | 사이드바 링크는 목적 섹션명을 사용. 외부 링크는 `R20 JSONExporter 확장 프로그램(새 창)`으로 대상과 새 창을 보이는 텍스트에 명시하며 `noopener noreferrer` 적용 |
| 20 | 6.4.4 고정된 참조 위치 정보 | 해당 없음 | 페이지 구분자가 필요한 전자출판문서 형식이 아님 |
| 21 | 6.5.1 단일 포인터 입력 지원 | 해당 없음 | 다중 포인터나 경로 기반 드래그가 필수인 기능이 없음 |
| 22 | 6.5.2 포인터 입력 취소 | 통과 | 기능은 native `click`/submit의 up 이벤트로 실행. 초기화는 확인·취소와 1회 실행 취소를 제공하며 E2E lifecycle로 검증 |
| 23 | 6.5.3 레이블과 네임 | 통과 | 보이는 레이블 문구를 접근 가능한 이름에 포함; DOM 전체 visible form control 이름 검사, 탭/필터/반복 행 테스트 |
| 24 | 6.5.4 동작기반 작동 | 해당 없음 | 기기 흔들기·기울이기·카메라 제스처 기능이 없음 |
| 25 | 7.1.1 기본 언어 표시 | 통과 | `index.html`의 `<html lang="ko">`; DOM axe 테스트도 한국어 문서 언어를 설정 |
| 26 | 7.2.1 사용자 요구에 따른 실행 | 통과 | 초점만으로 제출·새 창·페이지 전환이 일어나지 않음. 유일한 `_blank` 링크는 보이는 `새 창` 안내 제공 |
| 27 | 7.2.2 찾기 쉬운 도움 정보 | 해당 없음 | 현재 배포 UI에는 반복되는 연락처·FAQ·채팅·도움말 진입 기능을 제공하지 않음. 사용방법 진입점은 비활성 상태 |
| 28 | 7.3.1 오류 정정 | 통과 | 가져오기·클립보드·비밀번호 오류를 `alert`로 알리고 비밀번호 대화상자를 유지; 초기화 확인·취소·실행 취소 제공 |
| 29 | 7.3.2 레이블 제공 | 통과 | visible control 전수 이름, label 1:1, 반복 행 맥락, password `aria-invalid`/`aria-errormessage`를 DOM 테스트로 검증 |
| 30 | 7.3.3 접근 가능한 인증 | 수동 외부 환경 필요 | InSane 룰북 구매 확인이 숫자 합산 문구라는 인지 과제에 의존한다. 복사·붙여넣기는 차단하지 않지만 대체 인증 여부는 저작권·제품 정책 검토가 필요하므로 **공식 준수 주장 보류** |
| 31 | 7.3.4 반복 입력 정보 | 해당 없음 | 하나의 절차 안에서 앞 단계의 동일 개인정보를 다시 입력시키는 다단계 흐름이 없음 |
| 32 | 8.1.1 마크업 오류 방지 | 통과 | React/TypeScript 빌드, 중복 ID·ARIA 관계를 포함한 axe, DOM tab/panel 및 dialog ID 연결 검사 통과 |
| 33 | 8.2.1 웹 애플리케이션 접근성 준수 | 수동 외부 환경 필요 | Chromium role/name 쿼리와 키보드 자동화는 통과했으나 아래 실제 화면낭독프로그램 조합을 실행하지 않아 플랫폼 접근성 API의 최종 상호운용 판정은 보류 |

## WCAG 2.2 A/AA 추가 확인

| 성공기준 | 상태 | 증거 |
| --- | --- | --- |
| 1.4.10 Reflow | 통과 | 320 CSS px 및 200% 동등 640 CSS px에서 문서 가로 overflow 없음. 이름 있는 표 영역의 내부 가로 스크롤만 허용 |
| 1.4.11 Non-text Contrast | 통과 | 입력·버튼 경계 3:1 이상 계산, forced-colors 시스템 경계 |
| 1.4.12 Text Spacing | 통과 | WCAG 간격 override 후 콘텐츠·기능 손실 및 문서 overflow 없음 |
| 2.4.11 Focus Not Obscured (Minimum) | 통과 | sticky topbar 아래 섹션 초점과 낮은 모달의 checkbox/footer 초점이 viewport/dialog 안에 보임 |
| 2.5.7 Dragging Movements | 해당 없음 | 드래그 전용 기능 없음 |
| 2.5.8 Target Size (Minimum) | 수동 외부 환경 필요 | 대표 44px 대상은 자동 통과. 조밀한 표의 예외 적용성과 실제 터치 간격은 6.1.3 수동 항목에서 전수 확인 필요 |
| 3.2.6 Consistent Help | 해당 없음 | 현재 배포 UI에 도움 메커니즘 진입점 없음 |
| 3.3.7 Redundant Entry | 해당 없음 | 반복 입력을 요구하는 다단계 절차 없음 |
| 3.3.8 Accessible Authentication (Minimum) | 수동 외부 환경 필요 | KWCAG 7.3.3과 동일한 제품·정책 결정 필요 |

## 핵심 흐름 증거

| 흐름 | COC | InSane |
| --- | --- | --- |
| landmark·heading·control name | E2E 양 시스템 의미 구조, DOM COC 전체 control 이름 | E2E 양 시스템 의미 구조, DOM InSane 전체 control 이름·label 1:1 |
| 표 맥락 | 기능치·무기·방어구·주문 caption/scope/행 이름 | 특기 표 caption/scope/행·목표치 이름 |
| 대화상자 | 세이브·비밀 주사위·초기화의 최초 초점, Tab 모달성, Escape, 호출자 복귀 | 비밀번호 오류 유지, native form close, 재열기, Escape와 룰 선택 호출자 복귀 |
| live/error | 성장·저장·복사·주사위·삭제 status, 가져오기/클립보드 alert | 비밀번호 alert, 삭제 status |
| 삭제 후 초점 | 다음 행 → 이전 행 → 추가 버튼 | 인물 행의 다음 → 이전 → 추가 버튼 |
| sidebar·reflow·axe | 세 viewport, 모든 7개 섹션, serious/critical 0 | 세 viewport, 모든 8개 섹션, serious/critical 0 |

## 보조기술 수동 검증 매트릭스

Playwright의 role/name locator와 Chromium 키보드 동작은 접근성 의미 구조에 대한 자동 증거이지만 화면낭독프로그램 실행 결과가 아니다.

| 플랫폼 | 조합 | 상태 | 확인할 내용 |
| --- | --- | --- | --- |
| macOS | VoiceOver + Chrome | 외부 환경 수동 검증 필요 | landmark/heading 이동, 표 행·열 맥락, 모달 수명주기, live/alert, 삭제 초점 |
| macOS | VoiceOver + Safari | 외부 환경 수동 검증 필요 | 위 항목과 native `<dialog>`/`inert` 상호운용 |
| Windows | NVDA + Firefox | 외부 환경 수동 검증 필요 | 위 항목과 browse/forms mode 전환 |
| Windows | NVDA + Chrome | 외부 환경 수동 검증 필요 | 위 항목과 ARIA tab/tabpanel, live 반복 공지 |
| Android | TalkBack + Chrome | 외부 환경 수동 검증 필요 | 320px 리플로우, 터치 탐색 순서, target size, 모달·표 내부 스크롤 |

각 수동 실행 시 운영체제·브라우저·화면낭독프로그램 버전, 날짜, COC/InSane 각각의 결과와 예외를 이 표에 추가한다. 실제 실행 기록 없이 `통과`로 바꾸지 않는다.

## 재검증 절차

```bash
npm install
npm test
npm run typecheck
npm run build
npm run test:a11y
git diff --check
```

수동으로는 다음 순서로 확인한다.

1. 마우스를 사용하지 않고 skip link부터 모든 핵심 기능을 실행한다.
2. 위 화면낭독프로그램 조합마다 COC와 InSane을 각각 선택하고 모든 섹션을 탐색한다.
3. 표 머리글·행 이름, 대화상자 제목·설명·Escape·호출자 복귀, status/alert 공지를 듣는다.
4. 행을 삭제해 다음·이전·추가 컨트롤로 초점이 이동하는지 확인한다.
5. 실제 브라우저 200% 확대, 운영체제 강제 색상/고대비, 모션 감소, 모바일 터치로 재확인한다.
6. InSane 구매 확인 흐름의 대체 인증 정책을 확정하기 전에는 공인 적합성이나 전체 준수를 주장하지 않는다.
