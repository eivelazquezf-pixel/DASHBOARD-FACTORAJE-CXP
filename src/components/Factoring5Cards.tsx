import React from 'react';
import { Factoring5CardsSummary } from '../types/factoring';
import { 
  CheckCircle2, 
  Clock, 
  Layers,
  FileSpreadsheet
} from 'lucide-react';

interface Factoring5CardsProps {
  summary: Factoring5CardsSummary;
  activeFilter?: 'all' | 'liv_op' | 'liv_noop' | 'sub_op' | 'sub_noop';
  onFilterChange?: (filter: 'all' | 'liv_op' | 'liv_noop' | 'sub_op' | 'sub_noop') => void;
}

export const Factoring5Cards: React.FC<Factoring5CardsProps> = ({
  summary,
  activeFilter = 'all',
  onFilterChange
}) => {
  const formatMxn = (val: number) => {
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

  const formatConteo = (val: number) => {
    return `${val.toLocaleString('es-MX')} letras`;
  };

  return (
    <div className="space-y-2.5">
      {/* Section Title with Verified Source Badge */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF2D8D] shadow-sm" />
          <h2 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wider">
            Control Financiero de Factoraje 2026
          </h2>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            Fuente: Pestaña “Resumen Letras”
          </span>
        </div>
      </div>

      {/* 5 Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        
        {/* ========================================================
            1RA TARJETA: Factoraje 2026 - Total de Letras
            Conteo: D, L, T, AB | Suma Importe: G, O, W, AE
            Pestaña: "Resumen de Letras"
           ======================================================== */}
        <div
          onClick={() => onFilterChange && onFilterChange('all')}
          className={`cursor-pointer rounded-2xl p-4 transition-all duration-200 border relative overflow-hidden flex flex-col justify-between ${
            activeFilter === 'all'
              ? 'bg-gradient-to-br from-[#201B4B] to-[#362E73] text-white border-[#201B4B] shadow-md ring-2 ring-[#FF2D8D]/50'
              : 'bg-white hover:bg-slate-50 text-slate-800 border-pink-100 shadow-sm'
          }`}
        >
          {/* Top Row: Title & Icon */}
          <div>
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className={`text-xs font-bold tracking-tight block ${
                  activeFilter === 'all' ? 'text-white' : 'text-slate-900'
                }`}>
                  Factoraje 2026 - Total de Letras
                </span>
                <span className={`text-[10px] font-medium block mt-0.5 ${
                  activeFilter === 'all' ? 'text-pink-200' : 'text-slate-500'
                }`}>
                  Pestaña “Resumen Letras”
                </span>
              </div>
              <div className={`p-1.5 rounded-lg shrink-0 ${
                activeFilter === 'all' ? 'bg-white/10 text-pink-300' : 'bg-pink-50 text-[#FF2D8D]'
              }`}>
                <Layers className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Amount and Count */}
          <div className="mt-4 pt-3 border-t border-slate-100/20">
            <div className={`text-lg lg:text-xl font-extrabold font-mono tracking-tight tabular-nums ${
              activeFilter === 'all' ? 'text-white' : 'text-slate-900'
            }`}>
              {formatMxn(summary.total2026.importe)}
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className={activeFilter === 'all' ? 'text-pink-200' : 'text-slate-500'}>
                Conteo Total:
              </span>
              <strong className={`font-mono font-bold ${
                activeFilter === 'all' ? 'text-white' : 'text-[#FF2D8D]'
              }`}>
                {formatConteo(summary.total2026.conteo)}
              </strong>
            </div>
          </div>
        </div>

        {/* ========================================================
            2DA TARJETA: Liverpool / Letras Operadas
            Conteo: D | Suma Importe: G
            Pestaña: "Resumen de Letras"
           ======================================================== */}
        <div
          onClick={() => onFilterChange && onFilterChange('liv_op')}
          className={`cursor-pointer rounded-2xl p-4 transition-all duration-200 border relative overflow-hidden flex flex-col justify-between ${
            activeFilter === 'liv_op'
              ? 'bg-[#FF2D8D] text-white border-[#FF2D8D] shadow-md ring-2 ring-[#FF2D8D]/40'
              : 'bg-white hover:bg-pink-50/40 text-slate-800 border-pink-100 shadow-sm'
          }`}
        >
          <div>
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className={`text-base font-black tracking-tight block leading-tight ${
                  activeFilter === 'liv_op' ? 'text-white' : 'text-slate-900'
                }`}>
                  Liverpool
                </span>
                <span className={`text-xs font-semibold block mt-0.5 ${
                  activeFilter === 'liv_op' ? 'text-pink-100' : 'text-[#FF2D8D]'
                }`}>
                  Letras Operadas
                </span>
                <span className={`text-[10px] block mt-0.5 ${
                  activeFilter === 'liv_op' ? 'text-pink-100/80' : 'text-slate-400'
                }`}>
                  Resumen Letras
                </span>
              </div>
              <div className={`p-1.5 rounded-lg shrink-0 ${
                activeFilter === 'liv_op' ? 'bg-white/20 text-white' : 'bg-pink-50 text-[#FF2D8D]'
              }`}>
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Amount and Count */}
          <div className="mt-4 pt-3 border-t border-slate-100/20">
            <div className={`text-lg lg:text-xl font-extrabold font-mono tracking-tight tabular-nums ${
              activeFilter === 'liv_op' ? 'text-white' : 'text-slate-900'
            }`}>
              {formatMxn(summary.liverpoolOperadas.importe)}
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className={activeFilter === 'liv_op' ? 'text-pink-100' : 'text-slate-500'}>
                Conteo:
              </span>
              <strong className={`font-mono font-bold ${
                activeFilter === 'liv_op' ? 'text-white' : 'text-[#FF2D8D]'
              }`}>
                {formatConteo(summary.liverpoolOperadas.conteo)}
              </strong>
            </div>
          </div>
        </div>

        {/* ========================================================
            3RA TARJETA: Liverpool / Letras NO Operadas
            Conteo: L | Suma Importe: O
            Pestaña: "Resumen Letras"
           ======================================================== */}
        <div
          onClick={() => onFilterChange && onFilterChange('liv_noop')}
          className={`cursor-pointer rounded-2xl p-4 transition-all duration-200 border relative overflow-hidden flex flex-col justify-between ${
            activeFilter === 'liv_noop'
              ? 'bg-[#201B4B] text-white border-[#201B4B] shadow-md ring-2 ring-slate-400/50'
              : 'bg-white hover:bg-slate-50 text-slate-800 border-pink-100 shadow-sm'
          }`}
        >
          <div>
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className={`text-base font-black tracking-tight block leading-tight ${
                  activeFilter === 'liv_noop' ? 'text-white' : 'text-slate-900'
                }`}>
                  Liverpool
                </span>
                <span className={`text-xs font-semibold block mt-0.5 ${
                  activeFilter === 'liv_noop' ? 'text-slate-200' : 'text-slate-600'
                }`}>
                  Letras NO Operadas
                </span>
                <span className={`text-[10px] block mt-0.5 ${
                  activeFilter === 'liv_noop' ? 'text-slate-300/80' : 'text-slate-400'
                }`}>
                  Resumen Letras
                </span>
              </div>
              <div className={`p-1.5 rounded-lg shrink-0 ${
                activeFilter === 'liv_noop' ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                <Clock className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Amount and Count */}
          <div className="mt-4 pt-3 border-t border-slate-100/20">
            <div className={`text-lg lg:text-xl font-extrabold font-mono tracking-tight tabular-nums ${
              activeFilter === 'liv_noop' ? 'text-white' : 'text-slate-900'
            }`}>
              {formatMxn(summary.liverpoolNoOperadas.importe)}
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className={activeFilter === 'liv_noop' ? 'text-slate-300' : 'text-slate-500'}>
                Conteo:
              </span>
              <strong className={`font-mono font-bold ${
                activeFilter === 'liv_noop' ? 'text-white' : 'text-slate-700'
              }`}>
                {formatConteo(summary.liverpoolNoOperadas.conteo)}
              </strong>
            </div>
          </div>
        </div>

        {/* ========================================================
            4TA TARJETA: Suburbia / Letras Operadas
            Conteo: T | Suma Importe: W
            Pestaña: "Resumen Letras"
           ======================================================== */}
        <div
          onClick={() => onFilterChange && onFilterChange('sub_op')}
          className={`cursor-pointer rounded-2xl p-4 transition-all duration-200 border relative overflow-hidden flex flex-col justify-between ${
            activeFilter === 'sub_op'
              ? 'bg-[#9B30FF] text-white border-[#9B30FF] shadow-md ring-2 ring-[#9B30FF]/40'
              : 'bg-white hover:bg-purple-50/40 text-slate-800 border-pink-100 shadow-sm'
          }`}
        >
          <div>
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className={`text-base font-black tracking-tight block leading-tight ${
                  activeFilter === 'sub_op' ? 'text-white' : 'text-slate-900'
                }`}>
                  Suburbia
                </span>
                <span className={`text-xs font-semibold block mt-0.5 ${
                  activeFilter === 'sub_op' ? 'text-purple-100' : 'text-[#9B30FF]'
                }`}>
                  Letras Operadas
                </span>
                <span className={`text-[10px] block mt-0.5 ${
                  activeFilter === 'sub_op' ? 'text-purple-200/80' : 'text-slate-400'
                }`}>
                  Resumen Letras
                </span>
              </div>
              <div className={`p-1.5 rounded-lg shrink-0 ${
                activeFilter === 'sub_op' ? 'bg-white/20 text-white' : 'bg-purple-50 text-[#9B30FF]'
              }`}>
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Amount and Count */}
          <div className="mt-4 pt-3 border-t border-slate-100/20">
            <div className={`text-lg lg:text-xl font-extrabold font-mono tracking-tight tabular-nums ${
              activeFilter === 'sub_op' ? 'text-white' : 'text-slate-900'
            }`}>
              {formatMxn(summary.suburbiaOperadas.importe)}
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className={activeFilter === 'sub_op' ? 'text-purple-100' : 'text-slate-500'}>
                Conteo:
              </span>
              <strong className={`font-mono font-bold ${
                activeFilter === 'sub_op' ? 'text-white' : 'text-[#9B30FF]'
              }`}>
                {formatConteo(summary.suburbiaOperadas.conteo)}
              </strong>
            </div>
          </div>
        </div>

        {/* ========================================================
            5TA TARJETA: Suburbia / Letras No Operadas
            Conteo: AB | Suma Importe: AE
            Pestaña: "Resumen Letras"
           ======================================================== */}
        <div
          onClick={() => onFilterChange && onFilterChange('sub_noop')}
          className={`cursor-pointer rounded-2xl p-4 transition-all duration-200 border relative overflow-hidden flex flex-col justify-between ${
            activeFilter === 'sub_noop'
              ? 'bg-[#362E73] text-white border-[#362E73] shadow-md ring-2 ring-purple-300/50'
              : 'bg-white hover:bg-slate-50 text-slate-800 border-pink-100 shadow-sm'
          }`}
        >
          <div>
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className={`text-base font-black tracking-tight block leading-tight ${
                  activeFilter === 'sub_noop' ? 'text-white' : 'text-slate-900'
                }`}>
                  Suburbia
                </span>
                <span className={`text-xs font-semibold block mt-0.5 ${
                  activeFilter === 'sub_noop' ? 'text-purple-200' : 'text-slate-600'
                }`}>
                  Letras No Operadas
                </span>
                <span className={`text-[10px] block mt-0.5 ${
                  activeFilter === 'sub_noop' ? 'text-purple-200/80' : 'text-slate-400'
                }`}>
                  Resumen Letras
                </span>
              </div>
              <div className={`p-1.5 rounded-lg shrink-0 ${
                activeFilter === 'sub_noop' ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                <Clock className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Amount and Count */}
          <div className="mt-4 pt-3 border-t border-slate-100/20">
            <div className={`text-lg lg:text-xl font-extrabold font-mono tracking-tight tabular-nums ${
              activeFilter === 'sub_noop' ? 'text-white' : 'text-slate-900'
            }`}>
              {formatMxn(summary.suburbiaNoOperadas.importe)}
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className={activeFilter === 'sub_noop' ? 'text-purple-200' : 'text-slate-500'}>
                Conteo:
              </span>
              <strong className={`font-mono font-bold ${
                activeFilter === 'sub_noop' ? 'text-white' : 'text-slate-700'
              }`}>
                {formatConteo(summary.suburbiaNoOperadas.conteo)}
              </strong>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
