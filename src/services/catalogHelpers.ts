import * as XLSX from 'xlsx';
import { CatalogoItem, CatalogoModelo, Maquina } from '../types';

export function normalizarTexto(h: unknown): string {
  return String(h ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function opDigits(op: unknown): string {
  return String(op ?? '').replace(/\D/g, '');
}

export function opDigitsSinCeros(op: unknown): string {
  const d = opDigits(op).replace(/^0+/, '');
  return d || opDigits(op);
}

export function opCoincide(opA: string, opB: string): boolean {
  const a = (opA || '').trim().toLowerCase();
  const b = (opB || '').trim().toLowerCase();
  if (!a || !b) return false;
  if (a === b) return true;
  const da = opDigitsSinCeros(a);
  const db = opDigitsSinCeros(b);
  return Boolean(da && db && da === db);
}

export function parsearCantidad(raw: unknown): number {
  if (raw === null || raw === undefined || raw === '') return 0;
  if (typeof raw === 'number') {
    return isNaN(raw) ? 0 : Math.round(raw);
  }
  const s = String(raw).trim();
  if (!s) return 0;
  let clean = s.replace(/[^0-9.,-]/g, '').trim();
  if (!clean) return 0;
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(clean)) {
    clean = clean.replace(/,/g, '');
  } else if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(clean)) {
    clean = clean.replace(/\./g, '').replace(/,/g, '.');
  } else if (clean.includes(',') && !clean.includes('.')) {
    clean = clean.replace(/,/g, '');
  }
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : Math.round(n);
}

export function normalizarCatalogoItem(raw: any): CatalogoItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const opStr = String(raw.op ?? '').trim();
  if (!opStr) return null;

  const rawModelos = Array.isArray(raw.modelos) ? raw.modelos : [];
  const modelos: CatalogoModelo[] = rawModelos
    .filter((m: any) => m && typeof m === 'object')
    .map((m: any) => {
      const cant = parsearCantidad(m.cantidadTotal);
      return {
        ...(m.modelo ? { modelo: String(m.modelo).trim() } : {}),
        descripcion: String(m.descripcion || m.modelo || '').trim(),
        sap: String(m.sap || '').trim(),
        cantidadTotal: cant,
      };
    });

  if (modelos.length === 0) {
    modelos.push({
      descripcion: String(raw.descripcion || '').trim(),
      sap: String(raw.sap || '').trim(),
      cantidadTotal: parsearCantidad(raw.cantidadTotal),
    });
  }

  let totalOp = parsearCantidad(raw.cantidadTotal);
  const sumModelos = modelos.reduce((acc, m) => acc + parsearCantidad(m.cantidadTotal), 0);
  if (sumModelos > 0) {
    totalOp = sumModelos;
  }

  const tieneMultiples = modelos.length > 1;
  const descripcionBase =
    String(raw.descripcionBase || '').trim() ||
    modelos[0]?.descripcion ||
    String(raw.descripcion || '').trim();

  return {
    op: opStr,
    cliente: String(raw.cliente || '').trim(),
    cantidadTotal: totalOp,
    descripcion: tieneMultiples
      ? `Varios modelos (${modelos.length})`
      : modelos[0]?.descripcion || String(raw.descripcion || '').trim(),
    sap: tieneMultiples ? '' : modelos[0]?.sap || String(raw.sap || '').trim(),
    descripcionBase,
    modelos,
  };
}

