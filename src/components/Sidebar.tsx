import React, { useState } from 'react';
import { 
  Home, 
  Star, 
  Building2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  LogOut
} from 'lucide-react';
import { GoogleUserProfile } from '../services/googleAuthService';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

interface SidebarProps {
  activeView: 'dashboard' | 'table' | 'providers';
  setActiveView: (view: 'dashboard' | 'table' | 'providers') => void;
  userName?: string;
  userProfile?: GoogleUserProfile | null;
  onLogout?: () => void;
  onRefreshData: () => void;
  syncStatus: SyncStatus;
  lastSyncAt: Date | null;
  linkedSheetName?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  userName = 'Factoraje "Puerto de Liverpool"',
  userProfile,
  onLogout,
  onRefreshData,
  syncStatus,
  lastSyncAt,
  linkedSheetName
}) => {
  const [avatarError, setAvatarError] = useState(false);

  const userDisplayName = userProfile?.name || userProfile?.email?.split('@')[0] || 'Usuario Corporativo';
  const userInitial = userDisplayName.trim().charAt(0).toUpperCase();

  const formatSyncTime = (date: Date | null) => {
    if (!date) return 'Sin sincronizar';
    return date.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <aside className="w-60 shrink-0 bg-[#201B4B] text-white flex flex-col justify-between py-6 px-0 min-h-screen border-r border-slate-800 select-none">

      {/* Top Profile Zone (Original Liverpool & Suburbia Logo & Title) */}
      <div className="px-5 mb-6 text-center flex flex-col items-center">
        <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center p-1 shadow-lg mb-3 overflow-hidden ring-2 ring-pink-500/30">
          <img
            src="/assets/aistudio/image_390fa5f2.png"
            alt="Cuentas por Pagar - Factoraje"
            className="w-full h-full rounded-full object-cover shadow-sm hover:scale-105 transition-transform"
          />
        </div>

        <div className="w-full pb-3 border-b border-slate-700/80">
          <h2 className="text-sm font-semibold text-white tracking-wide leading-tight">
            {userName}
          </h2>
          <span className="text-[10px] text-pink-300 font-medium block mt-1">
            Liverpool &amp; Suburbia
          </span>
        </div>
      </div>

      {/* Nav Menu Items */}
      <nav className="flex-1 space-y-1.5 px-0">
        
        {/* Item 1: Dashboard (Home) */}
        <button
          onClick={() => setActiveView('dashboard')}
          className={`w-full flex items-center gap-3.5 px-6 py-2.5 text-xs font-medium transition-all ${
            activeView === 'dashboard'
              ? 'bg-gradient-to-r from-[#D9258B] to-[#FF2D8D] text-white font-semibold shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <Home className="w-4 h-4 shrink-0" />
          <span>Dashboard</span>
        </button>

        {/* Item 2: Detalle Letras */}
        <button
          onClick={() => setActiveView('table')}
          className={`w-full flex items-center justify-between px-6 py-2.5 text-xs font-medium transition-all ${
            activeView === 'table'
              ? 'bg-gradient-to-r from-[#D9258B] to-[#FF2D8D] text-white font-semibold shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <Star className="w-4 h-4 shrink-0 text-amber-300 fill-amber-300/40" />
            <span>Detalle Letras</span>
          </div>
          <span className="text-[10px] font-mono text-white/80">
            Resumen
          </span>
        </button>

        {/* Item 3: Proveedores */}
        <button
          onClick={() => setActiveView('providers')}
          className={`w-full flex items-center justify-between px-6 py-2.5 text-xs font-medium transition-all ${
            activeView === 'providers'
              ? 'bg-gradient-to-r from-[#D9258B] to-[#FF2D8D] text-white font-semibold shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <Building2 className="w-4 h-4 shrink-0 text-pink-300" />
            <span>Proveedores</span>
          </div>
          <span className="text-[10px] font-mono text-white/80">
            Cartera
          </span>
        </button>

      </nav>

      {/* Bottom Action Area: Perfil autenticado + Sincronización de Google Sheets vinculada */}
      <div className="px-4 pt-3 border-t border-slate-800/80 space-y-3">
        <div className="bg-[#2A2363]/80 p-3.5 rounded-2xl border border-pink-500/20 space-y-3">
          {/* Perfil del usuario autenticado (Círculo con inicial o foto, nombre y correo) */}
          {userProfile && (
            <div className="flex items-center gap-2.5 pb-2.5 border-b border-white/10">
              {!avatarError && userProfile.picture ? (
                <img
                  src={userProfile.picture}
                  alt={userDisplayName}
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarError(true)}
                  className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-pink-400/50"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#D9258B] to-[#FF2D8D] text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {userInitial}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate" title={userDisplayName}>
                  {userDisplayName}
                </p>
                <p className="text-[10px] text-pink-200 truncate" title={userProfile.email}>
                  {userProfile.email}
                </p>
              </div>
            </div>
          )}

          {/* Fuente vinculada */}
          {linkedSheetName && (
            <p className="text-[11px] text-slate-300 truncate" title={linkedSheetName}>
              {linkedSheetName}
            </p>
          )}

          {/* Botón Principal: Actualizar información */}
          <button
            onClick={onRefreshData}
            disabled={syncStatus === 'syncing'}
            className="w-full py-2.5 px-3 bg-gradient-to-r from-[#FF2D8D] to-[#9B30FF] hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <RefreshCw className={`w-4 h-4 shrink-0 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
            <span>{syncStatus === 'syncing' ? 'Actualizando...' : 'Actualizar información'}</span>
          </button>

          {/* Estatus y hora de última sincronización */}
          <div className="pt-1 border-t border-white/10 space-y-1 text-[11px]">
            <div className="flex items-center gap-1.5">
              {syncStatus === 'syncing' && (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-pink-300 animate-spin shrink-0" />
                  <span className="text-pink-200 font-medium">Sincronizando datos...</span>
                </>
              )}
              {syncStatus === 'success' && (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-emerald-300 font-medium">Información actualizada</span>
                </>
              )}
              {syncStatus === 'error' && (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span className="text-rose-300 font-medium">Error al sincronizar</span>
                </>
              )}
              {syncStatus === 'idle' && (
                <>
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-slate-300 font-medium">Listo para actualizar</span>
                </>
              )}
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>Última sincronización</span>
              <span className="font-mono tabular-nums text-slate-200">
                {formatSyncTime(lastSyncAt)}
              </span>
            </div>
          </div>
        </div>

        {onLogout && (
          <button
            onClick={onLogout}
            className="w-full py-2 px-3 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar sesión</span>
          </button>
        )}
      </div>

    </aside>
  );
};
