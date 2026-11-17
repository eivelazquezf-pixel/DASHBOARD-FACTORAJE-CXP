import React from 'react';
import { 
  Search, 
  Bell, 
  FileSpreadsheet, 
  Plus, 
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react';
import { FactoringFilters } from '../types/factoring';
import { SyncStatus } from './Sidebar';

interface TopSearchBarProps {
  filters: FactoringFilters;
  setFilters: React.Dispatch<React.SetStateAction<FactoringFilters>>;
  anomalyCount: number;
  onOpenNotifications: () => void;
  onRefreshData: () => void;
  onExportExcel: () => void;
  onOpenNewLetter: () => void;
  userEmail: string;
  syncStatus: SyncStatus;
  lastSyncAt: Date | null;
}

export const TopSearchBar: React.FC<TopSearchBarProps> = ({
  filters,
  setFilters,
  anomalyCount,
  onOpenNotifications,
  onRefreshData,
  onExportExcel,
  onOpenNewLetter,
  userEmail,
  syncStatus,
  lastSyncAt
}) => {
  const formatSyncTime = (date: Date | null) => {
    if (!date) return 'Pendiente';
    return date.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 py-4 px-2">
      
      {/* Search Input */}
      <div className="relative flex-1 max-w-xl w-full">
        <Search className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-[#FF2D8D]" />
        <input
          type="text"
          placeholder="Buscar Proveedor, Folio, RFC, Banco..."
          value={filters.search}
          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          className="w-full pl-13 pr-10 py-2.5 text-xs bg-white rounded-full border border-pink-100 shadow-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all"
        />
        {filters.search && (
          <button
            onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Right Actions & Sync Status Zone */}
      <div className="flex flex-wrap items-center justify-end gap-3 shrink-0">

        {/* Logged-in email & Last sync status (unboxed metadata with separators) */}
        <div className="hidden xl:flex items-center gap-2 text-xs text-slate-600 pr-2 border-r border-pink-200/80">
          <span className="font-medium text-slate-800 truncate max-w-[200px]" title={userEmail}>
            {userEmail}
          </span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            {syncStatus === 'syncing' && (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-[#D9258B] animate-spin" />
                <span className="text-[#D9258B] font-medium">Actualizando...</span>
              </>
            )}
            {syncStatus === 'success' && (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-medium">Sincronizado</span>
                <span className="font-mono tabular-nums text-slate-500">
                  {formatSyncTime(lastSyncAt)}
                </span>
              </>
            )}
            {syncStatus === 'error' && (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                <span className="text-rose-700 font-medium">Error de sincronización</span>
              </>
            )}
            {syncStatus === 'idle' && (
              <>
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-500">Última sinc:</span>
                <span className="font-mono tabular-nums text-slate-700">
                  {formatSyncTime(lastSyncAt)}
                </span>
              </>
            )}
          </span>
        </div>

        {/* Bell Icon */}
        <button
          onClick={onOpenNotifications}
          title="Alertas de tesorería y conciliación"
          className="relative p-2.5 rounded-full bg-white border border-pink-100 text-[#FF2D8D] hover:bg-pink-50 transition-colors shadow-sm"
        >
          <Bell className="w-4 h-4" />
          {anomalyCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-2 right-2 ring-2 ring-white" />
          )}
        </button>

        {/* Actualizar información button */}
        <button
          onClick={onRefreshData}
          disabled={syncStatus === 'syncing'}
          title="Actualizar información desde el archivo Google Sheets vinculado"
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#D9258B] bg-white border border-pink-200 hover:bg-pink-50 disabled:opacity-60 disabled:cursor-not-allowed rounded-full shadow-sm transition-all whitespace-nowrap shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
          <span>{syncStatus === 'syncing' ? 'Actualizando...' : 'Actualizar información'}</span>
        </button>

        {/* Export Excel Button */}
        <button
          onClick={onExportExcel}
          title="Exportar cartera a Excel"
          className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#201B4B] hover:bg-[#161233] rounded-full shadow-sm transition-all whitespace-nowrap shrink-0"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
          <span>Exportar</span>
        </button>

        {/* Register Letter Button */}
        <button
          onClick={onOpenNewLetter}
          className="flex items-center gap-1 px-3.5 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#FF2D8D] to-[#9B30FF] hover:brightness-110 rounded-full shadow-sm transition-all whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nueva Letra</span>
        </button>

      </div>

    </div>
  );
};
