// Constructor común de los manuales (docx-js). Arial, texto justificado, grises.
const fs = require('fs');
const D = require('docx');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun, Header, Footer, AlignmentType, LevelFormat,
  InternalHyperlink, Bookmark, TabStopType, LeaderType, HeadingLevel, BorderStyle, WidthType, ShadingType, VerticalAlign, PageNumber } = D;

const AN = 9360; // ancho útil (Carta, márgenes de 1")
const GRIS = { oscuro: '262626', medio: '595959', borde: 'A6A6A6', claro: 'F2F2F2', cab: 'D9D9D9' };

function crear(pages = {}) {
  const heads = [], figs = [], tabs = [];
  let nId = 0;
  const run = (t, o = {}) => new TextRun({ text: t, font: o.code ? 'Courier New' : 'Arial', size: o.size || (o.code ? 20 : undefined), bold: o.bold, italics: o.italics, color: o.color });

  // Marcas en línea: `código`, **negrita**, *cursiva*
  function runs(texto, base = {}) {
    const out = [];
    const re = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
    let i = 0, m;
    while ((m = re.exec(texto))) {
      if (m.index > i) out.push(run(texto.slice(i, m.index), base));
      const t = m[0];
      if (t.startsWith('`')) out.push(run(t.slice(1, -1), { ...base, code: true }));
      else if (t.startsWith('**')) out.push(run(t.slice(2, -2), { ...base, bold: true }));
      else out.push(run(t.slice(1, -1), { ...base, italics: true }));
      i = m.index + t.length;
    }
    if (i < texto.length) out.push(run(texto.slice(i), base));
    return out;
  }

  const largo = (t) => /`[^`]{32,}`/.test(t);
  const P = (t, o = {}) => new Paragraph({ alignment: o.align || (largo(t) ? AlignmentType.LEFT : AlignmentType.JUSTIFIED), spacing: { after: o.after ?? 120, before: o.before ?? 0, line: 276 }, indent: o.indent, keepNext: o.keepNext, children: runs(t, o.run) });
  const heading = (nivel, texto, o = {}) => {
    const id = `h${++nId}`;
    heads.push({ id, nivel, texto });
    return new Paragraph({
      heading: [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3][nivel - 1],
      pageBreakBefore: nivel === 1 && !o.sinSalto,
      keepNext: true,
      children: [new Bookmark({ id, children: [new TextRun({ text: texto, font: 'Arial' })] })],
    });
  };
  const H1 = (t, o) => heading(1, t, o), H2 = (t) => heading(2, t), H3 = (t) => heading(3, t);
  const UL = (items, ref = 'vinetas') => items.map((t, i) => new Paragraph({ numbering: { reference: ref, level: 0 }, alignment: AlignmentType.JUSTIFIED, spacing: { after: i === items.length - 1 ? 140 : 60, line: 276 }, children: runs(t) }));
  let nOL = 0;
  const OL = (items) => { const ref = `num${++nOL}`; olRefs.push(ref); return items.map((t, i) => new Paragraph({ numbering: { reference: ref, level: 0 }, alignment: AlignmentType.JUSTIFIED, spacing: { after: i === items.length - 1 ? 140 : 60, line: 276 }, children: runs(t) })); };
  const olRefs = [];

  const spacer = (n = 80) => new Paragraph({ spacing: { after: n }, children: [] });

  const caption = (kind, n, texto, anchor) => {
    const kids = [new Bookmark({ id: anchor, children: [run(`${kind} ${n}. `, { bold: true, size: 20, color: GRIS.oscuro }), ...runs(texto, { size: 20, color: GRIS.oscuro })] })];
    return kids;
  };

  function FIG(archivo, texto, ancho = 6.0) {
    const n = figs.length + 1, anchor = `fig${n}`;
    figs.push({ n, texto, anchor });
    const buf = fs.readFileSync(archivo);
    const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
    const wpx = Math.round(ancho * 96);
    const hpx = Math.round((wpx * h) / w);
    return [
      new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 120, after: 80 }, children: [new ImageRun({ type: 'png', data: buf, transformation: { width: wpx, height: hpx }, altText: { title: `Figura ${n}`, description: texto, name: `figura-${n}` } })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: caption('Figura', n, texto, anchor) }),
    ];
  }

  const borde = { style: BorderStyle.SINGLE, size: 4, color: GRIS.borde };
  const bordes = { top: borde, bottom: borde, left: borde, right: borde };
  function TBL(texto, cab, filas, anchos, o = {}) {
    const n = tabs.length + 1, anchor = `tab${n}`;
    tabs.push({ n, texto, anchor });
    const total = anchos.reduce((a, b) => a + b, 0);
    const celda = (t, i, esCab, mantener = false) => new TableCell({
      borders: bordes, width: { size: anchos[i], type: WidthType.DXA }, verticalAlign: VerticalAlign.TOP,
      shading: esCab ? { fill: GRIS.cab, type: ShadingType.CLEAR, color: 'auto' } : undefined,
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
      children: String(t).split('\n').map((l) => new Paragraph({ alignment: AlignmentType.LEFT, keepNext: mantener, spacing: { after: 20 }, children: runs(l, { size: o.size || 19, bold: esCab }) })),
    });
    return [
      new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 160, after: 80 }, children: caption('Tabla', n, texto, anchor) }),
      new Table({ width: { size: total, type: WidthType.DXA }, columnWidths: anchos, alignment: AlignmentType.CENTER,
        rows: [new TableRow({ tableHeader: true, cantSplit: true, children: cab.map((c, i) => celda(c, i, true, filas.length <= 9)) }), ...filas.map((f, k) => new TableRow({ cantSplit: true, children: f.map((c, i) => celda(c, i, false, filas.length <= 9 && k < filas.length - 1)) }))] }),
      spacer(160),
    ];
  }

  function CODE(lineas) {
    return lineas.map((l, i) => new Paragraph({ alignment: AlignmentType.LEFT, spacing: { after: 0 }, keepNext: i < lineas.length - 1, shading: { fill: GRIS.claro, type: ShadingType.CLEAR, color: 'auto' }, indent: { left: 200, right: 200 },
      border: { left: { style: BorderStyle.SINGLE, size: 12, color: GRIS.borde, space: 6 } }, children: [new TextRun({ text: l || ' ', font: 'Courier New', size: 18 })] })).concat([spacer(120)]);
  }
  const NOTA = (titulo, texto) => [new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { before: 80, after: 160, line: 276 }, shading: { fill: GRIS.claro, type: ShadingType.CLEAR, color: 'auto' }, indent: { left: 160, right: 160 },
    border: { left: { style: BorderStyle.SINGLE, size: 18, color: GRIS.medio, space: 8 } }, children: [run(titulo + '. ', { bold: true, size: 20 }), ...runs(texto, { size: 20 })] })];

  // ---- Índices (estáticos, con número de página de la pasada anterior) ----
  const pg = (k) => String(pages[k] ?? '0');
  const entrada = (texto, anchor, pagina, sangria, negrita) => new Paragraph({
    alignment: AlignmentType.LEFT, spacing: { after: negrita ? 70 : 40, before: negrita ? 100 : 0 }, indent: { left: sangria, right: 500, hanging: 0 },
    tabStops: [{ type: TabStopType.RIGHT, position: AN, leader: LeaderType.DOT }],
    children: [new InternalHyperlink({ anchor, children: [run(texto, { bold: negrita, size: 20 }), run('\t' + pagina, { size: 20, bold: negrita })] })],
  });
  const tituloIndice = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, spacing: { after: 240 }, children: [new TextRun({ text: t, font: 'Arial' })] });
  const indiceContenido = () => [tituloIndice('Índice de contenido'), ...heads.filter((h) => h.nivel <= 2).map((h) => entrada(h.texto, h.id, pg('h:' + h.id), h.nivel === 1 ? 0 : 360, h.nivel === 1))];
  const indiceFiguras = () => [tituloIndice('Índice de figuras'), ...figs.map((f) => entrada(`Figura ${f.n}. ${f.texto}`, f.anchor, pg('f:' + f.n), 0, false))];
  const indiceTablas = () => [tituloIndice('Índice de tablas'), ...tabs.map((t) => entrada(`Tabla ${t.n}. ${t.texto}`, t.anchor, pg('t:' + t.n), 0, false))];

  return { P, H1, H2, H3, UL, OL, FIG, TBL, CODE, NOTA, spacer, runs, run, heads, figs, tabs, olRefs, indiceContenido, indiceFiguras, indiceTablas };
}

function documento(titulo, autor, ctx, cuerpo, pages, tieneTablas = true) {
  const front = [...ctx.indiceContenido(), ...ctx.indiceFiguras(), ...(tieneTablas ? ctx.indiceTablas() : [])];
  const pie = new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, border: { top: { style: BorderStyle.SINGLE, size: 4, color: GRIS.borde, space: 6 } },
    children: [new TextRun({ text: 'Página ', font: 'Arial', size: 18, color: GRIS.medio }), new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 18, color: GRIS.medio }), new TextRun({ text: ' de ', font: 'Arial', size: 18, color: GRIS.medio }), new TextRun({ children: [PageNumber.TOTAL_PAGES], font: 'Arial', size: 18, color: GRIS.medio })] })] });
  const cab = new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: GRIS.borde, space: 4 } },
    children: [new TextRun({ text: `Escape del Laboratorio Numérico II · ${titulo}`, font: 'Arial', size: 17, color: GRIS.medio })] })] });
  const vinetas = { reference: 'vinetas', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] };
  const numeradas = ctx.olRefs.map((r) => ({ reference: r, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] }));
  return new Document({
    creator: autor, title: titulo, description: 'Escape del Laboratorio Numérico II, Edición DELUXE',
    styles: {
      default: { document: { run: { font: 'Arial', size: 22 } } },
      paragraphStyles: [
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 32, bold: true, font: 'Arial', color: GRIS.oscuro }, paragraph: { spacing: { before: 120, after: 240 }, outlineLevel: 0, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: GRIS.borde, space: 4 } } } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 26, bold: true, font: 'Arial', color: GRIS.oscuro }, paragraph: { spacing: { before: 260, after: 120 }, outlineLevel: 1 } },
        { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 23, bold: true, font: 'Arial', color: GRIS.medio }, paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 } },
      ],
    },
    numbering: { config: [vinetas, ...numeradas] },
    sections: [
      { properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1417, bottom: 1417, left: 1701, right: 1701, header: 0, footer: 500 } } }, footers: { default: pie }, children: [new Paragraph({ children: [] })] },
      { properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, bottom: 1300, left: 1440, right: 1440, header: 600, footer: 500 } } }, headers: { default: cab }, footers: { default: pie }, children: [...front, ...cuerpo] },
    ],
  });
}

module.exports = { crear, documento, Packer, GRIS, AN };
