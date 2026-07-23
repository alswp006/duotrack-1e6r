import type {
  UserProfile,
  StudySession,
  MockExamResult,
  GeneratedProblem,
  AppMeta,
} from "./types";

type StorageResult = { ok: false; reason: string } | undefined;

// Generic helpers
export function getItem<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function removeItem(key: string): void {
  localStorage.removeItem(key);
}

// Profile CRUD
export function getProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem("duotrack.profile");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setProfile(profile: UserProfile): StorageResult {
  try {
    localStorage.setItem("duotrack.profile", JSON.stringify(profile));
  } catch (e) {
    if (e instanceof Error && e.name === "QuotaExceededError") {
      return { ok: false, reason: "quota" };
    }
    throw new Error(`Storage error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// Sessions CRUD
export function getSessions(): StudySession[] {
  try {
    const raw = localStorage.getItem("duotrack.sessions");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addSession(session: StudySession): StorageResult {
  try {
    const existing = getSessions();
    const updated = [...existing, session];
    localStorage.setItem("duotrack.sessions", JSON.stringify(updated));
  } catch (e) {
    if (e instanceof Error && e.name === "QuotaExceededError") {
      return { ok: false, reason: "quota" };
    }
    throw new Error(`Storage error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// Exams CRUD
export function getExams(): MockExamResult[] {
  try {
    const raw = localStorage.getItem("duotrack.exams");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addExam(exam: MockExamResult): StorageResult {
  try {
    const existing = getExams();
    const updated = [...existing, exam];
    localStorage.setItem("duotrack.exams", JSON.stringify(updated));
  } catch (e) {
    if (e instanceof Error && e.name === "QuotaExceededError") {
      return { ok: false, reason: "quota" };
    }
    throw new Error(`Storage error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// Problems CRUD (with 100-item limit)
export function getProblems(): GeneratedProblem[] {
  try {
    const raw = localStorage.getItem("duotrack.problems");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addProblem(problem: GeneratedProblem): StorageResult {
  try {
    const existing = getProblems();
    const updated = [...existing, problem];

    // Evict oldest items if exceeding 100
    if (updated.length > 100) {
      const evicted = updated.slice(updated.length - 100);
      localStorage.setItem("duotrack.problems", JSON.stringify(evicted));
    } else {
      localStorage.setItem("duotrack.problems", JSON.stringify(updated));
    }
  } catch (e) {
    if (e instanceof Error && e.name === "QuotaExceededError") {
      return { ok: false, reason: "quota" };
    }
    throw new Error(`Storage error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// Meta CRUD
const DEFAULT_META: AppMeta = {
  aiNoticeAcknowledged: false,
  isSubscribed: false,
  weeklyFreeSessionsUsed: 0,
  weekAnchor: new Date().toISOString().split("T")[0],
  onboarded: false,
};

export function getMeta(): AppMeta {
  try {
    const raw = localStorage.getItem("duotrack.meta");
    return raw ? JSON.parse(raw) : DEFAULT_META;
  } catch {
    return DEFAULT_META;
  }
}

export function setMeta(meta: AppMeta): StorageResult {
  try {
    localStorage.setItem("duotrack.meta", JSON.stringify(meta));
  } catch (e) {
    if (e instanceof Error && e.name === "QuotaExceededError") {
      return { ok: false, reason: "quota" };
    }
    throw new Error(`Storage error: ${e instanceof Error ? e.message : String(e)}`);
  }
}
