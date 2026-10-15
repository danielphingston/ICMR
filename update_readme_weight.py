from pathlib import Path
p=Path('README.md');s=p.read_text(encoding='utf-8')
s=s.replace('Select the calculation weight. BMI uses actual weight. At BMI >=23, a clinician-entered weight is required; the supplied documents do not define an automatic ABW formula.', 'BMI uses actual weight. IBW is height in metres squared × 22.5; ABW is IBW + 0.25 × (actual − IBW). The default weight is actual below BMI 23 and ABW at BMI 23 or above, rounded to the nearest kg as in the Sajitha example. Choose actual, IBW, ABW or a custom weight when clinically appropriate.')
s=s.replace('The specification provides no ABW formula.', 'IBW uses target BMI 22.5, and ABW applies the specified 0.25 correction factor.')
s=s.replace('BMI: WHO underweight threshold 18.5; Asian Indian action points 23 (overweight) and 25 (obesity), explicitly labelled.', 'BMI: WHO underweight threshold 18.5; Asian Indian action points 23 (overweight) and 25 (obesity), explicitly labelled. The recommended weight basis is actual below BMI 23 and ABW at BMI >=23. The Sajitha ABW is about 58.96 kg and is rounded to 59 kg for TER.')
p.write_text(s,encoding='utf-8')
