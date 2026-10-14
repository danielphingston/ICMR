from pathlib import Path
p=Path('protocol-app.js');s=p.read_text(encoding='utf-8')
s=s.replace('<span>${c.label}</span>', '<span><strong>${c.ok?\'Pass\':\'Needs attention\'}</strong> · ${c.label}</span>')
s=s.replace("label:'All 11 food-group meal rows match the DDP'}];", "label:'All 11 food-group meal rows match the DDP'},{ok:current().protocolMeals.every(m=>m.label.trim()),label:'Every meal has a name'}];")
s=s.replace("function distributionBadge(){const rows=foods().map(rowDistribution);", "function distributionBadge(){const rows=foods().map(rowDistribution);")
s=s.replace("${p.protocol.roundMacroTargets?'Whole-gram planning targets; underlying exact values retained.':'Unrounded planning targets.'}</p>", "${p.protocol.roundMacroTargets?`Whole-gram planning targets. Exact values: CHO ${num(a.macros?.exactGrams?.carbs,3)}, PRO ${num(a.macros?.exactGrams?.protein,3)}, FAT ${num(a.macros?.exactGrams?.fat,3)} g.`:'Unrounded planning targets.'}</p>")
p.write_text(s,encoding='utf-8')
