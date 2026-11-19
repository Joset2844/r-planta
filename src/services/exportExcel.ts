import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import { FiltrosConsulta, RegistroFiltrado, ResumenMaquina, ResumenOp } from '../types';
import { etiquetaArea, etiquetaTurno, formatearFechaCorta } from './catalogHelpers';

function descargarBlob(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

const BORDES: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
};

export function describirFiltros(filtros: FiltrosConsulta): string {
  const partes: string[] = [];
  if (filtros.fechaDesde && filtros.fechaHasta) {
    partes.push(`Fechas: ${formatearFechaCorta(filtros.fechaDesde)} al ${formatearFechaCorta(filtros.fechaHasta)}`);
  } else if (filtros.fechaDesde) {
    partes.push(`Desde: ${formatearFechaCorta(filtros.fechaDesde)}`);
  } else if (filtros.fechaHasta) {
    partes.push(`Hasta: ${formatearFechaCorta(filtros.fechaHasta)}`);
  } else {
    partes.push('Fechas: Todo el historial');
  }

  if (filtros.tipoTurno) partes.push(`Turno: ${etiquetaTurno(filtros.tipoTurno)}`);
  if (filtros.opsSeleccionadas.length > 0) partes.push(`OPs: ${filtros.opsSeleccionadas.join(', ')}`);
  if (filtros.maquinasSeleccionadas.length > 0) {
    partes.push(`Máquinas: ${filtros.maquinasSeleccionadas.length} selec.`);
  }
  if (filtros.areaFiltro) partes.push(`Área: ${etiquetaArea(filtros.areaFiltro)}`);
  if (filtros.tipoProductoFiltro) partes.push(`Tipo: ${filtros.tipoProductoFiltro.toUpperCase()}`);
  if (filtros.busquedaTexto.trim()) partes.push(`Búsqueda: "${filtros.busquedaTexto.trim()}"`);

  return partes.join('  |  ');
}

