Analyzing the report against the *complete* TASK doc (not the truncated excerpts the consistency check saw): most flagged "gaps" are truncation artifacts — the full plan already covers all 52 ACs (F1 diagnosis→3.2/3.3/3.4/2.4, F4→2.5/3.9, F5→3.10, monetization IAP→3.11 + counter→3.7 + gate→2.2, AI disclosure→3.2 + badges). But two **genuine** defects survive scrutiny:

1. **RouteState is incomplete** — Task 1.1 defines 9 route keys but the app has 11 routes; `/settings` and `/` are missing, so those pages can't type-cast `location.state` against the contract (the exact class of runtime crash the Epic 1 risk note warns about).
2. **ROI report has no AI badge** — SPEC mandates the "AI가 생성한 결과입니다" badge on *all* AI outputs including the ROI 리포트, but Task 3.10 omits it (only 3.4/3.9 have `data-testid="ai-badge"`).

Both fixed below. Formatting normalized to plain-list (`- DoD:` / `- Covers:` / `- Files:`) throughout.

---

# TASK — DuoTrack

## Epic 1. TypeScript Types + Interfaces

### Task 1.1 엔티티 타입 + RouteState 정의
- Description: SPEC의 5개 데이터 모델(UserProfile, StudySession, MockExamResult, GeneratedProblem, AppMeta)과 외부 API 요청/응답 타입(DiagnoseRequest/Response, GenerateRequest/Response), 그리고 페이지 간 데이터 계약 `RouteState` 타입을 순수 타입 파일로 정의한다. 런타임 코드 없음.
- DoD:
  - `src/lib/types.ts`에 5개 entity interface + API 4개 interface export
  - `export type TargetExam = "TOEIC" | "OPIC" | "TEPS"` 등 유니온 타입 분리 export
  - `export type RouteState = { "/": undefined; "/diagnose": undefined; "/diagnose/quiz": { targetExam: TargetExam; targetScore: number }; "/diagnose/result": { profile: UserProfile }; "/home": undefined; "/session": undefined; "/exams": undefined; "/problems": { mode: "mock" } | undefined; "/report": undefined; "/subscribe": { from?: string } | undefined; "/settings": undefined }` 정의 — **11개 라우트 전부 포함**(4.1 라우터의 Route 수와 1:1 일치)
  - `tsc --noEmit` 통과, import 시 에러 0
- Covers: [데이터 모델·RouteState 계약 — 전 기능 기반]
- Files: `src/lib/types.ts`
- Depends on: none

> Risk — Epic 1
> - Complexity: Low
> - Risk factors: RouteState 누락 시 페이지 간 `location.state` 불일치로 런타임 undefined 크래시.
> - Mitigation: 11개 라우트 전부를 1.1에서 선(先)수집하여 단일 타입으로 고정, 4.1 라우터가 이 키 집합과 1:1 일치하는지 검증 → 후속 페이지 패킷이 이 타입만 import하므로 계약 위반 방지.

---

## Epic 2. Data Layer

### Task 2.1 localStorage CRUD 헬퍼 + 손상/용량 방어
- Description: 5개 key(`duotrack.profile/sessions/exams/problems/meta`)에 대한 read/write CRUD 함수를 작성한다. JSON 파싱 실패 시 기본값 복구, 문제 100건 상한 유지, QuotaExceededError 캐치를 포함한다.
- DoD:
  - `getX/setX/addX` 함수가 key별로 존재, `addProblem`은 100건 초과 시 오래된 항목부터 제거
  - JSON.parse 실패 시 해당 key를 기본값으로 초기화 후 반환(throw 없음, console.error 미출력)
  - `setX`가 QuotaExceededError를 캐치해 `{ ok: false, reason: "quota" }` 반환(크래시 없음)
  - `tsc --noEmit` 통과
- Covers: [F7-AC2, F7-AC3, F2-AC8]
- Files: `src/lib/storage.ts`
- Depends on: Task 1.1

