"""Inserta la portada original (cuerpo de document.xml + imágenes) como primera página del .docx generado."""
import re, shutil, sys, zipfile

generado, portada, salida = sys.argv[1:4]
zp = zipfile.ZipFile(portada)
zg = zipfile.ZipFile(generado)
doc = zg.read('word/document.xml').decode('utf8')
cov = zp.read('word/document.xml').decode('utf8')
cuerpo = re.search(r'<w:body>(.*)</w:body>', cov, re.S).group(1)
cuerpo = re.sub(r'<w:sectPr>.*?</w:sectPr>\s*$', '', cuerpo, flags=re.S)  # sectPr final de la portada
cuerpo = cuerpo.replace('r:embed="rId2"', 'r:embed="rIdPortada1"').replace('r:embed="rId3"', 'r:embed="rIdPortada2"')
# ids únicos de dibujos
n = [9000]
def nuevo(m):
    n[0] += 1
    return f'<wp:docPr id="{n[0]}"'
cuerpo = re.sub(r'<wp:docPr id="\d+"', nuevo, cuerpo)
# primer párrafo del generado = marcador con sectPr (sección de la portada)
m = re.search(r'<w:body>(<w:p>(?:(?!</w:p>).)*?<w:sectPr>.*?</w:sectPr>.*?</w:p>)', doc, re.S)
marcador = m.group(1)
sect = re.search(r'<w:sectPr>.*?</w:sectPr>', marcador, re.S).group(0)
# la sección de la portada termina en su último párrafo
idx = [mm.start() for mm in re.finditer(r'<w:p(?=[ >])', cuerpo)][-1]
tail = cuerpo[idx:]
assert '</w:pPr>' in tail, 'el último párrafo de la portada no tiene pPr'
tail = tail.replace('</w:pPr>', sect + '</w:pPr>', 1)
cuerpo = cuerpo[:idx] + tail
doc = doc.replace(marcador, cuerpo, 1)
rels = zg.read('word/_rels/document.xml.rels').decode('utf8')
rels = rels.replace('</Relationships>', '<Relationship Id="rIdPortada1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/portada1.jpeg"/><Relationship Id="rIdPortada2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/portada2.jpeg"/></Relationships>')
estilos = zg.read('word/styles.xml').decode('utf8')
if 'w:styleId="TableParagraph"' not in estilos:
    estilos = estilos.replace('</w:styles>', '<w:style w:type="paragraph" w:customStyle="1" w:styleId="TableParagraph"><w:name w:val="Table Paragraph"/><w:basedOn w:val="Normal"/><w:uiPriority w:val="1"/><w:qFormat/><w:pPr><w:ind w:left="107"/></w:pPr></w:style></w:styles>')
ct = zg.read('[Content_Types].xml').decode('utf8')
if 'Extension="jpeg"' not in ct:
    ct = ct.replace('<Default ', '<Default Extension="jpeg" ContentType="image/jpeg"/><Default ', 1)
# namespaces de la portada que el generado no declara
raiz = re.search(r'<w:document [^>]*>', doc).group(0)
nuevos = raiz
for pref, uri in re.findall(r'xmlns:(\w+)="([^"]+)"', re.search(r'<w:document [^>]*>', cov).group(0)):
    if f'xmlns:{pref}=' not in nuevos:
        nuevos = nuevos[:-1] + f' xmlns:{pref}="{uri}">'
doc = doc.replace(raiz, nuevos, 1)
with zipfile.ZipFile(salida, 'w', zipfile.ZIP_DEFLATED) as zo:
    for it in zg.infolist():
        data = zg.read(it.filename)
        if it.filename == 'word/document.xml': data = doc.encode('utf8')
        elif it.filename == 'word/_rels/document.xml.rels': data = rels.encode('utf8')
        elif it.filename == 'word/styles.xml': data = estilos.encode('utf8')
        elif it.filename == '[Content_Types].xml': data = ct.encode('utf8')
        zo.writestr(it, data)
    zo.writestr('word/media/portada1.jpeg', zp.read('word/media/image1.jpeg'))
    zo.writestr('word/media/portada2.jpeg', zp.read('word/media/image2.jpeg'))
print('portada fusionada')
