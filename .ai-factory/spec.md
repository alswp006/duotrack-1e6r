I'll expand the DuoTrack PRD into a detailed SPEC following the template exactly.

# SPEC — DuoTrack

## Common Principles

- **Tech Stack**: Vite + React + TypeScript, TDS(@toss/tds-mobile) UI 전용, React Router(react-router-dom) 클라이언트 라우팅, localStorage 데이터 영속화.
- **인증**: 토스 앱이 세션 자동 제공. 별도 로그인 함수 호출 없음. 유저 식별 필요 시 `getIsTossLoginIntegratedService()`로 통합 여부만 확인.
- **AI 고지 의무**: 실력 진단·취약 파트 감지·문제 자동 생성·ROI 리포트는 생성형 AI 결과물 → 첫 이용 시 "이 서비스는 생성형 AI를 활용합니다" 고지 1회, 모든 AI 결과물에 "AI가 생성한 결과입니다" 배지 필수.
- **수익화**: freemium. 무료(주 3회 세션 + 기본 진단), 유료(월 7,900원 = 무제한 세션 + 모의시험 + ROI 리포트). 구독은 `<TossPurchase>` (IAP) 사용.
- **광고 정책**: 학습 세션 중에는 광고 절대 없음(제품 핵심 가치). 광고는 결과/리포트 화면에서 `<AdSlot>`(배너) 및 `<TossRewardAd>`(보상형 게이트)로만 배치.
- **색상**: HEX 하드코딩 금지 → `var(--tds-color-*)` 또는 TDS 컴포넌트만. 다크모드 필수.
- **외부 이탈 금지**: `window.location.href`/`window.open` 외부 URL 차단. 외부 분석 솔루션(GA·Amplitude) 미사용.
- **터치 타겟**: 모든 인터랙티브 요소 ≥ 44px.
- **레이아웃 골격**: 모든 화면은 ScreenScaffold(PageShell)로 감싸며 raw div 골격 금지. 1차 액션은 SubmitFooter(하단 고정) 또는 display="block" 버튼.
- **데이터 저장**: 전량 localStorage. 총 용량 5MB 미만 유지.

---

## Data Models

### UserProfile — 유저 학습 프로필
```typescript
interface UserProfile {
  targetExam: "TOEIC" | "OPIC" | "TEPS";   // 목표 시험
  targetScore: number;                      // 목표 점수 (TOEIC 10~990, OPIC IL~AL 매핑값, TEPS 10~600)
  currentLevel: number;                     // AI 진단 현재 실력 점수 (0~990 정규화)
  diagnosedAt: string;                      // ISO8601 진단 완료 시각
  weakParts: string[];                      // 취약 파트 태그 배열 (예: ["LC_Part2","RC_Part5"])
  createdAt: string;                        // ISO8601
}
```
- **localStorage key**: `duotrack.profile`
- **shape**: 단일 객체 JSON
- **size**: ~0.4KB

### StudySession — 학습 세션 기록
```typescript
interface StudySession {
  id: string;                    // crypto.randomUUID()
  startedAt: string;             // ISO8601
  durationSec: number;           // 실제 학습 시간(초). 포모도로 25분=1500
  focusPart: string;             // 학습 파트 태그
  completed: boolean;            // 25분 완주 여부
  problemsSolved: number;        // 푼 문제 수
  correctCount: number;          // 정답 수
}
```
- **localStorage key**: `duotrack.sessions`
- **shape**: `StudySession[]` (최신순 정렬)
- **size**: ~0.2KB/건, 500건 기준 ~100KB

### MockExamResult — 모의시험 & 실제시험 점수
```typescript
interface MockExamResult {
  id: string;                    // crypto.randomUUID()
  type: "MOCK" | "REAL";         // 모의 or 실제 시험
  exam: "TOEIC" | "OPIC" | "TEPS";
  score: number;                 // 취득 점수
  takenAt: string;               // ISO8601 응시일
  partScores: Record<string, number>; // 파트별 점수 (예: {"LC":350,"RC":320})
}
```
- **localStorage key**: `duotrack.exams`
- **shape**: `MockExamResult[]`
- **size**: ~0.3KB/건, 200건 기준 ~60KB

### GeneratedProblem — AI 생성 문제
```typescript
interface GeneratedProblem {
  id: string;
  part: string;                  // 파트 태그
  question: string;
  choices: string[];             // 4지선다
  answerIndex: number;           // 정답 인덱스 (0~3)
  explanation: string;           // AI 해설
  generatedAt: string;           // ISO8601
}
```
- **localStorage key**: `duotrack.problems`
- **shape**: `GeneratedProblem[]` (최근 100문항만 유지, 초과 시 오래된 것 제거)
- **size**: ~0.6KB/건, 100건 ~60KB

