import React, { useState, useRef } from 'react';
import { FactoringRecord, ProveedoresData, TopProveedoresData, CurvaOperacionData } from '../types/factoring';
import { 
  FileText, 
  Eye, 
  TrendingUp, 
  Building2, 
  DollarSign, 
  Clock, 
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Users,
  Store,
  FileDown,
  Loader2
} from 'lucide-react';

import { calculate5CardsSummary } from '../utils/columnCalculator';
import { loadSavedProveedores } from '../utils/storage';
import { TopProveedoresTableCard } from './TopProveedoresTableCard';
import { CurvaOperacionLetrasCard } from './CurvaOperacionLetrasCard';
import { generateExecutiveDashboardPdf } from '../utils/pdfGenerator';

interface ImageExactDashboardProps {
  records: FactoringRecord[];
  allRecords: FactoringRecord[];
  onSelectRecord: (r: FactoringRecord) => void;
  onOpenUpload: () => void;
  onViewTable: () => void;
  active5CardsFilter?: 'all' | 'liv_op' | 'liv_noop' | 'sub_op' | 'sub_noop';
  on5CardsFilterChange?: (filter: 'all' | 'liv_op' | 'liv_noop' | 'sub_op' | 'sub_noop') => void;
  proveedores?: ProveedoresData;
  onOpenProveedores?: () => void;
  topProveedores?: TopProveedoresData;
  curvaOperacion?: CurvaOperacionData;
}