### Task 2.2 앱 상태 Context + 로딩 + 구독 게이트 플래그
- Description: 전역 상태를 관리하는 경량 Context(Provider + `useAppStore` 훅)를 만든다. 초기 로드 로딩 플래그, `isSubscribed` 기반 유료 게이트 파생값, meta 갱신 액션을 제공한다.
- DoD:
  - `AppStoreProvider`가 마운트 시 storage에서 meta/profile을 로드하고 `isLoading` true→false 전환
  - `useAppStore()`가 `{ meta, profile, isLoading, isSubscribed, canUseFeature(feature) }` 반환
  - `isSubscribed === true`면 `canUseFeature("mock"|"report"|"unlimitedSession")`가 모두 true
  - meta 갱신 시 storage.setMeta 동기 반영
- Covers: [F6-AC2, F7-AC4]
- Files: `src/lib/store.tsx`
- Depends on: Task 2.1

### Task 2.3 주간 카운터 리셋 + 용량 임계 계산
- Description: 앱 진입 시 주간 무료 세션 카운터를 월요일 기준으로 리셋하는 순수 함수와, 전체 localStorage 용량을 추정해 4MB 초과 여부를 반환하는 함수를 작성한다.
- DoD:
  - `maybeResetWeek(meta, now)` → weekAnchor가 이번 주 월요일 이전이면 `weeklyFreeSessionsUsed=0`, weekAnchor를 이번 주 월요일 00:00로 갱신한 meta 반환
  - 같은 주 재호출 시 변화 없음(idempotent)
  - `getStorageUsageBytes()` 반환값 > 4MB일 때 `isNearQuota()===true`
  - 순수 함수로 `now` 주입(테스트 가능)
- Covers: [F7-AC1, F7-AC5]
- Files: `src/lib/integrity.ts`
- Depends on: Task 2.1

### Task 2.4 외부 AI API 클라이언트
- Description: Railway 서버의 `POST /diagnose`, `POST /generate-problems`를 호출하는 fetch 래퍼를 작성한다. 성공/에러(`{error}`)를 구분 반환하고, 네트워크 예외를 캐치한다.
- DoD:
  - `diagnose(req)` → 성공 시 `DiagnoseResponse`, 실패 시 `{ error: string }` 반환(throw 없음)
  - `generateProblems(req)` → `GenerateResponse` 또는 `{ error }`
  - 500/네트워크 예외를 캐치해 `{ error: "..." }` 정규화
  - base URL은 `import.meta.env.VITE_API_BASE_URL`에서 주입
- Covers: [F1-AC6, F4-AC7]
- Files: `src/lib/api.ts`
- Depends on: Task 1.1

### Task 2.5 집계 로직 + 프로모션 리워드 래퍼
- Description: 취약 파트 자동 계산, ROI 지표(시간당 효율/진척도/예측정확도, 0시간 방어), 프로모션 리워드 지급(클램프·중복방지) 순수 함수/래퍼를 작성한다.
- DoD:
  - `computeWeakParts(sessions)` → 세션 5건 이상일 때 파트별 정답률(correctCount/problemsSolved) 최저 파트 반환, 5건 미만이면 `null`
  - `computeRoi(sessions, exams, profile)` → `{ efficiency, progress, predictError }`, 총 학습시간 0이면 efficiency `"—"`(NaN/Infinity 미반환)
  - `grantPromo(meta, code)` → amount를 min(3000,5000)으로 클램프해 `grantPromotionReward` 호출, 이미 지급 플래그 있으면 미호출 후 `{ granted:false }`
  - 순수 함수 + 래퍼 분리
- Covers: [F4-AC1, F5-AC7, F6-AC5, F6-AC6]
- Files: `src/lib/analytics.ts`, `src/lib/promo.ts`
- Depends on: Task 2.1

