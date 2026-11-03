# Job Logs

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