### AppMeta — 앱 상태 플래그
```typescript
interface AppMeta {
  aiNoticeAcknowledged: boolean; // AI 고지 확인 여부
  isSubscribed: boolean;         // 구독 상태
  weeklyFreeSessionsUsed: number;// 이번 주 무료 세션 사용 수
  weekAnchor: string;            // 주간 카운터 기준일(ISO8601, 월요일)
  onboarded: boolean;            // 온보딩 완료 여부
}
```
- **localStorage key**: `duotrack.meta`
- **shape**: 단일 객체
- **size**: ~0.2KB

**총 용량 추정**: 최악 ~280KB << 5MB ✅

---

## Feature List

### F1. 목표 시험 설정 & AI 실력 진단

- **Description**: 사용자가 목표 시험(토익/오픽/텝스)과 목표 점수를 설정하면 간단한 진단 문항 응답을 바탕으로 AI가 현재 실력을 추정하고 맞춤 학습 경로(취약 파트 포함)를 설계한다. 진단 결과는 UserProfile로 저장되어 이후 모든 리포트의 기준선이 된다.
- **Data**: UserProfile, AppMeta, GeneratedProblem(진단 문항)
- **API**: `POST /diagnose {answers: DiagnoseAnswer[], exam: string} → {currentLevel: number, weakParts: string[], path: string[]} | {error: string}` (외부 AI API)
- **Requirements**:
- AC-1 [E][P0]: Scenario: AI 서비스 첫 이용 고지
  - Given 사용자가 진단 기능을 처음 사용할 때 (`meta.aiNoticeAcknowledged === false`)
  - When 진단 화면 진입
  - Then "이 서비스는 생성형 AI를 활용합니다" AlertDialog가 1회 표시됨
  - And 확인 버튼 탭 후 `localStorage.duotrack.meta.aiNoticeAcknowledged = true` 저장
- AC-2 [E][P0]: Scenario: 목표 설정 저장
  - Given 토스 로그인된 유저가 진단 화면에 있을 때
  - When `{ targetExam: "TOEIC", targetScore: 800 }` 선택 후 진단 시작
  - Then 진단 문항 화면으로 이동하고 입력값이 임시 보관됨
- AC-3 [E][P0]: Scenario: AI 진단 완료 및 프로필 저장
  - Given 진단 문항 10개에 모두 응답했을 때
  - When "진단 결과 보기" 탭 → TossRewardAd 광고 시청 완료
  - Then `POST /diagnose` 호출 결과 `{ currentLevel: 620, weakParts: ["LC_Part2"] }`가 `duotrack.profile`에 저장되고 결과 화면 표시
- AC-4 [U][P0]: Scenario: AI 결과물 라벨 표시
  - Given AI 진단 결과가 화면에 표시될 때
  - Then 결과 카드 상단에 "AI가 생성한 결과입니다" 배지가 표시됨
- AC-5 [W][P1]: Scenario: 목표 점수 범위 초과 거부
  - Given TOEIC 선택 상태일 때
  - When `targetScore: 1200` 입력 후 진단 시작 탭
  - Then 에러 메시지 "목표 점수는 10~990 사이여야 합니다" 표시, 진행 차단
- AC-6 [W][P1]: Scenario: AI API 실패 처리
  - Given 진단 결과 요청 중일 때
  - When `POST /diagnose`가 500 또는 네트워크 에러 반환
  - Then 에러 문구 "진단에 실패했어요. 다시 시도해주세요" + "다시 시도" 버튼 표시, 크래시 없음
- AC-7 [S][P1]: Scenario: 진단 로딩 상태
  - While `POST /diagnose` 응답 대기 중일 때
  - Then TDS Spinner와 "AI가 실력을 분석하고 있어요" 문구 표시, 하단 버튼 비활성화
- AC-8 [W][P1]: Scenario: 미응답 문항 제출 차단
  - Given 진단 문항 10개 중 3개 미응답 상태일 때
  - When "진단 결과 보기" 탭
  - Then 에러 토스트 "모든 문항에 답해주세요" 표시, API 호출 안 함

---

### F2. 광고 없는 집중 학습 세션 (포모도로)