> Risk — Epic 2
> - Complexity: Medium
> - Risk factors: (1) localStorage 5MB 한도 — sessions 500건/problems 100건 누적. (2) 월요일 리셋 타임존/DST 오프바이원. (3) 0시간 나눗셈으로 NaN 렌더.
> - Mitigation: 2.1에서 문제 상한·quota 캐치를 데이터 진입점에 집중, 2.3에서 리셋을 순수 함수+`now` 주입으로 테스트 가능화, 2.5에서 나눗셈 방어를 계산 레이어에 격리 → 페이지는 방어된 값만 소비.

---

## Epic 3. Core UI Pages

### Task 3.1 온보딩 화면 (S1 `/`)
- Description: 앱 소개 + 최초 진입 AI 고지 화면. `onboarded === true`면 `/home` 리다이렉트, 아니면 소개 노출.
- DoD:
  - ScreenScaffold + Top + Paragraph.Text 골격
  - SubmitFooter의 display="block" "시작하기" 버튼(48px) → `navigate('/diagnose')`
  - meta 로드 중 Spinner 표시
  - `onboarded === true` 시 즉시 `/home` 리다이렉트
- Covers: [S1 골격 — 앱 인입 경로]
- Files: `src/pages/OnboardingPage.tsx`
- Depends on: Task 2.2

### Task 3.2 진단 설정 화면 (S2 `/diagnose`)
- Description: 시험 선택 Chip + 목표 점수 입력 + AI 고지 AlertDialog(1회). 범위 검증 후 quiz로 이동.
- DoD:
  - `aiNoticeAcknowledged===false`면 진입 시 "이 서비스는 생성형 AI를 활용합니다" AlertDialog 1회, 확인 시 `meta.aiNoticeAcknowledged=true` 저장
  - Chip(TOEIC/OPIC/TEPS 각 44px), TextField `inputMode="numeric"`
  - TOEIC에서 `targetScore>990` 또는 <10 시 "목표 점수는 10~990 사이여야 합니다" 에러, 진행 차단
  - "진단 시작"(48px) → `navigate('/diagnose/quiz', { state: { targetExam, targetScore } })` (RouteState 캐스팅)
- Covers: [F1-AC1, F1-AC2, F1-AC5]
- Files: `src/pages/DiagnosePage.tsx`
- Depends on: Task 2.2

### Task 3.3 진단 문항 화면 (S3 `/diagnose/quiz`)
- Description: 10문항 응답 → 보상형 광고 게이트 → `/diagnose` API 호출 → 결과 화면 이동. 로딩/에러/미응답 처리.
- DoD:
  - `location.state`를 `RouteState["/diagnose/quiz"]`로 캐스팅
  - 10문항 중 미응답 존재 시 "모든 문항에 답해주세요" 토스트, API 미호출
  - "진단 결과 보기" → `<TossRewardAd>` 시청 완료 후 `diagnose()` 호출
  - 대기 중 Spinner + "AI가 실력을 분석하고 있어요", 하단 버튼 비활성
  - API 에러 시 "진단에 실패했어요. 다시 시도해주세요" + "다시 시도" 버튼(크래시 없음)
  - 성공 시 profile을 `duotrack.profile` 저장 후 `navigate('/diagnose/result', { state: { profile } })`
- Covers: [F1-AC3, F1-AC6, F1-AC7, F1-AC8]
- Files: `src/pages/DiagnoseQuizPage.tsx`
- Depends on: Task 2.1, Task 2.4

### Task 3.4 진단 결과 화면 (S4 `/diagnose/result`) + 프로모션 지급
- Description: currentLevel CountUp SummaryHero + 취약 파트 Chip + AI 배지 표시. 진단 완료 시 프로모션 리워드 지급.
- DoD:
  - `location.state`를 `RouteState["/diagnose/result"]`로 캐스팅, state 누락 시 `/home` 리다이렉트
  - `data-testid="diagnose-hero"` SummaryHero(CountUp) + `data-testid="ai-badge"` "AI가 생성한 결과입니다" 배지 필수
  - 취약 파트 Chip 나열
  - 마운트 시 `grantPromo()` 호출(클램프 3000, 미지급 시에만) → 지급 완료/이미 지급 안내 토스트
  - "홈으로"(48px) → `navigate('/home')`
