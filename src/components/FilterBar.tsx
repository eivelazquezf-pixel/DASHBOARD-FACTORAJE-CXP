import React from 'react';
import { Search, X, RotateCcw, Filter, Building, Calendar, Landmark, CheckCircle2 } from 'lucide-react';
import { FactoringFilters } from '../types/factoring';

interface FilterBarProps {
  filters: FactoringFilters;
  setFilters: React.Dispatch<React.SetStateAction<FactoringFilters>>;
  availableYears: number[];
  availableBanks: string[];
  totalMatches: number;
  totalRecords: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  setFilters,
  availableYears,
  availableBanks,
  totalMatches,
  totalRecords
}) => {
  const isFiltered = 
    filters.empresa !== 'all' || 
    filters.año !== 'all' || 
    filters.banco !== 'all' || 
    filters.estatus !== 'all' || 
    filters.moneda !== 'all' || 
    filters.vencimientoRango !== 'all' ||
    filters.search.trim() !== '';

  const handleReset = () => {
    setFilters({
      empresa: 'all',
      año: 'all',
      banco: 'all',
      estatus: 'all',
      moneda: 'all',
      search: '',
      vencimientoRango: 'all'
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 transition-colors space-y-3.5">
      
      {/* Upper row: Search, Company Segmented, Year & Currency */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        
        {/* Live Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por Proveedor, Folio, RFC o ID SAP..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white transition-colors"
          />
          {filters.search && (
            <button
              onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Company Segmented Control (Interactive functional buttons) */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg self-start sm:self-auto overflow-x-auto max-w-full">
          {[
            { id: 'all', label: 'Todas' },
            { id: 'Liverpool', label: 'Liverpool' },
            { id: 'Suburbia', label: 'Suburbia' },
            { id: 'Distribuidora Liverpool', label: 'Distribuidora' }
          ].map(comp => (
            <button
              key={comp.id}
              onClick={() => setFilters(prev => ({ ...prev, empresa: comp.id }))}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                filters.empresa === comp.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {comp.label}
            </button>
          ))}
        </div>

        {/* Year Pills & Reset */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              onClick={() => setFilters(prev => ({ ...prev, año: 'all' }))}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                filters.año === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Años: Todos
            </button>
            {availableYears.map(yr => (
              <button
                key={yr}
                onClick={() => setFilters(prev => ({ ...prev, año: String(yr) }))}
                className={`px-2.5 py-1 text-xs font-mono font-semibold rounded-md transition-all whitespace-nowrap ${
                  filters.año === String(yr)
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {yr}
              </button>
            ))}
          </div>

          {isFiltered && (
            <button
              onClick={handleReset}
              className="px-2.5 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpiar</span>
            </button>
          )}
        </div>

      </div>

      {/* Lower row: Bank Select, Status Tabs, Maturity Aging, Currency & Count */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
        
        {/* Status segmented filters */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-slate-400 font-medium mr-1 hidden sm:inline">Estatus:</span>
          {[
            { id: 'all', label: 'Todos' },
            { id: 'Vigente', label: 'Vigente' },
            { id: 'Por Vencer', label: 'Por Vencer (<15d)' },
            { id: 'Liquidada', label: 'Liquidada' },
            { id: 'En Aclaración', label: 'En Aclaración' },
            { id: 'Vencida', label: 'Vencida' },
          ].map(st => (
            <button
              key={st.id}
              onClick={() => setFilters(prev => ({ ...prev, estatus: st.id }))}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                filters.estatus === st.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        {/* Dropdowns: Banco, Moneda, Vencimiento */}
        <div className="flex items-center gap-2 flex-wrap">
          
          {/* Banco Factor */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-400 hidden xl:inline">Banco:</span>
            <select
              value={filters.banco}
              onChange={(e) => setFilters(prev => ({ ...prev, banco: e.target.value }))}
              aria-label="Filtrar por banco factor"
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="all">Todos los Bancos</option>
              {availableBanks.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Moneda */}
          <div className="flex items-center gap-1 text-xs">
            <select
              value={filters.moneda}
              onChange={(e) => setFilters(prev => ({ ...prev, moneda: e.target.value }))}
              aria-label="Filtrar por moneda"
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="all">Todas Divisas</option>
              <option value="MXN">Solo MXN</option>
              <option value="USD">Solo USD</option>
            </select>
          </div>

          {/* Matches Counter */}
          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono ml-2">
            Mostrando <strong className="text-slate-900 dark:text-white font-bold">{totalMatches}</strong> de {totalRecords} letras
          </div>

        </div>

      </div>

    </div>
  );
};
