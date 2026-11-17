import React, { useState, useMemo } from 'react';
import { 
  FactoringRecord, 
  EstatusLetra 
} from '../types/factoring';
import { 
  ArrowUpDown, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  CheckCircle, 
  Plus, 
  FileSpreadsheet,
  AlertCircle,
  Search,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  TrendingUp,
  X
} from 'lucide-react';

interface LettersTableProps {
  records: FactoringRecord[];
  onSelectRecord: (record: FactoringRecord) => void;
  onUpdateStatus?: (id: string, newStatus: EstatusLetra) => void;
  onOpenNewLetter?: () => void;
  onExportExcel: () => void;
}

type SortField = 'folio' | 'empresa' | 'proveedor' | 'noProveedorSap' | 'fechaEmision' | 'montoNominal' | 'estatus';

export const LettersTable: React.FC<LettersTableProps> = ({
  records,
  onSelectRecord,
  onUpdateStatus,
  onOpenNewLetter,
  onExportExcel
}) => {
  // Business view selector: 'all' | 'Liverpool' | 'Suburbia'
  const [selectedBusiness, setSelectedBusiness] = useState<'all' | 'Liverpool' | 'Suburbia'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('montoNominal');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Helper para identificar registros dummy mock
  const isMockRecord = (r: FactoringRecord) =>
    !r || !r.id ||
    r.id.startsWith('rec_202') ||
    r.id.startsWith('mock_') ||
    (r.archivoOrigen && r.archivoOrigen.includes('Control de Letras Factoraje'));

  const hasRealUploads = useMemo(() => {
    return records.some(r => !isMockRecord(r) && (
      r.id.startsWith('rec_d_') || 
      r.id.startsWith('rec_l_') || 
      r.id.startsWith('rec_t_') || 
      r.id.startsWith('rec_ab_') ||
      r.pestañaOrigen === 'Resumen Letras'
    ));
  }, [records]);

  // Filter records by business and search (Solo letras operadas/negociadas: Col D para Liverpool, Col T para Suburbia)
  const businessRecords = useMemo(() => {
    // Si existen registros reales cargados de Excel, purgar cualquier residuo mock
    const cleanSource = hasRealUploads ? records.filter(r => !isMockRecord(r)) : records;

    return cleanSource.filter(r => {
      // Excluir letras no operadas (Col L / Col AB)
      if (r.columnaOrigen === 'L' || r.columnaOrigen === 'AB' || r.operada === false) {
        return false;
      }

      // Filter by business if selected
      if (selectedBusiness === 'Liverpool') {
        const isLiv = r.empresa === 'Liverpool' || r.empresa === 'Distribuidora Liverpool' || r.columnaOrigen === 'D';
        if (!isLiv) return false;
      } else if (selectedBusiness === 'Suburbia') {
        const isSub = r.empresa === 'Suburbia' || r.columnaOrigen === 'T';
        if (!isSub) return false;
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchProv = (r.proveedor || '').toLowerCase().includes(q);
        const matchFolio = (r.folio || '').toLowerCase().includes(q);
        const matchSap = (r.noProveedorSap || '').toLowerCase().includes(q);
        const matchRfc = (r.rfc || '').toLowerCase().includes(q);
        if (!matchProv && !matchFolio && !matchSap && !matchRfc) return false;
      }

      return true;
    });
  }, [records, selectedBusiness, searchQuery, hasRealUploads]);

  // Sorting
  const sortedRecords = useMemo(() => {
    return [...businessRecords].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'montoNominal') {
        valA = Math.abs(a.montoNominal * (a.tipoCambio || 1));
        valB = Math.abs(b.montoNominal * (b.tipoCambio || 1));
      }

      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? ((valA || 0) - (valB || 0)) : ((valB || 0) - (valA || 0));
    });
  }, [businessRecords, sortField, sortAsc]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRecords.slice(start, start + pageSize);
  }, [sortedRecords, currentPage, pageSize]);

  // Aggregate metrics
  // 1. TOTAL DE LETRAS NEGOCIADAS: conteo de letras operadas (Columna D para Liverpool son 13,049, Columna T para Suburbia)
  // 2. IMPORTE TOTAL NEGOCIADO: suma total de las letras con signo oficial negativo (-12,598,937,721.13)
  // 3. TOTAL DE PROVEEDORES: proveedores únicos eliminando duplicados (Columna E para Liverpool son 516)
  const metrics = useMemo(() => {
    const totalLetras = businessRecords.length;
    // Suma de importes con convención contable negativa oficial
    const sumMonto = businessRecords.reduce((acc, r) => acc + Math.abs(r.montoNominal * (r.tipoCambio || 1)), 0);
    const totalMonto = sumMonto === 0 ? 0 : -Math.abs(sumMonto);

    const uniqueProviders = new Set(
      businessRecords
        .map(r => r.noProveedorSap || r.proveedor)
        .filter(Boolean)
    ).size;

    return {
      totalLetras,
      totalMonto,
      uniqueProviders
    };
  }, [businessRecords]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // default to descending for amounts
    }
  };

  const formatCurrency = (amount: number, currency = 'MXN') => {
    return `$${Math.abs(amount).toLocaleString('es-MX', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })} ${currency}`;
  };

  return (
    <div className="space-y-4 animate-fade-in">
      
      {/* 1. Header Card with Title and Business Switcher */}
      <div className="bg-white border border-pink-100/80 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-pink-100/70 text-[#FF2D8D]">
                <Layers className="w-5 h-5" />
              </span>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Detalle de Letras Negociadas
              </h1>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 self-stretch sm:self-auto justify-end">
            {onOpenNewLetter && (
              <button
                onClick={onOpenNewLetter}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-[#FF2D8D]" />
                <span>Registrar Letra</span>
              </button>
            )}

            <button
              onClick={onExportExcel}
              className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#201B4B] to-[#2E266D] hover:brightness-110 rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Exportar a Excel</span>
            </button>
          </div>
        </div>

        {/* Business Tabs & Quick Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4">
          
          {/* Segmented Switcher for Businesses */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/60 shadow-inner">
            <button
              onClick={() => {
                setSelectedBusiness('all');
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                selectedBusiness === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ambos Negocios
            </button>

            <button
              onClick={() => {
                setSelectedBusiness('Liverpool');
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                selectedBusiness === 'Liverpool'
                  ? 'bg-white text-[#FF2D8D] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#FF2D8D]" />
              <span>Liverpool</span>
            </button>

            <button
              onClick={() => {
                setSelectedBusiness('Suburbia');
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                selectedBusiness === 'Suburbia'
                  ? 'bg-white text-[#9B30FF] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#9B30FF]" />
              <span>Suburbia</span>
            </button>
          </div>

          {/* Table Search Input */}
          <div className="relative max-w-xs w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar proveedor, SAP o folio..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-300 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        
        {/* Card 1: TOTAL DE LETRAS NEGOCIADAS (Col D / Col T) */}
        <div className="bg-white border border-pink-100 rounded-xl p-3.5 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            TOTAL DE LETRAS NEGOCIADAS
          </span>
          <div className="text-xl font-extrabold text-slate-900 mt-1">
            {metrics.totalLetras.toLocaleString('es-MX')} <span className="text-xs font-normal text-slate-500">letras operadas</span>
          </div>
          <span className="text-[10px] text-pink-600 font-semibold block mt-0.5">
            {selectedBusiness === 'all' ? 'Liverpool + Suburbia' : selectedBusiness}
          </span>
        </div>

        {/* Card 2: IMPORTE TOTAL NEGOCIADO (Col G / Col W) */}
        <div className="bg-white border border-pink-100 rounded-xl p-3.5 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            IMPORTE TOTAL NEGOCIADO
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-[#201B4B] mt-1 tabular-nums tracking-tight">
            -${Math.abs(metrics.totalMonto).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} MXN
          </div>
          <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
            Formato completo en pesos (sin centavos)
          </span>
        </div>

        {/* Card 3: TOTAL DE PROVEEDORES (Col E / Col U) */}
        <div className="bg-white border border-pink-100 rounded-xl p-3.5 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            TOTAL DE PROVEEDORES
          </span>
          <div className="text-xl font-extrabold text-slate-900 mt-1 tabular-nums">
            {metrics.uniqueProviders.toLocaleString('es-MX')}
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
            Proveedores únicos (Col. {selectedBusiness === 'Suburbia' ? 'U' : selectedBusiness === 'Liverpool' ? 'E' : 'E / U'})
          </span>
        </div>

      </div>

      {/* 3. Detailed Data Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        
        {/* Sub-header info bar */}
        <div className="px-5 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="font-semibold text-slate-700">
            Mostrando {paginatedRecords.length} de {businessRecords.length} registros
          </span>

          <div className="flex items-center gap-2">
            <span>Filas:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-200 rounded px-2 py-0.5 text-xs text-slate-700 focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 select-none">
                
                <th className="py-3 px-3 font-semibold text-center w-12 text-slate-400">#</th>

                <th 
                  onClick={() => handleSort('folio')}
                  className="py-3 px-3 font-semibold cursor-pointer hover:text-slate-900 whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Folio / Letra</span>
                    <ArrowUpDown className="w-3 h-3 ml-0.5" />
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('empresa')}
                  className="py-3 px-3 font-semibold cursor-pointer hover:text-slate-900 whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Negocio</span>
                    <ArrowUpDown className="w-3 h-3 ml-0.5" />
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('noProveedorSap')}
                  className="py-3 px-3 font-semibold cursor-pointer hover:text-slate-900 whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>No. Proveedor</span>
                    <ArrowUpDown className="w-3 h-3 ml-0.5" />
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('proveedor')}
                  className="py-3 px-3 font-semibold cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Razón Social del Proveedor</span>
                    <ArrowUpDown className="w-3 h-3 ml-0.5" />
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('fechaEmision')}
                  className="py-3 px-3 font-semibold cursor-pointer hover:text-slate-900 whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Fecha Operación</span>
                    <ArrowUpDown className="w-3 h-3 ml-0.5" />
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('montoNominal')}
                  className="py-3 px-3 font-semibold cursor-pointer hover:text-slate-900 text-right whitespace-nowrap"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Importe Total</span>
                    <ArrowUpDown className="w-3 h-3 ml-0.5" />
                  </div>
                </th>

                <th className="py-3 px-3 font-semibold text-center whitespace-nowrap">
                  Estatus
                </th>

                <th className="py-3 px-3 font-semibold text-center whitespace-nowrap w-20">
                  Acción
                </th>

              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="w-7 h-7 text-pink-300" />
                      <span className="text-sm font-semibold text-slate-700">No se encontraron letras negociadas</span>
                      <span className="text-xs text-slate-400">Verifica el negocio seleccionado o la búsqueda actual</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((r, idx) => {
                  const globalIdx = (currentPage - 1) * pageSize + idx + 1;
                  const isLiverpool = r.empresa === 'Liverpool' || r.empresa === 'Distribuidora Liverpool' || r.columnaOrigen === 'D';
                  
                  return (
                    <tr 
                      key={r.id || `${r.folio}_${idx}`}
                      className="hover:bg-pink-50/30 transition-colors group"
                    >
                      {/* Index */}
                      <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {globalIdx}
                      </td>

                      {/* Folio / Letra */}
                      <td className="py-3 px-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                        <span>{r.folio}</span>
                      </td>

                      {/* Negocio */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                          isLiverpool
                            ? 'bg-pink-50 text-[#FF2D8D] border border-pink-100'
                            : 'bg-purple-50 text-[#9B30FF] border border-purple-100'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isLiverpool ? 'bg-[#FF2D8D]' : 'bg-[#9B30FF]'}`} />
                          {isLiverpool ? 'Liverpool' : 'Suburbia'}
                        </span>
                      </td>

                      {/* No. Proveedor (Col E / Col U) */}
                      <td className="py-3 px-3 font-mono font-semibold text-slate-800 whitespace-nowrap">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-xs text-slate-800 border border-slate-200">
                          {r.noProveedorSap || `P${100000 + globalIdx}`}
                        </span>
                      </td>

                      {/* Razón Social del Proveedor (Col F / Col V) */}
                      <td className="py-3 px-3 max-w-sm">
                        <div className="font-semibold text-slate-900 truncate">
                          {r.proveedor}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          RFC: {r.rfc || (isLiverpool ? 'LIV850101XX1' : 'SUB900101YY2')}
                        </div>
                      </td>

                      {/* Fecha de Operación (Col C / Col S) */}
                      <td className="py-3 px-3 font-mono text-slate-700 whitespace-nowrap">
                        {r.fechaEmision || r.fechaVencimiento || '2026-09-15'}
                      </td>

                      {/* Importe Total de la Letra (Col G / Col W) */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 tabular-nums whitespace-nowrap">
                        {formatCurrency(r.montoNominal, r.moneda)}
                      </td>

                      {/* Estatus */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Operada
                        </span>
                      </td>

                      {/* Acción */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => onSelectRecord(r)}
                          title="Ver detalle completo de la letra"
                          className="p-1.5 text-slate-400 hover:text-[#FF2D8D] rounded-lg hover:bg-pink-50 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Pagination */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="font-mono">
            Página <strong className="text-slate-800">{currentPage}</strong> de {totalPages} · ({businessRecords.length} registros totales)
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <span className="px-2 py-1 bg-white border border-slate-200 rounded-lg font-mono text-xs font-bold text-slate-800">
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
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