- Covers: [F1-AC4, F6-AC4]
- Files: `src/pages/DiagnoseResultPage.tsx`
- Depends on: Task 2.5

### Task 3.5 홈 대시보드 (S5 `/home`)
- Description: 진척도 요약 Card + SummaryHero + 각 기능 진입 CTA. 빈 상태/스켈레톤 처리. 하단 배너.
- DoD:
  - `data-testid="home-summary"` Card 1개
  - 로딩 시 스켈레톤, 기록 0건 시 "아직 학습 기록이 없어요. 첫 세션을 시작하세요"
  - CTA: 세션→`/session`, 리포트→`/report`, 문제생성→`/problems`, 점수입력→`/exams` (각 48px)
  - `<AdSlot>`를 콘텐츠 하단에 비겹침 배치
- Covers: [S5 골격 — 대시보드 진입 허브]
- Files: `src/pages/HomePage.tsx`
- Depends on: Task 2.2

### Task 3.6 학습 세션 타이머 UI (S6 `/session` — 타이머)
- Description: 25분 포모도로 타이머 구동 UI. 광고 컴포넌트 렌더 금지, 진행 인디케이터 1초 갱신.
- DoD:
  - "세션 시작" 시 25:00부터 카운트다운, `startedAt` 기록
  - 남은 시간(mm:ss) + 원형 진행 인디케이터(커스텀 flex 허용) 1초 간격 갱신
  - 화면 DOM에 AdSlot/TossRewardAd 요소 0개
  - 타이머 중앙 배치, ScreenScaffold 골격
- Covers: [F2-AC1, F2-AC2, F2-AC7]
- Files: `src/pages/SessionPage.tsx`
- Depends on: Task 2.2

### Task 3.7 세션 저장·한도 게이트 (S6 `/session` — 로직)
- Description: 세션 완주/중도이탈 저장, 무료 주간 한도 검증 및 초과 게이트, 저장 실패 처리를 SessionPage에 추가.
- DoD:
  - `weeklyFreeSessionsUsed<3` 또는 구독 시에만 시작; 무료·3회 소진 시 BottomSheet "이번 주 무료 세션을 모두 사용했어요…" + 구독 버튼, 시작 차단
  - 00:00 도달 시 `{durationSec:1500, completed:true}` 저장 + "25분 집중 완료!" 토스트 + 무료 시 `weeklyFreeSessionsUsed`+1
  - "그만두기"→AlertDialog 확인 시 `{completed:false, durationSec:경과초}` 저장, 한도 미차감
  - storage 저장이 quota 실패 반환 시 "저장 공간이 부족해요…" 토스트(크래시 없음)
  - 종료 시 `navigate('/home')`
- Covers: [F2-AC3, F2-AC4, F2-AC5, F2-AC6]
- Files: `src/pages/SessionPage.tsx`
- Depends on: Task 3.6, Task 2.1

### Task 3.8 점수 입력/목록 화면 (S7 `/exams`)
- Description: 실제/모의 점수 파트별 입력·검증·저장 + 이력 목록 + 모의시험 유료 게이트.
- DoD:
  - 정상 입력 시 `duotrack.exams` 저장 + "점수가 기록됐어요" 토스트 + 목록 추가
  - 파트 합 ≠ 총점 시 "파트 점수 합이 총점과 일치하지 않아요", 저장 차단
  - score 빈값/0 이하 시 "점수를 입력해주세요"
  - `takenAt`이 오늘(2026-07-24) 이후면 "응시일은 오늘 이전이어야 해요"
  - TextField `inputMode="numeric"`, 키보드가 입력 필드 미가림(스크롤 조정)
  - 0건 시 Asset.ContentIcon + "아직 기록된 점수가 없어요. 첫 점수를 입력해보세요"
  - 비구독 "모의시험 시작" 탭 시 BottomSheet "모의시험은 구독 전용 기능이에요" + 구독 버튼, 차단; 구독 시 `navigate('/problems',{state:{mode:"mock"}})`