export async function exportarReporteExcel(params: {
  registros: RegistroFiltrado[];
  resumenMaquinas: ResumenMaquina[];
  resumenOps: ResumenOp[];
  filtros: FiltrosConsulta;
}) {
  const { registros, resumenMaquinas, resumenOps, filtros } = params;
  if (registros.length === 0) {
    throw new Error('No hay registros filtrados para exportar.');
  }

  const ahora = new Date();
  const hoyIso = ahora.toISOString().slice(0, 10);
  const fechaHora = ahora.toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const filtroResumen = describirFiltros(filtros);
  const nombreArchivo = `reporte_planta2_${hoyIso}.xlsx`;

  try {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Consultas Planta 2';
    wb.created = ahora;

    // ================== HOJA 1: DETALLE FILTRADO ==================
    const ws1 = wb.addWorksheet('Detalle Filtrado');
    ws1.columns = [
      { width: 12 }, // Fecha
      { width: 10 }, // Turno
      { width: 22 }, // Máquina
      { width: 12 }, // Código
      { width: 18 }, // Área
      { width: 8 },  // Tipo
      { width: 13 }, // OP
      { width: 14 }, // SAP
      { width: 38 }, // Producto
      { width: 22 }, // Cliente
      { width: 14 }, // Producido
      { width: 12 }, // Merma
      { width: 30 }, // Observaciones
    ];

    ws1.mergeCells(1, 1, 1, 13);
    const rTitle1 = ws1.getRow(1);
    rTitle1.height = 24;
    rTitle1.getCell(1).value = 'REPORTE DE PRODUCCIÓN — SUPERVISIÓN PLANTA 2';
    rTitle1.getCell(1).font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
    rTitle1.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    rTitle1.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    ws1.mergeCells(2, 1, 2, 13);
    const rSub1 = ws1.getRow(2);
    rSub1.height = 19;
    rSub1.getCell(1).value = `Generado: ${fechaHora}   |   ${filtroResumen}`;
    rSub1.getCell(1).font = { bold: true, size: 9.5, color: { argb: 'FFFFFFFF' } };
    rSub1.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD97706' } };
    rSub1.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    const headers1 = [
      'FECHA',
      'TURNO',
      'MÁQUINA',
      'CÓDIGO',
      'ÁREA',
      'TIPO',
      'OP',
      'SAP',
      'PRODUCTO / MODELO',
      'CLIENTE',
      'PRODUCIDO (u)',
      'MERMA (u)',
      'OBSERVACIONES',
    ];
    const rHead1 = ws1.getRow(3);
    rHead1.height = 22;
    headers1.forEach((h, i) => {
      const c = rHead1.getCell(i + 1);
      c.value = h;
      c.font = { bold: true, size: 9.5, color: { argb: 'FF1E293B' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      c.border = BORDES;
    });

    let totalProd = 0;
    let totalMerma = 0;
    let rowIdx = 4;

    registros.forEach((r, idx) => {
      totalProd += r.total;
      totalMerma += r.merma;
      const row = ws1.getRow(rowIdx++);
      const vals = [
        formatearFechaCorta(r.fecha),
        etiquetaTurno(r.turnoTipo),
        r.maquina,
        r.codigoMaquina,
        etiquetaArea(r.area),
        r.tipoProducto ? r.tipoProducto.toUpperCase() : '',
        r.op,
        r.sap,
        r.producto,
        r.cliente,
        r.total,
        r.merma,
        r.observaciones,
      ];
      const par = idx % 2 === 1;
      vals.forEach((v, col) => {
        const c = row.getCell(col + 1);
        c.value = v;
        c.border = BORDES;
        c.font = { size: 9.5, color: { argb: 'FF0F172A' } };
        if (par) {
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        }
        if (col === 0 || col === 1 || col === 3 || col === 5 || col === 6 || col === 7) {
          c.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (col === 10 || col === 11) {
          c.alignment = { horizontal: 'right', vertical: 'middle' };
          c.numFmt = '#,##0';
          if (col === 10 && r.total > 0) c.font = { bold: true, size: 9.5, color: { argb: 'FF0F172A' } };
          if (col === 11 && r.merma > 0) c.font = { bold: true, size: 9.5, color: { argb: 'FFDC2626' } };
        } else {
          c.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        }
      });
    });

    ws1.mergeCells(rowIdx, 1, rowIdx, 10);
    const rTot1 = ws1.getRow(rowIdx);
    rTot1.height = 22;
    rTot1.getCell(1).value = `TOTALES (${registros.length} registros)`;
    for (let i = 1; i <= 13; i++) {
      const c = rTot1.getCell(i);
      c.font = { bold: true, size: 10, color: { argb: 'FF0F172A' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
      c.border = BORDES;
      c.alignment = { vertical: 'middle' };
    }
    rTot1.getCell(11).value = totalProd;
    rTot1.getCell(11).numFmt = '#,##0';
    rTot1.getCell(11).alignment = { horizontal: 'right', vertical: 'middle' };
    rTot1.getCell(12).value = totalMerma;
    rTot1.getCell(12).numFmt = '#,##0';
    rTot1.getCell(12).alignment = { horizontal: 'right', vertical: 'middle' };
    rTot1.getCell(12).font = { bold: true, size: 10, color: { argb: 'FFDC2626' } };
    ws1.views = [{ state: 'frozen', ySplit: 3 }];
    ws1.pageSetup = { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 };

    // ================== HOJA 2: RESUMEN POR MÁQUINA ==================
    const ws2 = wb.addWorksheet('Resumen por Máquina');
    ws2.columns = [
      { width: 24 }, // Máquina
      { width: 12 }, // Código
      { width: 18 }, // Área
      { width: 8 },  // Tipo
      { width: 11 }, // Turnos
      { width: 11 }, // Días
      { width: 16 }, // Total Producido
      { width: 14 }, // Total Merma
      { width: 11 }, // % Merma
      { width: 15 }, // Promedio/Turno
      { width: 32 }, // OPs Trabajadas
    ];
    ws2.mergeCells(1, 1, 1, 11);
    const rTitle2 = ws2.getRow(1);
    rTitle2.height = 24;
    rTitle2.getCell(1).value = 'CONSOLIDADO POR MÁQUINA';
    rTitle2.getCell(1).font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
    rTitle2.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    rTitle2.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    ws2.mergeCells(2, 1, 2, 11);
    const rSub2 = ws2.getRow(2);
    rSub2.height = 18;
    rSub2.getCell(1).value = filtroResumen;
    rSub2.getCell(1).font = { bold: true, size: 9.5, color: { argb: 'FFFFFFFF' } };
    rSub2.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD97706' } };
    rSub2.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    const headers2 = [
      'MÁQUINA',
      'CÓDIGO',
      'ÁREA',
      'TIPO',
      'TURNOS',
      'DÍAS',
      'PRODUCIDO (u)',
      'MERMA (u)',
      '% MERMA',
      'PROM. / TURNO',
      'OPs ATENDIDAS',
    ];
    const rHead2 = ws2.getRow(3);
    rHead2.height = 22;
    headers2.forEach((h, i) => {
      const c = rHead2.getCell(i + 1);
      c.value = h;
      c.font = { bold: true, size: 9.5, color: { argb: 'FF1E293B' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      c.alignment = { horizontal: 'center', vertical: 'middle' };
      c.border = BORDES;
    });

    let r2 = 4;
    resumenMaquinas.forEach((m, idx) => {
      const row = ws2.getRow(r2++);
      const pctMerma = m.totalProducido + m.totalMerma > 0
        ? m.totalMerma / (m.totalProducido + m.totalMerma)
        : 0;
      const vals = [
        m.maquina,
        m.codigoMaquina,
        etiquetaArea(m.area),
        m.tipoProducto ? m.tipoProducto.toUpperCase() : '',
        m.turnosCount,
        m.diasCount,
        m.totalProducido,
        m.totalMerma,
        pctMerma,
        m.promedioPorTurno,
        m.opsUnicas.join(', '),
      ];
      vals.forEach((v, col) => {
        const c = row.getCell(col + 1);
        c.value = v;
        c.border = BORDES;
        c.font = { size: 9.5 };
        if (idx % 2 === 1) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        if (col === 1 || col === 3) c.alignment = { horizontal: 'center', vertical: 'middle' };
        else if (col >= 4 && col <= 9) {
          c.alignment = { horizontal: 'right', vertical: 'middle' };
          c.numFmt = col === 8 ? '0.0%' : '#,##0';
        } else {
          c.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        }
      });
    });
    ws2.views = [{ state: 'frozen', ySplit: 3 }];

    // ================== HOJA 3: RESUMEN POR OP ==================
    const ws3 = wb.addWorksheet('Resumen por OP');
    ws3.columns = [
      { width: 13 }, // OP
      { width: 22 }, // Cliente
      { width: 38 }, // Descripción
      { width: 14 }, // Meta Orden
      { width: 14 }, // Total PT
      { width: 14 }, // Total PP
      { width: 13 }, // Merma
      { width: 12 }, // % Avance PT
      { width: 14 }, // Pendiente PT
      { width: 10 }, // Turnos
      { width: 32 }, // Máquinas
    ];
    ws3.mergeCells(1, 1, 1, 11);
    const rTitle3 = ws3.getRow(1);
    rTitle3.height = 24;
    rTitle3.getCell(1).value = 'CONSOLIDADO POR ORDEN DE PRODUCCIÓN (OP)';
    rTitle3.getCell(1).font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
    rTitle3.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    rTitle3.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    ws3.mergeCells(2, 1, 2, 11);
    const rSub3 = ws3.getRow(2);
    rSub3.height = 18;
    rSub3.getCell(1).value = filtroResumen;
    rSub3.getCell(1).font = { bold: true, size: 9.5, color: { argb: 'FFFFFFFF' } };
    rSub3.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD97706' } };
    rSub3.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    const headers3 = [
      'OP',
      'CLIENTE',
      'DESCRIPCIÓN',
      'META ORDEN',
      'PT PRODUCIDO',
      'PP PRODUCIDO',
      'MERMA (u)',
      '% AVANCE PT',
      'PENDIENTE PT',
      'TURNOS',
      'MÁQUINAS',
    ];
    const rHead3 = ws3.getRow(3);
    rHead3.height = 22;
    headers3.forEach((h, i) => {
      const c = rHead3.getCell(i + 1);
      c.value = h;
      c.font = { bold: true, size: 9.5, color: { argb: 'FF1E293B' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      c.alignment = { horizontal: 'center', vertical: 'middle' };
      c.border = BORDES;
    });

    let r3 = 4;
    resumenOps.forEach((op, idx) => {
      const row = ws3.getRow(r3++);
      const vals = [
        op.op,
        op.cliente,
        op.descripcion,
        op.metaOrden,
        op.ptTotal,
        op.ppTotal,
        op.mermaTotal,
        op.metaOrden > 0 ? op.pctAvancePT / 100 : 0,
        op.pendientePT,
        op.turnosCount,
        op.maquinas.join(', '),
      ];
      vals.forEach((v, col) => {
        const c = row.getCell(col + 1);
        c.value = v;
        c.border = BORDES;
        c.font = { size: 9.5 };
        if (idx % 2 === 1) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        if (col === 0) c.alignment = { horizontal: 'center', vertical: 'middle' };
        else if (col >= 3 && col <= 9) {
          c.alignment = { horizontal: 'right', vertical: 'middle' };
          c.numFmt = col === 7 ? '0.0%' : '#,##0';
        } else {
          c.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        }
      });
    });
    ws3.views = [{ state: 'frozen', ySplit: 3 }];

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    descargarBlob(blob, nombreArchivo);
  } catch {
    // Fallback SheetJS
    const ws1 = XLSX.utils.json_to_sheet(
      registros.map((r) => ({
        Fecha: formatearFechaCorta(r.fecha),
        Turno: etiquetaTurno(r.turnoTipo),
        Máquina: r.maquina,
        Código: r.codigoMaquina,
        Área: etiquetaArea(r.area),
        Tipo: r.tipoProducto.toUpperCase(),
        OP: r.op,
        SAP: r.sap,
        Producto: r.producto,
        Cliente: r.cliente,
        Producido: r.total,
        Merma: r.merma,
        Observaciones: r.observaciones,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, 'Detalle Filtrado');
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    descargarBlob(
      new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      nombreArchivo
    );
  }
}

export function exportarMigracionPtExcel(registros: RegistroFiltrado[], filtros: FiltrosConsulta) {
  const filasPt = registros.filter((r) => r.tipoProducto === 'pt' && r.total > 0);
  if (filasPt.length === 0) {
    throw new Error('No hay registros PT con producción mayor a 0 en el filtro actual.');
  }
  const aoa: Array<Array<string | number>> = [
    ['ODTCOD', 'CODPTSAP', 'CODMAQ', 'ODTCANT', 'ODTOBS', 'FECHA', 'TURNO'],
  ];
  filasPt.forEach((r) => {
    aoa.push([
      r.op,
      r.sap,
      r.codigoMaquina,
      r.total,
      r.observaciones,
      formatearFechaCorta(r.fecha),
      etiquetaTurno(r.turnoTipo),
    ]);
  });
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 30 },
    { wch: 12 },
    { wch: 10 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Migracion_PT');
  const wbArray = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const suffix = filtros.fechaDesde || new Date().toISOString().slice(0, 10);
  descargarBlob(
    new Blob([wbArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `migracion_pt_${suffix}.xlsx`
  );
}
