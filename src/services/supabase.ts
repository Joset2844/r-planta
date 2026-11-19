import {
  CatalogoItem,
  Maquina,
  SupabaseConfig,
  SupabaseSession,
  TurnoDBRow,
} from '../types';
import { normalizarCatalogoItem, parsearMaquinasCsv } from './catalogHelpers';

export const DEFAULT_SB_URL = 'https://skoksthbuyrhekfchmug.supabase.co';
export const DEFAULT_SB_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNrb2tzdGhidXlyaGVrZmNobXVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyMTEwNjUsImV4cCI6MjEwNTc4NzA2NX0.1vrW7PVIzPvi5a4kIIc-1EoPIYsZcOTeWVq0vXBr5f4';
export const SB_DOMINIO_USUARIO = 'planta.local';

export const SHEETS_MAQUINAS_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTVxCxG3XBMgSSedTqw7xWb7s7qxbYB3ZavS8MP9bx2lrwkzlK8oNQRSoFLw_sjjY68b1V0vNUaCb7B/pub?gid=770560989&single=true&output=csv';

const STORAGE_KEYS = {
  SB_SESION: 'cp2_sb_sesion',
};

export function getSupabaseConfig(): SupabaseConfig {
  return {
    url: DEFAULT_SB_URL,
    key: DEFAULT_SB_KEY,
  };
}

export function getStoredSession(): SupabaseSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SB_SESION);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (s && !s.usuario && s.email) {
      s.usuario = s.email.split('@')[0];
    }
    return s;
  } catch {
    return null;
  }
}

export function saveSession(s: SupabaseSession | null) {
  try {
    if (s) {
      localStorage.setItem(STORAGE_KEYS.SB_SESION, JSON.stringify(s));
    } else {
      localStorage.removeItem(STORAGE_KEYS.SB_SESION);
    }
  } catch {}
}

export function sbUsuarioAEmail(usuario: string, dominio = SB_DOMINIO_USUARIO): string {
  const u = usuario.trim().toLowerCase();
  if (u.includes('@')) return u;
  return u.replace(/\s+/g, '') + '@' + dominio;
}

async function intentarLoginConEmail(
  cfg: SupabaseConfig,
  email: string,
  pass: string
): Promise<SupabaseSession> {
  const resp = await fetch(`${cfg.url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: cfg.key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass }),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error_description || data.msg || data.message || `HTTP ${resp.status}`);
  }
  const session: SupabaseSession = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    user_id: data.user.id,
    email: data.user.email,
    usuario: data.user.email.split('@')[0],
  };
  saveSession(session);
  return session;
}

export async function sbLogin(
  cfg: SupabaseConfig,
  usuario: string,
  pass: string
): Promise<SupabaseSession> {
  const emailPrincipal = sbUsuarioAEmail(usuario, SB_DOMINIO_USUARIO);
  try {
    return await intentarLoginConEmail(cfg, emailPrincipal, pass);
  } catch (err) {
    if (!usuario.includes('@')) {
      const emailAlt = sbUsuarioAEmail(usuario, 'planta.com');
      try {
        return await intentarLoginConEmail(cfg, emailAlt, pass);
      } catch {
        throw err;
      }
    }
    throw err;
  }
}

let sbRenovandoPromesa: Promise<SupabaseSession | null> | null = null;

export async function sbRenovarSesion(
  cfg: SupabaseConfig,
  session: SupabaseSession
): Promise<SupabaseSession | null> {
  if (!session || !session.refresh_token) {
    throw new Error('Sesión sin refresh_token');
  }
  if (sbRenovandoPromesa) return sbRenovandoPromesa;

  sbRenovandoPromesa = (async () => {
    try {
      const resp = await fetch(`${cfg.url}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { apikey: cfg.key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: session.refresh_token }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error_description || data.msg || `HTTP ${resp.status}`);
      }
      const newSession: SupabaseSession = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        user_id: data.user.id,
        email: data.user.email,
        usuario: data.user.email.split('@')[0],
      };
      saveSession(newSession);
      return newSession;
    } finally {
      sbRenovandoPromesa = null;
    }
  })();

  return sbRenovandoPromesa;
}