- Covers: [F3-AC1, F3-AC2, F3-AC3, F3-AC4, F3-AC5, F3-AC6, F3-AC7]
- Files: `src/pages/ExamsPage.tsx`
- Depends on: Task 2.1, Task 2.2

### Task 3.9 AI 문제 생성/풀이 화면 (S8 `/problems`)
- Description: 취약 파트 문제 생성(데이터 부족 차단·보상형 광고 게이트·로딩·에러) + 채점/해설 + AI 배지.
- DoD:
  - `location.state`를 `RouteState["/problems"]`로 캐스팅
  - StudySession 5건 미만 시 "학습 데이터가 부족해요. 세션을 3회 이상 완료해주세요", API 미호출
  - "문제 생성"→로딩 완료 후 `<TossRewardAd>` 시청 완료 시 목록 표시
  - 대기 중 Spinner + "AI가 맞춤 문제를 만들고 있어요"
  - 성공 시 5개 GeneratedProblem을 `duotrack.problems` 저장·표시; 에러 시 "문제 생성에 실패했어요" + "다시 시도"(크래시 없음)
  - `data-testid="ai-badge"` "AI가 생성한 결과입니다" 배지 필수
  - 선택지(ListRow ≥48px), 정답 선택 시 "정답이에요" + 해설, 세션 correctCount +1
  - 완료 → `navigate('/home')`
- Covers: [F4-AC2, F4-AC3, F4-AC4, F4-AC5, F4-AC6, F4-AC8]
- Files: `src/pages/ProblemsPage.tsx`
- Depends on: Task 2.4, Task 2.5

### Task 3.10 ROI 리포트 화면 (S9 `/report`)
- Description: 시간당 효율/진척도/예측정확도 대시보드 + Sparkline + 유료 블러 게이트 + 빈 상태 + AI 배지 + 하단 배너.
- DoD:
  - `data-testid="roi-hero"` SummaryHero 1개(효율 CountUp) + `data-testid="roi-card"` Card 3개(효율/진척도/예측정확도) + Sparkline 1개
  - **`data-testid="ai-badge"` "AI가 생성한 결과입니다" 배지 필수** (ROI 리포트는 SPEC상 생성형 AI 결과물 → 배지 의무)
  - 효율=점수증가/총시간(예 8.0점/시간), 진척도=(현재-진단시작)/(목표-진단시작) 프로그레스 바, 예측오차=|모의-실제| "예측 정확도 오차 ±20점"
  - 총 학습시간 0시간 시 효율 "—" 표시(NaN/Infinity 없음)
  - 비구독 시 블러 미리보기 + "구독하고 전체 리포트 보기"→`navigate('/subscribe')`, 실수치 숨김
  - exams 0건 또는 sessions 0건 시 Asset.ContentIcon + "리포트를 만들 데이터가 아직 없어요", 계산 미실행
  - 구독자 스크롤 하단에 `<AdSlot>` 배너 비겹침 1개
- Covers: [F5-AC1, F5-AC2, F5-AC3, F5-AC4, F5-AC5, F5-AC6, F5-AC7, F5-AC8, F6-AC4]
- Files: `src/pages/ReportPage.tsx`
- Depends on: Task 2.5, Task 2.2

