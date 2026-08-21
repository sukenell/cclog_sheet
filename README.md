# CCLog Sheet

크툴루의 부름 7판 캐릭터를 한국어로 작성하는 React 프론트엔드 프로젝트입니다.

## 실행

```bash
npm install
npm run dev
```

## 스크립트

```bash
npm test
npm run typecheck
npm run build
npm run test:a11y
```

작성한 시트는 브라우저 `localStorage`에 자동 저장되며, JSON 세이브/로드로 파일 이동이 가능합니다.

## 접근성 검증

`npm test`는 DOM 의미 구조, 컨트롤 이름, 대화상자·라이브 메시지·동적 포커스를 검사합니다. `npm run test:a11y`는 Chromium에서 `1280×720`, `320×800`, `1280×320` 화면과 COC/InSane 핵심 흐름, axe, 키보드, 리플로우, 대비, 강제 색상, 모션 감소 및 텍스트 간격을 검사합니다.

수동 검증은 macOS VoiceOver + Chrome/Safari, Windows NVDA + Firefox/Chrome, Android TalkBack + Chrome 조합이 필요합니다. 현재 자동 검증은 실제 화면낭독프로그램 실행이나 공식 품질인증을 대신하지 않습니다. 시스템 클립보드 E2E는 데스크톱에서 한 번만 실행되며 테스트 페이로드가 클립보드에 남을 수 있습니다. InSane 구매 확인 방식은 접근 가능한 대체 인증에 관한 제품·정책 검토가 남아 있어, 그 검토와 보조기술 수동 검증 전에는 공식 준수를 주장하지 않습니다.

33개 KWCAG 항목별 상태, 자동 증거, viewport 매트릭스와 수동 절차는 [접근성 자체 검수 기록](docs/accessibility-test-checklist.md)에 정리되어 있습니다.
