import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  LogOut,
  Printer,
  RefreshCw,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  CatalogoItem,
  FiltrosConsulta,
  Maquina,
  SupabaseSession,
  TurnoDBRow,
  VistaReporte,
} from './types';
import {
  fetchCatalogoCompleto,
  fetchMaquinasSheets,
  fetchTurnosRango,
  getStoredSession,
  getSupabaseConfig,
  saveSession,
} from './services/supabase';
import { toLocalIsoDate } from './services/catalogHelpers';
import {
  calcularResumenMaquinas,
  calcularResumenOps,
  construirRegistrosPlanos,
  filtrarRegistros,
} from './services/dataEngine';
import { describirFiltros, exportarMigracionPtExcel, exportarReporteExcel } from './services/exportExcel';
import { exportarReportePdf } from './services/exportPdf';
import { LoginView } from './components/LoginView';
import { SidebarFiltros } from './components/SidebarFiltros';
import { KpiStrip } from './components/KpiStrip';
import { DetalleTableView } from './components/views/DetalleTableView';
import { ResumenMaquinasView } from './components/views/ResumenMaquinasView';
import { ResumenOpsView } from './components/views/ResumenOpsView';
import { TurnosAgrupadosView } from './components/views/TurnosAgrupadosView';
import { PrintableReport } from './components/PrintableReport';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';

function crearFiltrosIniciales(): FiltrosConsulta {
  const hoy = new Date();
  const hace30 = new Date(hoy);
  hace30.setDate(hoy.getDate() - 29);
  return {
    fechaDesde: toLocalIsoDate(hace30),
    fechaHasta: toLocalIsoDate(hoy),
    tipoTurno: '',
    opsSeleccionadas: [],
    maquinasSeleccionadas: [],
    areaFiltro: '',
    tipoProductoFiltro: '',
    busquedaTexto: '',
    soloConProduccion: true,
  };
}

