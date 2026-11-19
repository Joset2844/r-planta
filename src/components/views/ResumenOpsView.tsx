import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Filter } from 'lucide-react';
import { ResumenOp } from '../../types';

interface ResumenOpsViewProps {
  resumen: ResumenOp[];
  cargando: boolean;
  onFiltrarOp: (op: string) => void;
}

export const ResumenOpsView: React.FC<ResumenOpsViewProps> = ({
  resumen,
  cargando,
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
        <p className="text-sm font-semibold text-slate-800">Sin órdenes de producción en el filtro actual</p>
        <p className="text-xs text-slate-500 mt-1">
          Ajusta las fechas, máquinas u OPs seleccionadas para consultar.
        </p>
      </div>
    );
  }

  const totalPT = resumen.reduce((a, o) => a + o.ptTotal, 0);
  const totalPP = resumen.reduce((a, o) => a + o.ppTotal, 0);
  const totalMerma = resumen.reduce((a, o) => a + o.mermaTotal, 0);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <th className="py-2.5 px-3 w-8" />
              <th className="py-2.5 px-3 whitespace-nowrap">OP</th>
              <th className="py-2.5 px-3 min-w-[200px]">Descripción / Cliente</th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap">Meta Orden</th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap">PT Producido</th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap">PP Producido</th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap">Merma</th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap">Avance PT</th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap">Pendiente PT</th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {resumen.map((op) => {
              const isOpen = !!expandidos[op.key];
              const pctClamped = Math.min(100, Math.max(0, op.pctAvancePT));

              return (
                <React.Fragment key={op.key}>
                  <tr className="hover:bg-slate-50/90 transition-colors">
                    <td className="py-2.5 px-3">
                      <button
                        type="button"
                        onClick={() => toggle(op.key)}
                        className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
                        title="Ver modelos y máquinas"
                      >
                        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => toggle(op.key)}
                        className="font-mono font-bold text-slate-900 hover:text-amber-700 cursor-pointer"
                      >
                        {op.op}
                      </button>
                      <div className="text-[11px] font-mono text-slate-400">
                        {op.turnosCount} turno(s) · {op.maquinas.length} máq.
                      </div>
                    </td>
                    <td className="py-2.5 px-3 max-w-[260px]">
                      <div className="font-medium text-slate-900 truncate">{op.descripcion || '—'}</div>
                      {op.cliente && (
                        <div className="text-[11px] text-slate-500 truncate">{op.cliente}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                      {op.metaOrden > 0 ? op.metaOrden.toLocaleString('es-PE') : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-sky-700">
                      {op.ptTotal.toLocaleString('es-PE')}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-amber-700">
                      {op.ppTotal.toLocaleString('es-PE')}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-red-600">
                      {op.mermaTotal.toLocaleString('es-PE')}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums min-w-[110px]">
                      {op.metaOrden > 0 ? (
                        <div>
                          <div className="font-semibold text-slate-900">{op.pctAvancePT.toFixed(1)}%</div>
                          <div className="mt-1 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-sky-600"
                              style={{ width: `${pctClamped}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                      {op.metaOrden > 0 ? op.pendientePT.toLocaleString('es-PE') : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      {op.op !== 'Sin OP' && (
                        <button
                          type="button"
                          onClick={() => onFiltrarOp(op.op)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                        >
                          <Filter size={11} />
                          <span>Aislar</span>
                        </button>
                      )}
                    </td>
                  </tr>

                  {isOpen && (
                    <tr className="bg-slate-50/70">
                      <td colSpan={10} className="px-6 py-3 space-y-2">
                        <div className="text-[11px] text-slate-600">
                          <span className="font-semibold">Máquinas involucradas:</span>{' '}
                          {op.maquinas.join(', ')}
                        </div>
                        {op.modelosDetalle.length > 0 && (
                          <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                                  <th className="py-1.5 px-3 text-left">SAP</th>
                                  <th className="py-1.5 px-3 text-left">Producto / Modelo</th>
                                  <th className="py-1.5 px-3 text-right">PT</th>
                                  <th className="py-1.5 px-3 text-right">PP</th>
                                  <th className="py-1.5 px-3 text-right">Merma</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {op.modelosDetalle.map((md, idx) => (
                                  <tr key={`${md.sap}-${idx}`}>
                                    <td className="py-1.5 px-3 font-mono text-slate-600">
                                      {md.sap || '—'}
                                    </td>
                                    <td className="py-1.5 px-3 text-slate-800">{md.producto}</td>
                                    <td className="py-1.5 px-3 text-right font-mono tabular-nums text-sky-700 font-semibold">
                                      {md.pt.toLocaleString('es-PE')}
                                    </td>
                                    <td className="py-1.5 px-3 text-right font-mono tabular-nums text-amber-700 font-semibold">
                                      {md.pp.toLocaleString('es-PE')}
                                    </td>
                                    <td className="py-1.5 px-3 text-right font-mono tabular-nums text-red-600">
                                      {md.merma.toLocaleString('es-PE')}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-amber-50/80 border-t border-slate-300 font-semibold text-slate-900">
              <td colSpan={4} className="py-2.5 px-3 text-xs">
                Total ({resumen.length} OPs)
              </td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-sky-700">
                {totalPT.toLocaleString('es-PE')}
              </td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-amber-700">
                {totalPP.toLocaleString('es-PE')}
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
