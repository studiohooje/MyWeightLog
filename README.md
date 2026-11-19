# 마웨로그 (MyWeightLog)

체중·체성분, 식단, 운동을 기록하는 개인용 로컬 베타 앱입니다. 안드로이드 프로젝트와 아이폰 홈 화면용 웹 앱(PWA)이 같은 화면 코드를 사용합니다.

## 최신 상태 (MWL Beta 2.0.1 · 2026-11-19)

승인된 각 사용자 계정에 Codex·Claude Code 등 로컬 MCP 도구가 **AI 검토 초안**을 직접 넣는 시험 경로가 있습니다. 이번 패치는 검토함의 식사·운동 편집, 중복 확정 방지, 추정 범위·출처 보존, 머신 등록 요청의 전체·명판 사진 접수를 보완했습니다. [AI 연결 도구](agent-bridge/README.md)와 [패치노트](releases/2.0.1.md)를 확인하세요. AI 모델 API는 앱에 연결하지 않았습니다. AI 대화의 사진 원본은 서버로 전달하지 않으며, 앱 내 머신 등록 요청에 첨부한 사진만 압축해 제한된 요청 문서에 보관합니다. 친구 실계정 연결은 해당 사용자가 직접 로그인해 시험해야 합니다.

웹은 [GitHub Pages](https://studiohooje.github.io/MyWeightLog/)에 게시합니다. Android APK의 버전명은 `2.0.1-beta`이며 [설치 파일](https://studiohooje.github.io/MyWeightLog/downloads/MWL-Beta-2.0.1-debug.apk)을 제공합니다. [AI 기록 지침](MWL_AI_RECORDING_PROMPT.md)과 [사업계획서](MWL_Beta_2_0_Business_Plan.pptx)도 함께 관리합니다.

## 이전 상태 (2026-11-17)

웹 베타는 [GitHub Pages](https://studiohooje.github.io/MyWeightLog/)에 게시되어 있습니다. 식단·운동 입력창은 빠른 검색 패널 방식입니다. Google 로그인 계정은 관리자 승인 후 서버 건강기록과 공용 도감을 사용할 수 있습니다. Firebase는 Spark 요금제를 유지하며 서버 사진 업로드는 비활성화되어 있습니다. Android 디버그 APK는 `MyWeightLog-1.7-beta-quick-palette-debug.apk`입니다. [최신 배포·검증 보고](RELEASE_STATUS_2026-11-17.md)를 우선 확인하세요. 아래의 2026-11-02 항목은 당시 기록입니다.

## 최신 업데이트 (2026-11-02)

[최신 V3 구현·검증 보고서](IMPLEMENTATION_REPORT_V3_2026-11-02.md)를 먼저 확인하세요. 통합 사진 백업·기록 수정·운동 초안 복구·머신/kg·lb·반복 식사·기록 기반 제안을 추가했고, 확정한 **3번 테크니컬 아틀라스**를 공통 적용했습니다. 실제 Android/iPhone 기기 검증과 AI/서버 연결은 별도입니다.

## 결과물

- `app/dist/`: GitHub Pages에 배포하는 정적 웹 앱.
- `app/android/`: Capacitor Android 프로젝트. 디버그 APK는 `app/android/app/build/outputs/apk/debug/app-debug.apk`에 있습니다. Android 에뮬레이터에서 설치·화면 이동을 확인했습니다.
- `app/`: 모듈화된 원본 코드와 자동 테스트.
- `mockups/index.html`: 앞서 만든 다섯 화면 구조 목업.
- [최신 구현·검증 보고서](IMPLEMENTATION_REPORT_V2.md) · [초기 보고서](IMPLEMENTATION_REPORT.md)
- [Astra 새 채팅용 전체 인수인계서](ASTRA_HANDOFF_COMPLETE.md)
- [피트니스 플랫폼 조사와 마웨로그 보완 제안](FITNESS_PLATFORM_RESEARCH_2026-11-01.md)
- [번핏 기능 조사](FEATURE_INVENTORY.md)
- [번핏 Pro 상세 기능·입력 방식과 초기 구현 격차](BURNFIT_PRO_GAP_ANALYSIS.md)

2026-11-01 기능 확장으로 식단 수량·재사용·수정, 운동 종목 목록·세트 편집·유산소·타이머·프로그램·분석, Codex 식단·운동 JSON 검토 가져오기, 진행 사진을 추가했습니다. 최신 기능과 실제 검증 범위는 최신 보고서를 기준으로 확인하세요.

## 실행 및 빌드

Node.js 22 이상에서 `app` 폴더로 이동한 뒤:

```powershell
npm ci
npm test
npm run build
npm run serve
```

브라우저에서 `http://localhost:4173`을 엽니다. `dist`에는 OCR 라이브러리와 한국어·영어 인식 데이터가 함께 들어 있습니다. 정적 파일을 `file://`로 직접 열면 JavaScript 모듈과 서비스 워커가 정상 작동하지 않을 수 있습니다.

안드로이드 프로젝트를 갱신하려면 `npm run build` 다음에 `npx cap sync android`를 실행합니다. APK 생성에는 JDK 21·Android SDK가 필요합니다. 이 작업 공간에는 호환 JDK 21을 `jdk21/`에 두었습니다. `JAVA_HOME`을 그 폴더로, `ANDROID_HOME`을 설치된 Android SDK로 설정한 뒤 `app/android` 폴더의 `gradlew.bat assembleDebug`로 디버그 APK를 빌드합니다. Android Studio Rabbit 2에 포함된 JBR 25는 현재 프로젝트의 Gradle 8.14.3과 호환되지 않았습니다.

## 확정 범위

- 개인용 비공개 사용. 워치 연동은 보류.
- 체중·체지방률·골격근량 그래프, 식단의 칼로리·탄단지 g와 열량 비율, 운동 세트·루틴·볼륨·추정 1RM.
- 인바디 270 결과지 사진의 주요 수치를 기기에서 읽고, 원본 대조 후 저장. 다른 결과지 형식은 수동 입력 또는 마웨로그 JSON 가져오기.
- 로컬 저장, 백업·복원. 서버 동기화는 승인 계정에 한해 활성화했고, 외부 AI는 연결 규격만 준비했다.
- 시각 기준(2026-11-07 갱신): 딥 네이비 `#07111E`, 밝은 아이보리 블루 `#EAF4FF`, 전기 파랑 `#3B8DFF`, 아이스 블루 `#9DDCFF`, Pretendard, Tossface 이모지.

## 데이터 주의

진행 사진은 IndexedDB에 보관하며 V3 통합 JSON 백업에 포함됩니다. 기존 숫자 JSON을 복원하면 현재 사진은 유지합니다. 운동 임시 초안은 설정에서 별도로 내보내세요.


앱은 기록을 먼저 브라우저/웹뷰의 로컬 저장소에 보관합니다. 승인 계정은 Firebase 동기화를 사용할 수 있지만, 기기를 교체하거나 앱 데이터를 지우기 전에 설정에서 백업 파일을 내려받으세요. 인바디 결과지에 포함된 이름·연락처 등 식별 정보는 기록 필드로 가져오지 않습니다. 저장소에는 앱 소스만 올리고 실제 건강 기록이나 백업 파일은 올리지 마세요.


