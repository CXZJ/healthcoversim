# HealthCoverSim

A local health-cover quote simulator built with React, Express, and SQLite. Create, view, edit, and delete quotes, then read an explanation of the hospital cover, extras cover, applicant loadings, Family upgrade fee, and annual-payment discount.

This application follows the simplified rules in `Assignment_1_HealthCoverSim.pdf`. It produces learning estimates, not insurer prices or an insurance policy.

## Requirements

- Node.js 24 or newer, with npm. The backend uses Node's built-in `node:sqlite` module; no separate SQLite service is needed.
- A modern web browser.

## Install and run

Open a terminal in the project directory:

```bash
npm install
npm run db:init
npm run dev
```

Open <http://127.0.0.1:5173>. The development API runs at <http://127.0.0.1:3001>; Vite forwards `/api` requests to it. Keep the terminal running, and press `Ctrl+C` to stop the application.

The database starts empty. To add the assignment's worked example for practice:

```bash
npm run db:seed
```

The seed command adds a fictional customer, Mira Hartono. Running it again preserves the existing example when its customer name and demo note are unchanged. Seeding is optional and is not needed to create your own quotes.

For a production build served by Express:

```bash
npm run build
npm start
```

Open <http://127.0.0.1:3001>. This is still a local application; these commands do not publish it to the internet.

## Database and configuration

`npm run db:init` creates the database schema if needed. Normal server startup also initializes it. Saved quotes persist when the server stops and restarts.

| Setting | Default | Purpose |
| --- | --- | --- |
| `DATABASE_PATH` | `data/healthcoversim.sqlite` | SQLite file containing saved quote inputs |
| `PORT` | `3001` | Express server port |

For example, choose a separate database for a demonstration:

```bash
DATABASE_PATH=/tmp/healthcoversim-demo.sqlite npm run db:init
DATABASE_PATH=/tmp/healthcoversim-demo.sqlite npm run dev
```

Use the same `DATABASE_PATH` for initialization, seeding, and running when selecting a custom location. The standard development setup expects API port 3001.

The database stores the customer and cover inputs plus timestamps. Premiums and explanation sheets are recalculated from those inputs when quotes are read. Applicant 2 fields are stored as `NULL` for Single cover.

## Using the application

1. Open the quote list and choose to create a quote.
2. Complete the Customer, Applicants, Cover, and Payment sections. Couple and Family require two applicants; Single requires one.
3. Save valid inputs to open the explanation sheet. There is no final estimate while the form is incomplete.
4. Use the detail page to edit the quote or return to the list.
5. Delete a quote only after confirming the customer name in the confirmation dialog.

Required selections start blank. Choose `None` explicitly if no hospital or extras cover is wanted. Both frontend and backend validate the inputs: applicant ages must be integers from 18 to 100, required selections must be present, and the annual-payment discount must be from 0% to 10%.

## Quote logic

Prices are in Australian dollars and displayed to two decimal places.

| Hospital level | Per adult, per month |
| --- | ---: |
| None | $0.00 |
| Basic | $90.00 |
| Bronze | $120.00 |
| Silver | $160.00 |
| Gold | $220.00 |

| Extras level | Per adult, per month |
| --- | ---: |
| None | $0.00 |
| Basic | $25.00 |
| Standard | $45.00 |
| Premium | $70.00 |

Single cover counts one adult. Couple and Family count two adults. Family adds one flat **$30.00 monthly Family upgrade fee**; dependent children are not separately priced.

Each applicant's Lifetime Health Cover loading is `(age − 30) × 2%` when they are older than 30, answer `No` to hospital cover history, and select hospital cover. `Yes` and `Not sure` receive 0% loading; `Not sure` also produces an applicant-specific uncertainty warning.

**Lifetime Health Cover loading applies only to hospital cover. It does not apply to extras cover.**

```text
Applicant hospital cost = hospital base × (1 + applicant loading / 100)
Monthly premium = total hospital costs + total extras costs + Family upgrade fee
Yearly premium before discount = monthly premium × 12
Yearly premium after discount = yearly premium before discount × (1 − discount / 100)
```

