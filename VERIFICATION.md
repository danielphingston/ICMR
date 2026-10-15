# Verification · 14 October 2026

## Revised clinical protocol

- `npm test`: 42 tests passed (legacy calculation regression, active protocol calculations and storage validation).
- Supplied case: BMI31.94046; selected59 kg × moderate30 =1770 kcal. Exact macros199.125/110.625/59 g; rounded199/111/59 g.
- Raw reference DDP:1697.666668 kcal;196.96 g CHO;101.456667 g protein;56 g fat. Within documented allowances, not an exact target match.
- Reference meal grid correctly flags cereals150 vs169.3 g, pulses60 vs28.4 g, other vegetables2 vs3 portions. Three minor-source allocations also disagree with their declared CHO targets.
- Seeded cereal169.3125 g and pulse28.455882352941174 g retain raw precision.
- New synthetic patient: assessment → targets → DDP → six independent meal columns → review → finalised snapshot. Snapshot survived reload.
- Editing oil to zero returned the current plan to draft and disabled finalisation. Restoring it reconciled the rows again.
- Adding a meal required its empty cells to be completed; removing it restored the prior column arrangement. Clearing one cereal cell reduced reconciliation from11/11 to10/11; restoring it returned11/11.
- Exported snapshot was downloaded, parsed with the production backup validator, and verified to contain six meals,11 DDP rows, selected59 kg, reviewed state and calculated1770 kcal.
- Synthetic QA patient was archived, preserving recoverability. Supplied reference case remains an unsaved example.
- Desktop and390px mobile browser views inspected. No document-level horizontal overflow; wide matrices scroll within their cards. Viewport override reset after testing.
- Browser console contained no errors/warnings during connected interaction.
- Local preview server stopped, then browser reloaded successfully from service-worker cache; reference page and supplied-case calculations remained usable offline.

## Limits

PWA assets, manifest and offline reload were checked; OS-level installation was not performed. Print/PDF report content and print stylesheet are implemented, but no final printed PDF was visually audited in this revision. Achieved fibre cannot be calculated from the supplied constants. No external hosting, cloud storage or patient upload was added.


## Weight selection update · 15 October 2026

- IBW now uses height in metres squared × 22.5. ABW now uses IBW + 0.25 × (actual − IBW).
- Recommended mode selects actual weight below BMI 23 and ABW at BMI 23 or above. ABW is rounded to the nearest kg for TER, matching the supplied Sajitha example.
- Clinicians can select actual, IBW, ABW, or custom weight. Legacy explicit calculation weights are preserved as custom selections.
- The Sajitha example derives IBW 53.361 kg and ABW 58.95825 kg (58.96 displayed), with 59 kg used for TER.
- JavaScript syntax was checked after the change. The regression suite was not rerun for this update.
