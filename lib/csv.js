// Parser de CSV / pegado desde Excel. Funciones puras, sin dependencias de UI ni de Supabase.

export function parseDelimitedText(text) {
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!text) return { headers: [], rows: [] };
  const firstLine = text.split('\n')[0];
  const delimiter = firstLine.includes('\t') ? '\t' : ',';
  const lines = splitDelimitedLines(text, delimiter);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].map(h => h.trim());
  const rows = lines.slice(1).filter(r => r.some(c => (c || '').trim() !== ''));
  return { headers, rows };
}

function splitDelimitedLines(text, delimiter) {
  const result = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; } }
      else field += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === delimiter) { row.push(field); field = ''; }
      else if (ch === '\n') { row.push(field); result.push(row); row = []; field = ''; }
      else field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); result.push(row); }
  return result;
}

function normalizeHeader(h) {
  return (h || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

export const FIELD_SYNONYMS = {
  tracking: ['codigo de rastreo', 'codigo', 'tracking', 'guia', 'nro guia', 'numero de guia'],
  recipient: ['destinatario', 'nombre', 'cliente', 'recipiente'],
  phone: ['telefono', 'celular', 'tel', 'whatsapp'],
  address: ['direccion', 'domicilio', 'address'],
  driver: ['repartidor', 'driver', 'asignado', 'mensajero'],
  notes: ['notas', 'observaciones', 'comentario', 'comentarios'],
};

export function guessColumnMap(headers) {
  const norm = headers.map(normalizeHeader);
  const map = {};
  for (const field in FIELD_SYNONYMS) {
    let foundIdx = -1;
    for (let i = 0; i < norm.length; i++) {
      if (FIELD_SYNONYMS[field].some(syn => norm[i] === syn || norm[i].includes(syn))) { foundIdx = i; break; }
    }
    map[field] = foundIdx;
  }
  return map;
}

export function rowsToCsv(headerRow, rows) {
  const all = [headerRow, ...rows];
  return all.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
}
