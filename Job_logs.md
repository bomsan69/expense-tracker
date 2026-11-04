# Job Logs

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