- **Description**: 25분 포모도로 타이머 기반의 무광고 집중 학습 세션을 제공한다. 세션 도중에는 배너/전면 광고를 절대 노출하지 않으며, 완주 시 StudySession으로 기록된다. 무료 사용자는 주 3회로 제한되고 구독 시 무제한이다.
- **Data**: StudySession, AppMeta
- **API**: 없음 (로컬 처리)
- **Requirements**:
- AC-1 [E][P0]: Scenario: 세션 시작 및 타이머 구동
  - Given `meta.weeklyFreeSessionsUsed < 3` 또는 `isSubscribed === true`일 때
  - When "세션 시작" 버튼 탭
  - Then 25:00부터 카운트다운 시작, `startedAt` 기록
- AC-2 [U][P0]: Scenario: 세션 중 광고 완전 차단
  - Given 학습 세션이 진행 중일 때
  - Then 화면에 AdSlot/TossRewardAd 컴포넌트가 렌더링되지 않음 (DOM에 광고 요소 0개)
- AC-3 [E][P0]: Scenario: 세션 완주 기록 저장
  - Given 타이머가 00:00에 도달했을 때
  - When 세션 자동 종료
  - Then `{ durationSec: 1500, completed: true }` StudySession이 `duotrack.sessions`에 추가되고 성공 토스트 "25분 집중 완료!" 표시
- AC-4 [E][P0]: Scenario: 무료 주간 한도 증가
  - Given 무료 사용자가 세션을 완주했을 때
  - When 저장 완료
  - Then `meta.weeklyFreeSessionsUsed`가 1 증가
- AC-5 [W][P1]: Scenario: 무료 한도 초과 차단
  - Given `isSubscribed === false` 이고 `weeklyFreeSessionsUsed === 3`일 때
  - When "세션 시작" 탭
  - Then BottomSheet로 "이번 주 무료 세션을 모두 사용했어요. 구독하면 무제한이에요" + 구독 버튼 표시, 세션 시작 차단
- AC-6 [W][P1]: Scenario: 중도 이탈 미완주 처리
  - Given 세션 진행 중(예: 12:30 남음)일 때
  - When 사용자가 "그만두기" 탭 후 확인
  - Then `{ completed: false, durationSec: 750 }`로 저장, 주간 한도 미차감
- AC-7 [S][P1]: Scenario: 세션 진행 상태 표시
  - While 타이머 구동 중일 때
  - Then 남은 시간(mm:ss)과 진행 원형 인디케이터가 1초 간격으로 갱신됨
- AC-8 [W][P1]: Scenario: localStorage 저장 실패 처리
  - Given 세션 저장 시 localStorage 용량 초과(QuotaExceededError)일 때
  - When 저장 시도
  - Then 에러 토스트 "저장 공간이 부족해요. 오래된 기록을 정리해주세요" 표시, 앱 크래시 없음

---

### F3. 모의시험 & 실제시험 점수 입력

- **Description**: 사용자가 모의시험 응시 결과와 실제 시험(토익/오픽/텝스) 점수를 파트별로 입력·저장한다. 저장된 점수는 예측 정확도 및 ROI 분석의 원천 데이터가 된다. 모의시험 응시는 유료 기능이다.
- **Data**: MockExamResult, AppMeta
- **API**: 없음 (점수 입력) / 모의시험 문제는 F4 생성 API 재사용
- **Requirements**:
- AC-1 [E][P0]: Scenario: 실제 점수 입력 저장
  - Given 토스 로그인된 유저가 점수 입력 폼에 있을 때
  - When `{ type: "REAL", exam: "TOEIC", score: 780, partScores: {"LC":400,"RC":380} }` 제출
  - Then `duotrack.exams`에 저장되고 성공 토스트 "점수가 기록됐어요" 표시, 목록에 추가
- AC-2 [W][P1]: Scenario: 파트 점수 합 불일치 거부
  - Given TOEIC 입력 상태일 때
  - When `score: 780`, `partScores: {"LC":400,"RC":300}` (합 700 ≠ 780) 제출
  - Then 에러 메시지 "파트 점수 합이 총점과 일치하지 않아요" 표시, 저장 차단
- AC-3 [W][P1]: Scenario: 빈 점수 거부
  - Given 점수 입력 폼에서
  - When `score` 필드가 비어있거나 0 이하로 제출
  - Then 에러 메시지 "점수를 입력해주세요" 표시
- AC-4 [O][P0]: Scenario: 모의시험 응시 유료 게이트
  - Where `isSubscribed === false`일 때
  - When "모의시험 시작" 탭
  - Then BottomSheet로 "모의시험은 구독 전용 기능이에요" + 구독 버튼 표시, 시작 차단
- AC-5 [S][P1]: Scenario: 점수 목록 빈 상태
  - While 저장된 MockExamResult가 0건일 때
  - Then Asset.ContentIcon과 "아직 기록된 점수가 없어요. 첫 점수를 입력해보세요" 안내 표시
