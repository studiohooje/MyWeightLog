# 마웨로그 · MyWeightLog

몸·식단·운동을 기록하는 개인용 웹 앱입니다. 현재 상태는 **beta**입니다.

## 사용과 데이터

기록은 먼저 사용하는 기기에 저장됩니다. 로그인 상태에서는 개인 몸·식단·운동·설정의 Firebase 자동 동기화를 시도하며, 설정에서 전송 상태와 충돌을 확인할 수 있습니다. 사진과 운동 초안은 기기에 남습니다. 배포된 Firebase 권한 규칙과 실제 계정의 저장 동작은 별도로 확인해야 합니다. 브라우저 데이터 삭제 전에 앱 설정에서 사진 포함 통합 백업을 내려받으세요.

음식은 직접 입력하거나 Codex가 검증해 소스 도감에 추가할 수 있습니다. 운동·머신은 사진 또는 직접 입력으로 관리자에게 등록 요청할 수 있습니다. 공용 도감의 관리자 수정값은 이후 기록에 적용되며, 과거 기록의 수치와 세트는 보존합니다. 외부 AI와 음식 검색 API는 연결하지 않았습니다.

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

## GitHub Pages

저장소 Settings → Pages → Build and deployment의 Source를 GitHub Actions로 설정합니다. `main`에 push하면 테스트·빌드가 통과한 `app/dist`를 배포합니다. 공개 URL: https://studiohooje.github.io/MyWeightLog/ 앱 경로, manifest, 서비스워커는 프로젝트 하위 경로를 지원하는 상대경로를 사용합니다.

이 저장소에는 앱 소스와 합성 데이터 테스트만 포함합니다. 개인 기록, 브라우저 프로필, 내부 작업 문서, 서명키, APK, 빌드 캐시는 포함하지 않습니다.

## 외부 구성요소

OCR 라이브러리 및 학습 데이터 고지는 [app/THIRD_PARTY_NOTICES.md](app/THIRD_PARTY_NOTICES.md)와 `app/licenses/`를 확인하세요. 별도의 프로젝트 오픈소스 라이선스는 아직 지정하지 않았습니다.

