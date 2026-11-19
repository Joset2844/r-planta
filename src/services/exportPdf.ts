import { jsPDF } from 'jspdf';
import {
  FiltrosConsulta,
  RegistroFiltrado,
  ResumenMaquina,
  ResumenOp,
  VistaReporte,
} from '../types';
import { etiquetaArea, etiquetaTurno, formatearFechaCorta } from './catalogHelpers';
import { describirFiltros } from './exportExcel';

export function exportarReportePdf(params: {
  vista: VistaReporte;
  registros: RegistroFiltrado[];
  resumenMaquinas: ResumenMaquina[];
  resumenOps: ResumenOp[];
  filtros: FiltrosConsulta;
}): string {
  const { vista, registros, resumenMaquinas, resumenOps, filtros } = params;
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const marginX = 11;
  const contentWidth = pageWidth - marginX * 2; // 275 mm
  const bottomLimit = pageHeight - 13;
  let y = 11;

  const tituloVista =
    vista === 'maquinas'
      ? 'REPORTE CONSOLIDADO POR MÁQUINA'
      : vista === 'ops'
      ? 'REPORTE CONSOLIDADO POR ORDEN DE PRODUCCIÓN (OP)'
      : 'REPORTE DETALLADO DE PRODUCCIÓN — PLANTA 2';

  const drawBanner = () => {
    doc.setFillColor(15, 23, 42);
    doc.rect(marginX, y, contentWidth, 16, 'F');
    doc.setFillColor(217, 119, 6);
    doc.rect(marginX, y, 3, 16, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.5);
    doc.setTextColor(255, 255, 255);
    doc.text(tituloVista, marginX + 6, y + 6.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(203, 213, 225);
    const filtroTxt = doc.splitTextToSize(describirFiltros(filtros), contentWidth - 12)[0] || '';
    doc.text(filtroTxt, marginX + 6, y + 12.2);

    y += 19;
  };

  const totalPT = registros.filter((r) => r.tipoProducto === 'pt').reduce((a, r) => a + r.total, 0);
  const totalPP = registros.filter((r) => r.tipoProducto === 'pp').reduce((a, r) => a + r.total, 0);
  const totalSinTipo = registros.filter((r) => !r.tipoProducto).reduce((a, r) => a + r.total, 0);
  const totalMerma = registros.reduce((a, r) => a + r.merma, 0);

  drawBanner();

  // KPI strip
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.rect(marginX, y, contentWidth, 9, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(15, 23, 42);
  const kpiParts = [
    `Registros: ${registros.length}`,
    `Total PT: ${totalPT.toLocaleString('es-PE')} u`,
    `Total PP: ${totalPP.toLocaleString('es-PE')} u`,
    ...(totalSinTipo > 0 ? [`Sin tipo: ${totalSinTipo.toLocaleString('es-PE')} u`] : []),
    `Merma: ${totalMerma.toLocaleString('es-PE')} u`,
  ];
  doc.text(kpiParts.join('    ·    '), marginX + 4, y + 5.8);
  y += 12;

  const drawTable = (
    headers: string[],
    colWidths: number[],
    rows: Array<{ cells: string[]; alignRightCols?: number[]; centerCols?: number[] }>
  ) => {
    const colX: number[] = [];
    let acc = marginX;
    colWidths.forEach((w) => {
      colX.push(acc);
      acc += w;
    });

    const drawHeaderRow = () => {
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.rect(marginX, y, contentWidth, 6.5, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(30, 41, 59);
      headers.forEach((h, i) => {
        doc.line(colX[i], y, colX[i], y + 6.5);
        doc.text(h, colX[i] + colWidths[i] / 2, y + 4.3, { align: 'center' });
      });
      doc.line(marginX + contentWidth, y, marginX + contentWidth, y + 6.5);
      y += 6.5;
    };

    drawHeaderRow();

    rows.forEach((r, idx) => {
      doc.setFontSize(7.2);
      const wrapped = r.cells.map((val, cIdx) =>
        val ? (doc.splitTextToSize(val, colWidths[cIdx] - 2.4) as string[]) : ['']
      );
      const maxLines = Math.max(...wrapped.map((l) => l.length), 1);
      const rowH = Math.max(5.5, maxLines * 3.2 + 2.2);

      if (y + rowH > bottomLimit) {
        doc.addPage('a4', 'landscape');
        y = 11;
        drawHeaderRow();
      }

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(marginX, y, contentWidth, rowH, 'F');
      }

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.18);
      colX.forEach((cx) => doc.line(cx, y, cx, y + rowH));
      doc.line(marginX + contentWidth, y, marginX + contentWidth, y + rowH);
      doc.line(marginX, y + rowH, marginX + contentWidth, y + rowH);

      wrapped.forEach((lines, cIdx) => {
        doc.setFont('helvetica', cIdx === 0 ? 'bold' : 'normal');
        doc.setTextColor(15, 23, 42);
        const totalTextH = lines.length * 3.2;
        let ty = y + (rowH - totalTextH) / 2 + 2.5;
        lines.forEach((line) => {
          if (r.alignRightCols?.includes(cIdx)) {
            doc.text(line, colX[cIdx] + colWidths[cIdx] - 1.5, ty, { align: 'right' });
          } else if (r.centerCols?.includes(cIdx)) {
            doc.text(line, colX[cIdx] + colWidths[cIdx] / 2, ty, { align: 'center' });
          } else {
            doc.text(line, colX[cIdx] + 1.3, ty);
          }
          ty += 3.2;
        });
      });

      y += rowH;
    });
  };

  if (vista === 'maquinas') {
    drawTable(
      ['MÁQUINA', 'CÓD.', 'ÁREA', 'TIPO', 'TURNOS', 'DÍAS', 'PRODUCIDO', 'MERMA', 'PROM/TURNO', 'OPs ATENDIDAS'],
      [36, 17, 30, 12, 15, 14, 24, 20, 24, 83],
      resumenMaquinas.map((m) => ({
        cells: [
          m.maquina,
          m.codigoMaquina || '—',
          etiquetaArea(m.area),
          m.tipoProducto ? m.tipoProducto.toUpperCase() : '—',
          String(m.turnosCount),
          String(m.diasCount),
          m.totalProducido.toLocaleString('es-PE'),
          m.totalMerma.toLocaleString('es-PE'),
          m.promedioPorTurno.toLocaleString('es-PE'),
          m.opsUnicas.join(', ') || '—',
        ],
        centerCols: [1, 3, 4, 5],
        alignRightCols: [6, 7, 8],
      }))
    );
  } else if (vista === 'ops') {
    drawTable(
      ['OP', 'CLIENTE', 'DESCRIPCIÓN', 'META', 'PT PROD.', 'PP PROD.', 'MERMA', '% PT', 'MÁQUINAS'],
      [20, 34, 65, 22, 22, 22, 19, 16, 55],
      resumenOps.map((o) => ({
        cells: [
          o.op,
          o.cliente || '—',
          o.descripcion || '—',
          o.metaOrden > 0 ? o.metaOrden.toLocaleString('es-PE') : '—',
          o.ptTotal.toLocaleString('es-PE'),
          o.ppTotal.toLocaleString('es-PE'),
          o.mermaTotal.toLocaleString('es-PE'),
          o.metaOrden > 0 ? `${o.pctAvancePT.toFixed(1)}%` : '—',
          o.maquinas.join(', '),
        ],
        centerCols: [0],
        alignRightCols: [3, 4, 5, 6, 7],
      }))
    );
  } else {
    // Detalle or Turnos view -> full detailed rows
    drawTable(
      ['FECHA', 'TURNO', 'MÁQUINA', 'TIPO', 'OP', 'SAP', 'PRODUCTO / MODELO', 'PROD. (u)', 'MERMA', 'OBSERVACIONES'],
      [20, 14, 34, 11, 18, 20, 68, 22, 18, 50],
      registros.map((r) => ({
        cells: [
          formatearFechaCorta(r.fecha),
          etiquetaTurno(r.turnoTipo),
          r.codigoMaquina ? `${r.maquina} (${r.codigoMaquina})` : r.maquina,
          r.tipoProducto ? r.tipoProducto.toUpperCase() : '—',
          r.op || '—',
          r.sap || '—',
          r.producto || '—',
          r.total.toLocaleString('es-PE'),
          r.merma > 0 ? r.merma.toLocaleString('es-PE') : '0',
          r.observaciones || '',
        ],
        centerCols: [0, 1, 3, 4, 5],
        alignRightCols: [7, 8],
      }))
    );
  }

  const totalPages = (doc as any).internal.getNumberOfPages();
  const generado = new Date().toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.2);
    doc.line(marginX, pageHeight - 9.5, marginX + contentWidth, pageHeight - 9.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generado: ${generado} · Consultas Planta 2`, marginX, pageHeight - 5.5);
    doc.text(`Página ${p} de ${totalPages}`, marginX + contentWidth, pageHeight - 5.5, {
      align: 'right',
    });
  }

  const hoy = new Date().toISOString().slice(0, 10);
  const nombre = `reporte_planta2_${vista}_${hoy}.pdf`;
  doc.save(nombre);
  return nombre;
}
