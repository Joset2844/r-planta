import {
  CatalogoItem,
  FiltrosConsulta,
  Maquina,
  RegistroFiltrado,
  ResumenMaquina,
  ResumenOp,
  TurnoDBRow,
} from '../types';
import { buscarEnCatalogo, normalizarTexto, opCoincide } from './catalogHelpers';

export function construirRegistrosPlanos(
  turnosDB: TurnoDBRow[],
  maquinas: Maquina[],
  catalogo: CatalogoItem[]
): RegistroFiltrado[] {
  const maqByName = new Map<string, Maquina>();
  const maqByCode = new Map<string, Maquina>();
  maquinas.forEach((m) => {
    if (m.nombre) maqByName.set(m.nombre.trim().toLowerCase(), m);
    if (m.codigo) maqByCode.set(m.codigo.trim().toLowerCase(), m);
  });

  const registros: RegistroFiltrado[] = [];

  turnosDB.forEach((rec) => {
    const fecha = (rec.fecha || '').slice(0, 10);
    const turnoTipo = (rec.tipo || '').trim().toLowerCase();
    const autorEmail = rec.created_by_email || '';

    // Map optionalTurno metadata (motivoParada, personal) by machine name/code/op
    const turnoMetaByMaq = new Map<string, { motivoParada: string; personal: string }>();
    if (Array.isArray(rec.turno)) {
      rec.turno.forEach((tm) => {
        const mInfo = maquinas.find((x) => x.id === tm.maquinaId);
        const key = mInfo ? mInfo.nombre.trim().toLowerCase() : tm.maquinaId;
        if (key && !turnoMetaByMaq.has(key)) {
          turnoMetaByMaq.set(key, {
            motivoParada: tm.motivoParada || '',
            personal: tm.personal || '',
          });
        }
      });
    }

    (rec.filas || []).forEach((f, idx) => {
      const maqNombre = (f.maquina || 'Sin máquina').trim();
      const codMaq = (f.codigoMaquina || '').trim();
      const maqRef =
        maqByName.get(maqNombre.toLowerCase()) ||
        (codMaq ? maqByCode.get(codMaq.toLowerCase()) : undefined);

      const areaRaw = (f.area || maqRef?.area || '').trim().toLowerCase();
      const area: RegistroFiltrado['area'] =
        areaRaw === 'vasos_envases' || areaRaw === 'papel_carton' ? areaRaw : '';

      const tipoRaw = (f.tipoProducto || maqRef?.tipoProducto || '').trim().toLowerCase();
      const tipoProducto: RegistroFiltrado['tipoProducto'] =
        tipoRaw === 'pp' || tipoRaw === 'pt' ? tipoRaw : '';

      const op = (f.op || '').trim();
      const catMatch = op ? buscarEnCatalogo(catalogo, op) : null;

      const metaExtra = turnoMetaByMaq.get(maqNombre.toLowerCase());

      registros.push({
        uid: `${fecha}|${turnoTipo}|${idx}|${maqNombre}|${op}`,
        fecha,
        turnoTipo,
        autorEmail,
        updatedAt: rec.updated_at,
        maquina: maqNombre,
        codigoMaquina: codMaq || maqRef?.codigo || '',
        area,
        tipoProducto,
        op,
        sap: (f.sap || catMatch?.sap || '').trim(),
        producto: (f.producto || catMatch?.descripcion || '').trim(),
        cliente: (catMatch?.cliente || '').trim(),
        total: Number(f.total) || 0,
        merma: Number(f.merma) || 0,
        metaMaquina: Number(maqRef?.meta) || 0,
        metaOp: Number(catMatch?.cantidadTotal) || 0,
        observaciones: (f.observaciones || '').trim(),
        motivoParada: metaExtra?.motivoParada || '',
        personal: metaExtra?.personal || '',
      });
    });
  });

  return registros;
}