export function buscarEnCatalogo(catalogo: CatalogoItem[], op: string): CatalogoItem | null {
  if (!op || !Array.isArray(catalogo) || catalogo.length === 0) return null;
  const q = String(op).trim().toLowerCase();
  if (!q) return null;

  const exactMatches = catalogo.filter((c) => String(c.op || '').trim().toLowerCase() === q);
  if (exactMatches.length === 1) return exactMatches[0];
  if (exactMatches.length > 1) {
    return exactMatches.reduce((best, cur) =>
      (cur.modelos?.length || 0) > (best.modelos?.length || 0) ? cur : best
    );
  }

  const digits = opDigits(q);
  if (digits) {
    const digitsNoZero = opDigitsSinCeros(q);
    const byDigits = catalogo.filter((c) => {
      const cd = opDigits(c.op);
      if (!cd) return false;
      return cd === digits || opDigitsSinCeros(c.op) === digitsNoZero;
    });
    if (byDigits.length > 0) {
      return byDigits.reduce((best, cur) =>
        (cur.modelos?.length || 0) > (best.modelos?.length || 0) ? cur : best
      );
    }
  }
  return null;
}

export function parsearMaquinasCsv(csvText: string): Maquina[] {
  const wb = XLSX.read(csvText, { type: 'string' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (rows.length < 2) return [];

  const headers = rows[0].map(normalizarTexto);
  const idxMaquina = headers.findIndex((h) => h.includes('maquina'));
  const idxCodigo = headers.findIndex((h) => h.includes('codigo'));
  if (idxMaquina === -1) return [];

  const idxTipo = headers.findIndex((h) => h === 'tipo' || h.startsWith('tipo'));
  const idxArea = headers.findIndex((h) => h === 'area' || h.startsWith('area'));
  const idxCantidad = headers.findIndex(
    (h) => h === 'cantidad' || h.startsWith('cantidad') || h === 'meta' || h.startsWith('meta') || h === 'objetivo'
  );
  const idxUndMin = headers.findIndex(
    (h) => h.includes('undxmin') || h.includes('und/min') || (h.includes('und') && h.includes('min'))
  );

  const lista: Maquina[] = [];
  rows.slice(1).forEach((r, idx) => {
    const nombre = String(r[idxMaquina] ?? '').trim();
    if (!nombre) return;
    const codigo = idxCodigo !== -1 ? String(r[idxCodigo] ?? '').trim() : '';

    let tipoProducto: Maquina['tipoProducto'] = '';
    if (idxTipo !== -1) {
      const v = String(r[idxTipo] ?? '').trim().toLowerCase();
      if (v === 'pp' || v === 'pt') tipoProducto = v;
    }

    let area: Maquina['area'] = '';
    if (idxArea !== -1) {
      const v = String(r[idxArea] ?? '').trim().toLowerCase();
      if (v === 'v' || v.includes('vaso')) area = 'vasos_envases';
      else if (v === 'p' || v.includes('papel')) area = 'papel_carton';
    }

    let meta = 0;
    if (idxCantidad !== -1) {
      const raw = String(r[idxCantidad] ?? '').trim().replace(/,/g, '').replace(/\./g, '');
      const n = parseInt(raw, 10);
      if (!isNaN(n)) meta = Math.max(0, n);
    }

    let undPorMin = 0;
    if (idxUndMin !== -1) {
      const raw = String(r[idxUndMin] ?? '').trim().replace(/,/g, '');
      const n = parseInt(raw, 10);
      if (!isNaN(n)) undPorMin = Math.max(0, n);
    }

    lista.push({
      id: `sheet-${idx}-${nombre.toLowerCase().replace(/\s+/g, '-')}`,
      nombre,
      codigo,
      area,
      tipoProducto,
      meta,
      undPorMin,
    });
  });

  return lista;
}

export function formatearFechaCorta(isoDate: string): string {
  if (!isoDate) return '—';
  const clean = isoDate.slice(0, 10);
  const parts = clean.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoDate;
}

export function etiquetaArea(area: string): string {
  if (area === 'vasos_envases') return 'Vasos y Envases';
  if (area === 'papel_carton') return 'Papel y Cartón';
  return 'Sin área';
}

export function etiquetaTurno(tipo: string): string {
  const t = (tipo || '').trim().toLowerCase();
  if (t === 'dia') return 'Día';
  if (t === 'noche') return 'Noche';
  return tipo || 'Turno';
}

export function toLocalIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
