import React from 'react';
import { RegistroFiltrado } from '../types';

interface KpiStripProps {
  registros: RegistroFiltrado[];
}

export const KpiStrip: React.FC<KpiStripProps> = ({ registros }) => {
  let totalPT = 0;
  let totalPP = 0;
  let totalSinTipo = 0;
  let totalMerma = 0;
  const turnosSet = new Set<string>();
  const maquinasSet = new Set<string>();
  const opsSet = new Set<string>();

  registros.forEach((r) => {
    if (r.tipoProducto === 'pt') totalPT += r.total;
    else if (r.tipoProducto === 'pp') totalPP += r.total;
    else totalSinTipo += r.total;

    totalMerma += r.merma;
    if (r.fecha) turnosSet.add(`${r.fecha}|${r.turnoTipo}`);
    if (r.maquina) maquinasSet.add(r.maquina.toLowerCase());
    if (r.op) opsSet.add(r.op.toLowerCase());
  });

  const totalGeneral = totalPT + totalPP + totalSinTipo;
  const pctMerma = totalGeneral + totalMerma > 0 ? (totalMerma / (totalGeneral + totalMerma)) * 100 : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
      <div className="p-4">
        <div className="text-xs font-medium text-slate-500">Producto Terminado (PT)</div>
        <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900">
          {totalPT.toLocaleString('es-PE')}
          <span className="text-xs font-normal text-slate-400 ml-1">u</span>
        </div>
        {totalSinTipo > 0 && (
          <div className="mt-1 text-[11px] font-mono tabular-nums text-slate-500">
            Sin clasificar: {totalSinTipo.toLocaleString('es-PE')} u
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="text-xs font-medium text-slate-500">Producto en Proceso (PP)</div>
        <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-amber-700">
          {totalPP.toLocaleString('es-PE')}
          <span className="text-xs font-normal text-slate-400 ml-1">u</span>
        </div>
        <div className="mt-1 text-[11px] text-slate-500">
          Total combinado: <span className="font-mono tabular-nums">{totalGeneral.toLocaleString('es-PE')} u</span>
        </div>
      </div>

      <div className="p-4">
        <div className="text-xs font-medium text-slate-500">Merma Registrada</div>
        <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-red-600">
          {totalMerma.toLocaleString('es-PE')}
          <span className="text-xs font-normal text-slate-400 ml-1">u</span>
        </div>
        <div className="mt-1 text-[11px] font-mono tabular-nums text-slate-500">
          Índice de merma: {pctMerma.toFixed(2)}%
        </div>
      </div>

      <div className="p-4">
        <div className="text-xs font-medium text-slate-500">Alcance de Consulta</div>
        <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900">
          {registros.length.toLocaleString('es-PE')}
          <span className="text-xs font-normal text-slate-400 ml-1.5">filas</span>
        </div>
        <div className="mt-1 text-[11px] text-slate-500 font-mono tabular-nums">
          {turnosSet.size} turnos · {maquinasSet.size} máq. · {opsSet.size} OPs
        </div>
      </div>
    </div>
  );
};
