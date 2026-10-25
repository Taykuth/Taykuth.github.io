# Bora Taykut HINDAL — AI Engineer Portfolio

This repository powers my bilingual portfolio ([English](https://taykuth.github.io/) · [Türkçe](https://taykuth.github.io/tr/)) and hosts **Kocaeli Factory Intelligence**, an explainable predictive-maintenance prototype for manufacturing operations.

[Portfolio](https://taykuth.github.io/) · [Live KFI demo](https://taykuth.github.io/kocaeli-factory-intelligence/) · [Project documentation](./kocaeli-factory-intelligence/) · [Source package](./kocaeli-factory-intelligence/source/)

## Featured project: Kocaeli Factory Intelligence

Kocaeli Factory Intelligence turns machine telemetry into an interpretable maintenance signal: an estimated 24-hour failure risk, an anomaly score, the signals behind the alert, and a concrete first maintenance action.

It is intentionally framed as a manufacturing pilot prototype rather than a claim of production-ready accuracy. The dashboard keeps the selected demo scenario separate from the model calculation, so visual alerts cannot be mistaken for model outputs.

| Area | Implementation |
| --- | --- |
| Product surface | Responsive browser dashboard for maintenance and shift teams |
| Runtime | JavaScript with ECMAScript Modules; Node.js 20+ |
| Telemetry | Deterministic synthetic data: 8 machines, 4,608 measurements, 15-minute intervals |
| Anomaly detection | Multivariate z-score |
| Failure-risk model | Class-weighted logistic regression trained with gradient descent |
| Evaluation | Temporal 75/25 holdout split, with precision, recall, F1 and false-alarm rate |
| Serving | Static GitHub Pages demo plus an optional Node.js HTTP API |
| Quality checks | Node test runner and a GitHub Actions verification workflow |

### Review the project in three minutes

1. Open the [live demo](https://taykuth.github.io/kocaeli-factory-intelligence/).
2. Switch between bearing wear, cooling issue and normal-operation scenarios.
3. Compare the risk trend, suggested action, anomaly score and feature-level explanation.
4. Read the [project README](./kocaeli-factory-intelligence/) for architecture, model limits and a local run guide.
5. Inspect the [reproducible source package](./kocaeli-factory-intelligence/source/).

### Why this project matters

Predictive-maintenance work is not only a model-training problem. A useful first pilot must deal with time-aware validation, imbalanced labels, false-alarm cost, operator explanation and an operational action loop. This prototype makes those decisions visible rather than hiding them behind a single “AI score.”

### Evidence and limitations

The published metrics are generated from a reproducible synthetic holdout dataset. They are **not** presented as results from a real factory. A real pilot would first join historian/SCADA telemetry with CMMS maintenance records, agree on failure labels and cost functions with the maintenance team, and evaluate the effect on downtime and work orders.

## Local verification

~~~bash
git clone https://github.com/Taykuth/Taykuth.github.io.git
cd Taykuth.github.io/kocaeli-factory-intelligence/source
npm run verify
npm run serve
~~~

The local service starts on http://127.0.0.1:8080.

## Repository map

~~~
.
├── index.html                    # English portfolio page (generated)
├── tr/index.html                 # Turkish portfolio page (generated)
├── content/en.json, tr.json      # All page text, one file per language
├── tools/build.py                # Builds both pages from content/*.json (standard library only)
├── tools/make_og.py, og.html     # Renders the social preview images
├── assets/                       # CSS, JS, self-hosted fonts, images and the public CVs
├── kocaeli-factory-intelligence/
│   ├── README.md                 # Project documentation
│   ├── index.html                # Public GitHub Pages dashboard
│   ├── data/                     # Browser model artifacts
│   └── source/                   # Reproducible modeling and API source
└── .github/workflows/kfi-verify.yml
~~~

## Editing the portfolio

The two pages are generated, so edit the JSON, not the HTML:

~~~bash
# change text in content/en.json and content/tr.json, then
python tools/build.py
~~~

- The about section is under `about`, featured projects under `work.projects` and smaller ones under `more`; keep the two languages in step.
- The CV buttons point to `assets/cv/Bora_Taykut_Hindal_CV_EN.pdf` and `..._TR.pdf`. Replace those files to update the CV. The public copies leave out the phone number.
- The portrait (`assets/img/portrait-*.webp`) has a transparent background so the red backlight shows behind it.
- English is served at `/`, Turkish at `/tr/`. A browser set to Turkish is sent to `/tr/` once, unless the visitor has picked a language with the switch.
- The only font, Archivo, is self-hosted under `assets/fonts/` (SIL Open Font License), so the site makes no third-party requests.
