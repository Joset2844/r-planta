import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { RegistroFiltrado } from '../../types';
import { etiquetaArea, etiquetaTurno, formatearFechaCorta } from '../../services/catalogHelpers';

interface DetalleTableViewProps {
  registros: RegistroFiltrado[];
  cargando: boolean;
  onFiltrarOp: (op: string) => void;
  onFiltrarMaquina: (maquinaNombre: string) => void;
}

type SortKey = 'fecha' | 'maquina' | 'op' | 'total' | 'merma';

export const DetalleTableView: React.FC<DetalleTableViewProps> = ({
  registros,
  cargando,
  onFiltrarOp,
  onFiltrarMaquina,
}) => {
  const [sortKey, setSortKey] = useState<SortKey>('fecha');
  const [sortAsc, setSortAsc] = useState(false);
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 100;

  const ordenados = useMemo(() => {
    const copia = [...registros];
    copia.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'fecha') {
        cmp = a.fecha.localeCompare(b.fecha);
        if (cmp === 0) cmp = a.turnoTipo.localeCompare(b.turnoTipo);
      } else if (sortKey === 'maquina') {
        cmp = a.maquina.localeCompare(b.maquina, 'es');
      } else if (sortKey === 'op') {
        cmp = a.op.localeCompare(b.op, 'es');
      } else if (sortKey === 'total') {
        cmp = a.total - b.total;
      } else if (sortKey === 'merma') {
        cmp = a.merma - b.merma;
      }
      return sortAsc ? cmp : -cmp;
    });
    return copia;
  }, [registros, sortKey, sortAsc]);

  const totalPaginas = Math.max(1, Math.ceil(ordenados.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = useMemo(() => {
    const start = (paginaActual - 1) * POR_PAGINA;
    return ordenados.slice(start, start + POR_PAGINA);
  }, [ordenados, paginaActual]);

  const totalProducido = useMemo(() => registros.reduce((a, r) => a + r.total, 0), [registros]);
  const totalMerma = useMemo(() => registros.reduce((a, r) => a + r.merma, 0), [registros]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'maquina' || key === 'op');
    }
    setPagina(1);
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown size={12} className="text-slate-400" />;
    return sortAsc ? (
      <ArrowUp size={12} className="text-amber-600" />
    ) : (
      <ArrowDown size={12} className="text-amber-600" />
    );
  };

  if (cargando) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 space-y-2.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-9 bg-slate-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (registros.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
        <p className="text-sm font-semibold text-slate-800">
          No hay registros que coincidan con los filtros seleccionados
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Prueba ampliando el rango de fechas, quitando filtros de máquina u OP, o verificando el turno.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <th className="py-2.5 px-3 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => toggleSort('fecha')}
                  className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                >
                  <span>Fecha</span>
                  <SortIcon col="fecha" />
                </button>
              </th>
              <th className="py-2.5 px-3 whitespace-nowrap">Turno</th>
              <th className="py-2.5 px-3 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => toggleSort('maquina')}
                  className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                >
                  <span>Máquina</span>
                  <SortIcon col="maquina" />
                </button>
              </th>
              <th className="py-2.5 px-3 whitespace-nowrap">Tipo</th>
              <th className="py-2.5 px-3 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => toggleSort('op')}
                  className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                >
                  <span>OP</span>
                  <SortIcon col="op" />
                </button>
              </th>
              <th className="py-2.5 px-3 whitespace-nowrap">SAP</th>
              <th className="py-2.5 px-3 min-w-[200px]">Producto / Modelo</th>
              <th className="py-2.5 px-3 min-w-[130px]">Cliente</th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => toggleSort('total')}
                  className="inline-flex items-center justify-end gap-1 hover:text-slate-900 cursor-pointer ml-auto"
                >
                  <span>Producido</span>
                  <SortIcon col="total" />
                </button>
              </th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => toggleSort('merma')}
                  className="inline-flex items-center justify-end gap-1 hover:text-slate-900 cursor-pointer ml-auto"
                >
                  <span>Merma</span>
                  <SortIcon col="merma" />
                </button>
              </th>
              <th className="py-2.5 px-3 min-w-[160px]">Observaciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibles.map((r) => (
              <tr key={r.uid} className="hover:bg-slate-50/90 transition-colors">
                <td className="py-2.5 px-3 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                  {formatearFechaCorta(r.fecha)}
                </td>
                <td className="py-2.5 px-3 whitespace-nowrap text-slate-700">
                  <span className={r.turnoTipo === 'noche' ? 'text-indigo-700 font-medium' : 'text-amber-700 font-medium'}>
                    {etiquetaTurno(r.turnoTipo)}
                  </span>
                </td>
                <td className="py-2.5 px-3 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => onFiltrarMaquina(r.maquina)}
                    title="Filtrar solo esta máquina"
                    className="font-medium text-slate-900 hover:text-amber-700 hover:underline text-left cursor-pointer"
                  >
                    {r.maquina}
                  </button>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {[r.codigoMaquina, etiquetaArea(r.area)].filter(Boolean).join(' · ')}
                  </div>
                </td>
                <td className="py-2.5 px-3 whitespace-nowrap font-mono font-semibold">
                  {r.tipoProducto ? (
                    <span className={r.tipoProducto === 'pt' ? 'text-sky-700' : 'text-amber-700'}>
                      {r.tipoProducto.toUpperCase()}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="py-2.5 px-3 whitespace-nowrap font-mono">
                  {r.op ? (
                    <button
                      type="button"
                      onClick={() => onFiltrarOp(r.op)}
                      title="Agregar OP al filtro"
                      className="font-semibold text-slate-900 hover:text-amber-700 hover:underline cursor-pointer"
                    >
                      {r.op}
                    </button>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="py-2.5 px-3 whitespace-nowrap font-mono text-slate-600">
                  {r.sap || '—'}
                </td>
                <td className="py-2.5 px-3 text-slate-800 max-w-[260px]">
                  <div className="line-clamp-2">{r.producto || '—'}</div>
                </td>
                <td className="py-2.5 px-3 text-slate-600 max-w-[160px] truncate">
                  {r.cliente || '—'}
                </td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                  {r.total.toLocaleString('es-PE')}
                </td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                  <span className={r.merma > 0 ? 'text-red-600 font-semibold' : 'text-slate-400'}>
                    {r.merma.toLocaleString('es-PE')}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-slate-600 max-w-[220px]">
                  <div className="line-clamp-2">
                    {r.motivoParada ? `Parada: ${r.motivoParada}` : r.observaciones || '—'}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-amber-50/80 border-t border-slate-300 font-semibold text-slate-900">
              <td colSpan={8} className="py-2.5 px-3 text-xs">
                Totales de la consulta ({registros.length.toLocaleString('es-PE')} registros)
              </td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                {totalProducido.toLocaleString('es-PE')}
              </td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-red-600">
                {totalMerma.toLocaleString('es-PE')}
              </td>
              <td className="py-2.5 px-3" />
            </tr>
          </tfoot>
        </table>
      </div>

      {totalPaginas > 1 && (
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
          <span className="font-mono tabular-nums">
            Mostrando {(paginaActual - 1) * POR_PAGINA + 1}–
            {Math.min(paginaActual * POR_PAGINA, ordenados.length)} de {ordenados.length}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={paginaActual <= 1}
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 border border-slate-300 bg-white rounded-md hover:bg-slate-100 disabled:opacity-40 cursor-pointer inline-flex items-center gap-1"
            >
              <ChevronLeft size={14} />
              <span>Anterior</span>
            </button>
            <span className="px-2 font-mono tabular-nums">
              {paginaActual} / {totalPaginas}
            </span>
            <button
              type="button"
              disabled={paginaActual >= totalPaginas}
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              className="px-2.5 py-1 border border-slate-300 bg-white rounded-md hover:bg-slate-100 disabled:opacity-40 cursor-pointer inline-flex items-center gap-1"
            >
              <span>Siguiente</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
