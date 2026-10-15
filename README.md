# Nourish · Clinical diet protocol

A local, buildless, mobile-first PWA for a clinician to manage patients, compute targets, create a daily diet prescription (DDP), and reconcile food quantities across meals. No package dependencies, CDN, analytics or patient-upload endpoint.

## Run

Run `npm start` in this directory and open http://127.0.0.1:4173/ in Chrome or Edge. Node.js 18+ is required; no install/build step is needed. Run `npm test` for calculation and storage tests.

Use the same browser profile and address each time: localhost and 127.0.0.1 have separate storage. The server binds only to this computer. Phone installation requires a reachable HTTPS origin; the desktop localhost URL cannot be used from a phone. No remote deployment has been made.

## Clinical workflow

1. Add a patient and record height, actual weight, age, sex, activity, clinical notes and optional labs.
2. BMI uses actual weight. IBW is height in metres squared × 22.5; ABW is IBW + 0.25 × (actual − IBW). The default weight is actual below BMI 23 and ABW at BMI 23 or above, rounded to the nearest kg as in the Sajitha example. Choose actual, IBW, ABW or a custom weight when clinically appropriate.
3. Set macro percentages, minor CHO target and its six allocations. Review the remaining major CHO, split 7/8 to cereals and 1/8 to pulses.
4. Apply CHO allocations to seed the 11-row DDP. Edit raw weights or fractional portions while watching nutrient totals and residuals. Choose meat/fish, eggs and oil amounts clinically.
5. Configure 1–8 meals. Independently allocate each food row: cereals/pulses in raw grams, other foods in portions. All cells require a number, including explicit zero. Every row must reconcile.
6. Review checks, confirm clinical review, and save a dated snapshot. Print/save PDF includes patient data, anthropometry, targets, ranges, carbohydrate rationale, DDP weights, meal grid, instructions and labs. Drafts and unsaved reference examples are clearly labelled.

Changes to prescription inputs return the current plan to draft; past snapshots remain available. Patients can be archived/restored, searched and switched. JSON backup/import includes archived records and snapshots; existing IDs are skipped on import.

## Calculation basis and changes

The active implementation follows the two supplied documents, not the first version's population-energy reference and My Plate scaling:

- TER = selected kg × activity factor: sedentary 25, moderate 30, heavy 35–40 kcal/kg.
- Editable macro percentages sum to 100. CHO/protein use 4 kcal/g; fat uses 9 kcal/g.
- Default 45/25/30 split, whole-gram targets, 70 g minor CHO and allowances come from the supplied reference case. These are editable planning inputs, not general ICMR recommendations.
- Exact macro values are retained and visible. Disable whole-gram rounding when using exact-match acceptance, since rounded macros can yield energy different from TER.
- The fixed 11-food exchange matrix is transcribed from the developer specification. The app does not claim independent verification of these exact exchange constants as an official ICMR protocol.
- Default DDP allowances: energy ±100 kcal, CHO ±25 g, protein ±10 g, fat ±5 g. Exact mode uses ±0.1 g/kcal. CHO-source reconciliation uses 0.1 g and meal-row matching uses 0.0001 raw g/portion. Numeric display rounding does not change stored inputs.
- BMI: WHO underweight threshold 18.5; Asian Indian action points 23 (overweight) and 25 (obesity), explicitly labelled. The recommended weight basis is actual below BMI 23 and ABW at BMI >=23. The Sajitha ABW is about 58.96 kg and is rounded to 59 kg for TER.
- Adult scope only; pregnancy and lactation are withheld from automated calculations. Labs are recorded for clinician interpretation without automatic diagnosis or treatment changes.
- Fibre may be recorded as a target, but achieved fibre is unavailable because the provided matrix has no fibre constants.

## Supplied example discrepancies

The reference case uses 59 kg ×30 =1770 kcal, with rounded CHO/PRO/FAT targets 199/111/59 g. Its listed raw food weights produce 1697.67 kcal, 196.96 g CHO, 101.46 g protein and 56 g fat, inside the documented allowances.

Its stated 70 g minor CHO allocation differs from the 68 g supplied by the listed raw weights. Meal totals also disagree with DDP: cereals150 vs169.3 g, pulses60 vs28.4 g, other vegetables200 vs300 g. The reference page explains these and can load the original example, unsaved, for inspection. No values are silently changed to make it pass.

The original DOCX files are unchanged. Extracted working text is in `.references/` and is excluded from the local server's asset whitelist.

## Data and offline use

Patient records remain in browser localStorage. Records and JSON backups are not encrypted; use a protected device and secure backups. Clearing browser storage deletes its local records. No cloud sync or multi-user database is included.

After one successful visit, the service worker caches every app asset for offline reload. The manifest supplies normal/maskable icons and standalone display. Install via the browser's install option; Safari uses Share → Add to Home Screen. PWA installation itself is browser/device dependent and was not performed by the agent.

Earlier-version patient settings/history are retained in backups. They require a new protocol assessment and are never silently treated as finalised under the new rules. Legacy calculation files are retained for regression tests; `app.js` loads `protocol-app.js` and `protocol.js` for the active clinical flow.

## Sources

- User-supplied Developer Spec–Clinical Diet Protocol App.docx
- User-supplied Dietician Reference–Sajitha K M.docx
- WHO adult BMI context: https://www.who.int/data/nutrition/nlis/info/malnutrition-in-women
- Asian Indian BMI consensus: https://kemdiabetes.org/Paper/125%20Consensus%20Statement%20for%20Diagnosis%20of%20Obesity,%20Abdominal%20Obesity%20and%20the%20Metabolic%20Syndrome%20for%20Asian%20Indians.pdf
