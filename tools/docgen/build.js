// Consolida la documentación Markdown del repositorio en un único .docx.
// Uso: node build.js <raíz del repo> <salida.docx>
const fs = require('node:fs');
const path = require('node:path');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType,
  ShadingType, BorderStyle, AlignmentType, LevelFormat, PageBreak, TableOfContents, Footer,
  PageNumber, Header,
} = require('docx');

const [, , ROOT, OUT] = process.argv;
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

const FONT = 'Calibri';
const MONO = 'Consolas';
const ACCENT = '1D4ED8';
const PAGE_W = 11906; // A4
const MARGIN = 1134; // 2 cm
const CONTENT_W = PAGE_W - 2 * MARGIN;

const HEADINGS = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6];

// ---------- Inline: **negrita**, *cursiva*, `código`, [texto](url) ----------
function inline(text, base = {}) {
  const runs = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|(?<![\w*])\*[^*\s][^*]*\*(?![\w*]))/g;
  let last = 0;
  let m;
  const push = (t, extra = {}) => t && runs.push(new TextRun({ text: t, font: FONT, ...base, ...extra }));
  while ((m = re.exec(text))) {
    push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('**')) runs.push(...inline(tok.slice(2, -2), { ...base, bold: true }));
    else if (tok.startsWith('`')) push(tok.slice(1, -1), { font: MONO, size: (base.size || 21) - 2, color: '9A3412' });
    else if (tok.startsWith('[')) {
      const label = tok.slice(1, tok.indexOf(']'));
      runs.push(...inline(label, { ...base, color: ACCENT }));
    } else runs.push(...inline(tok.slice(1, -1), { ...base, italics: true }));
    last = m.index + tok.length;
  }
  push(text.slice(last));
  return runs;
}

// ---------- Tablas ----------
const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: 'C9D2DD' };
const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

function splitRow(line) {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));
}

function table(lines) {
  const rows = lines.filter((l, i) => !(i === 1 && /^\s*\|?\s*:?-{2,}/.test(l))).map(splitRow);
  const cols = Math.max(...rows.map((r) => r.length));
  // Ancho proporcional al contenido, con mínimo por columna.
  const weights = Array.from({ length: cols }, (_, c) =>
    Math.max(6, Math.min(60, Math.max(...rows.map((r) => (r[c] || '').length))))
  );
  const total = weights.reduce((a, b) => a + b, 0);
  const widths = weights.map((w) => Math.floor((w / total) * CONTENT_W));
  widths[widths.length - 1] += CONTENT_W - widths.reduce((a, b) => a + b, 0);

  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: widths,
    rows: rows.map((r, ri) =>
      new TableRow({
        tableHeader: ri === 0,
        children: Array.from({ length: cols }, (_, c) =>
          new TableCell({
            borders,
            width: { size: widths[c], type: WidthType.DXA },
            shading: ri === 0 ? { fill: 'E0E8FD', type: ShadingType.CLEAR, color: 'auto' } : undefined,
            margins: { top: 60, bottom: 60, left: 90, right: 90 },
            children: [new Paragraph({ children: inline(r[c] || '', { size: 18, bold: ri === 0 || undefined }) })],
          })
        ),
      })
    ),
  });
}

// ---------- Bloques ----------
function codeBlock(lines) {
  return lines.map(
    (l, i) =>
      new Paragraph({
        shading: { fill: 'F3F4F6', type: ShadingType.CLEAR, color: 'auto' },
        spacing: { before: i === 0 ? 80 : 0, after: i === lines.length - 1 ? 120 : 0, line: 240 },
        indent: { left: 120, right: 120 },
        children: [new TextRun({ text: l || ' ', font: MONO, size: 16 })],
      })
  );
}

