import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Filter } from 'lucide-react';
import { ResumenMaquina } from '../../types';
import { etiquetaArea } from '../../services/catalogHelpers';

interface ResumenMaquinasViewProps {
  resumen: ResumenMaquina[];
  cargando: boolean;
  onFiltrarMaquina: (maquinaNombre: string) => void;
  onFiltrarOp: (op: string) => void;
}

export const ResumenMaquinasView: React.FC<ResumenMaquinasViewProps> = ({
  resumen,
  cargando,
  onFiltrarMaquina,
  onFiltrarOp,
}) => {
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});

  const toggle = (key: string) => {
    setExpandidos((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (cargando) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (resumen.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
        <p className="text-sm font-semibold text-slate-800">Sin datos de máquinas en el filtro actual</p>
        <p className="text-xs text-slate-500 mt-1">
          Selecciona un rango de fechas o ajusta las máquinas seleccionadas en el panel izquierdo.
        </p>
      </div>
    );
  }

  const totalProd = resumen.reduce((a, m) => a + m.totalProducido, 0);
  const totalMerma = resumen.reduce((a, m) => a + m.totalMerma, 0);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <th className="py-2.5 px-3 w-8" />
              <th className="py-2.5 px-3 whitespace-nowrap">Máquina</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Área</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Tipo</th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap">Turnos</th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap">Días</th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap">Total Producido</th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap">Merma</th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap">% Merma</th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap">Prom. / Turno</th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {resumen.map((m) => {
              const isOpen = !!expandidos[m.key];
              const pctMerma =
                m.totalProducido + m.totalMerma > 0
                  ? (m.totalMerma / (m.totalProducido + m.totalMerma)) * 100
                  : 0;
              const pctMeta =
                m.metaTurno > 0 ? (m.promedioPorTurno / m.metaTurno) * 100 : 0;

              return (
                <React.Fragment key={m.key}>
                  <tr className="hover:bg-slate-50/90 transition-colors">
                    <td className="py-2.5 px-3">
                      <button
                        type="button"
                        onClick={() => toggle(m.key)}
                        className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
                        title="Ver desglose por OP"
                      >
                        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                    </td>
                    <td className="py-2.5 px-3">
                      <button
                        type="button"
                        onClick={() => toggle(m.key)}
                        className="font-semibold text-slate-900 hover:text-amber-700 text-left cursor-pointer"
                      >
                        {m.maquina}
                      </button>
                      <div className="text-[11px] font-mono text-slate-400">
                        {m.codigoMaquina || 'Sin código'} · {m.opsUnicas.length} OP(s)
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                      {etiquetaArea(m.area)}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold whitespace-nowrap">
                      {m.tipoProducto ? (
                        <span className={m.tipoProducto === 'pt' ? 'text-sky-700' : 'text-amber-700'}>
                          {m.tipoProducto.toUpperCase()}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                      {m.turnosCount}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                      {m.diasCount}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {m.totalProducido.toLocaleString('es-PE')}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-red-600">
                      {m.totalMerma.toLocaleString('es-PE')}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                      {pctMerma.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-800">
                      <div>{m.promedioPorTurno.toLocaleString('es-PE')}</div>
                      {m.metaTurno > 0 && (
                        <div className="text-[10.5px] text-slate-400">
                          Meta {m.metaTurno.toLocaleString('es-PE')} ({pctMeta.toFixed(0)}%)
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onFiltrarMaquina(m.maquina)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                      >
                        <Filter size={11} />
                        <span>Aislar</span>
                      </button>
                    </td>
                  </tr>

                  {isOpen && m.detalleOps.length > 0 && (
                    <tr className="bg-slate-50/70">
                      <td colSpan={11} className="px-6 py-3">
                        <div className="text-[11px] font-semibold text-slate-500 mb-2">
                          Producción por OP en {m.maquina}
                        </div>
                        <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                                <th className="py-1.5 px-3 text-left">OP</th>
                                <th className="py-1.5 px-3 text-left">Producto</th>
                                <th className="py-1.5 px-3 text-right">Turnos</th>
                                <th className="py-1.5 px-3 text-right">Producido</th>
                                <th className="py-1.5 px-3 text-right">Merma</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {m.detalleOps.map((d, idx) => (
                                <tr key={`${d.op}-${idx}`}>
                                  <td className="py-1.5 px-3 font-mono font-semibold">
                                    <button
                                      type="button"
                                      onClick={() => onFiltrarOp(d.op)}
                                      className="text-amber-700 hover:underline cursor-pointer"
                                    >
                                      {d.op}
                                    </button>
                                  </td>
                                  <td className="py-1.5 px-3 text-slate-700">{d.producto || '—'}</td>
                                  <td className="py-1.5 px-3 text-right font-mono tabular-nums text-slate-600">
                                    {d.turnos}
                                  </td>
                                  <td className="py-1.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                                    {d.total.toLocaleString('es-PE')}
                                  </td>
                                  <td className="py-1.5 px-3 text-right font-mono tabular-nums text-red-600">
                                    {d.merma.toLocaleString('es-PE')}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-amber-50/80 border-t border-slate-300 font-semibold text-slate-900">
              <td colSpan={6} className="py-2.5 px-3 text-xs">
                Total ({resumen.length} máquinas)
              </td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                {totalProd.toLocaleString('es-PE')}
              </td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-red-600">
                {totalMerma.toLocaleString('es-PE')}
              </td>
              <td colSpan={3} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
