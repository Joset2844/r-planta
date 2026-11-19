import React, { useState } from 'react';
import { Lock, ArrowRight } from 'lucide-react';
import { getSupabaseConfig, sbLogin } from '../services/supabase';
import { SupabaseSession } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface LoginViewProps {
  onLoginSuccess: (session: SupabaseSession) => void;
  catalogoCount: number;
  maquinasCount: number;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  catalogoCount,
  maquinasCount,
}) => {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!usuario.trim() || !password) {
      setError('Ingresa tu usuario (o correo) y contraseña.');
      return;
    }
    setCargando(true);
    try {
      const cfg = getSupabaseConfig();
      const session = await sbLogin(cfg, usuario.trim(), password);
      onLoginSuccess(session);
    } catch (err: any) {
      setError(err.message || 'Credenciales inválidas o error de conexión.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-8">
        <div className="mb-6">
          <p className="text-xs font-medium text-amber-700 mb-1.5">
            Reportes y Exportación
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Consulta de Producción
          </h1>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Inicia sesión con tu cuenta registrada para consultar, filtrar por máquina, fechas y OP, imprimir y exportar a Excel los turnos guardados.
          </p>
        </div>

        {(catalogoCount > 0 || maquinasCount > 0) && (
          <div className="mb-6 py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center gap-2">
            <span>Base sincronizada:</span>
            <span className="font-mono tabular-nums font-medium text-slate-800">
              {maquinasCount} máquinas
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums font-medium text-slate-800">
              {catalogoCount.toLocaleString('es-PE')} OPs
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-user" className="block text-xs font-medium text-slate-700 mb-1.5">
              Usuario o correo electrónico
            </label>
            <input
              id="login-user"
              type="text"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="ej. admin o nombre@correo.com"
              autoComplete="username"
              autoFocus
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
            />
          </div>

          <div>
            <label htmlFor="login-pass" className="block text-xs font-medium text-slate-700 mb-1.5">
              Contraseña
            </label>
            <input
              id="login-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingresa tu contraseña"
              autoComplete="current-password"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer min-h-[42px]"
          >
            <Lock size={15} />
            <span>{cargando ? 'Conectando...' : 'Acceder a Consultas'}</span>
            {!cargando && <ArrowRight size={15} />}
          </button>
        </form>

        <div className="mt-5 flex justify-center empty:hidden">
          <PWAInstallButton />
        </div>
      </div>
    </div>
  );
};