### Task 3.11 구독 화면 (S10 `/subscribe`)
- Description: 무료/유료 플랜 비교 + TossPurchase 결제 + 성공/취소/로딩 처리.
- DoD:
  - 플랜 비교 Card 2개(무료/유료 월 7,900원)
  - `<TossPurchase>` `onPurchased` 성공 시 `meta.isSubscribed=true` 저장 + "구독이 시작됐어요" 토스트 → `navigate('/home')`
  - 결제 취소 시 `isSubscribed` 불변 + "결제가 취소됐어요" 토스트(크래시 없음)
  - 결제 처리 중 버튼 비활성 + Spinner(중복 탭 방지)
- Covers: [F6-AC1, F6-AC3, F6-AC7]
- Files: `src/pages/SubscribePage.tsx`
- Depends on: Task 2.2

### Task 3.12 설정 화면 (S11 `/settings`)
- Description: 설정 항목 ListRow 그룹 + 다크모드 Switch + 용량 경고 + 오래된 기록 삭제.
- DoD:
  - 용량 4MB 초과 시(`isNearQuota()`) "저장 공간이 거의 찼어요. 오래된 기록을 정리하세요" 안내 표시
  - "6개월 이전 기록 삭제" 탭→AlertDialog 확인 시 2026-01-24 이전 StudySession 제거 + 성공 토스트
  - 다크모드 Switch(44px), 각 ListRow ≥48px
- Covers: [F7-AC5, F7-AC6]
- Files: `src/pages/SettingsPage.tsx`
- Depends on: Task 2.1, Task 2.3

> Risk — Epic 3
> - Complexity: High
> - Risk factors: (1) 페이지 간 `location.state` 불일치. (2) 세션 화면 광고 노출 위반 시 검수 반려(핵심 가치). (3) 리포트 `data-testid` 레이아웃 계약 누락. (4) reward ad 게이트 후에만 결과 노출하는 순서 위반. (5) AI 결과물(진단/문제/ROI) 배지 누락 시 검수 반려.
> - Mitigation: 모든 페이지가 1.1 RouteState로 캐스팅(계약 강제), 세션은 3.6/3.7에서 광고 컴포넌트 자체를 import하지 않도록 격리, 리포트/배지 testid를 DoD에 명시하고 AI 결과물 3개 화면(3.4/3.9/3.10) 전부에 `ai-badge` 강제, TossRewardAd로 결과를 children 감싸 순서 보장.

---

## Epic 4. Integration + Polish

### Task 4.1 라우터 배선 + 온보딩 리다이렉트 + 주간 리셋 트리거
- Description: react-router-dom으로 11개 화면 라우팅, FloatingTabBar(템플릿) 연결, 앱 진입 시 주간 카운터 리셋 실행, AppStoreProvider 최상위 래핑.
- DoD:
  - `src/App.tsx`에 11개 Route 등록(`/`, `/diagnose`, `/diagnose/quiz`, `/diagnose/result`, `/home`, `/session`, `/exams`, `/problems`, `/report`, `/subscribe`, `/settings`) — 1.1 RouteState 키 집합과 1:1 일치
  - 미온보딩 시 `/`, 온보딩 후 `/home` 진입
  - 앱 마운트 시 `maybeResetWeek(meta, now)` 1회 실행 후 저장(지난 주 앵커 시 `weeklyFreeSessionsUsed=0`, weekAnchor 이번 주 월요일 갱신)
  - FloatingTabBar(홈/세션/리포트/설정 등) 각 탭 44px, 라우팅 연결
  - 전 화면 AppStoreProvider 하위 렌더
- Covers: [F7-AC1]
- Files: `src/App.tsx`, `src/components/FloatingTabBar/index.tsx`
- Depends on: Task 3.1, Task 3.2, Task 3.3, Task 3.4, Task 3.5, Task 3.6, Task 3.7, Task 3.8, Task 3.9, Task 3.10, Task 3.11, Task 3.12, Task 2.3