- AC-6 [E][P0]: Scenario: 모바일 키보드 숫자 입력
  - Given 점수 입력 TextField에 포커스될 때
  - Then `inputMode="numeric"` 키보드가 표시되고, 키보드가 입력 필드를 가리지 않도록 스크롤 조정됨
- AC-7 [W][P1]: Scenario: 미래 날짜 응시일 거부
  - Given `takenAt`에 오늘(2026-07-24) 이후 날짜 입력 시
  - When 제출
  - Then 에러 메시지 "응시일은 오늘 이전이어야 해요" 표시

---

### F4. 취약 파트 감지 & AI 문제 자동 생성

- **Description**: 저장된 세션·시험 데이터에서 정답률이 낮은 파트를 자동 감지하고, 해당 파트를 집중 공략하는 4지선다 문제를 AI로 생성한다. 생성된 문제 풀이 결과는 다시 세션 정답률에 반영되어 취약 파트 감지 정확도를 높인다.
- **Data**: GeneratedProblem, StudySession, UserProfile
- **API**: `POST /generate-problems {part: string, count: number, level: number} → {problems: GeneratedProblem[]} | {error: string}` (외부 AI API)
- **Requirements**:
- AC-1 [U][P0]: Scenario: 취약 파트 자동 계산
  - Given StudySession이 5건 이상 존재할 때
  - Then 파트별 정답률(correctCount/problemsSolved)을 계산하여 최저 파트를 `profile.weakParts[0]`로 갱신
- AC-2 [E][P0]: Scenario: 결과 보기 전 보상형 광고 게이트
  - Given 사용자가 "취약 파트 문제 생성" 탭 후 로딩 완료
  - When TossRewardAd 광고 시청 완료
  - Then 생성된 문제 목록 화면이 표시됨
- AC-3 [E][P0]: Scenario: AI 문제 생성 저장
  - Given `weakParts[0] === "LC_Part2"`일 때
  - When `POST /generate-problems {part:"LC_Part2", count:5, level:620}` 성공
  - Then 5개 GeneratedProblem이 `duotrack.problems`에 저장되고 목록 표시
- AC-4 [U][P0]: Scenario: AI 결과물 라벨 표시
  - Given AI 생성 문제가 화면에 표시될 때
  - Then 문제 목록 상단에 "AI가 생성한 결과입니다" 배지 표시
- AC-5 [E][P1]: Scenario: 문제 풀이 정답 채점
  - Given 생성 문제 화면에서 문제의 `answerIndex === 2`일 때
  - When 사용자가 3번(index 2) 선택
  - Then "정답이에요" 표시 + 해설 노출, 해당 세션 correctCount +1
- AC-6 [W][P1]: Scenario: 데이터 부족 시 생성 차단
  - Given StudySession이 5건 미만일 때
  - When "취약 파트 문제 생성" 탭
  - Then 안내 "학습 데이터가 부족해요. 세션을 3회 이상 완료해주세요" 표시, API 미호출
- AC-7 [W][P1]: Scenario: AI 생성 실패 처리
  - Given 문제 생성 요청 중일 때
  - When `POST /generate-problems`가 에러 반환
  - Then "문제 생성에 실패했어요" + "다시 시도" 버튼 표시, 크래시 없음
- AC-8 [S][P1]: Scenario: 문제 생성 로딩 상태
  - While `POST /generate-problems` 대기 중일 때
  - Then TDS Spinner + "AI가 맞춤 문제를 만들고 있어요" 표시

---

### F5. ROI 리포트 (시간당 점수 향상 효율)

- **Description**: 누적 학습 시간과 시험 점수 변화를 결합해 '시간당 점수 향상 효율'을 계산·시각화하는 유료 리포트다. 목표 점수까지의 진척도, 예측 정확도(모의 vs 실제), 파트별 추이를 대시보드로 제공한다. 학습 ROI를 객관적 수치로 증명하는 앱의 핵심 가치 화면이다.
- **Data**: StudySession, MockExamResult, UserProfile
- **API**: 없음 (로컬 집계)
- **Requirements**:
- AC-1 [O][P0]: Scenario: 리포트 유료 게이트
  - Where `isSubscribed === false`일 때
  - When ROI 리포트 화면 진입
  - Then 블러 처리된 미리보기 + "구독하고 전체 리포트 보기" 버튼 표시, 실제 수치 숨김
- AC-2 [U][P0]: Scenario: 시간당 효율 계산
  - Given 총 학습시간 20시간, 점수 620→780(+160) 데이터가 있을 때
  - Then 시간당 효율 = 160/20 = 8.0점/시간이 SummaryHero에 CountUp으로 표시됨
