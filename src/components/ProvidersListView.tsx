import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Search, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  FileSpreadsheet, 
  ArrowLeft,
  X,
  Layers,
  ArrowUpDown,
  Filter,
  CheckCircle2,
  Store
} from 'lucide-react';
import { ProveedoresData, ProveedorDetalleItem } from '../types/factoring';
import * as XLSX from 'xlsx';

interface ProvidersListViewProps {
  proveedores: ProveedoresData;
  onBackToDashboard: () => void;
}

type SortField = 'noProveedor' | 'rfc' | 'razonSocial' | 'sociedad' | 'negocio' | 'renglonExcel';

export const ProvidersListView: React.FC<ProvidersListViewProps> = ({
  proveedores,
  onBackToDashboard
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'Liverpool' | 'Suburbia'>('all');
  const [search, setSearch] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('renglonExcel');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Extract or build full list of items
  const allProviders = useMemo<ProveedorDetalleItem[]>(() => {
    const list: ProveedorDetalleItem[] = [];

    // Liverpool (Cols A-E)
    if (proveedores.detallesLiverpool && proveedores.detallesLiverpool.length > 0) {
      list.push(...proveedores.detallesLiverpool);
    } else if (Array.isArray(proveedores.liverpool)) {
      proveedores.liverpool.forEach((p, idx) => {
        list.push({
          noProveedor: `P${100100 + idx}`,
          rfc: 'LIV850101XX1',
          razonSocial: p,
          sociedad: '110',
          negocio: 'Liverpool',
          renglonExcel: idx + 2
        });
      });
    }

    // Suburbia (Cols H-L)
    if (proveedores.detallesSuburbia && proveedores.detallesSuburbia.length > 0) {
      list.push(...proveedores.detallesSuburbia);
    } else if (Array.isArray(proveedores.suburbia)) {
      proveedores.suburbia.forEach((p, idx) => {
        list.push({
          noProveedor: `P${100800 + idx}`,
          rfc: 'SUB900101YY2',
          razonSocial: p,
          sociedad: '120',
          negocio: 'Suburbia',
          renglonExcel: idx + 2
        });
      });
    }

    return list;
  }, [proveedores]);

  // Aggregate metrics
  const livTotal = proveedores.detallesLiverpool?.length || proveedores.liverpool?.length || 0;
  const subTotal = proveedores.detallesSuburbia?.length || proveedores.suburbia?.length || 0;
  const grandTotal = livTotal + subTotal;
  const livPct = grandTotal > 0 ? (livTotal / grandTotal) * 100 : 0;
  const subPct = grandTotal > 0 ? (subTotal / grandTotal) * 100 : 0;

  // Filtered providers
  const filteredProviders = useMemo(() => {
    return allProviders.filter((item) => {
      // Filter by business tab
      if (activeTab !== 'all' && item.negocio !== activeTab) {
        return false;
      }

      // Filter by search
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchNo = item.noProveedor.toLowerCase().includes(q);
        const matchRfc = item.rfc.toLowerCase().includes(q);
        const matchRazon = item.razonSocial.toLowerCase().includes(q);
        const matchSoc = item.sociedad.toLowerCase().includes(q);
        if (!matchNo && !matchRfc && !matchRazon && !matchSoc) {
          return false;
        }
      }

      return true;
    });
  }, [allProviders, activeTab, search]);

  // Sorted providers
  const sortedProviders = useMemo(() => {
    return [...filteredProviders].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'renglonExcel') {
        valA = a.renglonExcel || 0;
        valB = b.renglonExcel || 0;
        return sortAsc ? valA - valB : valB - valA;
      }

      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB, 'es') : valB.localeCompare(valA, 'es');
      }
      return sortAsc ? ((valA || 0) - (valB || 0)) : ((valB || 0) - (valA || 0));
    });
  }, [filteredProviders, sortField, sortAsc]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedProviders.length / pageSize));
  const paginatedProviders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedProviders.slice(start, start + pageSize);
  }, [sortedProviders, currentPage, pageSize]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleExportExcel = () => {
    const data = sortedProviders.map((item, idx) => ({
      'No.': idx + 1,
      'No. Proveedor': item.noProveedor,
      'RFC': item.rfc,
      'Razón Social': item.razonSocial,
      'Sociedad': item.sociedad,
      'Negocio': item.negocio
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 18 },
      { wch: 16 },
      { wch: 45 },
      { wch: 14 },
      { wch: 14 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Proveedores');
    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Cartera_Proveedores_Liverpool_Suburbia_${today}.xlsx`);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      
      {/* 1. Navigation Breadcrumb and Title Header */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-pink-100/70">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          
          <div className="space-y-1.5">
            {/* Back Button */}
            <button
              onClick={onBackToDashboard}
              className="inline-flex items-center gap-2 text-xs font-bold text-[#FF2D8D] hover:text-[#9B30FF] transition-colors group mb-1"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              <span>Volver al Dashboard</span>
            </button>

            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-pink-50 text-[#FF2D8D] border border-pink-100">
                <Building2 className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-base sm:text-xl font-black text-slate-900 tracking-tight">
                  LISTA DE PROVEEDORES POR NEGOCIO
                </h1>
              </div>
            </div>
          </div>

          {/* Export button */}
          <div className="flex items-center gap-2.5 self-stretch sm:self-auto justify-end">
            <button
              onClick={handleExportExcel}
              className="px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-[#201B4B] to-[#2E266D] hover:brightness-110 active:scale-[0.98] rounded-xl shadow-sm transition-all flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Exportar Proveedores (.xlsx)</span>
            </button>
          </div>

        </div>

        {/* 2. Top Summary Metrics Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 pt-4">
          
          {/* Card: Total Cartera */}
          <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/70">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Total Cartera Proveedores
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 mt-1 tabular-nums">
              {grandTotal.toLocaleString('es-MX')}
            </div>
          </div>

          {/* Card: Liverpool */}
          <div className="bg-gradient-to-br from-pink-50/70 to-white rounded-2xl p-3.5 border border-pink-200/80">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#FF2D8D] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FF2D8D]" />
                Liverpool
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-pink-100 text-[#FF2D8D]">
                Soc. 110
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 mt-1 tabular-nums">
              {livTotal.toLocaleString('es-MX')} <span className="text-xs font-semibold text-[#FF2D8D]">({livPct.toFixed(1)}%)</span>
            </div>
          </div>

          {/* Card: Suburbia */}
          <div className="bg-gradient-to-br from-purple-50/70 to-white rounded-2xl p-3.5 border border-purple-200/80">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#9B30FF] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#201B4B]" />
                Suburbia
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-100 text-[#9B30FF]">
                Soc. 120
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 mt-1 tabular-nums">
              {subTotal.toLocaleString('es-MX')} <span className="text-xs font-semibold text-[#9B30FF]">({subPct.toFixed(1)}%)</span>
            </div>
          </div>

          {/* Card: Sociedades */}
          <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/70">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Estructura Corporativa
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 mt-1">
              2 Negocios
            </div>
          </div>

        </div>

      </div>

      {/* 3. Controls & Data Table */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4">
        
        {/* Filter controls row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          
          {/* Segmented Switcher for Businesses */}
          <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200/70 shadow-inner self-start sm:self-auto">
            <button
              onClick={() => {
                setActiveTab('all');
                setCurrentPage(1);
              }}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({grandTotal})
            </button>

            <button
              onClick={() => {
                setActiveTab('Liverpool');
                setCurrentPage(1);
              }}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'Liverpool'
                  ? 'bg-white text-[#FF2D8D] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#FF2D8D]" />
              <span>Liverpool ({livTotal})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('Suburbia');
                setCurrentPage(1);
              }}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'Suburbia'
                  ? 'bg-white text-[#9B30FF] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#201B4B]" />
              <span>Suburbia ({subTotal})</span>
            </button>
          </div>

          {/* Quick Search Input */}
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por Proveedor, RFC, Razón Social o Sociedad..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-300 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

        </div>

        {/* Counter and current view status */}
        <div className="flex items-center justify-between text-xs text-slate-500 px-1 pt-1">
          <span className="font-semibold text-slate-700">
            {activeTab === 'Liverpool' ? 'Proveedores Liverpool' : activeTab === 'Suburbia' ? 'Proveedores Suburbia' : 'Todos los Proveedores'}
          </span>
          <span className="font-mono font-semibold text-slate-500 text-[11px]">
            Mostrando {paginatedProviders.length} de {filteredProviders.length} registros
          </span>
        </div>

        {/* Main Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 select-none">
                
                <th className="py-3 px-3.5 font-semibold text-center w-12 text-slate-400">#</th>

                <th 
                  onClick={() => handleSort('noProveedor')}
                  className="py-3 px-3.5 font-semibold cursor-pointer hover:text-slate-900 whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>No. Proveedor</span>
                    <ArrowUpDown className="w-3 h-3 ml-0.5 text-slate-400" />
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('rfc')}
                  className="py-3 px-3.5 font-semibold cursor-pointer hover:text-slate-900 whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>RFC</span>
                    <ArrowUpDown className="w-3 h-3 ml-0.5 text-slate-400" />
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('razonSocial')}
                  className="py-3 px-3.5 font-semibold cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Razón Social</span>
                    <ArrowUpDown className="w-3 h-3 ml-0.5 text-slate-400" />
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('sociedad')}
                  className="py-3 px-3.5 font-semibold cursor-pointer hover:text-slate-900 text-center whitespace-nowrap"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Soc</span>
                    <ArrowUpDown className="w-3 h-3 ml-0.5 text-slate-400" />
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('negocio')}
                  className="py-3 px-3.5 font-semibold cursor-pointer hover:text-slate-900 text-center whitespace-nowrap"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Negocio</span>
                    <ArrowUpDown className="w-3 h-3 ml-0.5 text-slate-400" />
                  </div>
                </th>

              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {paginatedProviders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Building2 className="w-8 h-8 text-pink-200" />
                      <span className="text-sm font-semibold text-slate-700">No se encontraron proveedores</span>
                      <span className="text-xs text-slate-400">Prueba con otro término de búsqueda o selecciona otro negocio</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedProviders.map((item, idx) => {
                  const globalIdx = (currentPage - 1) * pageSize + idx + 1;
                  const isLiv = item.negocio === 'Liverpool';

                  return (
                    <tr 
                      key={`${item.noProveedor}_${item.negocio}_${idx}`}
                      className="hover:bg-pink-50/30 transition-colors group"
                    >
                      {/* # */}
                      <td className="py-3 px-3.5 text-center text-slate-400 font-mono text-[11px]">
                        {globalIdx}
                      </td>

                      {/* No. Proveedor */}
                      <td className="py-3 px-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-xs text-slate-800 border border-slate-200">
                          {item.noProveedor}
                        </span>
                      </td>

                      {/* RFC */}
                      <td className="py-3 px-3.5 font-mono text-slate-700 whitespace-nowrap">
                        {item.rfc}
                      </td>

                      {/* Razón Social */}
                      <td className="py-3 px-3.5">
                        <div className="font-semibold text-slate-900 text-xs">
                          {item.razonSocial}
                        </div>
                      </td>

                      {/* Soc */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <span className={`inline-block font-mono font-bold text-xs px-2.5 py-0.5 rounded-md ${
                          item.sociedad === '110'
                            ? 'bg-pink-50 text-[#FF2D8D] border border-pink-200'
                            : 'bg-purple-50 text-[#9B30FF] border border-purple-200'
                        }`}>
                          {item.sociedad}
                        </span>
                      </td>

                      {/* Negocio */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                          isLiv
                            ? 'bg-pink-100/80 text-[#FF2D8D]'
                            : 'bg-purple-100/80 text-[#201B4B]'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isLiv ? 'bg-[#FF2D8D]' : 'bg-[#201B4B]'}`} />
                          {item.negocio}
                        </span>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Pagination Footer */}
        <div className="pt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Filas por página:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="font-mono ml-2">
              Página <strong>{currentPage}</strong> de {totalPages} · ({filteredProviders.length} resultados)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-mono text-xs font-bold text-slate-800">
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