export const ImageExactDashboard: React.FC<ImageExactDashboardProps> = ({
  records,
  allRecords,
  onSelectRecord,
  onOpenUpload,
  onViewTable,
  active5CardsFilter = 'all',
  on5CardsFilterChange,
  proveedores,
  onOpenProveedores,
  topProveedores,
  curvaOperacion
}) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);
  // 5 Tarjetas solicitadas por columnas: D, G, L, O, T, W, AB, AE (Pestaña "Resumen Letras")
  const fiveCardsSummary = calculate5CardsSummary(allRecords);

  // Cálculos precisos solicitados:
  // 1. Liverpool
  const livOpConteo = fiveCardsSummary.liverpoolOperadas.conteo;
  const livOpImporte = fiveCardsSummary.liverpoolOperadas.importe;
  const livNoOpConteo = fiveCardsSummary.liverpoolNoOperadas.conteo;
  const livNoOpImporte = fiveCardsSummary.liverpoolNoOperadas.importe;

  const livTotalConteo = livOpConteo + livNoOpConteo;
  const livTotalImporte = Number((livOpImporte + livNoOpImporte).toFixed(2));

  // 2. Suburbia
  const subOpConteo = fiveCardsSummary.suburbiaOperadas.conteo;
  const subOpImporte = fiveCardsSummary.suburbiaOperadas.importe;
  const subNoOpConteo = fiveCardsSummary.suburbiaNoOperadas.conteo;
  const subNoOpImporte = fiveCardsSummary.suburbiaNoOperadas.importe;

  const subTotalConteo = subOpConteo + subNoOpConteo;
  const subTotalImporte = Number((subOpImporte + subNoOpImporte).toFixed(2));

  // 3. Totales Consolidados y Estatus Operativo
  const grandTotalConteo = fiveCardsSummary.total2026.conteo > 0 
    ? fiveCardsSummary.total2026.conteo 
    : (livTotalConteo + subTotalConteo);
  const grandTotalImporte = fiveCardsSummary.total2026.importe !== 0 
    ? fiveCardsSummary.total2026.importe 
    : Number((livTotalImporte + subTotalImporte).toFixed(2));

  // Porcentaje de letras de acuerdo al conteo de letras por negocio sobre el Total:
  const livPctLetras = grandTotalConteo > 0 ? ((livTotalConteo / grandTotalConteo) * 100) : 80.95;
  const subPctLetras = grandTotalConteo > 0 ? ((subTotalConteo / grandTotalConteo) * 100) : 19.05;

  // Porcentaje interno de operación por negocio:
  const livOpPct = livTotalConteo > 0 ? ((livOpConteo / livTotalConteo) * 100) : 69.44;
  const livNoOpPct = livTotalConteo > 0 ? ((livNoOpConteo / livTotalConteo) * 100) : 30.56;

  const subOpPct = subTotalConteo > 0 ? ((subOpConteo / subTotalConteo) * 100) : 63.91;
  const subNoOpPct = subTotalConteo > 0 ? ((subNoOpConteo / subTotalConteo) * 100) : 36.09;

  // División Operado vs No Operado Global:
  const totalOpConteo = livOpConteo + subOpConteo;
  const totalNoOpConteo = livNoOpConteo + subNoOpConteo;
  const totalOpImporte = Number((livOpImporte + subOpImporte).toFixed(2));
  const totalNoOpImporte = Number((livNoOpImporte + subNoOpImporte).toFixed(2));

  const totalOpPctLetras = grandTotalConteo > 0 ? ((totalOpConteo / grandTotalConteo) * 100) : 68.39;
  const totalNoOpPctLetras = grandTotalConteo > 0 ? ((totalNoOpConteo / grandTotalConteo) * 100) : 31.61;

  // Formatters contables (sin centavos)
  const formatMxnFull = (val: number) => {
    if (val < 0) {
      return `- $${Math.abs(val).toLocaleString('es-MX', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      })}`;
    }
    return `$${val.toLocaleString('es-MX', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`;
  };

  const formatMxnCompact = (val: number) => {
    const abs = Math.abs(val);
    const sign = val < 0 ? '- ' : '';
    if (abs >= 1_000_000_000) {
      return `${sign}$${(abs / 1_000_000_000).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}B`;
    }
    if (abs >= 1_000_000) {
      return `${sign}$${(abs / 1_000_000).toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
    }
    return formatMxnFull(val);
  };

  // Financial computations based on active records
  const totalNominal = records.reduce((s, r) => s + (r.montoNominal * r.tipoCambio), 0);
  const totalNeto = records.reduce((s, r) => s + (r.montoNeto * r.tipoCambio), 0);

  // Weighted rate
  const rateSum = records.reduce((s, r) => s + (r.tasaDescuento * r.montoNominal * r.tipoCambio), 0);
  const avgRate = totalNominal > 0 ? (rateSum / totalNominal) : 11.25;

  // DPO
  const dpoSum = records.reduce((s, r) => s + (r.plazoDias * r.montoNominal * r.tipoCambio), 0);
  const avgDpo = totalNominal > 0 ? Math.round(dpoSum / totalNominal) : 58;

  // Cartera de proveedores por negocio (Pestaña "Proveedores": Columna A Liverpool · Columna H Suburbia)
  const provData = proveedores || loadSavedProveedores();
  const livProvCount = provData.liverpool?.length || 0;
  const subProvCount = provData.suburbia?.length || 0;
  const totalProvCount = livProvCount + subProvCount;
  const livProvPct = totalProvCount > 0 ? (livProvCount / totalProvCount) * 100 : 0;
  const subProvPct = totalProvCount > 0 ? (subProvCount / totalProvCount) * 100 : 0;

  // Active / Vigente percentage
  const totalActiva = records.filter(r => r.estatus === 'Vigente' || r.estatus === 'Por Vencer').length;
  const activaPct = records.length > 0 ? Math.round((totalActiva / records.length) * 100) : 75;

  // Weekly / Bank distribution for the vertical bar chart
  const barChartDays = [
    { label: 'SUN', val: 78, color: '#FF2D8D', subVal: '$78M' },
    { label: 'MON', val: 38, color: '#9B30FF', subVal: '$38M' },
    { label: 'TUE', val: 55, color: '#201B4B', subVal: '$55M' },
    { label: 'WEN', val: 46, color: '#FF2D8D', subVal: '$46M' },
    { label: 'THU', val: 70, color: '#9B30FF', subVal: '$70M' },
    { label: 'FRI', val: 30, color: '#201B4B', subVal: '$30M' },
    { label: 'SAT', val: 52, color: '#FF2D8D', subVal: '$52M' },
    { label: 'SUN', val: 36, color: '#201B4B', subVal: '$36M' },
    { label: 'MON', val: 45, color: '#FF2D8D', subVal: '$45M' },
    { label: 'TUE', val: 82, color: '#9B30FF', subVal: '$82M' },
    { label: 'WED', val: 50, color: '#FF2D8D', subVal: '$50M' },
  ];

  const fmtM = (val: number) => `$${(val / 1_000_000).toFixed(1)}M`;

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      setPdfError(null);
      await generateExecutiveDashboardPdf({
        records,
        allRecords,
        proveedores: provData,
        topProveedores,
        curvaOperacion,
        containerElement: dashboardRef.current
      });
    } catch (err: any) {
      console.error('Error al generar la presentación ejecutiva en PDF:', err);
      setPdfError('Ocurrió un error al generar la presentación PDF. Intente nuevamente.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div ref={dashboardRef} className="space-y-6">
      
      {/* BARRA SUPERIOR EJECUTIVA: TÍTULO Y BOTÓN DE DESCARGA DE PRESENTACIÓN (.PDF) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-pink-100/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF2D8D] animate-pulse" />
            <span className="text-[11px] font-black tracking-wider uppercase text-[#FF2D8D]">
              Factoraje "Puerto de Liverpool" · Liverpool &amp; Suburbia
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mt-0.5">
            Dashboard Ejecutivo de Operación 2026
          </h2>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
          {pdfError && (
            <span className="text-xs text-rose-600 font-semibold">{pdfError}</span>
          )}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#201B4B] via-[#2A2362] to-[#FF2D8D] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            title="Descargar presentación ejecutiva en formato .pdf"
          >
            {isGeneratingPdf ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-pink-300" />
                <span>Generando Presentación PDF...</span>
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4 text-pink-300" />
                <span>Descargar Presentación (.pdf)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ROW 1: Tres Tarjetas Circulares: Porcentaje de Letras y Sumatoria de Importe por Negocio y Operado/No Operado */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* ========================================================
            CARD 1: LIVERPOOL (Porcentaje de Letras y Sumatoria de Importe)
           ======================================================== */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-pink-100/60 flex flex-col justify-between relative overflow-hidden transition-all hover:shadow-md">
          <div className="flex items-center gap-5">
            
            {/* Circular Ring Pink SVG con Porcentaje de Letras Liverpool */}
            <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="stroke-pink-100 fill-none"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="stroke-[#FF2D8D] fill-none transition-all duration-700"
                  strokeWidth="8"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 * (1 - Math.min(100, livPctLetras) / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-black text-slate-800 tracking-tight font-mono">
                  {livPctLetras.toFixed(1)}%
                </span>
                <span className="text-[9px] font-bold text-slate-400 block uppercase -mt-0.5">
                  de letras
                </span>
              </div>
            </div>

            {/* Label, Sumatoria de Importe y Desglose */}
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-black text-[#FF2D8D] tracking-wide uppercase">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF2D8D] shadow-xs" />
                <span className="text-sm">Liverpool</span>
              </div>
              <div className="text-base lg:text-lg font-black font-mono text-slate-900 tracking-tight tabular-nums truncate">
                {formatMxnFull(livTotalImporte)}
              </div>
              <p className="text-[11px] font-semibold text-slate-600">
                {livTotalConteo.toLocaleString('es-MX')} letras <span className="text-[#FF2D8D] font-extrabold font-mono">({livPctLetras.toFixed(1)}% del total)</span>
              </p>

              {/* Desglose Operadas vs No Operadas de Liverpool */}
              <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2.5">
                <div className="bg-pink-50/70 rounded-2xl p-2.5 sm:p-3 border border-pink-200/70 shadow-2xs">
                  <span className="text-xs sm:text-[13px] font-bold text-slate-700 block leading-tight">
                    Operadas ({livOpPct.toFixed(1)}%):
                  </span>
                  <strong className="text-sm sm:text-base font-black text-slate-900 font-mono block mt-1 tracking-tight tabular-nums">
                    {livOpConteo.toLocaleString('es-MX')} letras
                  </strong>
                  <span className="text-xs sm:text-[13px] font-extrabold text-[#FF2D8D] font-mono block mt-0.5 truncate tabular-nums">
                    {formatMxnCompact(livOpImporte)}
                  </span>
                </div>
                <div className="bg-slate-50 rounded-2xl p-2.5 sm:p-3 border border-slate-200/80 shadow-2xs">
                  <span className="text-xs sm:text-[13px] font-bold text-slate-700 block leading-tight">
                    No Operadas ({livNoOpPct.toFixed(1)}%):
                  </span>
                  <strong className="text-sm sm:text-base font-black text-slate-900 font-mono block mt-1 tracking-tight tabular-nums">
                    {livNoOpConteo.toLocaleString('es-MX')} letras
                  </strong>
                  <span className="text-xs sm:text-[13px] font-extrabold text-slate-600 font-mono block mt-0.5 truncate tabular-nums">
                    {formatMxnCompact(livNoOpImporte)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Slider & Label */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            <div className="flex-1 relative flex items-center">
              <div className="w-full h-1.5 bg-pink-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#FF2D8D] rounded-full transition-all duration-500" 
                  style={{ width: `${livOpPct}%` }}
                />
              </div>
              <div 
                className="w-3.5 h-3.5 rounded-full bg-white border-2 border-[#FF2D8D] absolute -translate-x-1/2 shadow-xs"
                style={{ left: `${livOpPct}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-slate-700 font-mono whitespace-nowrap">
              {livOpPct.toFixed(1)}% OPERADAS ({livOpConteo.toLocaleString('es-MX')})
            </span>
          </div>
        </div>

        {/* ========================================================
            CARD 2: SUBURBIA (Porcentaje de Letras y Sumatoria de Importe)
           ======================================================== */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-pink-100/60 flex flex-col justify-between relative overflow-hidden transition-all hover:shadow-md">
          <div className="flex items-center gap-5">
            
            {/* Circular Ring Navy SVG con Porcentaje de Letras Suburbia */}
            <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="stroke-slate-100 fill-none"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="stroke-[#201B4B] fill-none transition-all duration-700"
                  strokeWidth="8"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 * (1 - Math.min(100, subPctLetras) / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-black text-[#201B4B] tracking-tight font-mono">
                  {subPctLetras.toFixed(1)}%
                </span>
                <span className="text-[9px] font-bold text-slate-400 block uppercase -mt-0.5">
                  de letras
                </span>
              </div>
            </div>

            {/* Label, Sumatoria de Importe y Desglose */}
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-black text-[#201B4B] tracking-wide uppercase">
                <span className="w-2.5 h-2.5 rounded-full bg-[#201B4B] shadow-xs" />
                <span className="text-sm">Suburbia</span>
              </div>
              <div className="text-base lg:text-lg font-black font-mono text-slate-900 tracking-tight tabular-nums truncate">
                {formatMxnFull(subTotalImporte)}
              </div>
              <p className="text-[11px] font-semibold text-slate-600">
                {subTotalConteo.toLocaleString('es-MX')} letras <span className="text-[#201B4B] font-extrabold font-mono">({subPctLetras.toFixed(1)}% del total)</span>
              </p>

              {/* Desglose Operadas vs No Operadas de Suburbia */}
              <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2.5">
                <div className="bg-purple-50/70 rounded-2xl p-2.5 sm:p-3 border border-purple-200/70 shadow-2xs">
                  <span className="text-xs sm:text-[13px] font-bold text-slate-700 block leading-tight">
                    Operadas ({subOpPct.toFixed(1)}%):
                  </span>
                  <strong className="text-sm sm:text-base font-black text-slate-900 font-mono block mt-1 tracking-tight tabular-nums">
                    {subOpConteo.toLocaleString('es-MX')} letras
                  </strong>
                  <span className="text-xs sm:text-[13px] font-extrabold text-[#9B30FF] font-mono block mt-0.5 truncate tabular-nums">
                    {formatMxnCompact(subOpImporte)}
                  </span>
                </div>
                <div className="bg-slate-50 rounded-2xl p-2.5 sm:p-3 border border-slate-200/80 shadow-2xs">
                  <span className="text-xs sm:text-[13px] font-bold text-slate-700 block leading-tight">
                    No Operadas ({subNoOpPct.toFixed(1)}%):
                  </span>
                  <strong className="text-sm sm:text-base font-black text-slate-900 font-mono block mt-1 tracking-tight tabular-nums">
                    {subNoOpConteo.toLocaleString('es-MX')} letras
                  </strong>
                  <span className="text-xs sm:text-[13px] font-extrabold text-slate-600 font-mono block mt-0.5 truncate tabular-nums">
                    {formatMxnCompact(subNoOpImporte)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Slider & Label */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            <div className="flex-1 relative flex items-center">
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#201B4B] rounded-full transition-all duration-500" 
                  style={{ width: `${subOpPct}%` }}
                />
              </div>
              <div 
                className="w-3.5 h-3.5 rounded-full bg-white border-2 border-[#201B4B] absolute -translate-x-1/2 shadow-xs"
                style={{ left: `${subOpPct}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-slate-700 font-mono whitespace-nowrap">
              {subOpPct.toFixed(1)}% OPERADAS ({subOpConteo.toLocaleString('es-MX')})
            </span>
          </div>
        </div>

        {/* ========================================================
            CARD 3: LETRAS OPERADAS (LIVERPOOL & SUBURBIA)
           ======================================================== */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-pink-100/60 flex flex-col justify-between relative overflow-hidden transition-all hover:shadow-md">
          <div className="flex items-center gap-5">
            
            {/* Circular Ring Purple SVG con Porcentaje Operado Global */}
            <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="stroke-purple-100 fill-none"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="stroke-[#9B30FF] fill-none transition-all duration-700"
                  strokeWidth="8"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 * (1 - Math.min(100, totalOpPctLetras) / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-black text-[#9B30FF] tracking-tight font-mono">
                  {totalOpPctLetras.toFixed(1)}%
                </span>
                <span className="text-[9px] font-bold text-slate-400 block uppercase -mt-0.5">
                  operado
                </span>
              </div>
            </div>

            {/* Label, Sumatoria Operada y Desglose por Negocio */}
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-black text-[#9B30FF] tracking-wide uppercase">
                <span className="w-2.5 h-2.5 rounded-full bg-[#9B30FF] shadow-xs" />
                <span className="text-xs sm:text-sm">LETRAS OPERADAS (LIVERPOOL &amp; SUBURBIA)</span>
              </div>
              <div className="text-base lg:text-lg font-black font-mono text-slate-900 tracking-tight tabular-nums truncate">
                {formatMxnFull(totalOpImporte)}
              </div>
              <p className="text-[11px] font-semibold text-slate-600">
                {totalOpConteo.toLocaleString('es-MX')} Operadas <span className="text-[#9B30FF] font-extrabold font-mono">({totalOpPctLetras.toFixed(1)}%)</span> · {totalNoOpConteo.toLocaleString('es-MX')} No Op
              </p>

              {/* Desglose dividiendo en lo Operado y No Operado por Negocio */}
              <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2.5">
                <div className="bg-pink-50/70 rounded-2xl p-2.5 sm:p-3 border border-pink-200/70 shadow-2xs">
                  <span className="text-xs sm:text-[13px] font-bold text-slate-700 block leading-tight">
                    Liverpool:
                  </span>
                  <strong className="text-sm sm:text-base font-black text-slate-900 font-mono block mt-1 tracking-tight tabular-nums">
                    {livOpConteo.toLocaleString('es-MX')} Op ({livOpPct.toFixed(1)}%)
                  </strong>
                  <span className="text-xs sm:text-[12px] font-bold text-slate-600 font-mono block mt-0.5 truncate tabular-nums">
                    {livNoOpConteo.toLocaleString('es-MX')} No Op ({formatMxnCompact(livNoOpImporte)})
                  </span>
                </div>
                <div className="bg-purple-50/70 rounded-2xl p-2.5 sm:p-3 border border-purple-200/70 shadow-2xs">
                  <span className="text-xs sm:text-[13px] font-bold text-slate-700 block leading-tight">
                    Suburbia:
                  </span>
                  <strong className="text-sm sm:text-base font-black text-slate-900 font-mono block mt-1 tracking-tight tabular-nums">
                    {subOpConteo.toLocaleString('es-MX')} Op ({subOpPct.toFixed(1)}%)
                  </strong>
                  <span className="text-xs sm:text-[12px] font-bold text-slate-600 font-mono block mt-0.5 truncate tabular-nums">
                    {subNoOpConteo.toLocaleString('es-MX')} No Op ({formatMxnCompact(subNoOpImporte)})
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Slider & Label */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            <div className="flex-1 relative flex items-center">
              <div className="w-full h-1.5 bg-purple-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#9B30FF] rounded-full transition-all duration-500" 
                  style={{ width: `${totalOpPctLetras}%` }}
                />
              </div>
              <div 
                className="w-3.5 h-3.5 rounded-full bg-white border-2 border-[#9B30FF] absolute -translate-x-1/2 shadow-xs"
                style={{ left: `${totalOpPctLetras}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-slate-700 font-mono whitespace-nowrap">
              {totalOpPctLetras.toFixed(1)}% OPERADO GLOBAL ({totalOpConteo.toLocaleString('es-MX')})
            </span>
          </div>

          {/* Action Footer: Ver detalle de Letras */}
          <div className="mt-3 pt-2.5 border-t border-slate-100/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-medium">
              Operación 2026: <strong className="text-slate-800 font-mono font-bold">{totalOpConteo.toLocaleString('es-MX')} letras</strong>
            </span>
            <button 
              onClick={onViewTable}
              className="text-[#9B30FF] hover:text-[#FF2D8D] font-bold text-xs hover:underline flex items-center gap-1 transition-colors group ml-auto"
            >
              <span>Ver detalle de Letras</span>
              <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>

      </div>

      {/* ROW 2: Two Cards (Left: VIEWS with 3 dashed boxes / Right: SUBSCRIPTIONS vertical pill bars) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT CARD: CARTERA DE PROVEEDORES POR NEGOCIO (Liverpool & Suburbia) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 shadow-sm border border-pink-100/60 flex flex-col justify-between">
          
          {/* Card Header */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#FF2D8D]" />
              <span>CARTERA DE PROVEEDORES POR NEGOCIO</span>
            </h3>
            <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
              Pestaña “{provData.pestaña || 'Proveedores'}”
            </span>
          </div>

          {/* TWO INNER CARDS: Una por Liverpool y otra por Suburbia */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 my-1">
            
            {/* INNER CARD 1: LIVERPOOL */}
            <div className="bg-gradient-to-br from-pink-50/80 to-white rounded-2xl p-4 border border-pink-200/90 shadow-2xs flex flex-col justify-between transition-all hover:border-pink-300">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF2D8D] shadow-xs" />
                  <span className="text-sm font-black text-slate-900 tracking-tight">Liverpool</span>
                </div>

                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 tracking-tight tabular-nums">
                    {livProvCount.toLocaleString('es-MX')}
                  </span>
                  <span className="text-xs font-bold text-slate-600">
                    proveedores
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between text-xs font-extrabold text-[#FF2D8D] font-mono">
                  <span>{livProvPct.toFixed(1)}%</span>
                  <span className="text-[11px] font-semibold text-slate-600">de la cartera</span>
                </div>

                {/* Progress bar of portfolio share */}
                <div className="w-full h-1.5 bg-pink-100 rounded-full overflow-hidden mt-1.5">
                  <div 
                    className="h-full bg-[#FF2D8D] rounded-full transition-all duration-500" 
                    style={{ width: `${livProvPct}%` }}
                  />
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-pink-100/80 text-[10px] text-slate-500 font-medium">
                <span>Pestaña “{provData.pestaña}”</span>
              </div>
            </div>

            {/* INNER CARD 2: SUBURBIA */}
            <div className="bg-gradient-to-br from-purple-50/70 to-white rounded-2xl p-4 border border-purple-200/90 shadow-2xs flex flex-col justify-between transition-all hover:border-purple-300">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#201B4B] shadow-xs" />
                  <span className="text-sm font-black text-slate-900 tracking-tight">Suburbia</span>
                </div>

                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 tracking-tight tabular-nums">
                    {subProvCount.toLocaleString('es-MX')}
                  </span>
                  <span className="text-xs font-bold text-slate-600">
                    proveedores
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between text-xs font-extrabold text-[#9B30FF] font-mono">
                  <span>{subProvPct.toFixed(1)}%</span>
                  <span className="text-[11px] font-semibold text-slate-600">de la cartera</span>
                </div>

                {/* Progress bar of portfolio share */}
                <div className="w-full h-1.5 bg-purple-100 rounded-full overflow-hidden mt-1.5">
                  <div 
                    className="h-full bg-[#201B4B] rounded-full transition-all duration-500" 
                    style={{ width: `${subProvPct}%` }}
                  />
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-purple-100/80 text-[10px] text-slate-500 font-medium">
                <span>Pestaña “{provData.pestaña}”</span>
              </div>
            </div>

          </div>

          {/* Bottom Action Footer with requested button name */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">
              Total Cartera: <strong className="text-slate-800 font-mono font-bold">{totalProvCount} proveedores</strong>
            </span>
            <button 
              onClick={onOpenProveedores || onViewTable}
              className="text-[#FF2D8D] hover:text-[#9B30FF] font-bold text-xs hover:underline flex items-center gap-1 transition-colors group"
            >
              <span>Ver detalle de proveedores por negocio</span>
              <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>

        {/* RIGHT CARD: CURVA DE OPERACIÓN DE LETRAS (Identificada de Enero a Diciembre) */}
        <div className="lg:col-span-7">
          <CurvaOperacionLetrasCard
            curvaOperacion={curvaOperacion}
            records={records}
          />
        </div>

      </div>

      {/* ROW 3: TABLA DINÁMICA TOP 10 PROVEEDORES CON MAYOR CANTIDAD DE LETRAS NEGOCIADAS */}
      <div className="w-full">
        <TopProveedoresTableCard
          topProveedores={topProveedores}
          records={records}
        />
      </div>

    </div>
  );
};