- AC-3 [U][P0]: Scenario: 목표 진척도 계산
  - Given `currentLevel: 780, targetScore: 800, 진단시작 620`일 때
  - Then 진척도 = (780-620)/(800-620) = 88.9%가 프로그레스 바로 표시됨
- AC-4 [U][P0]: Scenario: 예측 정확도 계산
  - Given 모의 760, 실제 780일 때
  - Then 예측 오차 = |760-780| = 20점, "예측 정확도 오차 ±20점" 표시
- AC-5 [S][P1]: Scenario: 데이터 없는 빈 상태
  - While MockExamResult가 0건이거나 StudySession이 0건일 때
  - Then Asset.ContentIcon과 "리포트를 만들 데이터가 아직 없어요" 안내 표시, 계산 미실행
- AC-6 [U][P0]: Scenario: 리포트 레이아웃 계약
  - Given ROI 리포트가 표시될 때
  - Then `data-testid="roi-hero"` SummaryHero 1개 + `data-testid="roi-card"` Card 3개(효율/진척도/예측정확도) + 점수 추이 Sparkline 1개를 가짐
- AC-7 [W][P1]: Scenario: 0시간 나눗셈 방지
  - Given 총 학습시간이 0일 때
  - When 효율 계산
  - Then 효율값 "—" 표시 (NaN/Infinity 미표시), 크래시 없음
- AC-8 [E][P2]: Scenario: 리포트 하단 배너 광고
  - Given 구독자가 리포트를 끝까지 스크롤했을 때
  - Then 리포트 콘텐츠 아래(비겹침) AdSlot 배너 1개 표시

---

### F6. 구독 & 프로모션 (수익화 + 획득)

- **Description**: 무료·유료 구독 상태를 관리하고 유료 기능(무제한 세션/모의시험/ROI 리포트)을 게이팅한다. 신규 유저 획득을 위한 프로모션 리워드 지급을 포함한다. 결제는 TossPurchase(IAP)로 처리한다.
- **Data**: AppMeta
- **API**: 없음 (IAP는 SDK 처리)
- **Requirements**:
- AC-1 [E][P0]: Scenario: 구독 결제 성공
  - Given 유저가 구독 화면에서 결제 버튼 탭
  - When `<TossPurchase>` `onPurchased` 콜백 성공
  - Then `meta.isSubscribed = true` 저장, 성공 토스트 "구독이 시작됐어요" 표시
- AC-2 [S][P0]: Scenario: 구독자 유료 기능 해제
  - While `isSubscribed === true`일 때
  - Then 세션 무제한, 모의시험/ROI 리포트 게이트가 모두 해제됨
- AC-3 [W][P1]: Scenario: 결제 취소 처리
  - Given 결제 진행 중일 때
  - When 유저가 결제를 취소
  - Then `isSubscribed` 변화 없음, "결제가 취소됐어요" 토스트 표시, 크래시 없음
- AC-4 [E][P1]: Scenario: 프로모션 리워드 지급
  - Given 신규 유저가 프로모션 코드로 진입했을 때
  - When 진단 완료
  - Then `grantPromotionReward({ promotionCode, amount: 3000 })` 호출, 지급 완료 토스트 표시
- AC-5 [U][P0]: Scenario: 프로모션 지급 한도 검증
  - Given `grantPromotionReward` 호출 시
  - Then `amount ≤ 5000` 검증을 통과한 값만 전달 (초과 시 5000으로 클램프)
- AC-6 [W][P1]: Scenario: 프로모션 중복 지급 방지
  - Given 이미 프로모션을 받은 유저(`meta`에 지급 플래그 존재)일 때
  - When 재진입
  - Then `grantPromotionReward` 미호출, 안내 "이미 리워드를 받으셨어요" 표시
- AC-7 [S][P1]: Scenario: 결제 로딩 상태
  - While IAP 결제 처리 중일 때
  - Then 결제 버튼 비활성화 + Spinner 표시, 중복 탭 방지

---

### F7. 주간 카운터 & 데이터 관리 (무결성 레이어)

- **Description**: 무료 세션 주간 카운터의 리셋 로직과 localStorage 데이터 정리를 담당하는 무결성 레이어다. 매주 월요일 자동 리셋과 저장 용량 관리로 앱의 안정적 동작을 보장한다.
- **Data**: AppMeta, StudySession, GeneratedProblem
- **API**: 없음
- **Requirements**:
- AC-1 [E][P0]: Scenario: 주간 카운터 리셋
  - Given `meta.weekAnchor`가 지난 주 월요일이고 현재가 이번 주일 때
  - When 앱 진입
  - Then `weeklyFreeSessionsUsed = 0`, `weekAnchor`를 이번 주 월요일로 갱신
