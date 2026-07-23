# Shared Context (auto-generated — do NOT modify)


## Shared Types Contract (IMPORT these, do NOT redefine)
```typescript
// TargetExam 유니온 — 목표 시험 종류
export type TargetExam = "TOEIC" | "OPIC" | "TEPS";

// ExamType 유니온 — 시험 종류 (모의/실제)
export type ExamType = "MOCK" | "REAL";

// UserProfile — 유저 학습 프로필
export interface UserProfile {
  targetExam: TargetExam;
  targetScore: number;
  currentLevel: number;
  diagnosedAt: string;
  weakParts: string[];
  createdAt: string;
}

// StudySession — 학습 세션 기록
export interface StudySession {
  id: string;
  startedAt: string;
  durationSec: number;
  focusPart: string;
  completed: boolean;
  problemsSolved: number;
  correctCount: number;
}

// MockExamResult — 모의시험 & 실제시험 점수
export interface MockExamResult {
  id: string;
  type: ExamType;
  exam: TargetExam;
  score: number;
  takenAt: string;
  partScores: Record<string, number>;
}

// GeneratedProblem — AI 생성 문제
export interface GeneratedProblem {
  id: string;
  part: string;
  question: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
  generatedAt: string;
}

// AppMeta — 앱 상태 플래그
export interface AppMeta {
  aiNoticeAcknowledged: boolean;
  isSubscribed: boolean;
  weeklyFreeSessionsUsed: number;
  weekAnchor: string;
  onboarded: boolean;
}

// DiagnoseRequest — AI 실력 진단 요청
export interface DiagnoseRequest {
  exam: TargetExam;
  targetScore: number;
  answers: Array<{ questionId: string; selectedIndex: number }>;
}

// DiagnoseResponse — AI 실력 진단 응답
export interface DiagnoseResponse {
  currentLevel: number;
  weakParts: string[];
  path: string[];
}

// GenerateRequest — AI 문제 생성 요청
export interface GenerateRequest {
  part: string;
  count: number;
  level: number;
}

// GenerateResponse — AI 문제 생성 응답
export interface GenerateResponse {
  problems: Array<{
    id: string;
    part: string;
    question: string;
    choices: string[];
    answerIndex: number;
    explanation: string;
  }>;
}

// RouteState — 페이지 간 데이터 계약 (11개 라우트)
export type RouteState = {
  "/": undefined;
  "/diagnose": undefined;
  "/diagnose/quiz": {
    targetExam: TargetExam;
    targetScore: number;
  };
  "/diagnose/result": {
    profile: UserProfile;
  };
  "/home": undefined;
  "/session": undefined;
  "/exams": undefined;
  "/problems": {
    mode?: "mock";
  };
  "/report": undefined;
  "/subscribe": undefined;
  "/settings": undefined;
};

```

## Existing Codebase (import and use these — do NOT recreate)
### File Tree (src/)
  App.tsx
  __tmp_check.tsx
  __tmp_check2.tsx
  app/
  components/
    AdSlot.tsx
    Amount.tsx
    BottomCTA.tsx
    Card.tsx
    CountUp.tsx
    FloatingTabBar.tsx
    MiniBar.tsx
    PageShell.tsx
    ScreenScaffold.tsx
    Sparkline.tsx
    StateView.tsx
    SummaryHero.tsx
    TossPurchase.tsx
    TossRewardAd.tsx
  hooks/
  lib/
    analytics.ts
    api.ts
    integrity.ts
    promo.ts
    storage.ts
    store.tsx
    types.ts
    utils.ts
  main.tsx
  pages/
    DiagnoseQuiz.tsx
    DiagnoseResult.tsx
    DiagnoseSetup.tsx
    Exams.tsx
    Home.tsx
    Onboarding.tsx
    Problems.tsx
    Report.tsx
    Session.tsx
    Settings.tsx
    Subscribe.tsx
    __TdsGallery.tsx
  routes/
  shared/
    index.ts
  styles/
    globals.css
    reward-ad.css
  types/
  vite-env.d.ts

