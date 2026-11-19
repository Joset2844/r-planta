import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Check,
  Filter,
  Plus,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import { CatalogoItem, FiltrosConsulta, Maquina } from '../types';
import { etiquetaArea, normalizarTexto, toLocalIsoDate } from '../services/catalogHelpers';

interface SidebarFiltrosProps {
  filtros: FiltrosConsulta;
  onChange: (next: FiltrosConsulta) => void;
  onReset: () => void;
  maquinasDisponibles: Array<{
    nombre: string;
    codigo: string;
    area: Maquina['area'];
    tipoProducto: Maquina['tipoProducto'];
  }>;
  opsEnTurnos: string[];
  catalogo: CatalogoItem[];
  onBuscarRangoServidor: (desde: string, hasta: string) => void;
  cargandoTurnos: boolean;
}

export const SidebarFiltros: React.FC<SidebarFiltrosProps> = ({
  filtros,
  onChange,
  onReset,
  maquinasDisponibles,
  opsEnTurnos,
  catalogo,
  onBuscarRangoServidor,
  cargandoTurnos,
}) => {
  const [opInput, setOpInput] = useState('');
  const [showOpDropdown, setShowOpDropdown] = useState(false);
  const [busquedaMaquina, setBusquedaMaquina] = useState('');

  // Autocomplete OPs combining loaded shifts + catalog
  const sugerenciasOp = useMemo(() => {
    const q = opInput.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    const vistas = new Set<string>();
    const lista: Array<{ op: string; desc: string; enTurnos: boolean }> = [];

    opsEnTurnos.forEach((op) => {
      const k = op.toLowerCase();
      if (vistas.has(k)) return;
      vistas.add(k);
      const cat = catalogo.find((c) => c.op.toLowerCase() === k);
      lista.push({
        op,
        desc: cat?.descripcion || '',
        enTurnos: true,
      });
    });

    catalogo.forEach((c) => {
      const k = c.op.toLowerCase();
      if (vistas.has(k)) return;
      vistas.add(k);
      lista.push({
        op: c.op,
        desc: c.descripcion || '',
        enTurnos: false,
      });
    });

    return lista
      .filter((item) => {
        if (filtros.opsSeleccionadas.some((s) => s.toLowerCase() === item.op.toLowerCase())) {
          return false;
        }
        if (!q) return item.enTurnos;
        const itemDigits = item.op.replace(/\D/g, '');
        return (
          item.op.toLowerCase().includes(q) ||
          (digits && itemDigits.includes(digits)) ||
          normalizarTexto(item.desc).includes(normalizarTexto(q))
        );
      })
      .slice(0, 12);
  }, [opInput, opsEnTurnos, catalogo, filtros.opsSeleccionadas]);

  // Filtered machine list for sidebar checklist
  const maquinasFiltradasLista = useMemo(() => {
    const q = normalizarTexto(busquedaMaquina);
    return maquinasDisponibles.filter((m) => {
      if (filtros.areaFiltro && m.area !== filtros.areaFiltro) return false;
      if (filtros.tipoProductoFiltro && m.tipoProducto !== filtros.tipoProductoFiltro) return false;
      if (!q) return true;
      return normalizarTexto(`${m.nombre} ${m.codigo} ${etiquetaArea(m.area)}`).includes(q);
    });
  }, [maquinasDisponibles, filtros.areaFiltro, filtros.tipoProductoFiltro, busquedaMaquina]);

  const aplicarPresetFecha = (preset: 'hoy' | '7d' | '30d' | 'mes' | 'todo') => {
    const hoy = new Date();
    const hoyStr = toLocalIsoDate(hoy);
    let d = '';
    let h = '';
    if (preset === 'hoy') {
      d = hoyStr;
      h = hoyStr;
    } else if (preset === '7d') {
      const p = new Date(hoy);
      p.setDate(hoy.getDate() - 6);
      d = toLocalIsoDate(p);
      h = hoyStr;
    } else if (preset === '30d') {
      const p = new Date(hoy);
      p.setDate(hoy.getDate() - 29);
      d = toLocalIsoDate(p);
      h = hoyStr;
    } else if (preset === 'mes') {
      d = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`;
      h = hoyStr;
    }
    onChange({ ...filtros, fechaDesde: d, fechaHasta: h });
    onBuscarRangoServidor(d, h);
  };

  const agregarOp = (op: string) => {
    const clean = op.trim();
    if (!clean) return;
    if (filtros.opsSeleccionadas.some((o) => o.toLowerCase() === clean.toLowerCase())) {
      setOpInput('');
      setShowOpDropdown(false);
      return;
    }
    onChange({
      ...filtros,
      opsSeleccionadas: [...filtros.opsSeleccionadas, clean],
    });
    setOpInput('');
    setShowOpDropdown(false);
  };

  const quitarOp = (op: string) => {
    onChange({
      ...filtros,
      opsSeleccionadas: filtros.opsSeleccionadas.filter((o) => o !== op),
    });
  };

  const toggleMaquina = (nombreLower: string) => {
    const existe = filtros.maquinasSeleccionadas.includes(nombreLower);
    const next = existe
      ? filtros.maquinasSeleccionadas.filter((m) => m !== nombreLower)
      : [...filtros.maquinasSeleccionadas, nombreLower];
    onChange({ ...filtros, maquinasSeleccionadas: next });
  };

  const seleccionarTodasVisibles = () => {
    const set = new Set(filtros.maquinasSeleccionadas);
    maquinasFiltradasLista.forEach((m) => set.add(m.nombre.toLowerCase()));
    onChange({ ...filtros, maquinasSeleccionadas: Array.from(set) });
  };

  const limpiarMaquinas = () => {
    onChange({ ...filtros, maquinasSeleccionadas: [] });
  };

  const activeFiltersCount =
    (filtros.fechaDesde ? 1 : 0) +
    (filtros.fechaHasta ? 1 : 0) +
    (filtros.tipoTurno ? 1 : 0) +
    filtros.opsSeleccionadas.length +
    filtros.maquinasSeleccionadas.length +
    (filtros.areaFiltro ? 1 : 0) +
    (filtros.tipoProductoFiltro ? 1 : 0) +
    (filtros.busquedaTexto.trim() ? 1 : 0);

  return (
    <aside className="w-full lg:w-[310px] shrink-0 bg-white border border-slate-200 rounded-xl p-4 space-y-5 self-start">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-amber-600" />
          <h2 className="text-sm font-semibold text-slate-900">Filtros de Consulta</h2>
        </div>
        {activeFiltersCount > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900 cursor-pointer"
          >
            <RotateCcw size={12} />
            <span>Limpiar</span>
          </button>
        )}
      </div>

      {/* 1. Rango de Fechas */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <Calendar size={13} className="text-slate-400" />
            <span>Rango de fechas</span>
          </label>
          <button
            type="button"
            disabled={cargandoTurnos}
            onClick={() => onBuscarRangoServidor(filtros.fechaDesde, filtros.fechaHasta)}
            className="text-[11px] font-medium text-amber-700 hover:text-amber-800 cursor-pointer disabled:opacity-50"
          >
            {cargandoTurnos ? 'Cargando...' : 'Consultar rango'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="block text-[11px] text-slate-500 mb-1">Desde</span>
            <input
              type="date"
              value={filtros.fechaDesde}
              onChange={(e) => onChange({ ...filtros, fechaDesde: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-amber-600"
            />
          </div>
          <div>
            <span className="block text-[11px] text-slate-500 mb-1">Hasta</span>
            <input
              type="date"
              value={filtros.fechaHasta}
              onChange={(e) => onChange({ ...filtros, fechaHasta: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-amber-600"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {[
            { id: 'hoy', label: 'Hoy' },
            { id: '7d', label: '7 días' },
            { id: '30d', label: '30 días' },
            { id: 'mes', label: 'Mes actual' },
            { id: 'todo', label: 'Todo' },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => aplicarPresetFecha(p.id as any)}
              className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors cursor-pointer whitespace-nowrap"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Turno */}
      <div className="space-y-2 pt-3 border-t border-slate-200">
        <span className="block text-xs font-semibold text-slate-700">Turno</span>
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
          {[
            { id: '', label: 'Todos' },
            { id: 'dia', label: 'Día' },
            { id: 'noche', label: 'Noche' },
          ].map((t) => {
            const active = filtros.tipoTurno === t.id;
            return (
              <button
                key={t.id || 'all'}
                type="button"
                onClick={() => onChange({ ...filtros, tipoTurno: t.id as any })}
                className={`py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Orden de Producción (OP) */}
      <div className="space-y-2 pt-3 border-t border-slate-200 relative">
        <label className="block text-xs font-semibold text-slate-700">
          Orden de Producción (OP)
        </label>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (opInput.trim()) agregarOp(opInput);
          }}
          className="flex gap-1.5"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={opInput}
              onFocus={() => setShowOpDropdown(true)}
              onBlur={() => setTimeout(() => setShowOpDropdown(false), 180)}
              onChange={(e) => {
                setOpInput(e.target.value);
                setShowOpDropdown(true);
              }}
              placeholder="Buscar o escribir OP..."
              className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-600"
            />
          </div>
          <button
            type="submit"
            title="Agregar OP al filtro"
            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg cursor-pointer shrink-0 flex items-center justify-center"
          >
            <Plus size={14} />
          </button>
        </form>

        {showOpDropdown && sugerenciasOp.length > 0 && (
          <div className="absolute left-0 right-0 z-30 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto divide-y divide-slate-100">
            {sugerenciasOp.map((item) => (
              <button
                key={item.op}
                type="button"
                onMouseDown={() => agregarOp(item.op)}
                className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between gap-2 cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="text-xs font-mono font-semibold text-slate-900">{item.op}</div>
                  {item.desc && (
                    <div className="text-[11px] text-slate-500 truncate">{item.desc}</div>
                  )}
                </div>
                {item.enTurnos && (
                  <span className="text-[10px] font-medium text-amber-700 shrink-0">
                    Con registro
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {filtros.opsSeleccionadas.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {filtros.opsSeleccionadas.map((op) => (
              <button
                key={op}
                type="button"
                onClick={() => quitarOp(op)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-mono font-medium rounded-md cursor-pointer"
              >
                <span>{op}</span>
                <X size={12} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 4. Área y Tipo Producto */}
      <div className="space-y-3 pt-3 border-t border-slate-200">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Área</label>
            <select
              value={filtros.areaFiltro}
              onChange={(e) => onChange({ ...filtros, areaFiltro: e.target.value as any })}
              className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-amber-600"
            >
              <option value="">Todas</option>
              <option value="vasos_envases">Vasos y Envases</option>
              <option value="papel_carton">Papel y Cartón</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tipo</label>
            <select
              value={filtros.tipoProductoFiltro}
              onChange={(e) => onChange({ ...filtros, tipoProductoFiltro: e.target.value as any })}
              className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-amber-600"
            >
              <option value="">Todos (PT/PP)</option>
              <option value="pt">Solo PT</option>
              <option value="pp">Solo PP</option>
            </select>
          </div>
        </div>
      </div>

      {/* 5. Máquinas Específicas (Multi-select) */}
      <div className="space-y-2 pt-3 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700">
            Máquinas específicas ({filtros.maquinasSeleccionadas.length || 'Todas'})
          </span>
          <div className="flex items-center gap-2 text-[11px]">
            <button
              type="button"
              onClick={seleccionarTodasVisibles}
              className="text-amber-700 hover:text-amber-800 font-medium cursor-pointer"
            >
              Todas
            </button>
            <span className="text-slate-300">/</span>
            <button
              type="button"
              onClick={limpiarMaquinas}
              className="text-slate-500 hover:text-slate-900 font-medium cursor-pointer"
            >
              Ninguna
            </button>
          </div>
        </div>

        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={busquedaMaquina}
            onChange={(e) => setBusquedaMaquina(e.target.value)}
            placeholder="Filtrar lista de máquinas..."
            className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-600"
          />
        </div>

        <div className="max-h-52 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
          {maquinasFiltradasLista.length === 0 ? (
            <div className="p-3 text-xs text-slate-400 text-center">
              Sin máquinas coincidentes
            </div>
          ) : (
            maquinasFiltradasLista.map((m) => {
              const key = m.nombre.toLowerCase();
              const checked = filtros.maquinasSeleccionadas.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleMaquina(key)}
                  className={`w-full px-2.5 py-2 text-left flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer ${
                    checked ? 'bg-amber-50/80 text-slate-900' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                        checked
                          ? 'bg-amber-600 border-amber-600 text-white'
                          : 'bg-white border-slate-300'
                      }`}
                    >
                      {checked && <Check size={11} strokeWidth={3} />}
                    </span>
                    <span className="truncate font-medium">{m.nombre}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                    {[m.codigo, m.tipoProducto ? m.tipoProducto.toUpperCase() : '']
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 6. Búsqueda libre y toggle */}
      <div className="space-y-3 pt-3 border-t border-slate-200">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Buscar producto, SAP, cliente u obs.
          </label>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={filtros.busquedaTexto}
              onChange={(e) => onChange({ ...filtros, busquedaTexto: e.target.value })}
              placeholder="Texto libre..."
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-600"
            />
            {filtros.busquedaTexto && (
              <button
                type="button"
                onClick={() => onChange({ ...filtros, busquedaTexto: '' })}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filtros.soloConProduccion}
            onChange={(e) => onChange({ ...filtros, soloConProduccion: e.target.checked })}
            className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
          />
          <span>Ocultar filas en cero (0 u)</span>
        </label>
      </div>
    </aside>
  );
};