export async function sbFetch<T = any>(
  cfg: SupabaseConfig,
  ruta: string,
  session?: SupabaseSession | null,
  onSessionRenewed?: (newSession: SupabaseSession) => void,
  reintentado = false
): Promise<T> {
  const headers: Record<string, string> = {
    apikey: cfg.key,
    Authorization: 'Bearer ' + (session ? session.access_token : cfg.key),
  };

  const resp = await fetch(`${cfg.url}/rest/v1/${ruta}`, {
    method: 'GET',
    headers,
    cache: 'no-store',
  });

  if (!resp.ok) {
    const text = await resp.text();
    if (resp.status === 401 && session && !reintentado) {
      try {
        const renewed = await sbRenovarSesion(cfg, session);
        if (renewed) {
          onSessionRenewed?.(renewed);
          return sbFetch<T>(cfg, ruta, renewed, onSessionRenewed, true);
        }
      } catch {
        saveSession(null);
        throw new Error('Sesión vencida. Inicia sesión nuevamente.');
      }
    }
    if (resp.status === 401) {
      saveSession(null);
    }
    throw new Error(`HTTP ${resp.status}: ${text}`);
  }

  const responseText = await resp.text();
  if (!responseText || !responseText.trim()) return [] as any;
  return JSON.parse(responseText);
}

export async function fetchTurnosRango(params: {
  cfg: SupabaseConfig;
  session: SupabaseSession | null;
  fechaDesde?: string;
  fechaHasta?: string;
  onSessionRenewed?: (newSession: SupabaseSession) => void;
}): Promise<TurnoDBRow[]> {
  const { cfg, session, fechaDesde, fechaHasta, onSessionRenewed } = params;
  const PAG = 500;
  let offset = 0;
  const acumulados: TurnoDBRow[] = [];

  while (true) {
    let q = `turnos?select=fecha,tipo,filas,turno,created_by,created_by_email,updated_at&order=fecha.desc,tipo.asc&limit=${PAG}&offset=${offset}`;
    if (fechaDesde) q += `&fecha=gte.${encodeURIComponent(fechaDesde)}`;
    if (fechaHasta) q += `&fecha=lte.${encodeURIComponent(fechaHasta)}`;

    const rows = await sbFetch<TurnoDBRow[]>(cfg, q, session, onSessionRenewed);
    if (!Array.isArray(rows) || rows.length === 0) break;
    acumulados.push(...rows);
    if (rows.length < PAG) break;
    offset += PAG;
    if (offset >= 5000) break; // safety cap
  }

  return acumulados;
}

export async function fetchCatalogoCompleto(
  cfg: SupabaseConfig,
  session: SupabaseSession | null,
  onSessionRenewed?: (newSession: SupabaseSession) => void
): Promise<CatalogoItem[]> {
  const PAG = 1000;
  let pagina = 0;
  const items: CatalogoItem[] = [];

  while (true) {
    const rows: any[] = await sbFetch(
      cfg,
      `catalogo_op?select=datos,actualizado_en&order=op.asc&limit=${PAG}&offset=${pagina * PAG}`,
      session,
      onSessionRenewed
    );
    if (!Array.isArray(rows) || rows.length === 0) break;
    rows.forEach((r) => {
      const norm = normalizarCatalogoItem(r.datos);
      if (norm) items.push(norm);
    });
    if (rows.length < PAG) break;
    pagina++;
  }

  return items;
}

export async function fetchMaquinasSheets(): Promise<Maquina[]> {
  try {
    const resp = await fetch(SHEETS_MAQUINAS_URL, { cache: 'no-store' });
    if (!resp.ok) return [];
    const csv = await resp.text();
    return parsearMaquinasCsv(csv);
  } catch {
    return [];
  }
}
