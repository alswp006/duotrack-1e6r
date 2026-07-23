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
    api.ts
    storage.ts
    types.ts
    utils.ts
  main.tsx
  pages/
    Home.tsx
    __TdsGallery.tsx
  styles/
    globals.css
    reward-ad.css
  types/
  vite-env.d.ts

### Exports (src/lib/)
- api.ts: export async function diagnose( req: DiagnoseRequest ): Promise<DiagnoseResponse |; export async function generateProblems( req: GenerateProblemsRequest ): Promise<GenerateResponse |
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
  lib/api.ts → imports: lib/types
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- 0001: 엔티티 타입 + RouteState 계약 정의 (files: src/lib/types.ts)
- 0004: 외부 AI API 클라이언트 (files: src/lib/api.ts)
- 0002: localStorage CRUD 헬퍼 + 손상/용량 방어 (files: src/lib/storage.ts)
- 0003: 앱 상태 Context + 로딩 + 구독 게이트 (files: src/lib/store.tsx)
- 0005: 집계·무결성·프로모션 순수 유틸 (files: src/lib/integrity.ts, src/lib/analytics.ts, src/lib/promo.ts)