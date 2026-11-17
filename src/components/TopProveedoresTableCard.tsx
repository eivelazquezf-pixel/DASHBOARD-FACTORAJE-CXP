import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Trophy, 
  ArrowUpDown, 
  Search, 
  Download, 
  FileSpreadsheet,
  Layers,
  ChevronRight,
  TrendingUp,
  Percent
} from 'lucide-react';
import { TopProveedoresData, TopProveedorItem, FactoringRecord } from '../types/factoring';
import { loadSavedTopProveedores } from '../utils/storage';
import * as XLSX from 'xlsx';

interface TopProveedoresTableCardProps {
  topProveedores?: TopProveedoresData;
  records?: FactoringRecord[];
}

const isDateVal = (val: any): boolean => {
  if (val instanceof Date) return true;
  if (!val) return false;
  const s = String(val).trim();
  if (s.includes('GMT') || s.includes('00:00:00') || s.includes('hora estándar') || s.includes('T00:00:')) return true;
  if (/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s/i.test(s)) return true;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return true;
  if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(s)) return true;
  return false;
};

export const TopProveedoresTableCard: React.FC<TopProveedoresTableCardProps> = ({
  topProveedores,
  records = []
}) => {
  const [selectedBusiness, setSelectedBusiness] = useState<'Liverpool' | 'Suburbia' | 'Consolidado'>('Liverpool');
  const [sortBy, setSortBy] = useState<'cantidad' | 'importe'>('cantidad');
  const [limitCount, setLimitCount] = useState<number>(10);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Carga inicial o persistida con sanitización estricta de nombres
  const baseData = useMemo(() => {
    const raw = topProveedores || loadSavedTopProveedores();
    const sanitize = (items: TopProveedorItem[] | undefined, defaultEmp: 'Liverpool' | 'Suburbia'): TopProveedorItem[] => {
      return (items || []).map((it, idx) => {
        let razon = it.razonSocial;
        if (isDateVal(razon)) {
          razon = defaultEmp === 'Liverpool'
            ? `Proveedor Liverpool ${it.noProveedor || idx + 1}`
            : `Proveedor Suburbia ${it.noProveedor || idx + 1}`;
        }
        return {
          ...it,
          razonSocial: razon
        };
      });
    };

    return {
      pestaña: raw?.pestaña || 'Resumen Letras',
      liverpool: sanitize(raw?.liverpool, 'Liverpool'),
      suburbia: sanitize(raw?.suburbia, 'Suburbia'),
      lastUpdated: raw?.lastUpdated
    };
  }, [topProveedores]);

  // Si hay registros cargados dinámicamente con desglose de proveedores, enriquecer solo si no provienen de fechas
  const compiledData = useMemo(() => {
    const livList = [...(baseData.liverpool || [])];
    const subList = [...(baseData.suburbia || [])];

    // Si baseData ya contiene la lista de proveedores extraída de Resumen Letras, mantenerla
    const hasValidLiv = livList.length > 0 && livList.some(item => item.razonSocial && !isDateVal(item.razonSocial));
    const hasValidSub = subList.length > 0 && subList.some(item => item.razonSocial && !isDateVal(item.razonSocial));

    if ((!hasValidLiv || !hasValidSub) && records.length > 0) {
      const livRecs = records.filter(r => r.empresa === 'Liverpool' || r.columnaOrigen === 'D');
      const subRecs = records.filter(r => r.empresa === 'Suburbia' || r.columnaOrigen === 'T');

      if (!hasValidLiv && livRecs.length > 0) {
        const livAgg = new Map<string, { noProv: string; razon: string; conteo: number; importe: number }>();
        livRecs.forEach((r, idx) => {
          const rawProv = r.proveedor || '';
          if (isDateVal(rawProv)) return; // Ignorar fechas
          const noProv = r.noProveedorSap || `P${100000 + idx + 1}`;
          const razon = (!isDateVal(rawProv) && !rawProv.includes('Cartera Consolidada')) 
            ? rawProv 
            : `Proveedor Liverpool ${noProv}`;
          const key = (noProv + '__' + razon).toLowerCase();
          const existing = livAgg.get(key) || { noProv, razon, conteo: 0, importe: 0 };
          existing.conteo += 1;
          existing.importe += Math.abs(r.montoNominal * r.tipoCambio);
          livAgg.set(key, existing);
        });

        if (livAgg.size > 0) {
          const totalLivLetras = Array.from(livAgg.values()).reduce((acc, it) => acc + it.conteo, 0) || 1;
          const totalLivImp = Array.from(livAgg.values()).reduce((acc, it) => acc + it.importe, 0) || 1;
          const dynLiv: TopProveedorItem[] = Array.from(livAgg.values())
            .sort((a, b) => b.conteo - a.conteo)
            .slice(0, 15)
            .map((it, idx) => ({
              ranking: idx + 1,
              noProveedor: it.noProv,
              razonSocial: it.razon,
              empresa: 'Liverpool',
              cantidadLetras: it.conteo,
              totalImporte: Number(it.importe.toFixed(2)),
              porcentajeLetras: Number(((it.conteo / totalLivLetras) * 100).toFixed(1)),
              porcentajeImporte: Number(((it.importe / totalLivImp) * 100).toFixed(1))
            }));
          livList.splice(0, livList.length, ...dynLiv);
        }
      }

      if (!hasValidSub && subRecs.length > 0) {
        const subAgg = new Map<string, { noProv: string; razon: string; conteo: number; importe: number }>();
        subRecs.forEach((r, idx) => {
          const rawProv = r.proveedor || '';
          if (isDateVal(rawProv)) return; // Ignorar fechas
          const noProv = r.noProveedorSap || `P${100800 + idx + 1}`;
          const razon = (!isDateVal(rawProv) && !rawProv.includes('Cartera Consolidada'))
            ? rawProv 
            : `Proveedor Suburbia ${noProv}`;
          const key = (noProv + '__' + razon).toLowerCase();
          const existing = subAgg.get(key) || { noProv, razon, conteo: 0, importe: 0 };
          existing.conteo += 1;
          existing.importe += Math.abs(r.montoNominal * r.tipoCambio);
          subAgg.set(key, existing);
        });

        if (subAgg.size > 0) {
          const totalSubLetras = Array.from(subAgg.values()).reduce((acc, it) => acc + it.conteo, 0) || 1;
          const totalSubImp = Array.from(subAgg.values()).reduce((acc, it) => acc + it.importe, 0) || 1;
          const dynSub: TopProveedorItem[] = Array.from(subAgg.values())
            .sort((a, b) => b.conteo - a.conteo)
            .slice(0, 15)
            .map((it, idx) => ({
              ranking: idx + 1,
              noProveedor: it.noProv,
              razonSocial: it.razon,
              empresa: 'Suburbia',
              cantidadLetras: it.conteo,
              totalImporte: Number(it.importe.toFixed(2)),
              porcentajeLetras: Number(((it.conteo / totalSubLetras) * 100).toFixed(1)),
              porcentajeImporte: Number(((it.importe / totalSubImp) * 100).toFixed(1))
            }));
          subList.splice(0, subList.length, ...dynSub);
        }
      }
    }

    return {
      pestaña: baseData.pestaña || 'Resumen Letras',
      liverpool: livList,
      suburbia: subList
    };
  }, [baseData, records]);

  // Selección de proveedores según pestaña y orden
  const displayedItems = useMemo(() => {
    let list: TopProveedorItem[] = [];

    if (selectedBusiness === 'Liverpool') {
      list = [...compiledData.liverpool];
    } else if (selectedBusiness === 'Suburbia') {
      list = [...compiledData.suburbia];
    } else {
      // Consolidado
      list = [...compiledData.liverpool, ...compiledData.suburbia];
    }

    // Filtrar búsqueda
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(item => 
        item.razonSocial.toLowerCase().includes(q) || 
        item.noProveedor.toLowerCase().includes(q)
      );
    }

    // Ordenamiento solicitado: mayor cantidad de letras o por importe
    if (sortBy === 'cantidad') {
      list.sort((a, b) => b.cantidadLetras - a.cantidadLetras);
    } else {
      list.sort((a, b) => b.totalImporte - a.totalImporte);
    }

    // Reasignar ranking secuencial después del orden y filtro
    const ranked = list.map((item, idx) => ({
      ...item,
      ranking: idx + 1
    }));

    return limitCount > 0 ? ranked.slice(0, limitCount) : ranked;
  }, [compiledData, selectedBusiness, sortBy, limitCount, searchQuery]);

  // Totales de la selección mostrada
  const totalLetrasVisible = displayedItems.reduce((acc, it) => acc + it.cantidadLetras, 0);
  const totalImporteVisible = displayedItems.reduce((acc, it) => acc + it.totalImporte, 0);
  const maxLetrasInList = Math.max(...displayedItems.map(it => it.cantidadLetras), 1);

  // Formateador de moneda MXN (sin centavos)
  const formatMxn = (val: number): string => {
    return `$${val.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} MXN`;
  };

  const handleExportExcel = () => {
    const exportData = displayedItems.map(item => ({
      'Ranking': `#${item.ranking}`,
      'Negocio': item.empresa,
      'No. Proveedor': item.noProveedor,
      'Razón Social': item.razonSocial,
      'Cantidad Letras Negociadas': item.cantidadLetras,
      'Importe Total Negociado ($ MXN)': item.totalImporte,
      '% Letras Negocio': `${item.porcentajeLetras || 0}%`,
      'Pestaña Origen': 'Resumen Letras',
      'Columnas Excel': item.empresa === 'Liverpool' ? 'Cols D, E, F, G' : 'Cols T, U, V, W / AC, AD, AE'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    worksheet['!cols'] = [
      { wch: 10 },
      { wch: 14 },
      { wch: 16 },
      { wch: 42 },
      { wch: 25 },
      { wch: 28 },
      { wch: 18 },
      { wch: 18 },
      { wch: 22 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Top10_${selectedBusiness}`);
    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `TOP_10_Proveedores_${selectedBusiness}_Factoraje_${today}.xlsx`);
  };

  return (
    <div className="lg:col-span-7 bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-pink-100/60 flex flex-col justify-between transition-all hover:shadow-md">
      
      {/* Header with Title and Origin Badge */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-pink-100/80 text-[#FF2D8D]">
                <Trophy className="w-4 h-4" />
              </div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span>TOP 10 PROVEEDORES · LETRAS NEGOCIADAS</span>
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
              <span>Mayor cantidad de letras negociadas por negocio</span>
              <span className="font-semibold text-slate-400">•</span>
              <span className="font-mono text-[#FF2D8D] font-bold">
                Pestaña “{compiledData.pestaña}”
              </span>
            </p>
          </div>

          {/* Business Tabs (Liverpool / Suburbia / Consolidado) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl gap-1 shrink-0">
            <button
              onClick={() => setSelectedBusiness('Liverpool')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                selectedBusiness === 'Liverpool'
                  ? 'bg-white text-[#FF2D8D] shadow-xs ring-1 ring-pink-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#FF2D8D]" />
              <span>Liverpool</span>
              <span className="text-[9px] font-mono text-slate-400 font-normal hidden md:inline">(D, E, F, G)</span>
            </button>

            <button
              onClick={() => setSelectedBusiness('Suburbia')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                selectedBusiness === 'Suburbia'
                  ? 'bg-white text-[#201B4B] shadow-xs ring-1 ring-purple-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#201B4B]" />
              <span>Suburbia</span>
              <span className="text-[9px] font-mono text-slate-400 font-normal hidden md:inline">(T, U, V, W)</span>
            </button>

            <button
              onClick={() => setSelectedBusiness('Consolidado')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedBusiness === 'Consolidado'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Ambos
            </button>
          </div>
        </div>

        {/* Dynamic Controls Bar: Sorting, Limit, Search & Excel Export */}
        <div className="py-3 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500">Ordenar por:</span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[11px]">
              <button
                onClick={() => setSortBy('cantidad')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                  sortBy === 'cantidad'
                    ? 'bg-white text-[#FF2D8D] shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cantidad de Letras
              </button>
              <button
                onClick={() => setSortBy('importe')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                  sortBy === 'importe'
                    ? 'bg-white text-[#9B30FF] shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Importe Total ($)
              </button>
            </div>

            {/* Limit toggle */}
            <select
              value={limitCount}
              onChange={(e) => setLimitCount(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-bold rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-pink-300"
            >
              <option value={10}>Top 10</option>
              <option value={5}>Top 5</option>
              <option value={15}>Top 15</option>
              <option value={0}>Todos</option>
            </select>
          </div>

          <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
            {/* Search */}
            <div className="relative w-36 sm:w-44">
              <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrar proveedor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-2 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#FF2D8D]"
              />
            </div>

            {/* Export */}
            <button
              onClick={handleExportExcel}
              className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors flex items-center gap-1 shrink-0"
              title="Descargar Top en Excel"
            >
              <Download className="w-3 h-3 text-slate-500" />
              <span className="hidden sm:inline">Exportar</span>
            </button>
          </div>
        </div>

        {/* Dynamic Table Body */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3 w-24">No. Proveedor</th>
                <th className="py-2.5 px-3">Razón Social del Proveedor</th>
                {selectedBusiness === 'Consolidado' && (
                  <th className="py-2.5 px-3 w-24 text-center">Negocio</th>
                )}
                <th className="py-2.5 px-3 w-36 text-right">
                  <span className="cursor-pointer inline-flex items-center gap-1 hover:text-[#FF2D8D]" onClick={() => setSortBy('cantidad')}>
                    <span>Letras Negociadas</span>
                    {sortBy === 'cantidad' && <ArrowUpDown className="w-2.5 h-2.5 text-[#FF2D8D]" />}
                  </span>
                </th>
                <th className="py-2.5 px-3 w-40 text-right">
                  <span className="cursor-pointer inline-flex items-center gap-1 hover:text-[#9B30FF]" onClick={() => setSortBy('importe')}>
                    <span>Importe Total</span>
                    {sortBy === 'importe' && <ArrowUpDown className="w-2.5 h-2.5 text-[#9B30FF]" />}
                  </span>
                </th>
                <th className="py-2.5 px-3 w-20 text-center">% Part.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {displayedItems.length === 0 ? (
                <tr>
                  <td colSpan={selectedBusiness === 'Consolidado' ? 7 : 6} className="py-8 text-center text-slate-400">
                    <FileSpreadsheet className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                    <p className="text-xs font-semibold text-slate-600">No hay proveedores para el filtro seleccionado</p>
                  </td>
                </tr>
              ) : (
                displayedItems.map((item) => {
                  const isTop3 = item.ranking <= 3;
                  const isLiv = item.empresa === 'Liverpool';
                  const pctWidth = Math.min(100, Math.round((item.cantidadLetras / maxLetrasInList) * 100));

                  return (
                    <tr 
                      key={`${item.empresa}_${item.noProveedor}_${item.ranking}`}
                      className={`transition-colors hover:bg-pink-50/20 ${
                        item.ranking === 1 ? 'bg-pink-50/30 font-medium' : ''
                      }`}
                    >
                      {/* Ranking badge */}
                      <td className="py-2 px-3 text-center">
                        <span className={`inline-flex items-center justify-center w-5 h-5 rounded-md text-[11px] font-black font-mono ${
                          item.ranking === 1
                            ? 'bg-[#FF2D8D] text-white shadow-xs'
                            : item.ranking === 2
                            ? 'bg-slate-700 text-white'
                            : item.ranking === 3
                            ? 'bg-amber-600 text-white'
                            : 'text-slate-500 bg-slate-100'
                        }`}>
                          {item.ranking}
                        </span>
                      </td>

                      {/* No. Proveedor (Col E Liverpool / Col U o AC Suburbia) */}
                      <td className="py-2 px-3 font-mono font-bold text-slate-700 text-[11px] whitespace-nowrap">
                        <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-800">
                          {item.noProveedor}
                        </span>
                      </td>

                      {/* Razón Social (Col F Liverpool / Col V o AD Suburbia) */}
                      <td className="py-2 px-3 font-bold text-slate-900 max-w-[200px] truncate" title={item.razonSocial}>
                        {isDateVal(item.razonSocial) 
                          ? (isLiv ? `Proveedor Liverpool ${item.noProveedor}` : `Proveedor Suburbia ${item.noProveedor}`) 
                          : item.razonSocial}
                      </td>

                      {/* Empresa (si es consolidado) */}
                      {selectedBusiness === 'Consolidado' && (
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            isLiv
                              ? 'bg-pink-50 text-[#FF2D8D] border border-pink-200'
                              : 'bg-purple-50 text-[#201B4B] border border-purple-200'
                          }`}>
                            {item.empresa}
                          </span>
                        </td>
                      )}

                      {/* Cantidad de Letras Negociadas (Col D Liverpool / Col T Suburbia) */}
                      <td className="py-2 px-3 text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-mono font-black text-slate-900 tracking-tight tabular-nums text-xs sm:text-[13px]">
                            {item.cantidadLetras.toLocaleString('es-MX')}
                            <span className="text-[10px] font-normal text-slate-500 ml-1">letras</span>
                          </span>
                          <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden mt-0.5">
                            <div 
                              className={`h-full rounded-full ${isLiv ? 'bg-[#FF2D8D]' : 'bg-[#201B4B]'}`}
                              style={{ width: `${pctWidth}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Importe Total Negociado (Col G Liverpool / Col W o AE Suburbia) */}
                      <td className="py-2 px-3 text-right font-mono font-extrabold text-slate-900 text-xs sm:text-[13px] tabular-nums whitespace-nowrap">
                        {formatMxn(item.totalImporte)}
                      </td>

                      {/* % del Negocio */}
                      <td className="py-2 px-3 text-center font-mono font-bold text-slate-600 text-[11px]">
                        <span className="px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded">
                          {item.porcentajeLetras || 0}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Info & Totals */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
        <div className="flex items-center gap-2">
          <span>Total en vista: <strong className="text-slate-900 font-mono font-bold">{totalLetrasVisible.toLocaleString('es-MX')} letras</strong></span>
          <span>•</span>
          <span>Importe: <strong className="text-slate-900 font-mono font-bold">{formatMxn(totalImporteVisible)}</strong></span>
        </div>

        <div className="text-[10px] text-slate-400 font-mono">
          {selectedBusiness === 'Liverpool' 
            ? 'Liverpool: Letras (Col D) · No. Prov (Col E) · Razón Social (Col F) · Importe (Col G)'
            : selectedBusiness === 'Suburbia'
            ? 'Suburbia: Letras (Col T) · No. Prov (Col U / AC) · Razón Social (Col V / AD) · Importe (Col W / AE)'
            : 'Liverpool: Cols D, E, F, G · Suburbia: Cols T, U, V, W'}
        </div>
      </div>

    </div>
  );
};