export default function App() {
  const [session, setSession] = useState<SupabaseSession | null>(() => getStoredSession());
  const [catalogo, setCatalogo] = useState<CatalogoItem[]>([]);
  const [maquinasSheets, setMaquinasSheets] = useState<Maquina[]>([]);
  const [turnosDB, setTurnosDB] = useState<TurnoDBRow[]>([]);
  const [cargandoTurnos, setCargandoTurnos] = useState(false);
  const [vista, setVista] = useState<VistaReporte>('detalle');
  const [filtros, setFiltros] = useState<FiltrosConsulta>(crearFiltrosIniciales);
  const [filtrosMobileOpen, setFiltrosMobileOpen] = useState(false);
  const [exportandoExcel, setExportandoExcel] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const mostrarAviso = useCallback((tipo: 'ok' | 'error', texto: string) => {
    setAviso({ tipo, texto });
    setTimeout(() => {
      setAviso((prev) => (prev?.texto === texto ? null : prev));
    }, 3500);
  }, []);

  // Load catalog & sheets machines once
  useEffect(() => {
    const cfg = getSupabaseConfig();
    fetchMaquinasSheets().then((list) => {
      if (list.length > 0) setMaquinasSheets(list);
    });
    fetchCatalogoCompleto(cfg, session, (renewed) => setSession(renewed))
      .then((cat) => {
        if (cat.length > 0) setCatalogo(cat);
      })
      .catch(() => {});
  }, [session?.user_id]);

  const abortRef = React.useRef<AbortController | null>(null);
  const sessionRef = React.useRef(session);
  sessionRef.current = session;

  // Fetch shifts from Supabase for a given date range
  const cargarTurnosServidor = useCallback(
    async (desde: string, hasta: string) => {
      const sesionActual = sessionRef.current;
      if (!sesionActual) return;
      if (desde && hasta && desde > hasta) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const cfg = getSupabaseConfig();
      setCargandoTurnos(true);
      try {
        const rows = await fetchTurnosRango({
          cfg,
          session: sesionActual,
          fechaDesde: desde || undefined,
          fechaHasta: hasta || undefined,
          onSessionRenewed: (renewed) => setSession(renewed),
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setTurnosDB(rows);
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        const msg = err?.message || 'No se pudieron consultar los turnos.';
        if (msg.toLowerCase().includes('sesión vencida')) {
          setSession(null);
        }
        mostrarAviso('error', msg);
      } finally {
        if (abortRef.current === controller) {
          setCargandoTurnos(false);
        }
      }
    },
    [mostrarAviso]
  );

  // Automatically fetch from Supabase whenever session or date range changes
  useEffect(() => {
    if (!session?.user_id) return;
    if (filtros.fechaDesde && filtros.fechaHasta && filtros.fechaDesde > filtros.fechaHasta) {
      return;
    }
    const timer = setTimeout(() => {
      cargarTurnosServidor(filtros.fechaDesde, filtros.fechaHasta);
    }, 250);
    return () => clearTimeout(timer);
  }, [session?.user_id, filtros.fechaDesde, filtros.fechaHasta, cargarTurnosServidor]);

  const handleLogout = () => {
    saveSession(null);
    setSession(null);
    setTurnosDB([]);
  };

  // Build unified flat rows
  const registrosPlanos = useMemo(
    () => construirRegistrosPlanos(turnosDB, maquinasSheets, catalogo),
    [turnosDB, maquinasSheets, catalogo]
  );

  // Build available machines list (combining Sheets master + any machine appearing in loaded shifts)
  const maquinasDisponibles = useMemo(() => {
    const map = new Map<
      string,
      {
        nombre: string;
        codigo: string;
        area: Maquina['area'];
        tipoProducto: Maquina['tipoProducto'];
      }
    >();

    maquinasSheets.forEach((m) => {
      const k = m.nombre.trim().toLowerCase();
      if (!map.has(k)) {
        map.set(k, {
          nombre: m.nombre,
          codigo: m.codigo || '',
          area: m.area || '',
          tipoProducto: m.tipoProducto || '',
        });
      }
    });

    registrosPlanos.forEach((r) => {
      const k = r.maquina.trim().toLowerCase();
      if (!map.has(k)) {
        map.set(k, {
          nombre: r.maquina,
          codigo: r.codigoMaquina || '',
          area: r.area || '',
          tipoProducto: r.tipoProducto || '',
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [maquinasSheets, registrosPlanos]);

  // Unique OPs present in loaded shifts
  const opsEnTurnos = useMemo(() => {
    const set = new Set<string>();
    registrosPlanos.forEach((r) => {
      if (r.op) set.add(r.op);
    });
    return Array.from(set).sort();
  }, [registrosPlanos]);

  // Apply all active filters
  const registrosFiltrados = useMemo(
    () => filtrarRegistros(registrosPlanos, filtros),
    [registrosPlanos, filtros]
  );

  const resumenMaquinas = useMemo(
    () => calcularResumenMaquinas(registrosFiltrados),
    [registrosFiltrados]
  );

  const resumenOps = useMemo(
    () => calcularResumenOps(registrosFiltrados, catalogo),
    [registrosFiltrados, catalogo]
  );

  const handleResetFiltros = () => {
    const next = crearFiltrosIniciales();
    setFiltros(next);
    cargarTurnosServidor(next.fechaDesde, next.fechaHasta);
  };

  const handleFiltrarOpRapido = (op: string) => {
    if (!op || op === 'Sin OP') return;
    setFiltros((prev) => {
      const exists = prev.opsSeleccionadas.some((o) => o.toLowerCase() === op.toLowerCase());
      if (exists) return prev;
      return { ...prev, opsSeleccionadas: [...prev.opsSeleccionadas, op] };
    });
  };

  const handleFiltrarMaquinaRapido = (maquinaNombre: string) => {
    const key = maquinaNombre.trim().toLowerCase();
    setFiltros((prev) => ({
      ...prev,
      maquinasSeleccionadas: [key],
    }));
  };

  const handleExportarExcel = async () => {
    if (registrosFiltrados.length === 0) {
      mostrarAviso('error', 'No hay registros filtrados para exportar.');
      return;
    }
    setExportandoExcel(true);
    try {
      await exportarReporteExcel({
        registros: registrosFiltrados,
        resumenMaquinas,
        resumenOps,
        filtros,
      });
      mostrarAviso('ok', 'Archivo Excel (.xlsx) generado correctamente.');
    } catch (err: any) {
      mostrarAviso('error', err?.message || 'Error al exportar Excel.');
    } finally {
      setExportandoExcel(false);
    }
  };

  const handleExportarPdf = () => {
    if (registrosFiltrados.length === 0) {
      mostrarAviso('error', 'No hay registros filtrados para exportar a PDF.');
      return;
    }
    try {
      const nombre = exportarReportePdf({
        vista,
        registros: registrosFiltrados,
        resumenMaquinas,
        resumenOps,
        filtros,
      });
      mostrarAviso('ok', `PDF descargado: ${nombre}`);
    } catch (err: any) {
      mostrarAviso('error', err?.message || 'Error al generar PDF.');
    }
  };

  const handleExportarMigracion = () => {
    try {
      exportarMigracionPtExcel(registrosFiltrados, filtros);
      mostrarAviso('ok', 'Excel de Migración PT descargado.');
    } catch (err: any) {
      mostrarAviso('error', err?.message || 'No hay datos PT para migrar.');
    }
  };

  if (!session) {
    return (
      <>
        <LoginView
          onLoginSuccess={(s) => setSession(s)}
          catalogoCount={catalogo.length}
          maquinasCount={maquinasSheets.length}
        />
        <OfflineIndicator />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Title */}
          <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 font-display">
            Consulta de Producción
          </span>

          {/* Zone 2: Single-line View Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {[
              { id: 'detalle', label: 'Detalle' },
              { id: 'maquinas', label: 'Por Máquina' },
              { id: 'ops', label: 'Por OP' },
              { id: 'turnos', label: 'Por Turno' },
            ].map((item) => {
              const active = vista === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setVista(item.id as VistaReporte)}
                  className={`py-5 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'border-amber-600 text-slate-900 font-semibold'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary CTA */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              disabled={exportandoExcel || registrosFiltrados.length === 0}
              onClick={handleExportarExcel}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-45 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileSpreadsheet size={15} />
              <span>{exportandoExcel ? 'Generando...' : 'Exportar Excel'}</span>
            </button>
          </div>
        </div>

        {/* Mobile view selector row */}
        <div className="md:hidden border-t border-slate-100 px-4 py-2 flex items-center gap-2 overflow-x-auto">
          {[
            { id: 'detalle', label: 'Detalle' },
            { id: 'maquinas', label: 'Por Máquina' },
            { id: 'ops', label: 'Por OP' },
            { id: 'turnos', label: 'Por Turno' },
          ].map((item) => {
            const active = vista === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setVista(item.id as VistaReporte)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 cursor-pointer ${
                  active ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Workspace */}
      <div className="no-print flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6 flex flex-col lg:flex-row gap-6">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <SidebarFiltros
            filtros={filtros}
            onChange={setFiltros}
            onReset={handleResetFiltros}
            maquinasDisponibles={maquinasDisponibles}
            opsEnTurnos={opsEnTurnos}
            catalogo={catalogo}
            onBuscarRangoServidor={cargarTurnosServidor}
            cargandoTurnos={cargandoTurnos}
          />
        </div>

        {/* Mobile Sidebar Drawer */}
        {filtrosMobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden bg-slate-900/40 backdrop-blur-xs flex">
            <div className="w-full max-w-xs bg-slate-50 h-full overflow-y-auto p-3">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-sm font-bold text-slate-900">Filtros</span>
                <button
                  type="button"
                  onClick={() => setFiltrosMobileOpen(false)}
                  className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600"
                >
                  <X size={16} />
                </button>
              </div>
              <SidebarFiltros
                filtros={filtros}
                onChange={setFiltros}
                onReset={handleResetFiltros}
                maquinasDisponibles={maquinasDisponibles}
                opsEnTurnos={opsEnTurnos}
                catalogo={catalogo}
                onBuscarRangoServidor={(d, h) => {
                  cargarTurnosServidor(d, h);
                  setFiltrosMobileOpen(false);
                }}
                cargandoTurnos={cargandoTurnos}
              />
            </div>
            <div className="flex-1" onClick={() => setFiltrosMobileOpen(false)} />
          </div>
        )}

        {/* Main Content Viewport */}
        <main className="flex-1 min-w-0 space-y-5">
          {/* Workspace Toolbar */}
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setFiltrosMobileOpen(true)}
                className="lg:hidden inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-800 rounded-lg cursor-pointer shrink-0"
              >
                <SlidersHorizontal size={14} />
                <span>Filtros</span>
              </button>
              <div className="min-w-0">
                <div className="text-xs text-slate-500 truncate">{describirFiltros(filtros)}</div>
                <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                  <span>Sesión: {session.usuario}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    {turnosDB.length} turno(s) descargados
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                disabled={cargandoTurnos}
                onClick={() => cargarTurnosServidor(filtros.fechaDesde, filtros.fechaHasta)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={13} className={cargandoTurnos ? 'animate-spin' : ''} />
                <span>Actualizar</span>
              </button>

              <button
                type="button"
                disabled={registrosFiltrados.length === 0}
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40"
              >
                <Printer size={13} />
                <span>Imprimir</span>
              </button>

              <button
                type="button"
                disabled={registrosFiltrados.length === 0}
                onClick={handleExportarPdf}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40"
              >
                <FileText size={13} />
                <span>PDF</span>
              </button>

              <button
                type="button"
                disabled={registrosFiltrados.length === 0}
                onClick={handleExportarMigracion}
                title="Exportar formato Migración PT (ODTCOD, CODPTSAP, CODMAQ, ODTCANT)"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40"
              >
                <Download size={13} />
                <span>Migración PT</span>
              </button>

              <PWAInstallButton />

              <button
                type="button"
                onClick={handleLogout}
                title="Cerrar sesión"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-red-600 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogOut size={13} />
                <span>Salir</span>
              </button>
            </div>
          </div>

          {/* Feedback banner */}
          {aviso && (
            <div
              className={`px-4 py-2.5 rounded-lg border text-xs flex items-center justify-between ${
                aviso.tipo === 'error'
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
            >
              <span>{aviso.texto}</span>
              <button
                type="button"
                onClick={() => setAviso(null)}
                className="p-0.5 hover:opacity-70 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* KPI Strip */}
          <KpiStrip registros={registrosFiltrados} />

          {/* Active View */}
          {vista === 'detalle' && (
            <DetalleTableView
              registros={registrosFiltrados}
              cargando={cargandoTurnos}
              onFiltrarOp={handleFiltrarOpRapido}
              onFiltrarMaquina={handleFiltrarMaquinaRapido}
            />
          )}
          {vista === 'maquinas' && (
            <ResumenMaquinasView
              resumen={resumenMaquinas}
              cargando={cargandoTurnos}
              onFiltrarMaquina={handleFiltrarMaquinaRapido}
              onFiltrarOp={handleFiltrarOpRapido}
            />
          )}
          {vista === 'ops' && (
            <ResumenOpsView
              resumen={resumenOps}
              cargando={cargandoTurnos}
              onFiltrarOp={handleFiltrarOpRapido}
            />
          )}
          {vista === 'turnos' && (
            <TurnosAgrupadosView registros={registrosFiltrados} cargando={cargandoTurnos} />
          )}
        </main>
      </div>

      {/* Print-Only Formal Report */}
      <PrintableReport
        vista={vista}
        registros={registrosFiltrados}
        resumenMaquinas={resumenMaquinas}
        resumenOps={resumenOps}
        filtros={filtros}
      />

      <OfflineIndicator />
    </div>
  );
}
