# 마웨로그 · MyWeightLog

몸·식단·운동을 기록하는 개인용 웹 앱입니다. 현재 상태는 **beta**입니다. 식단·운동 입력은 상단의 빠른 검색창에서 선택과 수치 수정을 이어서 할 수 있습니다. [2026-11-17 배포·검증 보고](RELEASE_STATUS_2026-11-17.md)를 참고하세요.

## 사용과 데이터

기록은 먼저 사용하는 기기에 저장됩니다. Google 로그인으로 Firebase Authentication 계정이 만들어져도, 관리자가 **기록 이용을 승인하기 전에는** 서버 건강기록과 공용 도감에 접근할 수 없습니다. 설정에서 별도 안내를 확인하고 신청하며, 승인 후 개인 몸·식단·운동·설정의 Firebase 동기화가 가능합니다. 사진과 운동 초안은 기기에 남습니다. 브라우저 데이터 삭제 전에 앱 설정에서 사진 포함 통합 백업을 내려받으세요.

음식은 직접 입력하거나 Codex가 검증해 소스 도감에 추가할 수 있습니다. 음식·운동·머신의 **문자 기반** 공용 등록 요청은 관리자에게 전달할 수 있습니다. Firebase Spark 요금제에서는 서버 사진 첨부가 불가능해 사진 등록 요청은 비활성화했습니다. 공용 도감의 관리자 수정값은 이후 기록에 적용되며, 과거 기록의 수치와 세트는 보존합니다. 외부 AI와 음식 검색 API는 연결하지 않았습니다.

타깃 근육과 기록 기반 추정부하는 참고용이며 의학적 피로·회복 상태를 측정하지 않습니다. 실제 Android·iPhone 기기의 로그인, 카메라, 오프라인 복귀는 추가 검증이 필요합니다.

## 개발

Node.js 22 이상에서 실행합니다.

```sh
cd app
npm ci
npm test
npm run build
node verify-build.mjs
npm run serve
```

승인제 Firestore 규칙은 Java 21과 Firebase CLI가 설치된 환경에서 `firebase emulators:exec --only firestore --project demo-myweightlog-approval "node --test tests/approval-rules.test.js"`로 검증합니다. GitHub Pages 배포 작업에도 이 검사를 포함합니다.

## GitHub Pages

저장소 Settings → Pages → Build and deployment의 Source를 GitHub Actions로 설정합니다. `main`에 push하면 테스트·빌드가 통과한 `app/dist`를 배포합니다. 공개 URL: https://studiohooje.github.io/MyWeightLog/ 앱 경로, manifest, 서비스워커는 프로젝트 하위 경로를 지원하는 상대경로를 사용합니다.

이 저장소에는 앱 소스와 합성 데이터 테스트만 포함합니다. 개인 기록, 브라우저 프로필, 내부 작업 문서, 서명키, APK, 빌드 캐시는 포함하지 않습니다.

## 외부 구성요소

OCR 라이브러리 및 학습 데이터 고지는 [app/THIRD_PARTY_NOTICES.md](app/THIRD_PARTY_NOTICES.md)와 `app/licenses/`를 확인하세요. 별도의 프로젝트 오픈소스 라이선스는 아직 지정하지 않았습니다.

