from pathlib import Path
from zipfile import ZipFile
from lxml import etree

refs = [
    ('developer-spec', Path(r'C:\Users\danie\Downloads\Developer Spec- Clinical Diet Protocol App.docx')),
    ('dietician-reference', Path(r'C:\Users\danie\Downloads\Dietician Reference- Sajitha K M.docx')),
]
ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'm': 'http://schemas.openxmlformats.org/officeDocument/2006/math'}
for key, path in refs:
    out = Path('.references') / key
    out.mkdir(parents=True, exist_ok=True)
    with ZipFile(path) as z:
        root = etree.fromstring(z.read('word/document.xml'))
        lines = []
        for element in root.find('w:body', ns):
            if element.tag == '{%s}p' % ns['w']:
                text = ''.join(element.xpath('.//w:t/text() | .//m:t/text()', namespaces=ns))
                if text: lines.append(text)
                for drawing in element.xpath('.//w:drawing', namespaces=ns):
                    lines.append('[Embedded image]')
            elif element.tag == '{%s}tbl' % ns['w']:
                lines.append('[Table]')
                for row in element.findall('w:tr', ns):
                    cells = [' '.join(cell.xpath('.//w:t/text() | .//m:t/text()', namespaces=ns)) for cell in row.findall('w:tc', ns)]
                    lines.append(' | '.join(cells))
        for name in z.namelist():
            if name.startswith('word/media/'):
                (out / Path(name).name).write_bytes(z.read(name))
                lines.append('[Asset: %s]' % (out / Path(name).name))
        content = '\n'.join(lines)
        (out/'text.txt').write_text(content,encoding='utf-8')
        print('\nDOCUMENT: '+path.name+'\n'+content)