export function filtrarRegistros(
  registros: RegistroFiltrado[],
  filtros: FiltrosConsulta
): RegistroFiltrado[] {
  const {
    fechaDesde,
    fechaHasta,
    tipoTurno,
    opsSeleccionadas,
    maquinasSeleccionadas,
    areaFiltro,
    tipoProductoFiltro,
    busquedaTexto,
    soloConProduccion,
  } = filtros;

  const qNorm = normalizarTexto(busquedaTexto);
  const maqSet = new Set(maquinasSeleccionadas.map((m) => m.trim().toLowerCase()));

  return registros.filter((r) => {
    if (fechaDesde && r.fecha < fechaDesde) return false;
    if (fechaHasta && r.fecha > fechaHasta) return false;
    if (tipoTurno && r.turnoTipo !== tipoTurno) return false;
    if (areaFiltro && r.area !== areaFiltro) return false;
    if (tipoProductoFiltro && r.tipoProducto !== tipoProductoFiltro) return false;

    if (soloConProduccion && r.total <= 0 && r.merma <= 0) return false;

    if (opsSeleccionadas.length > 0) {
      const matchOp = opsSeleccionadas.some((opSel) => opCoincide(r.op, opSel));
      if (!matchOp) return false;
    }

    if (maqSet.size > 0) {
      if (!maqSet.has(r.maquina.trim().toLowerCase())) return false;
    }

    if (qNorm) {
      const haystack = normalizarTexto(
        `${r.op} ${r.sap} ${r.producto} ${r.cliente} ${r.maquina} ${r.codigoMaquina} ${r.observaciones} ${r.motivoParada} ${r.personal}`
      );
      if (!haystack.includes(qNorm)) return false;
    }

    return true;
  });
}

export function calcularResumenMaquinas(
  registros: RegistroFiltrado[]
): ResumenMaquina[] {
  const mapa = new Map<
    string,
    {
      maquina: string;
      codigoMaquina: string;
      area: ResumenMaquina['area'];
      tipoProducto: ResumenMaquina['tipoProducto'];
      metaTurno: number;
      turnosSet: Set<string>;
      diasSet: Set<string>;
      totalProducido: number;
      totalMerma: number;
      opsSet: Set<string>;
      opDetalleMap: Map<string, { op: string; producto: string; total: number; merma: number; turnos: Set<string> }>;
    }
  >();

  registros.forEach((r) => {
    const key = r.maquina.trim().toLowerCase();
    if (!mapa.has(key)) {
      mapa.set(key, {
        maquina: r.maquina,
        codigoMaquina: r.codigoMaquina,
        area: r.area,
        tipoProducto: r.tipoProducto,
        metaTurno: r.metaMaquina,
        turnosSet: new Set(),
        diasSet: new Set(),
        totalProducido: 0,
        totalMerma: 0,
        opsSet: new Set(),
        opDetalleMap: new Map(),
      });
    }
    const entry = mapa.get(key)!;
    if (!entry.codigoMaquina && r.codigoMaquina) entry.codigoMaquina = r.codigoMaquina;
    if (!entry.area && r.area) entry.area = r.area;
    if (!entry.tipoProducto && r.tipoProducto) entry.tipoProducto = r.tipoProducto;
    if (!entry.metaTurno && r.metaMaquina) entry.metaTurno = r.metaMaquina;

    const turnoKey = `${r.fecha}|${r.turnoTipo}`;
    entry.turnosSet.add(turnoKey);
    if (r.fecha) entry.diasSet.add(r.fecha);

    entry.totalProducido += r.total;
    entry.totalMerma += r.merma;

    if (r.op) {
      entry.opsSet.add(r.op);
      const opKey = `${r.op.toLowerCase()}||${r.producto.toLowerCase()}`;
      if (!entry.opDetalleMap.has(opKey)) {
        entry.opDetalleMap.set(opKey, {
          op: r.op,
          producto: r.producto,
          total: 0,
          merma: 0,
          turnos: new Set(),
        });
      }
      const od = entry.opDetalleMap.get(opKey)!;
      od.total += r.total;
      od.merma += r.merma;
      od.turnos.add(turnoKey);
    }
  });

  return Array.from(mapa.entries())
    .map(([key, v]) => {
      const turnosCount = v.turnosSet.size;
      return {
        key,
        maquina: v.maquina,
        codigoMaquina: v.codigoMaquina,
        area: v.area,
        tipoProducto: v.tipoProducto,
        metaTurno: v.metaTurno,
        turnosCount,
        diasCount: v.diasSet.size,
        totalProducido: v.totalProducido,
        totalMerma: v.totalMerma,
        promedioPorTurno: turnosCount > 0 ? Math.round(v.totalProducido / turnosCount) : 0,
        opsUnicas: Array.from(v.opsSet).sort(),
        detalleOps: Array.from(v.opDetalleMap.values())
          .map((d) => ({
            op: d.op,
            producto: d.producto,
            total: d.total,
            merma: d.merma,
            turnos: d.turnos.size,
          }))
          .sort((a, b) => b.total - a.total),
      };
    })
    .sort((a, b) => b.totalProducido - a.totalProducido);
}

