# Cloudflare Workers Deployment

이 저장소는 Cloudflare Workers 기준으로 배포되도록 정리되어 있다.

현재 기준:

- Worker 이름: `mystery-time`
- Wrangler 설정 파일: [wrangler.jsonc](/home/yusin/mysteryGame/app/wrangler.jsonc)
- OpenNext 설정 파일: [open-next.config.ts](/home/yusin/mysteryGame/app/open-next.config.ts)
- GitHub 원격: `https://github.com/py9245/mysteryGame.git`

## GitHub 상태

- 기본 브랜치: `main`
- 최초 배포 커밋: `438715fd23d9e14bda380fceb4972dd4bbeb7661`

## Cloudflare에서 연결할 때

Cloudflare 공식 문서 기준으로 이 앱은 Pages보다 Workers 경로가 맞다.
이유:

- Next.js App Router + API route를 사용한다.
- Cloudflare는 full-stack Next.js를 Workers 가이드로 배포하도록 안내한다.

## 권장 연결 방식

1. Cloudflare 대시보드에서 `Workers & Pages`로 이동
2. `Create application`
3. `Import a repository`
4. GitHub 계정 연결 후 `py9245/mysteryGame` 선택
5. Worker 이름을 `mystery-time`으로 맞춤

중요:

- Cloudflare Workers Builds는 대시보드의 Worker 이름과 `wrangler.jsonc`의 `name`이 같아야 한다.
- 이 저장소는 이미 `mystery-time`으로 맞춰져 있다.

## 권장 Build 설정

- Production branch: `main`
- Root directory: `/`
- Build command: `npm run build:worker`
- Deploy command: `npx wrangler deploy`
- Non-production branch deploy command: `npx wrangler versions upload`

## 환경 변수

현재 최소 필요값:

- `GMS_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

설정 위치:

- Build Variables and Secrets
- Runtime Variables and Secrets

이 프로젝트는 AI 호출 시 `GMS_KEY`를 사용한다.
Supabase를 실제 연결할 경우 위 3개 값도 함께 넣어야 한다.

## 로컬 확인 명령

```bash
npm run typecheck
npm run build
npm run build:worker
```

## 수동 배포

Cloudflare 로그인 후:

```bash
npx wrangler login
npm run deploy
```
