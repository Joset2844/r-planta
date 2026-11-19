import React, { useMemo } from 'react';
import { Moon, Sun } from 'lucide-react';
import { RegistroFiltrado } from '../../types';
import { etiquetaArea, etiquetaTurno, formatearFechaCorta } from '../../services/catalogHelpers';

interface TurnosAgrupadosViewProps {
  registros: RegistroFiltrado[];
  cargando: boolean;
}

export const TurnosAgrupadosView: React.FC<TurnosAgrupadosViewProps> = ({
  registros,
  cargando,
}) => {
  const grupos = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        fecha: string;
        turnoTipo: string;
        autorEmail: string;
        filas: RegistroFiltrado[];
        totalPT: number;
        totalPP: number;
        totalSinTipo: number;
        totalMerma: number;
      }
    >();

    registros.forEach((r) => {
      const key = `${r.fecha}|${r.turnoTipo}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          fecha: r.fecha,
          turnoTipo: r.turnoTipo,
          autorEmail: r.autorEmail,
          filas: [],
          totalPT: 0,
          totalPP: 0,
          totalSinTipo: 0,
          totalMerma: 0,
        });
      }
      const g = map.get(key)!;
      g.filas.push(r);
      if (r.tipoProducto === 'pt') g.totalPT += r.total;
      else if (r.tipoProducto === 'pp') g.totalPP += r.total;
      else g.totalSinTipo += r.total;
      g.totalMerma += r.merma;
    });

    return Array.from(map.values()).sort((a, b) => {
      const fCmp = b.fecha.localeCompare(a.fecha);
      if (fCmp !== 0) return fCmp;
      return a.turnoTipo.localeCompare(b.turnoTipo);
    });
  }, [registros]);

  if (cargando) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-44 bg-white border border-slate-200 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (grupos.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
        <p className="text-sm font-semibold text-slate-800">Sin turnos registrados para el filtro actual</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {grupos.map((g) => {
        const esNoche = g.turnoTipo === 'noche';
        return (
          <div key={g.key} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5 text-xs">
                {esNoche ? (
                  <Moon size={14} className="text-indigo-600" />
                ) : (
                  <Sun size={14} className="text-amber-600" />
                )}
                <span className="font-mono font-bold text-sm text-slate-900">
                  {formatearFechaCorta(g.fecha)}
                </span>
                <span className="text-slate-300" aria-hidden="true">·</span>
                <span className={`font-semibold ${esNoche ? 'text-indigo-700' : 'text-amber-700'}`}>
                  Turno {etiquetaTurno(g.turnoTipo)}
                </span>
                {g.autorEmail && (
                  <>
                    <span className="text-slate-300" aria-hidden="true">·</span>
                    <span className="text-slate-500">{g.autorEmail}</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
                {g.totalPT > 0 && (
                  <span className="text-sky-700 font-semibold">
                    PT: {g.totalPT.toLocaleString('es-PE')} u
                  </span>
                )}
                {g.totalPP > 0 && (
                  <span className="text-amber-700 font-semibold">
                    PP: {g.totalPP.toLocaleString('es-PE')} u
                  </span>
                )}
                {g.totalSinTipo > 0 && (
                  <span className="text-slate-700 font-semibold">
                    Total: {g.totalSinTipo.toLocaleString('es-PE')} u
                  </span>
                )}
                {g.totalMerma > 0 && (
                  <span className="text-red-600 font-semibold">
                    Merma: {g.totalMerma.toLocaleString('es-PE')} u
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 bg-white">
                    <th className="py-2 px-3">Máquina</th>
                    <th className="py-2 px-3">Área</th>
                    <th className="py-2 px-3">Tipo</th>
                    <th className="py-2 px-3">OP</th>
                    <th className="py-2 px-3">SAP</th>
                    <th className="py-2 px-3">Producto</th>
                    <th className="py-2 px-3 text-right">Producido</th>
                    <th className="py-2 px-3 text-right">Merma</th>
                    <th className="py-2 px-3">Observaciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {g.filas.map((f) => (
                    <tr key={f.uid} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-medium text-slate-900 whitespace-nowrap">
                        {f.maquina}
                        {f.codigoMaquina && (
                          <span className="ml-1.5 text-[11px] font-mono text-slate-400">
                            ({f.codigoMaquina})
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                        {etiquetaArea(f.area)}
                      </td>
                      <td className="py-2 px-3 font-mono font-semibold whitespace-nowrap">
                        {f.tipoProducto ? f.tipoProducto.toUpperCase() : '—'}
                      </td>
                      <td className="py-2 px-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                        {f.op || '—'}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {f.sap || '—'}
                      </td>
                      <td className="py-2 px-3 text-slate-800 max-w-[260px] truncate">
                        {f.producto || '—'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {f.total.toLocaleString('es-PE')}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-red-600">
                        {f.merma > 0 ? f.merma.toLocaleString('es-PE') : '0'}
                      </td>
                      <td className="py-2 px-3 text-slate-600 max-w-[200px] truncate">
                        {f.observaciones || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
};