// Convierte Markdown a elementos docx. `shift` desplaza el nivel de los títulos.
let listInstance = 0;
function markdown(md, { shift = 0 } = {}) {
  const out = [];
  let inList = false;
  const lines = md.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (/^```/.test(line)) {
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push(...codeBlock(buf));
      continue;
    }
    if (/^\s*\|/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) buf.push(lines[i++]);
      out.push(table(buf), new Paragraph({ spacing: { after: 60 }, children: [] }));
      continue;
    }
    const h = line.match(/^(#{1,6})\s+(.*)/);
    if (h) {
      const level = Math.min(5, h[1].length - 1 + shift);
      out.push(new Paragraph({ heading: HEADINGS[level], children: inline(h[2]) }));
      i++;
      continue;
    }
    if (/^---+\s*$/.test(line)) {
      i++;
      continue;
    }
    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
      out.push(
        new Paragraph({
          indent: { left: 360 },
          border: { left: { style: BorderStyle.SINGLE, size: 12, color: ACCENT, space: 8 } },
          spacing: { after: 120 },
          children: inline(buf.join(' '), { italics: true, color: '4B5563' }),
        })
      );
      continue;
    }
    const li = line.match(/^(\s*)([-*]|\d+\.)\s+(.*)/);
    if (!li) inList = false;
    if (li) {
      if (!inList) listInstance++; // cada lista numerada reinicia en 1
      inList = true;
      const level = Math.min(2, Math.floor(li[1].length / 2));
      const ordered = /\d/.test(li[2]);
      let text = li[3].replace(/^\[x\]\s*/i, '☑ ').replace(/^\[ \]\s*/, '☐ ');
      out.push(
        new Paragraph({
          numbering: { reference: ordered ? 'numbers' : 'bullets', level, instance: listInstance },
          spacing: { after: 40 },
          children: inline(text),
        })
      );
      i++;
      continue;
    }
    if (!line.trim()) {
      i++;
      continue;
    }
    // Párrafo: une líneas consecutivas.
    const buf = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !/^(#|```|\s*\||>|\s*([-*]|\d+\.)\s|---)/.test(lines[i])) buf.push(lines[i++]);
    out.push(new Paragraph({ spacing: { after: 120 }, children: inline(buf.join(' ')) }));
  }
  return out;
}

const pageBreak = () => new Paragraph({ children: [new PageBreak()] });
const part = (title) => [pageBreak(), new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: title, font: FONT })] })];

// Elimina el título H1 de un documento (lo reemplaza el título de la parte).
const body = (md) => md.replace(/^#\s+.*\n/, '');

// ---------- Contenido ----------
const specOrder = ['gestion-espacios', 'usuarios', 'roles-permisos', 'solicitudes-reserva', 'disponibilidad', 'prevencion-conflictos', 'aprobacion', 'cancelacion-historial', 'interfaz-web'];
const archive = path.join(ROOT, 'sdd/changes/archive');
const changeDir = (suffix) => fs.readdirSync(archive).find((d) => d.endsWith(suffix));

const children = [
  // Portada
  new Paragraph({ spacing: { before: 2400 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Sistema de Gestión de Reservas', font: FONT, size: 52, bold: true, color: ACCENT })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'de Espacios Académicos', font: FONT, size: 52, bold: true, color: ACCENT })] }),
  new Paragraph({ spacing: { before: 400 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Documentación del proyecto — Spec-Driven Development', font: FONT, size: 28, color: '4B5563' })] }),
  new Paragraph({ spacing: { before: 1600 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Jaider Parra', font: FONT, size: 26, bold: true })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Modalidad individual · Octubre de 2026', font: FONT, size: 22 })] }),
  new Paragraph({ spacing: { before: 300 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Node.js · Express · Supabase (PostgreSQL) · Next.js', font: FONT, size: 22, color: '4B5563' })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'https://github.com/jaiderparra/proyectMachine', font: FONT, size: 20, color: ACCENT })] }),
  pageBreak(),
  new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: 'Contenido', font: FONT })] }),
  new Paragraph({ children: [new TextRun({ text: 'Para actualizar el índice en Word: clic derecho sobre él → Actualizar campos.', font: FONT, italics: true, size: 18, color: '6B7280' })] }),
  new TableOfContents('Contenido', { hyperlink: true, headingStyleRange: '1-2' }),

  ...part('1. Plan de ingeniería de software'),
  ...markdown(body(read('PLAN_INGENIERIA.md')), { shift: 0 }),

  ...part('2. Especificaciones (SDD)'),
  new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: '2.1 Proceso SDD y convenciones', font: FONT })] }),
  ...markdown(body(read('sdd/README.md')), { shift: 1 }),
  new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: '2.2 Contexto del proyecto y contrato de API', font: FONT })] }),
  ...markdown(body(read('sdd/project.md')), { shift: 1 }),
  ...specOrder.flatMap((s, idx) => {
    const md = read(`sdd/specs/${s}/spec.md`);
    const title = md.match(/^#\s+(.*)/)[1].replace(/^Especificación:\s*/, '');
    return [
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: `2.${idx + 3} ${title}`, font: FONT })] }),
      ...markdown(body(md), { shift: 1 }),
    ];
  }),

  ...part('3. Revisión de especificaciones'),
  ...markdown(body(read('sdd/reviews/2026-10-24-revision-especificaciones.md')), { shift: 0 }),

  ...part('4. Gestión de cambios'),
  new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: '4.1 Cambio: límite de cuatro horas consecutivas', font: FONT })] }),
  ...markdown(body(read(`sdd/changes/archive/${changeDir('limite-cuatro-horas')}/proposal.md`)), { shift: 1 }),
  new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text: 'Delta de especificación (RES-04)', font: FONT })] }),
  ...markdown(body(read(`sdd/changes/archive/${changeDir('limite-cuatro-horas')}/specs/solicitudes-reserva/spec.md`)), { shift: 2 }),
  new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text: 'Tareas', font: FONT })] }),
  ...markdown(body(read(`sdd/changes/archive/${changeDir('limite-cuatro-horas')}/tasks.md`)), { shift: 2 }),
  new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: '4.2 Cambio: persistencia en Supabase (PostgreSQL)', font: FONT })] }),
  ...markdown(body(read(`sdd/changes/archive/${changeDir('migracion-supabase')}/proposal.md`)), { shift: 1 }),
  new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text: 'Tareas', font: FONT })] }),
  ...markdown(body(read(`sdd/changes/archive/${changeDir('migracion-supabase')}/tasks.md`)), { shift: 2 }),

  ...part('5. Matriz de trazabilidad'),
  ...markdown(body(read('sdd/traceability.md')), { shift: 0 }),

  ...part('6. Instalación, configuración y ejecución'),
  ...markdown(body(read('README.md')), { shift: 0 }),

  ...part('7. Informe final'),
  ...markdown(body(read('INFORME_FINAL.md')), { shift: 0 }),
];

