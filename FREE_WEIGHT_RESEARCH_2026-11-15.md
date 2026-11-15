# 프리웨이트 도감 조사 목록 — 2026-11-15

상태: 조사와 후보 선별 완료. 아래 목록은 `app/catalog.js`의 구현 초안에 반영했다. 배포 여부는 별도 릴리스 확인이 필요하다. 종목 이름·장비·변형을 분리하고, 외부 사이트의 그림과 설명 문장은 복제하지 않는다.

## 현재 도감에서 수정할 종목

| 종목 | 필요한 수정 | 근거 |
|---|---|---|
| 데드리프트 | `등` 단일 분류를 복합 힌지로 바꾸고, 둔근·대퇴사두근·햄스트링과 척추기립근 등의 역할을 구분 | [NASM Barbell Deadlift](https://www.nasm.org/resource-center/exercise-library/barbell-deadlift) |
| 루마니안 데드리프트 | 햄스트링·둔근 주 타깃, 척추기립근 등 보조로 분리 | [NASM Romanian Deadlift](https://www.nasm.org/resource-center/exercise-library/romanian-deadlift-barbell) |
| 스쿼트·프론트 스쿼트 | 바벨 형태를 명시하고 대퇴사두근·둔근 주 타깃을 분리 | [NASM Front/Back Squat](https://blog.nasm.org/sports-performance/front-squat-back-squat-choose) |
| 벤치프레스·인클라인 벤치프레스 | 바벨 형태와 각도 변형을 분리하고 가슴·삼두·전면 어깨 역할을 구분 | [NASM Bench Press](https://www.nasm.org/resource-center/exercise-library/barbell-bench-press), [NASM Incline Bench Press](https://www.nasm.org/resource-center/exercise-library/incline-barbell-bench-press) |
| 바벨 로우·원암 덤벨 로우 | 장비와 편측 기록을 분리하고 등·팔·어깨 관여를 표시 | [ACE Bent-over Row](https://www.acefitness.org/resources/everyone/exercise-library/12/bent-over-row/), [ACE Dumbbell Library](https://www.acefitness.org/resources/everyone/exercise-library/equipment/dumbbells/?page=3) |
| 런지 | 바벨·덤벨·맨몸을 구분해 중량 단위와 좌우 반복 기록을 명확히 함 | [ACE Barbell Library](https://www.acefitness.org/resources/everyone/exercise-library/equipment/barbell/) |
| 바벨 컬 | 이두 주 타깃과 전완 보조를 분리 | [NASM Barbell Bicep Curl](https://www.nasm.org/resource-center/exercise-library/barbell-bicep-curl) |

## 신규 등록 후보

| 종목 | 장비·분류 | 근거 |
|---|---|---|
| 덤벨 루마니안 데드리프트 | 덤벨·힌지 | [NASM](https://www.nasm.org/resource-center/exercise-library/dumbbell-romanian-deadlift) |
| 굿모닝 | 바벨·힌지 | [NASM](https://www.nasm.org/resource-center/exercise-library/good-mornings) |
| 불가리안 스플릿 스쿼트 | 덤벨·편측 하체 | [NASM](https://www.nasm.org/resource-center/exercise-library/bulgarian-split-squat) |
| 고블릿 스쿼트 | 덤벨/케틀벨·하체 | [NASM](https://www.nasm.org/resource-center/blog/training/how-to-perform-goblet-squats) |
| 덤벨 프론트 스쿼트 | 덤벨·하체 | [NASM](https://www.nasm.org/resource-center/exercise-library/dumbbell-front-squat) |
| 클로즈그립 벤치프레스 | 바벨·가슴/삼두 | [NASM](https://www.nasm.org/resource-center/exercise-library/close-grip-bench-press) |
| 원암 덤벨 체스트프레스 | 덤벨·편측 가슴 | [NASM Exercise Library](https://www.nasm.org/workout-exercise-guidance) |
| 덤벨 스텝업 | 덤벨·편측 하체 | [ACE Dumbbell Library](https://www.acefitness.org/resources/everyone/exercise-library/equipment/dumbbells/?page=3) |
| 덤벨 슈트케이스 캐리 | 덤벨·캐리 | [ACE Dumbbell Library](https://www.acefitness.org/resources/everyone/exercise-library/equipment/dumbbells/?page=3) |
| 덤벨 트라이셉스 익스텐션 | 덤벨·팔 | [ACE Dumbbell Library](https://www.acefitness.org/resources/everyone/exercise-library/equipment/dumbbells/?page=3) |
| 덤벨 킥백 | 덤벨·팔 | [ACE Dumbbell Library](https://www.acefitness.org/resources/everyone/exercise-library/equipment/dumbbells/?page=3) |

## 등록 전 검수

- 데드리프트의 기존 `등` 한 줄 분류는 실제 근육 지도와 맞지 않아 기존 ID를 유지하면서 주·보조 타깃을 구분했다. UI가 목록 분류와 타깃을 혼동하지 않아야 한다.
- 척추기립근은 독립된 좁은 그림 영역을 추가했다. 아직 독립 영역이 없는 내전근은 그림에 표시되지 않는다고 텍스트로 명시한다.
- `강도`는 종목 고유값이 아니다. 세트의 중량·횟수·RPE 및 본인 이력으로 추정하고, 실제 근육별 부하로 표현하지 않는다.
- 한 손/한쪽씩 수행하는 종목은 양손 합산 중량인지 한 손 중량인지 선택하도록 한다.