- AC-2 [U][P0]: Scenario: 문제 저장 상한 유지
  - Given `duotrack.problems`가 100건 초과 시
  - Then 가장 오래된 항목부터 제거하여 최근 100건만 유지
- AC-3 [W][P1]: Scenario: 손상된 데이터 복구
  - Given localStorage 값이 JSON 파싱 불가(손상)일 때
  - When 데이터 로드
  - Then 해당 key를 기본값으로 초기화, 크래시 없음, 콘솔 에러 미출력
- AC-4 [S][P1]: Scenario: 데이터 로딩 상태
  - While 초기 localStorage 로드 중일 때
  - Then 스켈레톤 또는 Spinner 표시 후 데이터 렌더
- AC-5 [W][P1]: Scenario: 용량 임계 경고
  - Given 전체 저장 용량이 4MB 초과 시
  - Then 설정 화면에 "저장 공간이 거의 찼어요. 오래된 기록을 정리하세요" 안내 표시
- AC-6 [E][P2]: Scenario: 오래된 세션 정리
  - Given 사용자가 설정에서 "6개월 이전 기록 삭제" 탭
  - When 확인
  - Then 6개월(2026-01-24) 이전 StudySession 제거, 성공 토스트 표시

---

## Screen Definitions

### S1. 온보딩/AI 고지 화면 — `/`
- **TDS 컴포넌트**: ScreenScaffold, Top, Paragraph.Text, TDS Button(display="block"), AlertDialog
- **역할**: 최초 진입 시 앱 소개 + AI 고지. `onboarded === false`면 노출, 이후 `/home` 리다이렉트.
- **상태**: Loading(meta 로드 중 Spinner) / Empty(해당없음) / Error(손상 시 기본값 초기화 후 진행)
- **터치 인터랙션**: "시작하기" 버튼(높이 48px)
- **Navigation contract**:
  - Outgoing: 시작하기 → `navigate('/diagnose')`
  - Incoming: `location.state = undefined`
- **Layout contract**: ScreenScaffold 골격, 1차 액션은 SubmitFooter의 display="block" 버튼, AI 고지 AlertDialog 1회.

### S2. 진단 설정 화면 — `/diagnose`
- **TDS 컴포넌트**: ScreenScaffold, Top, TDS TextField(목표점수, inputMode="numeric"), Chip(시험 선택), SubmitFooter Button, AlertDialog(AI 고지)
- **상태**: Loading(없음) / Empty(없음) / Error(범위 초과 시 TextField 에러 문구)
- **터치 인터랙션**: 시험 선택 Chip(각 44px), "진단 시작" 버튼(48px)
- **Navigation contract**:
  - Outgoing: 진단 시작 → `navigate('/diagnose/quiz', { state: { targetExam: string, targetScore: number } })`
  - Incoming: `location.state = undefined`
- **Layout contract**: ScreenScaffold, 목표 설정 Card 1개, 하단 고정 SubmitFooter.

### S3. 진단 문항 화면 — `/diagnose/quiz`
- **TDS 컴포넌트**: ScreenScaffold, Top(진행률), ListRow(문항 선택지), TDS Button, TossRewardAd(결과 게이트), Spinner
- **상태**: Loading(진단 API 대기 시 Spinner + "AI가 실력을 분석하고 있어요") / Empty(없음) / Error("진단에 실패했어요" + 다시 시도)
- **터치 인터랙션**: 선택지 ListRow(각 ≥48px), "진단 결과 보기" 버튼(48px)
- **Navigation contract**:
  - Outgoing: 결과 보기(광고 시청 후) → `navigate('/diagnose/result', { state: { profile: UserProfile } })`
  - Incoming: `location.state = { targetExam: string, targetScore: number }`
- **Layout contract**: ScreenScaffold, 문항 Card, TossRewardAd로 결과 게이트.

### S4. 진단 결과 화면 — `/diagnose/result`
- **TDS 컴포넌트**: ScreenScaffold, Card, SummaryHero(currentLevel CountUp), Paragraph.Text, Chip(취약 파트), 배지("AI가 생성한 결과입니다"), TDS Button
- **상태**: Loading(없음) / Empty(없음) / Error(state 누락 시 `/home` 리다이렉트)
- **터치 인터랙션**: "홈으로" 버튼(48px)
- **Navigation contract**:
  - Outgoing: 홈으로 → `navigate('/home')`
  - Incoming: `location.state = { profile: UserProfile }`
