# Relay Story Studio

함께 이어 쓰는 분기형 소설 협업 플랫폼입니다.  
한 명이 시작한 이야기를 다른 사용자가 이어 쓰고, 각 선택이 새로운 분기를 만들며, 여러 개의 결말로 확장되는 구조를 목표로 만들었습니다.

배포 주소: [https://relay-story-studio.vercel.app](https://relay-story-studio.vercel.app)

## 1. 프로젝트 소개

### 왜 만들었는가

일반적인 글쓰기 서비스는 한 줄의 서사만 다룹니다.  
Relay Story Studio는 한 개의 시작점에서 여러 명이 동시에 이어 쓰고, 분기별로 서로 다른 결말을 만드는 경험에 집중했습니다.

핵심 질문은 아래와 같습니다.

- 한 개의 스토리를 여러 사람이 충돌 없이 이어 쓸 수 있을까
- 이전 문맥을 놓치지 않으면서 분기형 구조를 직관적으로 보여줄 수 있을까
- 이미지와 리더 화면까지 포함해 “창작”과 “감상” 흐름을 한 서비스 안에서 만들 수 있을까

### 핵심 컨셉

- 캔버스 하나가 하나의 스토리 세계관입니다
- 루트 노드에서 이야기가 시작됩니다
- 각 노드는 다음 노드로 분기될 수 있습니다
- 분기 끝은 엔딩 노드가 됩니다
- 사용자는 시각적인 캔버스에서 구조를 보고, 리더 화면에서 한 갈래의 서사를 읽을 수 있습니다

## 2. 주요 기능

### 2.1 인증

- 이메일/비밀번호 회원가입
- 로그인/로그아웃
- 세션 쿠키 기반 인증
- 비로그인 사용자는 공유된 캔버스 열람만 가능
- 쓰기, 업로드, 이미지 생성 등 변경 작업은 로그인 필요

### 2.2 캔버스 생성

- 캔버스 제목 입력
- 시작 본문 입력
- 분기당 최대 작성 노드 수 설정
- 생성과 동시에 루트 노드 생성
- 최대 노드 수가 1이면 자동 엔딩 노드까지 함께 생성

### 2.3 캔버스 편집

- 노드를 시각적으로 배치해 전체 분기 구조 확인
- 선택한 노드에서 다음 노드 작성
- 엔딩 여부 선택 가능
- 노드 위치 이동 및 저장
- 루트 노드는 고정되어 이동 불가
- 자식 노드는 부모보다 왼쪽으로 갈 수 없도록 제한

### 2.4 문맥 확인

- 작성 패널에서 부모 본문 확인
- 작성 패널에서 이전 본문 흐름 확인
- 이전 AI 요약 UI는 제거하고 실제 이전 본문을 직접 보여주는 방식으로 단순화

### 2.5 이미지 기능

- 직접 이미지 업로드
- AI 이미지 생성
- 생성/업로드된 이미지는 작성 중인 노드에 첨부 가능
- Vercel Blob에 저장하여 서버리스 환경에서도 안정적으로 동작

### 2.6 리더 화면

- 엔딩 노드를 기준으로 한 갈래의 스토리 읽기
- 공유 링크 복사
- 수동 엔딩 / 자동 엔딩 구분 표시

## 3. 사용자 흐름

### 작성자 흐름

1. 회원가입 또는 로그인
2. 홈에서 새 캔버스 생성
3. 캔버스에서 노드 선택
4. 이전 문맥을 확인하며 다음 노드 작성
5. 필요하면 이미지 업로드 또는 AI 이미지 생성
6. 엔딩 여부 선택 후 등록
7. 분기가 최대 길이에 도달하면 자동 엔딩 생성

### 독자 흐름

1. 공유 링크로 캔버스 또는 리더 진입
2. 엔딩 노드 기준으로 하나의 분기 서사 읽기
3. 리더 링크 공유

## 4. 기술 스택

### Frontend

- Next.js App Router
- React 19
- TypeScript
- CSS Modules
- Noto Sans KR

### Backend

- Next.js Route Handlers
- MongoDB Atlas
- Mongoose
- Session Cookie Auth

### Storage / Deployment

- Vercel
- Vercel Blob
- MongoDB Atlas

## 5. 기술 선택 이유

### Next.js App Router

- 페이지와 API를 한 저장소에서 관리하기 쉽습니다
- 서버 컴포넌트와 Route Handler를 함께 사용하기 좋습니다
- Vercel 배포와 궁합이 좋습니다

### MongoDB

- 캔버스, 노드, 조상 배열, 참여 기록처럼 문서 구조가 자주 중첩되고 유연성이 필요했습니다
- 분기형 스토리 데이터 모델링에 적합했습니다

### Mongoose

- 스키마 기반으로 컬렉션 구조를 명확히 유지할 수 있습니다
- 모델 레이어를 분리해 역할별 협업이 쉬웠습니다

### Vercel Blob

- 초기에 로컬 파일 시스템 저장을 사용했지만, 서버리스 환경에서는 안정적이지 않았습니다
- 이미지 업로드/생성을 Vercel Blob으로 바꾸면서 배포 환경에서도 동일하게 동작하게 만들었습니다

## 6. 시스템 구조

```text
사용자 브라우저
  -> Next.js UI
  -> Route Handlers (/api/*)
  -> Service Layer
  -> MongoDB Atlas
  -> Vercel Blob (이미지 저장)
```

주요 경로:

- 페이지: `/`, `/login`, `/signup`, `/home`, `/canvas/[shareKey]`, `/read/[shareKey]/[endingNodeId]`
- 인증 API: `/api/auth/signup`, `/api/auth/login`, `/api/auth/logout`
- 캔버스 API: `/api/canvases`, `/api/canvases/me`, `/api/canvases/[shareKey]`
- 노드 API: `/api/nodes`, `/api/nodes/[nodeId]/position`
- 미디어 API: `/api/assets/upload`, `/api/ai/image`

## 7. 데이터 모델

주요 컬렉션:

- `users`
- `canvases`
- `nodes`
- `participations`
- `assets`
- `drafts`
- `summaries`

### users

- 이메일
- 비밀번호 해시
- 닉네임

### canvases

- 제목
- 루트 노드 ID
- 최대 분기 길이
- 생성자 ID
- 공유 키

### nodes

- 부모 노드 ID
- 조상 노드 ID 배열
- 제목
- 본문
- 엔딩 여부
- 엔딩 타입
- 노드 위치
- 첨부 이미지 ID 배열

### participations

- 어떤 사용자가 어떤 캔버스에 참여했는지 기록
- 최근 방문/기여 시점 관리

### assets

- 업로드 이미지 / 생성 이미지 구분
- Blob URL 저장
- 프롬프트 기록

## 8. 서버 규칙

서비스 무결성을 위해 아래 규칙을 강제합니다.

- 비로그인 사용자는 공유 키로 캔버스 조회 가능
- 모든 쓰기 작업은 로그인 필요
- 캔버스 생성 시 캔버스와 루트 노드를 함께 생성
- 다른 캔버스의 부모 노드에는 자식 생성 불가
- 엔딩 노드 아래에는 새 노드 생성 불가
- 노드 본문은 발행 후 수정하지 않음
- 위치 수정은 `position`만 변경
- 최대 작성 노드 수에 도달하면 자동 엔딩 생성

## 9. 현재 UI 기준 주요 화면

### 랜딩

- 서비스 소개
- 회원가입 / 로그인 진입

### 홈

- 내 캔버스 목록
- 새 캔버스 생성
- 불필요한 디버그 정보 제거

### 캔버스

- 분기 구조 시각화
- 노드 선택
- 루트 고정
- 미니맵
- 작성 패널
- 이전 본문 확인

### 리더

- 한 갈래의 서사 읽기
- 공유 링크 복사

## 10. 협업 포인트

이 프로젝트는 여러 역할이 병렬로 작업할 수 있도록 타입과 레이어를 분리해 구성했습니다.

- 공용 타입: [lib/types/domain.ts](/Users/jeongbeomjin/Hex/jungle/codex_team_project/relay-story-studio/lib/types/domain.ts)
- API 타입: [lib/types/api.ts](/Users/jeongbeomjin/Hex/jungle/codex_team_project/relay-story-studio/lib/types/api.ts)
- 인증 서비스: [lib/services/auth.ts](/Users/jeongbeomjin/Hex/jungle/codex_team_project/relay-story-studio/lib/services/auth.ts)
- 캔버스 서비스: [lib/services/canvas.ts](/Users/jeongbeomjin/Hex/jungle/codex_team_project/relay-story-studio/lib/services/canvas.ts)
- 이미지 생성: [lib/ai/image.ts](/Users/jeongbeomjin/Hex/jungle/codex_team_project/relay-story-studio/lib/ai/image.ts)

## 11. 실행 방법

### 환경 변수

`.env.local` 예시:

```env
MONGODB_URI=
SESSION_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
AI_IMAGE_PROVIDER=auto
OPENAI_API_KEY=
OPENAI_IMAGE_MODEL=gpt-image-1-mini
OPENAI_IMAGE_SIZE=1024x1024
OPENAI_IMAGE_QUALITY=low
OPENAI_IMAGE_OUTPUT_FORMAT=png
```

### 로컬 실행

```bash
npm install
npm run dev
```

### 검증

```bash
npm run lint
npm run typecheck
npm run build
```

## 12. 배포 구조

### 프론트 / 백엔드

- Vercel에 Next.js 전체 배포

### 데이터베이스

- MongoDB Atlas 사용

### 파일 저장

- Vercel Blob 사용

## 13. 트러블슈팅

### 1. Vercel에서 이미지 생성 500 에러

원인:

- 초기에는 `storage/assets`에 직접 파일을 저장했음
- 서버리스 환경에서 로컬 파일 시스템 저장이 안정적이지 않았음

해결:

- Vercel Blob으로 전환

### 2. 회원가입 500 에러

원인:

- 일부 요청이 `nickname` 대신 `name` 필드를 보냄
- 서버가 `input.nickname.trim()`을 바로 호출하면서 예외 발생

해결:

- `nickname`과 `name` 둘 다 허용하도록 호환 처리

### 3. 요약 기능이 안 보이는 문제

원인:

- AI 요약 대신 실제 이전 본문을 보여주는 방식으로 UX를 단순화하는 게 더 적합했음

해결:

- 작성 패널에서 이전 본문을 직접 표시하도록 변경

### 4. 배포 속도가 느린 문제

원인:

- 불필요한 빌드 산출물과 백업 폴더까지 배포 업로드 대상에 포함됨

해결:

- `.vercelignore` 추가

## 14. 발표 때 강조할 포인트

- 단순한 게시판이 아니라 “분기형 스토리 협업 도구”라는 점
- 인증, 캔버스, 리더, 이미지, 배포까지 실제 서비스 흐름이 완성되어 있다는 점
- 루트 고정, 부모 기준 분기 제약, 자동 엔딩 생성 등 도메인 규칙이 코드에 반영되어 있다는 점
- 서버리스 환경에서 파일 저장 문제를 직접 겪고 Vercel Blob으로 전환한 과정
- MongoDB Atlas, Vercel, Blob을 조합해 실제 배포 가능한 구조로 만들었다는 점

## 15. 저장소 구조

```text
app/                 페이지 및 API 라우트
components/          화면 컴포넌트
lib/                 서비스, 인증, DB, AI, 유틸
models/              Mongoose 모델
docs/                역할 문서 및 배포 메모
```

## 16. 한 줄 정리

Relay Story Studio는 여러 사용자가 하나의 이야기 세계를 함께 확장해 나가는 분기형 소설 플랫폼이며,  
인증, 캔버스 편집, 리더, 이미지 생성, 실제 배포까지 연결된 프로젝트입니다.
