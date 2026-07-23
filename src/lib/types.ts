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
