# Third-party notices

The web build distributes these OCR components without modifying their upstream source:

- Tesseract.js 7.0.0 — Apache-2.0, https://github.com/naptha/tesseract.js
- Tesseract.js-core 7.0.0 — Apache-2.0, https://github.com/naptha/tesseract.js-core
- English/Korean Tesseract trained data from `@tesseract.js-data/eng` and `@tesseract.js-data/kor` 1.0.0. npm package metadata declares MIT; the upstream tessdata repository distributes its trained data under Apache-2.0: https://github.com/naptha/tessdata and https://github.com/tesseract-ocr/tessdata. The upstream Apache license is retained in `licenses/tessdata-Apache-2.0.txt`.
- Bundled worker/runtime components include buffer (MIT), ieee754 (BSD-3-Clause), regenerator-runtime (MIT), and zlib.js (MIT). Their provided license text and bundle notices are retained in `licenses/`.

The OCR core incorporates Tesseract and Leptonica. Upstream Leptonica notice is retained in `licenses/leptonica-BSD-2-Clause.txt`.

The full dependency versions are recorded in package-lock.json. Build-only npm dependencies are fetched by npm and not copied wholesale to the web output.