Only Yearly payment applies an annual-payment discount. Monthly payment uses the monthly premium and ignores any annual-payment discount. The form shows the discount field only for Yearly payment. Monetary amounts are rounded to cents.

For the assignment's example—Family, ages 40 and 35, history `No` and `Yes`, Silver hospital, Standard extras, Yearly payment, and 5% discount:

```text
Hospital: $160 × 1.20 + $160 = $352.00
Extras: $45 × 2 = $90.00
Family upgrade fee: $30.00
Monthly premium: $352 + $90 + $30 = $472.00
Yearly before discount: $472 × 12 = $5,664.00
Yearly after discount: $5,664 × 0.95 = $5,380.80
```

See [the calculation guide](docs/calculation-guide.md) for a walkthrough of the formulas and edge cases.

## Project structure

| Location | Responsibility |
| --- | --- |
| `client/` | React screens, quote form, explanation sheet, and styling |
| `shared/quote.js` | Shared validation and quote calculations |
| `server/app.js` | Express HTTP API |
| `server/db.js` | SQLite schema and quote persistence |
| `server/index.js` | Server entry point |
| `data/` | Generated local database |
| `docs/` | Calculation and demonstration guides |

The API exposes `GET /api/quotes`, `POST /api/quotes`, `GET /api/quotes/:id`, `PUT /api/quotes/:id`, and `DELETE /api/quotes/:id`. Invalid inputs are rejected before a quote is stored or updated. The browser uses hash routes: `#/quotes`, `#/quotes/new`, `#/quotes/:id`, and `#/quotes/:id/edit`.

## Verification

```bash
npm test
npm run lint
npm run build
```

The automated tests use Node's built-in test runner. HTTP API tests start a local Express server and use native `fetch` requests. They cover the worked example, hospital-only loading, monthly discount exclusion, unknown history, validation boundaries, CRUD operations, and SQLite persistence.

Use [the demonstration guide](docs/demo-guide.md) for manual browser verification of the required quote flows and to explain the results in your own words. Also check keyboard navigation and the form and explanation sheet at a narrow mobile width.

## Limits

This assignment model has fixed prices and a simplified LHC formula. It does not model actual insurers, rebates, tax, age-based discounts, real-world loading caps, or individual dependent details. Following the assignment formula, an eligible 100-year-old applicant has a 140% loading; no additional real-world cap is introduced.

Selecting `None` for both covers is permitted. Hospital and extras cost $0.00; Family still adds its $30.00 monthly fee. `Not sure` uses no loading but warns that the estimate may change if hospital cover history is confirmed.

There is no login, quote search, PDF export, public hosting, or access control. Use fictional names for demonstrations.

## AI assistance and student review

Codex generated the application code, automated tests, and documentation from the supplied assignment and the decisions approved in the planning conversation. The student selected the local implementation scope, calm teal visual direction, grouped form, save-then-calculate flow, delete confirmation, optional demonstration data, and staged explanations with AI assistance.

This statement does **not** claim that the student has personally checked or independently written every generated part. Before submission, the student must read the code, run the checks, verify the assignment requirements, understand the calculations, and update this statement to accurately describe their own reviewed contributions and changes. Follow the course's AI-use and attribution requirements.

## Preparing the source submission

Create the source ZIP from the project directory. This excludes dependencies, build output, local skills, test output, and generated databases:

```bash
zip -r HealthCoverSim-source.zip . -x \
  'node_modules/*' 'dist/*' '.git/*' '.agents/*' '.codex/*' \
  '.scratch/*' '.npm-cache/*' '.cache/*' \
  'test-results/*' 'playwright-report/*' 'data/*.sqlite*' \
  'HealthCoverSim-source.zip' '.DS_Store' '*/.DS_Store'
```

Keep `package.json`, the lockfile, source code, tests, scripts, and documentation in the submission. Check the ZIP contents before uploading. The recipient can recreate the database with `npm run db:init` and optionally `npm run db:seed`.

Recording the demonstration and publishing a GitHub repository, if required by the assignment, remain student submission tasks; neither is performed by running this application.
