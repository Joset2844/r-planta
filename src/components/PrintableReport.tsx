import React from 'react';
import {
  FiltrosConsulta,
  RegistroFiltrado,
  ResumenMaquina,
  ResumenOp,
  VistaReporte,
} from '../types';
import { etiquetaArea, etiquetaTurno, formatearFechaCorta } from '../services/catalogHelpers';
import { describirFiltros } from '../services/exportExcel';

interface PrintableReportProps {
  vista: VistaReporte;
  registros: RegistroFiltrado[];
  resumenMaquinas: ResumenMaquina[];
  resumenOps: ResumenOp[];
  filtros: FiltrosConsulta;
}

export const PrintableReport: React.FC<PrintableReportProps> = ({
  vista,
  registros,
  resumenMaquinas,
  resumenOps,
  filtros,
}) => {
  const totalPT = registros.filter((r) => r.tipoProducto === 'pt').reduce((a, r) => a + r.total, 0);
  const totalPP = registros.filter((r) => r.tipoProducto === 'pp').reduce((a, r) => a + r.total, 0);
  const totalMerma = registros.reduce((a, r) => a + r.merma, 0);
  const generado = new Date().toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="print-only text-slate-900 bg-white">
      <div className="border-b-2 border-slate-900 pb-3 mb-4 flex items-end justify-between">
        <div>
          <div className="text-[11px] font-semibold text-amber-700">
            Supervisión Planta 2 — Reporte Oficial de Consulta
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5">
            {vista === 'maquinas'
              ? 'Consolidado de Producción por Máquina'
              : vista === 'ops'
              ? 'Consolidado por Orden de Producción (OP)'
              : 'Detalle de Registros de Producción'}
          </h1>
          <div className="text-[11px] text-slate-600 mt-1">{describirFiltros(filtros)}</div>
        </div>
        <div className="text-right text-[11px] font-mono text-slate-600">
          <div>Emitido: {generado}</div>
          <div>Filas: {registros.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4 border border-slate-300 rounded p-2.5 text-xs bg-slate-50">
        <div>
          <span className="text-slate-500">Total PT:</span>{' '}
          <strong className="font-mono tabular-nums">{totalPT.toLocaleString('es-PE')} u</strong>
        </div>
        <div>
          <span className="text-slate-500">Total PP:</span>{' '}
          <strong className="font-mono tabular-nums">{totalPP.toLocaleString('es-PE')} u</strong>
        </div>
        <div>
          <span className="text-slate-500">Total Merma:</span>{' '}
          <strong className="font-mono tabular-nums">{totalMerma.toLocaleString('es-PE')} u</strong>
        </div>
        <div>
          <span className="text-slate-500">Total General:</span>{' '}
          <strong className="font-mono tabular-nums">
            {(totalPT + totalPP).toLocaleString('es-PE')} u
          </strong>
        </div>
      </div>

      {vista === 'maquinas' ? (
        <table className="w-full border-collapse text-[10.5px]">
          <thead>
            <tr className="bg-slate-100 border-y border-slate-400">
              <th className="py-1.5 px-2 text-left">Máquina</th>
              <th className="py-1.5 px-2 text-left">Área</th>
              <th className="py-1.5 px-2 text-center">Tipo</th>
              <th className="py-1.5 px-2 text-right">Turnos</th>
              <th className="py-1.5 px-2 text-right">Días</th>
              <th className="py-1.5 px-2 text-right">Producido</th>
              <th className="py-1.5 px-2 text-right">Merma</th>
              <th className="py-1.5 px-2 text-right">Prom/Turno</th>
              <th className="py-1.5 px-2 text-left">OPs</th>
            </tr>
          </thead>
          <tbody>
            {resumenMaquinas.map((m) => (
              <tr key={m.key} className="border-b border-slate-200">
                <td className="py-1.5 px-2 font-semibold">{m.maquina}</td>
                <td className="py-1.5 px-2">{etiquetaArea(m.area)}</td>
                <td className="py-1.5 px-2 text-center font-mono">
                  {m.tipoProducto ? m.tipoProducto.toUpperCase() : '—'}
                </td>
                <td className="py-1.5 px-2 text-right font-mono tabular-nums">{m.turnosCount}</td>
                <td className="py-1.5 px-2 text-right font-mono tabular-nums">{m.diasCount}</td>
                <td className="py-1.5 px-2 text-right font-mono tabular-nums font-semibold">
                  {m.totalProducido.toLocaleString('es-PE')}
                </td>
                <td className="py-1.5 px-2 text-right font-mono tabular-nums">
                  {m.totalMerma.toLocaleString('es-PE')}
                </td>
                <td className="py-1.5 px-2 text-right font-mono tabular-nums">
                  {m.promedioPorTurno.toLocaleString('es-PE')}
                </td>
                <td className="py-1.5 px-2">{m.opsUnicas.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : vista === 'ops' ? (
        <table className="w-full border-collapse text-[10.5px]">
          <thead>
            <tr className="bg-slate-100 border-y border-slate-400">
              <th className="py-1.5 px-2 text-left">OP</th>
              <th className="py-1.5 px-2 text-left">Cliente</th>
              <th className="py-1.5 px-2 text-left">Descripción</th>
              <th className="py-1.5 px-2 text-right">Meta</th>
              <th className="py-1.5 px-2 text-right">PT</th>
              <th className="py-1.5 px-2 text-right">PP</th>
              <th className="py-1.5 px-2 text-right">Merma</th>
              <th className="py-1.5 px-2 text-right">% PT</th>
              <th className="py-1.5 px-2 text-left">Máquinas</th>
            </tr>
          </thead>
          <tbody>
            {resumenOps.map((o) => (
              <tr key={o.key} className="border-b border-slate-200">
                <td className="py-1.5 px-2 font-mono font-semibold">{o.op}</td>
                <td className="py-1.5 px-2">{o.cliente || '—'}</td>
                <td className="py-1.5 px-2">{o.descripcion || '—'}</td>
                <td className="py-1.5 px-2 text-right font-mono tabular-nums">
                  {o.metaOrden > 0 ? o.metaOrden.toLocaleString('es-PE') : '—'}
                </td>
                <td className="py-1.5 px-2 text-right font-mono tabular-nums font-semibold">
                  {o.ptTotal.toLocaleString('es-PE')}
                </td>
                <td className="py-1.5 px-2 text-right font-mono tabular-nums font-semibold">
                  {o.ppTotal.toLocaleString('es-PE')}
                </td>
                <td className="py-1.5 px-2 text-right font-mono tabular-nums">
                  {o.mermaTotal.toLocaleString('es-PE')}
                </td>
                <td className="py-1.5 px-2 text-right font-mono tabular-nums">
                  {o.metaOrden > 0 ? `${o.pctAvancePT.toFixed(1)}%` : '—'}
                </td>
                <td className="py-1.5 px-2">{o.maquinas.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr className="bg-slate-100 border-y border-slate-400">
              <th className="py-1.5 px-1.5 text-left">Fecha</th>
              <th className="py-1.5 px-1.5 text-left">Turno</th>
              <th className="py-1.5 px-1.5 text-left">Máquina</th>
              <th className="py-1.5 px-1.5 text-center">Tipo</th>
              <th className="py-1.5 px-1.5 text-left">OP</th>
              <th className="py-1.5 px-1.5 text-left">SAP</th>
              <th className="py-1.5 px-1.5 text-left">Producto</th>
              <th className="py-1.5 px-1.5 text-right">Producido</th>
              <th className="py-1.5 px-1.5 text-right">Merma</th>
              <th className="py-1.5 px-1.5 text-left">Observaciones</th>
            </tr>
          </thead>
          <tbody>
            {registros.map((r) => (
              <tr key={r.uid} className="border-b border-slate-200">
                <td className="py-1 px-1.5 font-mono tabular-nums whitespace-nowrap">
                  {formatearFechaCorta(r.fecha)}
                </td>
                <td className="py-1 px-1.5 whitespace-nowrap">{etiquetaTurno(r.turnoTipo)}</td>
                <td className="py-1 px-1.5 font-medium">{r.maquina}</td>
                <td className="py-1 px-1.5 text-center font-mono">
                  {r.tipoProducto ? r.tipoProducto.toUpperCase() : '—'}
                </td>
                <td className="py-1 px-1.5 font-mono font-semibold">{r.op || '—'}</td>
                <td className="py-1 px-1.5 font-mono">{r.sap || '—'}</td>
                <td className="py-1 px-1.5">{r.producto || '—'}</td>
                <td className="py-1 px-1.5 text-right font-mono tabular-nums font-semibold">
                  {r.total.toLocaleString('es-PE')}
                </td>
                <td className="py-1 px-1.5 text-right font-mono tabular-nums">
                  {r.merma.toLocaleString('es-PE')}
                </td>
                <td className="py-1 px-1.5">{r.observaciones || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