export function calcularResumenOps(
  registros: RegistroFiltrado[],
  catalogo: CatalogoItem[]
): ResumenOp[] {
  const mapa = new Map<
    string,
    {
      op: string;
      cliente: string;
      descripcion: string;
      metaOrden: number;
      ptTotal: number;
      ppTotal: number;
      sinTipoTotal: number;
      mermaTotal: number;
      turnosSet: Set<string>;
      maquinasSet: Set<string>;
      modelosMap: Map<string, { producto: string; sap: string; pt: number; pp: number; merma: number }>;
    }
  >();

  registros.forEach((r) => {
    const opLabel = r.op || 'Sin OP';
    const key = opLabel.toLowerCase();
    if (!mapa.has(key)) {
      const cat = r.op ? buscarEnCatalogo(catalogo, r.op) : null;
      mapa.set(key, {
        op: opLabel,
        cliente: r.cliente || cat?.cliente || '',
        descripcion: cat?.descripcionBase || cat?.descripcion || r.producto || '',
        metaOrden: Number(cat?.cantidadTotal) || r.metaOp || 0,
        ptTotal: 0,
        ppTotal: 0,
        sinTipoTotal: 0,
        mermaTotal: 0,
        turnosSet: new Set(),
        maquinasSet: new Set(),
        modelosMap: new Map(),
      });
    }
    const entry = mapa.get(key)!;
    if (!entry.descripcion && r.producto) entry.descripcion = r.producto;
    if (!entry.cliente && r.cliente) entry.cliente = r.cliente;

    if (r.tipoProducto === 'pt') entry.ptTotal += r.total;
    else if (r.tipoProducto === 'pp') entry.ppTotal += r.total;
    else entry.sinTipoTotal += r.total;

    entry.mermaTotal += r.merma;
    entry.turnosSet.add(`${r.fecha}|${r.turnoTipo}`);
    entry.maquinasSet.add(r.maquina);

    const modKey = `${(r.sap || '').toLowerCase()}||${(r.producto || '').toLowerCase()}`;
    if (!entry.modelosMap.has(modKey)) {
      entry.modelosMap.set(modKey, {
        producto: r.producto || 'Producto sin descripción',
        sap: r.sap || '',
        pt: 0,
        pp: 0,
        merma: 0,
      });
    }
    const mod = entry.modelosMap.get(modKey)!;
    if (r.tipoProducto === 'pt') mod.pt += r.total;
    else if (r.tipoProducto === 'pp') mod.pp += r.total;
    mod.merma += r.merma;
  });

  return Array.from(mapa.entries())
    .map(([key, v]) => {
      const pctAvancePT = v.metaOrden > 0 ? (v.ptTotal / v.metaOrden) * 100 : 0;
      const pendientePT = v.metaOrden > 0 ? Math.max(0, v.metaOrden - v.ptTotal) : 0;
      return {
        key,
        op: v.op,
        cliente: v.cliente,
        descripcion: v.descripcion,
        metaOrden: v.metaOrden,
        ptTotal: v.ptTotal,
        ppTotal: v.ppTotal,
        sinTipoTotal: v.sinTipoTotal,
        mermaTotal: v.mermaTotal,
        pctAvancePT,
        pendientePT,
        turnosCount: v.turnosSet.size,
        maquinas: Array.from(v.maquinasSet).sort(),
        modelosDetalle: Array.from(v.modelosMap.values()).sort((a, b) => b.pt + b.pp - (a.pt + a.pp)),
      };
    })
    .sort((a, b) => b.ptTotal + b.ppTotal - (a.ptTotal + a.ppTotal));
}
