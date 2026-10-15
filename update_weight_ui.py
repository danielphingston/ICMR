from pathlib import Path
p=Path('protocol-app.js');s=p.read_text(encoding='utf-8')
start=s.index('function weightChoice(){')
end=s.index('\nfunction sourceNote()',start)
block=s[start:end]
block=block.replace('return `<div id="weight-choice"><div class="field">','return `<div class="field">')
block=block.replace('The reference case rounds its calculated ABW to 59 kg for TER.</p></div>`;}','The reference case rounds its calculated ABW to 59 kg for TER.</p>`;}')
s=s[:start]+block+s[end:]
s=s.replace("for(const [id,fn] of Object.entries(dynamic)){const node=$('#'+id);", "if(document.activeElement?.dataset.field==='protocol.customWeight')delete dynamic['weight-choice'];for(const [id,fn] of Object.entries(dynamic)){const node=$('#'+id);")
s=s.replace('<div>Weight used<strong>${num(a.anthropometrics?.calculationWeightKg,2)} kg</strong></div>', '<div>Weight used<strong>${num(a.anthropometrics?.calculationWeightKg,2)} kg</strong><small>${esc(a.anthropometrics?.weightSource||\'\')}</small></div>')
p.write_text(s,encoding='utf-8')