const doc = new Document({
  creator: 'Jaider Parra',
  title: 'Sistema de Gestión de Reservas de Espacios Académicos — Documentación',
  description: 'Plan de ingeniería, especificaciones SDD, gestión de cambios, trazabilidad e informe final',
  features: { updateFields: true },
  styles: {
    default: { document: { run: { font: FONT, size: 21 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 34, bold: true, color: ACCENT, font: FONT }, paragraph: { spacing: { before: 240, after: 160 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 28, bold: true, color: '1F2937', font: FONT }, paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 24, bold: true, color: '374151', font: FONT }, paragraph: { spacing: { before: 220, after: 100 }, outlineLevel: 2 } },
      { id: 'Heading4', name: 'Heading 4', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 22, bold: true, color: '4B5563', font: FONT }, paragraph: { spacing: { before: 180, after: 80 }, outlineLevel: 3 } },
      { id: 'Heading5', name: 'Heading 5', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 21, bold: true, italics: true, color: '4B5563', font: FONT }, paragraph: { spacing: { before: 140, after: 60 }, outlineLevel: 4 } },
      { id: 'Heading6', name: 'Heading 6', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 20, italics: true, color: '6B7280', font: FONT }, paragraph: { spacing: { before: 120, after: 60 }, outlineLevel: 5 } },
    ],
  },
  numbering: {
    config: [
      { reference: 'bullets', levels: [0, 1, 2].map((level) => ({ level, format: LevelFormat.BULLET, text: ['•', '◦', '▪'][level], alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360 * (level + 1), hanging: 260 } } } })) },
      { reference: 'numbers', levels: [0, 1, 2].map((level) => ({ level, format: LevelFormat.DECIMAL, text: `%${level + 1}.`, alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360 * (level + 1), hanging: 300 } } } })) },
    ],
  },
  sections: [
    {
      properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } } },
      headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Sistema de Reservas de Espacios Académicos — SDD', font: FONT, size: 16, color: '9CA3AF' })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: ['Página ', PageNumber.CURRENT, ' de ', PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: '6B7280' })] })] }) },
      children,
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(OUT, buf);
  console.log(`Generado ${OUT} (${(buf.length / 1024).toFixed(0)} KB, ${children.length} bloques)`);
});
