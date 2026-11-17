import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  Download, 
  Building2, 
  CheckCircle2, 
  FileSpreadsheet,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import { ProveedoresData } from '../types/factoring';
import * as XLSX from 'xlsx';

interface ProvidersListModalProps {
  isOpen: boolean;
  onClose: () => void;
  proveedores: ProveedoresData;
}

export const ProvidersListModal: React.FC<ProvidersListModalProps> = ({
  isOpen,
  onClose,
  proveedores
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'liverpool' | 'suburbia'>('all');
  const [search, setSearch] = useState<string>('');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  if (!isOpen) return null;

  const livList = proveedores?.liverpool || [];
  const subList = proveedores?.suburbia || [];
  const totalCount = livList.length + subList.length;

  const livPct = totalCount > 0 ? (livList.length / totalCount) * 100 : 0;
  const subPct = totalCount > 0 ? (subList.length / totalCount) * 100 : 0;

  // Unified list of providers with metadata
  const allItems = useMemo(() => {
    const list: Array<{
      nombre: string;
      empresa: 'Liverpool' | 'Suburbia';
      columna: 'A' | 'H';
      pestaña: string;
      indexOriginal: number;
    }> = [];

    livList.forEach((p, idx) => {
      list.push({
        nombre: p,
        empresa: 'Liverpool',
        columna: 'A',
        pestaña: proveedores.pestaña || 'Proveedores',
        indexOriginal: idx + 2 // Inicia en Renglón 2 de Excel
      });
    });

    subList.forEach((p, idx) => {
      list.push({
        nombre: p,
        empresa: 'Suburbia',
        columna: 'H',
        pestaña: proveedores.pestaña || 'Proveedores',
        indexOriginal: idx + 2 // Inicia en Renglón 2 de Excel
      });
    });

    return list;
  }, [livList, subList, proveedores]);

  // Filtered and sorted
  const filteredItems = useMemo(() => {
    let result = allItems;

    if (activeTab === 'liverpool') {
      result = result.filter(item => item.empresa === 'Liverpool');
    } else if (activeTab === 'suburbia') {
      result = result.filter(item => item.empresa === 'Suburbia');
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(item => item.nombre.toLowerCase().includes(q));
    }

    return result.sort((a, b) => {
      return sortAsc 
        ? a.nombre.localeCompare(b.nombre, 'es')
        : b.nombre.localeCompare(a.nombre, 'es');
    });
  }, [allItems, activeTab, search, sortAsc]);

  const handleExportExcel = () => {
    const data = filteredItems.map((item, idx) => ({
      'No.': idx + 1,
      'Razón Social / Proveedor': item.nombre,
      'Negocio': item.empresa,
      'Columna Excel': `Columna ${item.columna}`,
      'Pestaña Origen': item.pestaña,
      'Estatus': 'Activo en Cartera Factoraje'
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 45 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
      { wch: 26 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Proveedores');
    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Cartera_Proveedores_Liverpool_Suburbia_${today}.xlsx`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-pink-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FF2D8D] to-[#9B30FF] flex items-center justify-center text-white shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Detalle de Proveedores por Negocio</span>
                <span className="text-[11px] font-bold text-[#FF2D8D] bg-pink-50 border border-pink-200 px-2.5 py-0.5 rounded-full font-mono">
                  Pestaña “{proveedores.pestaña || 'Proveedores'}”
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Liverpool (Columna A) &amp; Suburbia (Columna H) · Cartera Total Consolidada
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Summary Cards (Liverpool & Suburbia Cartera) */}
        <div className="p-6 pb-3 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/50 border-b border-slate-100">
          
          {/* Card Total */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Cartera
              </span>
              <Layers className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 font-mono tracking-tight tabular-nums">
                {totalCount}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                proveedores
              </span>
            </div>
            <span className="text-[10px] font-semibold text-slate-400 block mt-1">
              100% de la base consolidada
            </span>
          </div>

          {/* Card Liverpool (Col A) */}
          <div className="bg-pink-50/60 rounded-2xl p-3.5 border border-pink-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-[#FF2D8D] uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FF2D8D]" />
                Liverpool
              </span>
              <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 bg-pink-100 text-[#FF2D8D] rounded-md">
                Columna A
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 font-mono tracking-tight tabular-nums">
                {livList.length}
              </span>
              <span className="text-xs font-extrabold text-[#FF2D8D] font-mono">
                {livPct.toFixed(1)}%
              </span>
            </div>
            <span className="text-[10px] font-semibold text-slate-600 block mt-1">
              {livPct.toFixed(1)}% de la cartera de proveedores
            </span>
          </div>

          {/* Card Suburbia (Col H) */}
          <div className="bg-purple-50/60 rounded-2xl p-3.5 border border-purple-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-[#201B4B] uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#201B4B]" />
                Suburbia
              </span>
              <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 bg-purple-100 text-[#9B30FF] rounded-md">
                Columna H
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 font-mono tracking-tight tabular-nums">
                {subList.length}
              </span>
              <span className="text-xs font-extrabold text-[#9B30FF] font-mono">
                {subPct.toFixed(1)}%
              </span>
            </div>
            <span className="text-[10px] font-semibold text-slate-600 block mt-1">
              {subPct.toFixed(1)}% de la cartera de proveedores
            </span>
          </div>

        </div>

        {/* Filter Toolbar (Tabs, Search, Export) */}
        <div className="px-6 py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-100">
          
          {/* Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({totalCount})
            </button>
            <button
              onClick={() => setActiveTab('liverpool')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'liverpool'
                  ? 'bg-white text-[#FF2D8D] shadow-xs ring-1 ring-pink-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF2D8D]" />
              <span>Liverpool ({livList.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('suburbia')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'suburbia'
                  ? 'bg-white text-[#201B4B] shadow-xs ring-1 ring-purple-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#201B4B]" />
              <span>Suburbia ({subList.length})</span>
            </button>
          </div>

          {/* Search + Sort + Export */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar proveedor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#FF2D8D] focus:bg-white transition-all text-slate-800"
              />
            </div>

            <button
              onClick={() => setSortAsc(!sortAsc)}
              className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
              title={sortAsc ? 'Orden A-Z' : 'Orden Z-A'}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5 shrink-0"
              title="Descargar lista de proveedores en Excel"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Exportar</span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-600">No se encontraron proveedores</p>
              <p className="text-xs text-slate-400 mt-1">Prueba con otro término de búsqueda o filtro</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                  <th className="py-2.5 px-4 w-12 text-center">#</th>
                  <th className="py-2.5 px-4">Proveedor / Razón Social</th>
                  <th className="py-2.5 px-4 w-32">Negocio</th>
                  <th className="py-2.5 px-4 w-28 text-center">Columna Excel</th>
                  <th className="py-2.5 px-4 w-32 text-center">Pestaña</th>
                  <th className="py-2.5 px-4 w-32 text-center">Estatus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredItems.map((item, idx) => {
                  const isLiv = item.empresa === 'Liverpool';
                  return (
                    <tr 
                      key={`${item.empresa}_${item.columna}_${idx}`}
                      className="hover:bg-pink-50/30 transition-colors"
                    >
                      <td className="py-2.5 px-4 text-center font-mono text-[11px] text-slate-400 font-semibold">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-800">
                        {item.nombre}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                          isLiv
                            ? 'bg-pink-50 text-[#FF2D8D] border border-pink-200'
                            : 'bg-purple-50 text-[#201B4B] border border-purple-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isLiv ? 'bg-[#FF2D8D]' : 'bg-[#201B4B]'}`} />
                          {item.empresa}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-700">
                        <span className="px-2 py-0.5 bg-slate-100 rounded-md text-[11px]">
                          Columna {item.columna}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center text-slate-500 font-mono text-[11px]">
                        {item.pestaña}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Activo</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Mostrando <strong className="text-slate-800 font-mono">{filteredItems.length}</strong> de <strong className="text-slate-800 font-mono">{totalCount}</strong> proveedores registrados
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors shadow-2xs"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