- **Layout contract**: `data-testid="diagnose-hero"` SummaryHero + `data-testid="ai-badge"` 배지 필수, 취약 파트 Chip 나열.

### S5. 홈 대시보드 — `/home`
- **TDS 컴포넌트**: ScreenScaffold, Top, Card(진척도 요약), SummaryHero, FloatingTabBar(템플릿), AdSlot(하단 배너)
- **상태**: Loading(스켈레톤) / Empty("아직 학습 기록이 없어요. 첫 세션을 시작하세요") / Error(기본값 복구)
- **터치 인터랙션**: 각 탭(FloatingTabBar 44px), 세션 시작 CTA 버튼(48px)
- **Navigation contract**:
  - Outgoing: 세션 시작 → `navigate('/session')`; 리포트 → `navigate('/report')`; 문제 생성 → `navigate('/problems')`; 점수 입력 → `navigate('/exams')`
  - Incoming: `location.state = undefined`
- **Layout contract**: `data-testid="home-summary"` Card 1개, AdSlot는 콘텐츠 하단 비겹침 배치.

### S6. 학습 세션 화면 — `/session`
- **TDS 컴포넌트**: ScreenScaffold, Top, 원형 진행 인디케이터(커스텀 flex 레이아웃 허용), TDS Button("그만두기"), AlertDialog(중도 이탈 확인), BottomSheet(한도 초과), Toast
- **상태**: Loading(없음) / Empty(없음) / Error(저장 실패 토스트)
- **터치 인터랙션**: "그만두기" 버튼(48px)
- **Navigation contract**:
  - Outgoing: 완주/이탈 → `navigate('/home')`
  - Incoming: `location.state = undefined`
- **Layout contract**: ScreenScaffold, **광고 컴포넌트 렌더링 금지**, 타이머 중앙 배치.

### S7. 점수 입력/목록 화면 — `/exams`
- **TDS 컴포넌트**: ScreenScaffold, Top, TDS TextField(점수/파트, inputMode="numeric"), ListRow(점수 이력), BottomSheet(모의시험 유료 게이트), Toast, Asset.ContentIcon(빈 상태)
- **상태**: Loading(스켈레톤) / Empty(Asset.ContentIcon + "아직 기록된 점수가 없어요") / Error(TextField 검증 에러 문구)
- **터치 인터랙션**: 저장 버튼(48px), 이력 ListRow(≥48px). 리스트 30건 초과 시 가상 스크롤.
- **Navigation contract**:
  - Outgoing: 모의시험 시작 → `navigate('/problems', { state: { mode: "mock" } })`
  - Incoming: `location.state = undefined`
- **Layout contract**: ScreenScaffold, 입력 Card + 이력 ListRow, 키보드가 입력 필드 미가림.

### S8. AI 문제 생성/풀이 화면 — `/problems`
- **TDS 컴포넌트**: ScreenScaffold, Top, TossRewardAd(결과 게이트), ListRow(선택지), Card(해설), 배지("AI가 생성한 결과입니다"), Spinner, TDS Button
- **상태**: Loading(Spinner + "AI가 맞춤 문제를 만들고 있어요") / Empty("학습 데이터가 부족해요") / Error("문제 생성에 실패했어요" + 다시 시도)
- **터치 인터랙션**: 선택지 ListRow(각 ≥48px), "다음 문제" 버튼(48px)
- **Navigation contract**:
  - Outgoing: 완료 → `navigate('/home')`
  - Incoming: `location.state = { mode: "mock" } | undefined`
- **Layout contract**: `data-testid="ai-badge"` 배지 필수, 문제 Card + 해설 Card 위계.

### S9. ROI 리포트 화면 — `/report`
- **TDS 컴포넌트**: ScreenScaffold, Top, SummaryHero(효율 CountUp), Card×3, Sparkline(점수 추이), MiniBar(파트별), 프로그레스 바, BottomSheet(유료 게이트), AdSlot(하단 배너), Asset.ContentIcon(빈 상태)
- **상태**: Loading(스켈레톤) / Empty(Asset.ContentIcon + "리포트를 만들 데이터가 아직 없어요") / Error(0시간 시 "—" 표시)
- **터치 인터랙션**: 구독 버튼(48px)
- **Navigation contract**:
  - Outgoing: 구독하기 → `navigate('/subscribe')`
  - Incoming: `location.state = undefined`
- **Layout contract**: `data-testid="roi-hero"` SummaryHero 1개 + `data-testid="roi-card"` Card 3개(효율/진척도/예측정확도) + Sparkline 1개. 비구독 시 블러 미리보기. AdSlot 콘텐츠 하단 비겹침.

