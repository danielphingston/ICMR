from pathlib import Path
p=Path('protocol-app.js');s=p.read_text(encoding='utf-8')
s=s.replace('<tr><td>Adjusted weight</td><td>Optional formula based on BMI 22.5</td><td>Clinician-entered weight; no formula specified</td></tr>', '<tr><td>TER weight</td><td>Prior manual selection</td><td>Actual below BMI 23; ABW at BMI ≥23; IBW or custom also selectable</td></tr>')
s=s.replace('The provided case selects 59 kg and moderate activity: <strong>59 × 30 = 1,770 kcal</strong>.', 'The provided case has IBW <strong>53.36 kg</strong> and calculated ABW <strong>58.96 kg</strong>, rounded to 59 kg for TER: <strong>59 × 30 = 1,770 kcal</strong>.')
s=s.replace('The document calls these ICMR portions. The app attributes the exact constants to the supplied specification; it does not assert that this whole protocol is an official ICMR guideline.', 'The document calls these ICMR portions. The app attributes the exact constants and weight formulas to the supplied clinical instructions; it does not assert that this whole protocol is an official ICMR guideline.')
p.write_text(s,encoding='utf-8')
