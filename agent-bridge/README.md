# 마웨로그 AI 연결 도구 · Beta 2.0.0

Codex·Claude Code 등 **로컬 MCP 도구를 실행할 수 있는 AI**가 사용자의 마웨로그 계정에 직접 **검토함 초안**을 쓰는 공통 연결부입니다. AI 모델 API는 사용하지 않습니다. 최종 기록 확정은 마웨로그 앱의 사용자가 합니다.

## 실행

Node.js 22 이상에서 이 폴더의 `mcp.mjs`를 `stdio` MCP 서버로 등록합니다.

```text
command: node
args: C:\VibeCoding Claude\MyWeightLog\agent-bridge\mcp.mjs
```

서버 시작 시 표준 오류 출력에 `포트`와 8자리 `코드`가 표시됩니다. **같은 컴퓨터**의 마웨로그 웹 앱에서 승인된 본인 계정으로 로그인하고, 설정의 AI 연결에서 포트와 코드를 입력합니다. 앱이 현재 사용자의 단기 Firebase ID 토큰을 `127.0.0.1`에만 전송합니다. 토큰은 연결 도구의 메모리에만 있고 파일·프롬프트·저장소에 쓰지 않습니다. 10분 안에 연결해야 하며 토큰 유효 기간이 지나면 다시 연결합니다. 두 사용자는 각각 별도 기기·계정으로 연결합니다.

마웨로그의 Firebase 규칙이 자신의 기록에만 접근을 허용합니다. 서비스 계정이나 관리자 자격증명은 사용하지 않습니다. Firebase Spark에서 Firestore 숫자·문자 초안은 가능하나 사진 원본 서버 업로드는 이 도구가 수행하지 않습니다. 사진은 AI 대화에 첨부하여 해석하고, 초안에는 사진 역할과 판정 근거 **메타데이터만** 담습니다. 사진의 실제 픽셀을 Firebase에 저장·동기화했다고 표현해서는 안 됩니다.

## 도구

- `mwl_connection_status`: 연결된 UID와 만료 시각 확인.
- `mwl_search_records`: 본인 음식·머신·운동 및 공개 도감 검색. 새 항목 생성 전 호출.
- `mwl_create_draft`: `meal`, `workout`, `body`, `food`, `machine`, `exercise` 초안 생성. 동일 `requestId` 재시도는 동일 초안으로 처리.
- `mwl_list_drafts`: 본인의 검토함 상태 확인.

`mwl_create_draft`는 `requestId`, 사용자 원문 `originalUtterance`, 기록별 `parsedData`, 선택적 `uncertainty`와 `evidence`를 받습니다. 식사는 `parsedData.items[]`에 음식별 마웨로그 식사 필드를 보냅니다. 사진 식단의 추정치는 **각 음식의 `aiEstimate`**에 중앙 영양값과 범위를 같은 단위로 기록합니다. `uncertainty`에는 초안 전체에 적용되는 사유를 기록할 수 있습니다. 신규 머신은 `evidence.photos`에 `{role:'whole'}`과 `{role:'nameplate'}` 두 항목이 필요하며 제조사와 모델이 불명확하면 도구가 등록을 거절합니다. 원본 사진이 도구로 전송되는 것은 아니므로 사진 판정은 AI와 사용자의 대화에서 수행합니다.

### 호출 예시

```json
{
  "type":"meal",
  "requestId":"2026-11-17-meal-1-photo-001",
  "sourceModel":"Codex",
  "originalUtterance":"오늘 오전 10시 식사①. 현미밥과 닭가슴살 사진을 보고 대략 기록해줘.",
  "parsedData":{"items":[
    {"date":"2026-11-17","slot":"식사①","loggedAt":"2026-11-17T10:00:00+09:00","name":"현미밥","servingQty":200,"servingUnit":"g","calories":300,"carbs":64,"protein":5,"fat":2,"aiEstimate":{"estimated":true,"caloriesMin":240,"caloriesMax":360,"carbsMin":51,"carbsMax":77,"proteinMin":4,"proteinMax":6,"fatMin":1,"fatMax":3,"basis":"사진 분량 추정"}},
    {"date":"2026-11-17","slot":"식사①","loggedAt":"2026-11-17T10:00:00+09:00","name":"닭가슴살","servingQty":120,"servingUnit":"g","calories":198,"carbs":0,"protein":37,"fat":4,"aiEstimate":{"estimated":true,"caloriesMin":150,"caloriesMax":270,"carbsMin":0,"carbsMax":2,"proteinMin":28,"proteinMax":48,"fatMin":2,"fatMax":7,"basis":"사진 분량 추정"}}
  ]},
  "uncertainty":{"estimated":true,"reason":"사진만 있어 중량을 추정함","calories":{"value":498,"min":390,"max":630,"unit":"kcal"}},
  "evidence":{"source":"ai-chat-photo","photos":[{"role":"meal"}]}
}
```

이 숫자는 **도구 형식 예시**이며 실제 음식의 검증된 영양값이 아닙니다. 영양 출처를 찾았으면 URL·제품 기준량을 증거에 남깁니다.

## 시험과 제한

`npm test`는 규격·멱등 ID·Firestore 쓰기 형식·MCP 초기화를 검증합니다. 실제 Firebase 두 계정 연결과 실기기 브라우저 연결은 승인된 별도 계정으로 통합 시험해야 합니다. 대화형 AI가 MCP 서버를 실행할 수 없는 환경에서는 프롬프트만으로 직접 입력이 되지 않습니다. 로컬 호스트 연결은 같은 컴퓨터의 브라우저를 전제로 하며 휴대전화 브라우저에서 데스크톱의 127.0.0.1로 연결되지 않습니다.
