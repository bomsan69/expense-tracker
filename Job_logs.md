# Job Logs

## 2026-11-14

### 부부 공동 가계부 — 지출 등록자(남편/부인) 구분 기능 (SPEC D11)
- 요구사항: 남편/부인이 함께 사용, 남편 등록분은 검정·부인 등록분은 파랑, 기본값 남편, 기존 데이터 유지. 코딩 전 검토 단계에서 "계정 1개 + 지출별 등록자 컬럼"(채택) vs "로그인 2개 + household 공유"(기각, §9.3 격리 모델 전면 재작성 대비 얻는 것 없음)를 제시해 사용자가 전자를 선택. 라벨은 영어(Husband/Wife), 추가 기능 3종(홈 필터·합계 분리·통계 비교)도 사용자가 선택
- `SPEC.md` — §2 범위(1인 전용 → 공동 계정), §4에 결정 행 D11 신규, §5 `expenses` 테이블에 `person` 컬럼, §6.2에 Person 색상 역할 2종 추가
- `db/schema.ts` + `db/migrations/0001_bouncy_vertigo.sql` 신규 — `person enum('husband','wife') NOT NULL DEFAULT 'husband'` 단일 `ADD COLUMN`(파괴적 구문 0건). 적용 전 생성 SQL 검수, 적용 후 기존 6행이 id·금액·날짜 그대로 전부 `husband`로 채워진 것 확인
- `lib/validation/expense.ts` — `personSchema`(기본값 husband), 목록 필터용 `personFilterSchema`(all 포함, 잘못된 값은 all로 폴백) 추가
- `lib/queries/expenses.ts` — `ExpenseFilter.person` 추가로 목록·건수·합계가 하나의 동일 조건을 공유, create/update/createMany가 `person` 저장, 합계 분리용 `sumExpensesByPerson` 신규
- `lib/queries/stats.ts` — `monthlyTotals`가 `groupBy(person)`으로 버킷별 `husbandMinor`/`wifeMinor`/`totalMinor` 반환 (기존 6회 쿼리 구조 유지)
- `lib/person.ts` 신규 — 라벨·색상 클래스 매핑 단일 정의 (행/폼/필터/합계/차트 5곳에서 공용)
- `app/globals.css` — `--person-husband`(#111827), `--person-wife`(#1D4ED8, accent와 구분되는 진한 파랑), 어두운 요약 카드 전용 `--person-wife-on-primary`(#93C5FD, 대비 8.15:1) 토큰 추가
- `components/expenses/expense-form.tsx` — "Entered by" Select 추가(기본 Husband, 수정 시 기존 값)
- `components/expenses/expense-row.tsx` — 상호·금액에 등록자 색상 적용 + `Husband`/`Wife` 텍스트 라벨 병기(색상 단독 전달 금지, SPEC §6.1)
- `components/expenses/spending-summary.tsx` — 총액 아래 `Husband $x · Wife $y` 분리 표시
- `components/expenses/expense-filters.tsx` / `pagination.tsx` — 등록자 필터(Everyone/Husband/Wife) 추가, URL `person` 파라미터로 왕복, 필터 변경 시 1페이지로 리셋
- `components/charts/monthly-spending.tsx` — 월별 막대를 등록자 누적(stacked)으로 변경(390px에서 grouped는 막대가 너무 얇음), 범례 추가, 접근성 표를 `Month|Husband|Wife|Total`로 확장
- `lib/receipt-draft.ts` / `receipt-picker.tsx` / `receipt-review-client.tsx` — 영수증 1장당 등록자 1명(기본 Husband)으로 배치 전체에 적용
- `app/(app)/actions.ts` 외 액션 3종 — `person` 파싱 및 전달, 홈 데이터에 `personTotals` 추가
- 게이트: `npm run verify` 통과(typecheck/lint 경고0/40파일 256 tests), `npm run build` clean, `npm run test:e2e` 50/50(axe 접근성 포함). 비즈니스 로직은 전부 테스트 우선(red 확인 후 구현). 실제 앱 390×844에서 부인 지출 등록 → 파랑 표시·합계 정합($25.10+$42.30=$67.40)·필터·통계 누적 막대 육안 확인

### 저장 실패 시 선택한 Category가 사라지던 기존 버그 수정
- 이번 기능과 무관한 기존 결함. Radix Select가 폼 내부에 렌더하는 네이티브 `<select>`의 `defaultValue`가 마운트 시점에 고정되는데, React 19가 `<form action>` 완료 후 폼을 리셋하면서 `onValueChange`를 재발화시켜 React 상태를 덮어씀. Merchant/Amount는 상태에서 복원되어 멀쩡해 보여 그동안 발견되지 않음
- `components/expenses/expense-form.tsx` — `action` prop 대신 `onSubmit` + `startTransition(formAction)`으로 제출해 리셋 자체가 발생하지 않도록 수정 (`onReset` + `preventDefault`는 React의 리셋이 cancelable 이벤트를 우회해 효과 없음을 먼저 확인)
- 회귀 테스트 2건 추가(Category·Entered by 각각 저장 실패 후 값 유지)

### 날짜에 의존해 깨져 있던 영수증 E2E 테스트 수정
- `tests/e2e/receipt.spec.ts` — 모의 영수증 항목이 `2026-10-31` 고정인데 홈 기본 범위가 `today−7`이라, 10/31로부터 8일 내에 실행할 때만 통과하던 상태(2026-11-09부터 실패). 손대지 않은 HEAD를 별도 워크트리에 꺼내 재현해 기존 결함임을 확인
- 저장 후 해당 항목을 포함하는 범위를 명시해 조회하도록 수정하고, 저장분이 Husband로 귀속되는지 검증도 함께 추가
- `tests/e2e/db-helpers.ts` — `createExpensesDirect`에 선택적 `person` 지원

### 환경 이슈 확인 (코드 수정 없음)
- 셸 Node가 v22.2.0인데 `.nvmrc`는 24.22.2 고정. `require(ESM)`이 Node 22.12+부터만 지원되어 jsdom의 `html-encoding-sniffer` → `@exodus/bytes` 체인이 `ERR_REQUIRE_ESM`으로 실패 → **컴포넌트 테스트 16개 파일이 전부 실행 불가**였던 것(11-10자 로그의 "기존 환경 이슈"와 동일 건). 지정 Node로 실행하면 의존성 변경 없이 해결됨을 확인. `package.json`에 `engines` 추가를 권고하나 이번 요청 범위 밖이라 미적용

## 2026-11-10

### 카드/은행 거래내역 스크린샷에서 `gpt-6.1-sol`이 항목을 0개로 반환하던 문제 수정
- 배포 서버(`/home/ai/project/expense-tracker`)에서 `tests/screen_capture.png`(카드 사용내역 캡처) 업로드 시 "No expense items were found" 재현 → 원인 조사 중 운영 서버의 로그 디렉터리가 호스트 바인드 마운트(`./logs:/app/logs`) 때문에 컨테이너의 `nextjs`(uid 1001) 유저가 쓰기를 못 해 `logError`가 전부 조용히 삼켜지고 있던 것 발견, 호스트 `logs/` 디렉터리 권한을 고쳐 로그가 남도록 조치
- 그 로그로 실제 원인 확인: `gpt-6.1-sol`이 `models.retrieve`로는 유효한 모델이지만, 이 이미지에서 `{"items": []}`를 반환 — 기존 프롬프트가 "a photo of a retail receipt"로만 명시해 카드 거래내역 스크린샷을 받으면 "영수증이 아니다"로 판단해 0개를 반환하는 것으로 보임 (같은 이미지로 `gpt-4o-mini`는 정상 인식)
- `lib/ai/parse-receipt.ts` — `RECEIPT_PROMPT`를 "retail receipt" 단일 케이스에서 "retail receipt 또는 card/bank transaction history" 두 케이스를 모두 다루도록 확장, "merchant" 필드 의미를 케이스별로 명시(영수증=품목명, 거래내역=해당 거래의 merchant/payee명). JSON 출력 스키마·다운스트림 파싱 로직은 변경 없음
- 수정 전/후 실제 모델·실제 이미지로 직접 재검증: `screen_capture.png`는 `gpt-6.1-sol` 기준 0개→5개, `costco_recepit.jpeg`(기존 케이스)는 양쪽 모델 모두 8개 유지(회귀 없음), `gpt-4o-mini`도 두 이미지 모두 회귀 없음
- `npm run verify` — typecheck/lint/vitest(176 tests) 통과. 일부 컴포넌트 테스트 파일(jsdom 환경)이 `html-encoding-sniffer`/`@exodus/bytes` 간 기존 ESM/CJS 상호운용 문제로 워커 시작에 실패하는 현상을 별도로 발견했으나, 이번 변경(프롬프트 텍스트 한 곳)과는 무관한 기존 환경 이슈로 손대지 않음

### 배포 서버 로그 쓰기 권한 문제의 재발 방지 (근본 수정)
- 위 항목에서 운영 서버에 적용한 `chown`은 임시 조치였음 — `./logs:/app/logs` 바인드 마운트가 매번 `Dockerfile`의 `chown nextjs:nodejs`를 덮어쓰는 구조적 문제라 재배포·새 호스트에서 재발 가능
- `docker-compose.yml` — `app` 서비스에 `user: "1001:1001"` 명시 추가 (Dockerfile의 `nextjs` 유저 UID와 고정적으로 일치시켜, 이미지가 바뀌어도 호스트에서 맞춰야 할 UID가 항상 동일하도록 보장)
- `README.md` — Deployment 섹션에 최초 배포 시 1회 필요한 `mkdir -p logs && chown 1001:1001 logs` 안내 추가
- `SPEC.md` §12 운영 규칙 — 위 내용 반영
- 로컬에서 `docker compose up -d --build app`으로 재검증: `user: 1001:1001` 적용 후 컨테이너 내부 `whoami` → `nextjs`, `/app/logs` 쓰기 가능 확인
- 검증 중 별개로 발견(미수정, 범위 밖): 로컬·배포 서버 모두 `app` 컨테이너가 `unhealthy` — healthcheck의 `wget http://localhost:3000`이 `Connection refused`. 이번 변경 전부터 있던 기존 문제로 확인(운영 서버 최초 점검 때도 동일 증상), 로그 권한 문제와는 무관

## 2026-11-04

### 실제 휴대폰 사진(1MB 초과) 영수증 스캔 500 에러 수정
- `next.config.ts` — `experimental.serverActions.bodySizeLimit: "10mb"` 추가 (Next.js 기본 1MB 제한이 앱 자체의 10MB 업로드 검증보다 먼저 막아서 발생한 500 에러 "Body exceeded 1 MB limit" 수정)
- `tests/e2e/receipt.spec.ts` — 1MB 초과 파일 업로드 회귀 테스트 추가
- `.gitignore` — `tests/costco_recepit.jpeg`(재현에 쓴 실제 영수증 사진, EXIF에 GPS 위치 포함) 추가 제외 — public 저장소에 개인 위치정보 노출 방지, 로컬에만 유지
- `BUILD_LOG.md` — 결함 원인 분석 및 수정 내역 기록

### 서버 에러 로깅 시스템 추가
- `instrumentation.ts` 신규 생성 — Next.js `onRequestError` 훅으로 렌더링/라우트 핸들러/Server Action/미들웨어 에러를 전부 포착 (Edge 런타임에서는 동적 import로 fs 모듈 번들링 회피)
- `lib/logging/error-log.ts` 신규 생성 — `logs/YYYY-MM-DD.log`에 에러 1건당 JSON 한 줄 기록(timestamp/message/stack/안전한 context만, 헤더·쿠키·요청본문은 절대 기록 안 함), 로깅 실패가 요청을 죽이지 않도록 전체 try/catch
- `lib/logging/error-log.test.ts` 신규 생성 — 정상 기록/비-Error 값 처리/다중 기록/디렉터리 생성 실패 시에도 미throw 검증
- `logs/.gitkeep` 추가 — 폴더는 저장소에 유지, 실제 로그 파일은 `.gitignore`로 제외
- `Dockerfile` — 런타임 스테이지에서 `logs/` 생성 후 비루트 `nextjs` 유저로 chown (쓰기 권한 확보)
- `docker-compose.yml` — `app` 서비스에 `./logs:/app/logs` 볼륨 마운트 추가 (호스트에서 직접 로그 확인 가능)
- `.gitignore`, `.dockerignore` — 로그 파일/폴더 관련 규칙 추가
- `SPEC.md` §10(파일 트리), §12(운영 규칙) — 로깅 시스템 반영
- 실제로 DB 연결을 끊어 서버 에러를 재현하고 `logs/` 파일에 정상 기록되는 것을 직접 확인

### 영수증 저장(Confirm & Save All) 시 예외가 로그 없이 사라지는 블라인드 스팟 수정
- `app/(app)/receipt/review/actions.ts` — `saveBatchAction`의 `catch` 블록이 `createManyExpenses`의 실제 예외(예: 카테고리 소유권 불일치로 인한 "Category not found")를 로그 없이 삼키던 문제 발견 및 수정, `logError(error, { action, userId })` 추가
- `app/(app)/receipt/review/actions.test.ts` — DB 레벨 실패 테스트에 로그 기록 검증 추가
- `lib/`·`app/` 전체의 예외 삼키는 catch 블록을 전수 조사해 이 한 곳만 실제 버그였음을 확인
- `BUILD_LOG.md` — 원인 분석 및 수정 내역 기록

### 영수증 인식 "no_items" 원인 진단 로그 추가 + OpenRouter 전환용 OPENAI_BASE_URL 연결
- `lib/ai/parse-receipt.ts` — `no_items`로 뭉뚱그려지던 4가지 서로 다른 원인(모델이 빈 응답 / JSON 형식 불일치 / 필터링으로 0개 / auth·timeout이 아닌 provider 예외)을 구분해 `logs/`에 모델명·원인·원본 응답과 함께 기록
- `docker-compose.yml` — `app` 서비스에 `OPENAI_BASE_URL` 환경변수 pass-through 추가 (OpenRouter 등 OpenAI 호환 엔드포인트로 전환 가능, 비워두면 기존과 동일하게 OpenAI 기본 엔드포인트 사용 — SDK가 이미 네이티브 지원하므로 코드 분기 없음)
- `.env.example`, `README.md`, `SPEC.md` §3 — `OPENAI_BASE_URL` 변수 문서화
- `lib/ai/parse-receipt.test.ts` — 4가지 원인별 로그 기록 검증 테스트 추가

### 모델이 날짜를 빈 값으로 반환할 때 항목이 통째로 드롭되던 문제 수정
- 사용자가 `TEST_AI_MODEL`을 `gpt-6.1-sol`로 바꿔 인식률 테스트 요청 → 실제 테스트 결과 merchant·금액은 매번 정확히 인식하지만 `date`가 항상 빈 문자열로 와서 전체 항목이 드롭되고 있음을 새 진단 로그로 즉시 확인
- `lib/ai/parse-receipt.ts` — 날짜가 비어있거나 파싱 불가하면 오늘 날짜(`todayIso()`)로 대체하고 항목은 저장되도록 변경 (merchant·금액 무효는 여전히 드롭)
- `lib/ai/parse-receipt.test.ts` — 날짜 대체 동작 테스트 추가, 기존 "날짜 무효 시 드롭" 테스트를 금액 무효 케이스로 분리
- `app/(app)/receipt/review/actions.test.ts`, `lib/ai/parse-receipt.test.ts` — 여러 테스트 파일이 같은 `logs/<날짜>.log`에 동시에 쓰면서 생기던 로그 검증 테스트 레이스 컨디션을 `action` 태그 필터링으로 수정 (3연속 전체 스위트 실행으로 안정성 확인)
- 실제 모델(`gpt-6.1-sol`)과 실제 영수증 파일로 수정 전/후 직접 재검증
- `BUILD_LOG.md` — 두 작업 모두 원인 분석 및 수정 내역 기록

## 2026-11-03

### Docker 포트 매핑 변경
- `docker-compose.yml` — 앱 컨테이너 호스트 포트를 3000 → 3400으로 변경

### 에이전트 실행 보고서 추가
- `AGENT_EXECUTION_REPORT.md` 신규 생성 — 5단계 자율 빌드(기반/데이터·로직/서버 기능/UI·상태/통합테스트·배포) 수행 결과 요약 보고서

### 배포 서버의 공용 MySQL과 포트 충돌 방지
- `docker-compose.yml` — mysql 호스트 포트를 `127.0.0.1:3306:3306` → `127.0.0.1:3307:3306`으로 변경 (배포 서버에 이미 동작 중인 공용 MySQL과 포트 겹치지 않도록 분리, 127.0.0.1 바인딩은 유지)
- `.env.example`, `README.md`, `SPEC.md` — 예시 `DATABASE_URL`/`TEST_DATABASE_URL`의 포트를 3307로 함께 갱신

### Settings에 AI 설정 Verify 버튼 추가 + AI 프로바이더를 Anthropic → OpenAI로 전환
- `lib/ai/parse-receipt.ts` — Anthropic Messages API → OpenAI Chat Completions API로 재작성 (호출 계약/실패 메시지는 동일하게 유지해 호출부 변경 없음)
- `lib/ai/verify-ai-settings.ts` 신규 생성 — `models.retrieve`로 모델명+키를 저장 없이 검증
- `app/(app)/settings/actions.ts` — `verifyAiSettingsAction` 추가 (키 필드가 빈 값이면 저장된 키로 검증, 성공/실패 모두 저장 없음)
- `components/settings/ai-settings-form.tsx` — Verify 버튼 및 검증 성공/실패 상태 표시 추가
- `SPEC.md`(§3, §4 D5, §7 SCR-05, §9, 파일 트리), `FLOW.md` — Anthropic → OpenAI, 기본 모델 `claude-sonnet-5` → `gpt-4o-mini`, Verify 동작 반영
- `package.json`/`package-lock.json` — `@anthropic-ai/sdk` 제거, `openai` 추가
- `lib/ai/parse-receipt.test.ts`, `lib/ai/verify-ai-settings.test.ts`(신규), `app/(app)/settings/actions.test.ts`, `app/(app)/expenses/new/actions.test.ts`, `lib/validation/settings.test.ts`, `components/settings/ai-settings-form.test.tsx` — OpenAI 목으로 전환, Verify 테스트 추가
- `tests/e2e/mock-anthropic-server.ts` 삭제 → `tests/e2e/mock-openai-server.ts` 신규 생성, `playwright.config.ts`/`tests/e2e/global-setup.ts`/`tests/e2e/receipt.spec.ts`/`tests/e2e/settings.spec.ts` 갱신 (Verify e2e 테스트 추가)
- `BUILD_LOG.md`에 변경 배경(LiteLLM 멀티 프로바이더 검토 후 단일 프로바이더 전환으로 결정한 이유 포함) 기록
- 실제 브라우저에서 `.env.local`의 `TEST_OPENAI_API_KEY`/`TEST_AI_MODEL`로 등록·Verify·Save까지 수동 확인, `npm run verify` + e2e + 프로덕션 빌드 전부 통과