### S10. 구독 화면 — `/subscribe`
- **TDS 컴포넌트**: ScreenScaffold, Top, Card(플랜 비교), Paragraph.Text, TossPurchase(결제 버튼), Spinner, Toast
- **상태**: Loading(결제 처리 중 Spinner + 버튼 비활성) / Empty(없음) / Error("결제가 취소됐어요" 토스트)
- **터치 인터랙션**: 결제 버튼(TossPurchase 48px)
- **Navigation contract**:
  - Outgoing: 결제 성공 → `navigate('/home')`
  - Incoming: `location.state = { from?: string } | undefined`
- **Layout contract**: ScreenScaffold, 플랜 비교 Card 2개(무료/유료), 하단 고정 결제 버튼.

### S11. 설정 화면 — `/settings`
- **TDS 컴포넌트**: ScreenScaffold, Top, ListRow(항목), Switch(다크모드 등 옵션), AlertDialog(삭제 확인), Toast
- **상태**: Loading(스켈레톤) / Empty(없음) / Error(용량 경고 안내)
- **터치 인터랙션**: 각 ListRow(≥48px), Switch(44px)
- **Navigation contract**:
  - Outgoing: 없음(설정 내 처리)
  - Incoming: `location.state = undefined`
- **Layout contract**: ScreenScaffold, 설정 항목 ListRow 그룹.

---

## API Contract (외부 AI API — 별도 Railway 서버)

### POST /diagnose — AI 실력 진단
```typescript
// Request
interface DiagnoseRequest {
  exam: "TOEIC" | "OPIC" | "TEPS";
  targetScore: number;
  answers: Array<{ questionId: string; selectedIndex: number }>;
}
// Response 200
interface DiagnoseResponse {
  currentLevel: number;     // 0~990 정규화 점수
  weakParts: string[];      // 취약 파트 태그
  path: string[];           // 추천 학습 경로 태그
}
// Error (4xx/5xx): { error: string }
```
- **에러 코드**: 400(입력 검증 실패), 429(요청 과다), 500(AI 처리 실패)

### POST /generate-problems — AI 문제 생성
```typescript
// Request
interface GenerateRequest {
  part: string;
  count: number;            // 1~10
  level: number;            // 현재 실력
}
// Response 200
interface GenerateResponse {
  problems: Array<{
    id: string;
    part: string;
    question: string;
    choices: string[];      // length 4
    answerIndex: number;    // 0~3
    explanation: string;
  }>;
}
// Error: { error: string }
```
- **에러 코드**: 400(입력 검증 실패), 429(요청 과다), 500(생성 실패)
- **CORS**: Railway 서버에 앱인토스 도메인 허용 설정 필수 (CORS 에러 0개).
- **공통**: 모든 에러 응답은 `{ error: string }` 단일 형태.

---

## Assumptions

1. AI 진단·문제 생성은 외부 Railway 서버(별도 배포)에서 LLM으로 처리하며, 앱은 결과만 받아 렌더한다.
2. 오픽(OPIC) 등급(IL~AH)은 내부적으로 0~990 정규화 점수로 매핑하여 ROI 계산에 사용한다.
3. 구독 상태는 IAP 결제 성공 콜백 기준 localStorage에 반영하며, 서버 검증은 MVP 범위 외로 둔다(추후 서버 연동).
4. 무료 세션 주간 리셋 기준은 월요일 00:00(로컬 타임존).
5. 프로모션 코드는 앱인토스 콘솔에서 발급되며 진단 1회 완료 시 1인당 3,000원 지급(≤5,000원).
6. 포모도로 세션은 브라우저 포그라운드 기준으로 타이머 구동(백그라운드 정확도는 MVP 범위 외).

## Open Questions

1. 오픽 등급→정규화 점수 매핑 테이블의 구체적 수치가 확정되지 않음 (예: IM2 = ?점).
2. 구독 결제가 월 자동갱신(subscription)인지 1회성(one-time)인지 — 템플릿 TossPurchase는 `createOneTimePurchaseOrder` 기반이므로 월 갱신 모델은 콘솔 SKU 설정 확인 필요.
3. AI 진단 문항의 출처(자체 문제은행 vs 실시간 생성)와 저작권 이슈.
4. 실제 시험 점수 입력의 진위 검증 방식 — 자기신고 기반으로 충분한지, ROI 리포트 신뢰도에 미치는 영향.
5. 프로모션 리워드 지급 트리거를 진단 완료로 할지, 첫 구독으로 할지 마케팅 전략 확정 필요.