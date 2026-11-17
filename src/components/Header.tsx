import React from 'react';
import { 
  Building2, 
  FileSpreadsheet, 
  Upload, 
  Moon, 
  Sun, 
  FileText, 
  Layers, 
  AlertTriangle,
  FolderOpen
} from 'lucide-react';
import { FileMetadata } from '../types/factoring';

interface HeaderProps {
  activeView: 'dashboard' | 'table' | 'banks' | 'reconciliation';
  setActiveView: (view: 'dashboard' | 'table' | 'banks' | 'reconciliation') => void;
  onOpenUpload: () => void;
  onOpenFilesDrawer: () => void;
  onExportExcel: () => void;
  onDownloadTemplate: () => void;
  files: FileMetadata[];
  anomalyCount: number;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  setActiveView,
  onOpenUpload,
  onOpenFilesDrawer,
  onExportExcel,
  onDownloadTemplate,
  files,
  anomalyCount,
  darkMode,
  setDarkMode
}) => {
  const activeFilesCount = files.filter(f => f.enabled).length;

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-6 h-16">
          
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#E10075] to-[#5F259F] flex items-center justify-center text-white font-bold text-lg shadow-sm">
              L
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                Liverpool &amp; Suburbia
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 block -mt-1 font-medium">
                Control de Factoraje Financiero
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation Links (Clean single-line prose) */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            <button
              onClick={() => setActiveView('dashboard')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeView === 'dashboard'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Dashboard Ejecutivo</span>
            </button>

            <button
              onClick={() => setActiveView('table')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeView === 'table'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Detalle Letras</span>
            </button>

            <button
              onClick={() => setActiveView('banks')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeView === 'banks'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Líneas Bancarias</span>
            </button>

            <button
              onClick={() => setActiveView('reconciliation')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 relative ${
                activeView === 'reconciliation'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${anomalyCount > 0 ? 'text-amber-500 dark:text-amber-400' : ''}`} />
              <span>Conciliación</span>
              {anomalyCount > 0 && (
                <span className="ml-1 text-[10px] font-mono font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.2 rounded">
                  {anomalyCount}
                </span>
              )}
            </button>
          </nav>

          {/* Zone 3: Actions (Upload, File manager, Excel export & Theme) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Source files count button */}
            <button
              onClick={onOpenFilesDrawer}
              title="Archivos cargados en el sistema"
              className="px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Archivos:</span>
              <span className="font-mono font-bold">{activeFilesCount}</span>
            </button>

            {/* Upload Excel Button */}
            <button
              onClick={onOpenUpload}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#E10075] hover:bg-[#c70067] rounded-lg shadow-sm transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Subir Excel</span>
            </button>

            {/* Quick Export to Excel */}
            <button
              onClick={onExportExcel}
              title="Descargar reporte consolidado en Excel"
              className="hidden lg:flex px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors items-center gap-1.5 whitespace-nowrap"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Exportar</span>
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
