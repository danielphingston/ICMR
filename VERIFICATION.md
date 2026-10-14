# Verification — 14 October 2026

## Automated checks

`npm test`: 26 tests passed. Covers ICMR reference values, BMI and weight calculations, invalid/blank/nonfinite inputs, clinical exclusions, macro sum validation, portion quantities, exact meal rounding, backup round trips, corrupt storage, duplicate IDs, schema protection and review snapshots.

`node --check app.js`: passed.

## Browser checks

Checked the served application in the Codex browser at desktop size and at a 390 × 844 mobile viewport:

- Created two clearly named synthetic QA patients and switched between them.
- Verified male, moderate activity reference: 2,710 kcal/day; 170 cm / 90 kg: BMI 31.1.
- Selected optional adjusted weight and verified 71.3 kg displayed and approximately 2,993 kcal/day, with non-ICMR convention labelling.
- A 105% macro split displays an error and withholds output; restoring 100% restores targets.
- A 105% meal split displays an error and withholds the distribution table.
- Blank food quantities display validation; corrected custom quantities update the daily and meal table.
- Entered meal instructions, saved a reviewed plan and confirmed its dated snapshot.
- Confirmed saved records and review history survive a reload.
- Downloaded a JSON backup and imported it through the file picker; preview detected both existing IDs and correctly disabled a duplicate-only merge.
- Archived both synthetic records; verified they remain recoverable in Device & data and disappear from the active list.
- Stopped the local server and reloaded: the cached interface and persisted assessment remained available.
- Checked mobile navigation, form layout and table containment. Browser error log was empty during the main workflow check.

## Limits

- Native installation was not performed; manifest, icons, install prompt handling and offline service-worker behavior are implemented. Phone installation needs an HTTPS origin reachable by the phone.
- A physical print/PDF export was not performed. A print stylesheet and browser print action are provided.
- These checks verify software behavior, not clinical validation of a patient's prescription.
- Synthetic QA records remain archived only in the testing browser profile. No patient data is bundled with the source.