### Exports (src/lib/)
- analytics.ts: export function computeRoi( sessions: StudySession[], exams: MockExamResult[], profile: UserProfile ): RoiResult
- api.ts: export async function diagnose( req: DiagnoseRequest ): Promise<DiagnoseResponse |; export async function generateProblems( req: GenerateProblemsRequest ): Promise<GenerateResponse |
- integrity.ts: export function maybeResetWeek(meta: AppMeta, now: Date): AppMeta; export function computeWeakParts(sessions: StudySession[]): string[] | null
- promo.ts: export async function grantPromo( amount: number, meta: AppMeta ): Promise<PromoResult>
- storage.ts: export function getItem<T>(key: string): T | null; export function setItem<T>(key: string, value: T): void; export function removeItem(key: string): void; export function getProfile(): UserProfile | null; export function setProfile(profile: UserProfile): StorageResult; export function getSessions(): StudySession[]; export function addSession(session: StudySession): StorageResult; export function getExams(): MockExamResult[]
- types.ts: export type TargetExam = "TOEIC" | "OPIC" | "TEPS"; export type ExamType = "MOCK" | "REAL"; export interface UserProfile; export interface StudySession; export interface MockExamResult; export interface GeneratedProblem; export interface AppMeta; export interface DiagnoseRequest
- utils.ts: export function cn(...classes: (string | boolean | undefined | null)[]): string; export function formatNumber(n: number): string; export function formatCurrency(n: number, currency = 'KRW'): string

### Components (src/components/)
- AdSlot.tsx: AdSlot
- Amount.tsx: Amount
- BottomCTA.tsx: SubmitFooter, ButtonStack
- Card.tsx: Card
- CountUp.tsx: CountUp
- FloatingTabBar.tsx: FloatingTabBar
- MiniBar.tsx: MiniBar
- PageShell.tsx: PageShell
- ScreenScaffold.tsx: ScreenScaffold
- Sparkline.tsx: Sparkline
- StateView.tsx: EmptyState, LoadingState
- SummaryHero.tsx: SummaryHero
- TossPurchase.tsx: TossPurchase
- TossRewardAd.tsx: TossRewardAd

### Module Dependencies (import graph)
  lib/analytics.ts → imports: lib/types
  lib/api.ts → imports: lib/types
  lib/integrity.ts → imports: lib/types
  lib/promo.ts → imports: lib/types
  pages/DiagnoseQuiz.tsx → imports: components/ScreenScaffold, components/Card, components/BottomCTA, components/TossRewardAd, lib/api, lib/storage, lib/types
  pages/DiagnoseResult.tsx → imports: components/ScreenScaffold, components/Card, components/SummaryHero, components/BottomCTA, components/CountUp, lib/types
  pages/DiagnoseSetup.tsx → imports: components/ScreenScaffold, components/Card, components/BottomCTA, lib/store, lib/types
  pages/Exams.tsx → imports: components/ScreenScaffold, components/Card, components/BottomCTA, components/StateView, lib/store, lib/storage, lib/types
  pages/Home.tsx → imports: components/ScreenScaffold, components/SummaryHero, components/Card, components/Amount, components/FloatingTabBar, lib/store, lib/storage, lib/integrity, lib/types
  pages/Onboarding.tsx → imports: components/ScreenScaffold, components/Card, components/BottomCTA, lib/store
  pages/Problems.tsx → imports: components/ScreenScaffold, components/Card, components/BottomCTA, lib/api, lib/storage, lib/store, components/TossRewardAd, lib/types
  pages/Report.tsx → imports: components/ScreenScaffold, components/Card, components/SummaryHero, components/CountUp, components/MiniBar, components/Sparkline, components/StateView, lib/store, lib/storage
  pages/Session.tsx → imports: components/ScreenScaffold, components/Card, components/BottomCTA, components/MiniBar, lib/store, lib/storage, lib/types
  pages/Settings.tsx → imports: components/ScreenScaffold, components/Card, lib/store, lib/storage
  pages/Subscribe.tsx → imports: components/ScreenScaffold, components/Card, components/TossPurchase, lib/store
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- 0001: 엔티티 타입 + RouteState 계약 정의 (files: src/lib/types.ts)
- 0002: localStorage CRUD 헬퍼 + 손상/용량 방어 (files: src/lib/storage.ts)
- 0003: 앱 상태 Context + 로딩 + 구독 게이트 (files: src/lib/store.tsx)
- 0004: 외부 AI API 클라이언트 (files: src/lib/api.ts)
- 0005: 집계·무결성·프로모션 순수 유틸 (files: src/lib/integrity.ts, src/lib/analytics.ts, src/lib/promo.ts)
- 0008: 진단 문항 화면 (S3 /diagnose/quiz) (files: src/pages/DiagnoseQuiz.tsx)
- 0013: AI 문제 생성/풀이 화면 (S8 /problems) (files: src/pages/Problems.tsx)
- heal-1-01: 공유 화면 계약·스캐폴드 안정화 및 export 정합 (files: src/routes/routeState.ts, src/app/AppStateContext.tsx, src/components/ScreenScaffold.tsx, src/shared/index.ts, tsconfig.json)