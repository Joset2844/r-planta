export interface CatalogoModelo {
  modelo?: string;
  descripcion: string;
  sap?: string;
  cantidadTotal?: number;
}

export interface CatalogoItem {
  op: string;
  descripcion: string;
  cliente: string;
  cantidadTotal?: number;
  sap?: string;
  descripcionBase?: string;
  modelos: CatalogoModelo[];
}

export interface Maquina {
  id: string;
  nombre: string;
  area: 'vasos_envases' | 'papel_carton' | '';
  codigo: string;
  tipoProducto: 'pp' | 'pt' | '';
  meta?: number;
  undPorMin?: number;
}

export interface RegistroTurno {
  id: string;
  op: string;
  descripcion: string;
  sap?: string;
  pliego?: number | string;
  cantidad: number;
  merma: number;
  observacion?: string;
  fecha: string;
}

export interface TurnoMaquina {
  maquinaId: string;
  instancia?: number;
  op: string;
  objetivo?: number | null;
  motivoParada: string;
  observaciones: string;
  personal?: string;
  modeloIdx: number;
  pliego?: number | string;
  registros: RegistroTurno[];
}

export interface FilaTurnoExcel {
  maquina: string;
  codigoMaquina: string;
  tipoProducto: string;
  area: string;
  op: string;
  sap: string;
  producto: string;
  total: number;
  merma: number;
  observaciones: string;
}

export interface TurnoDBRow {
  fecha: string;
  tipo: 'dia' | 'noche' | string;
  filas: FilaTurnoExcel[];
  turno?: TurnoMaquina[];
  created_by?: string;
  created_by_email?: string;
  updated_at?: string;
  creado_en?: string;
}

export interface RegistroFiltrado {
  uid: string;
  fecha: string;
  turnoTipo: 'dia' | 'noche' | string;
  autorEmail: string;
  updatedAt?: string;
  maquina: string;
  codigoMaquina: string;
  area: 'vasos_envases' | 'papel_carton' | '';
  tipoProducto: 'pp' | 'pt' | '';
  op: string;
  sap: string;
  producto: string;
  cliente: string;
  total: number;
  merma: number;
  metaMaquina: number;
  metaOp: number;
  observaciones: string;
  motivoParada: string;
  personal: string;
}

export interface FiltrosConsulta {
  fechaDesde: string;
  fechaHasta: string;
  tipoTurno: '' | 'dia' | 'noche';
  opsSeleccionadas: string[];
  maquinasSeleccionadas: string[]; // normalized lowercase machine names
  areaFiltro: '' | 'vasos_envases' | 'papel_carton';
  tipoProductoFiltro: '' | 'pt' | 'pp';
  busquedaTexto: string;
  soloConProduccion: boolean;
}

export interface ResumenMaquina {
  key: string;
  maquina: string;
  codigoMaquina: string;
  area: 'vasos_envases' | 'papel_carton' | '';
  tipoProducto: 'pp' | 'pt' | '';
  metaTurno: number;
  turnosCount: number;
  diasCount: number;
  totalProducido: number;
  totalMerma: number;
  promedioPorTurno: number;
  opsUnicas: string[];
  detalleOps: Array<{
    op: string;
    producto: string;
    total: number;
    merma: number;
    turnos: number;
  }>;
}

export interface ResumenOp {
  key: string;
  op: string;
  cliente: string;
  descripcion: string;
  metaOrden: number;
  ptTotal: number;
  ppTotal: number;
  sinTipoTotal: number;
  mermaTotal: number;
  pctAvancePT: number;
  pendientePT: number;
  turnosCount: number;
  maquinas: string[];
  modelosDetalle: Array<{
    producto: string;
    sap: string;
    pt: number;
    pp: number;
    merma: number;
  }>;
}

export interface SupabaseConfig {
  url: string;
  key: string;
}

export interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  user_id: string;
  email: string;
  usuario: string;
}

export type VistaReporte = 'detalle' | 'maquinas' | 'ops' | 'turnos';