### Task 4.2 광고 배치 감사 + 최종 UX 점검
- Description: 광고 정책 준수를 최종 검증한다. 세션 화면 광고 0개, 결과/리포트 화면에만 배너·보상형 배치, 다크모드/터치타겟/HEX 하드코딩 점검.
- DoD:
  - `/session` DOM에 AdSlot/TossRewardAd 요소 0개 확인
  - `/report` 구독자 콘텐츠 하단 AdSlot 배너 1개(비겹침), `/diagnose/quiz`·`/problems` 결과 게이트로만 TossRewardAd 사용
  - AI 결과물 3개 화면(`/diagnose/result`·`/problems`·`/report`) 모두 `data-testid="ai-badge"` 존재 확인
  - 전 화면 인터랙티브 요소 ≥44px, HEX 하드코딩 0(모두 `var(--tds-color-*)`/TDS), 다크모드 정상
  - 외부 URL(`window.open`/`location.href`) 사용 0
- Covers: [F2-AC2, F5-AC8]
- Files: `src/pages/SessionPage.tsx`, `src/pages/ReportPage.tsx`
- Depends on: Task 4.1

> Risk — Epic 4
> - Complexity: Medium
> - Risk factors: (1) 라우팅 배선 오류로 state 전달 누락. (2) 광고 정책 위반(세션 중 광고)으로 검수 반려. (3) 주간 리셋 트리거 위치 오류로 이중 실행. (4) AI 배지 누락 잔존.
> - Mitigation: 4.1이 모든 페이지 완료 후 배선(의존성 강제)하고 Route 키를 1.1 RouteState와 대조, 4.2를 마지막 전용 감사 패킷으로 분리해 광고/정책 위반 + AI 배지 누락을 출시 전 일괄 차단, 리셋을 앱 마운트 1회 idempotent 함수로 호출.

---

## AC Coverage

- Total ACs in SPEC: 52 (F1:8, F2:8, F3:7, F4:8, F5:8, F6:7, F7:6)
- Covered by tasks: 52
  - F1: AC1→3.2, AC2→3.2, AC3→3.3, AC4→3.4, AC5→3.2, AC6→3.3·2.4, AC7→3.3, AC8→3.3
  - F2: AC1→3.6, AC2→3.6·4.2, AC3→3.7, AC4→3.7, AC5→3.7, AC6→3.7, AC7→3.6, AC8→2.1
  - F3: AC1→3.8, AC2→3.8, AC3→3.8, AC4→3.8, AC5→3.8, AC6→3.8, AC7→3.8
  - F4: AC1→2.5, AC2→3.9, AC3→3.9, AC4→3.9, AC5→3.9, AC6→3.9, AC7→2.4·3.9, AC8→3.9
  - F5: AC1→3.10, AC2→3.10, AC3→3.10, AC4→3.10, AC5→3.10, AC6→3.10, AC7→2.5·3.10, AC8→3.10·4.2
  - F6: AC1→3.11, AC2→2.2, AC3→3.11, AC4→3.4·3.10, AC5→2.5, AC6→2.5, AC7→3.11
  - F7: AC1→2.3·4.1, AC2→2.1, AC3→2.1, AC4→2.2, AC5→2.3·3.12, AC6→3.12
- Uncovered: 0 ✅

---

### Changes made vs. prior version
1. **Task 1.1 RouteState** — added `/` and `/settings` keys (was 9 routes, now all 11); Epic 1 risk/mitigation updated to enforce 1:1 with the router.
2. **Task 3.10 ROI report** — added mandatory `data-testid="ai-badge"` (SPEC requires the badge on *all* AI outputs, ROI included); added **F6-AC4** to its Covers.
3. **Task 4.1** — spelled out all 11 Route paths and added a key-set cross-check against RouteState.
4. **Task 4.2** — added an explicit audit step verifying the AI badge on all three AI-output screens.
5. Epic 3/4 risk notes updated to include the AI-badge failure mode.

The other 5 report issues (F1/F4/F5 "missing", monetization, disclosure, Epic 3+/4 "missing") were false positives caused by the truncated excerpts the cross-validator was given — all were already covered in the full plan. AC coverage remains 52/52.