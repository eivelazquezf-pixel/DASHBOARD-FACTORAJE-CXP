import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Calendar, 
  Layers, 
  ChevronRight, 
  BarChart3, 
  Sparkles,
  ArrowUpRight,
  Info
} from 'lucide-react';
import { CurvaOperacionData, MesOperacionItem, FactoringRecord } from '../types/factoring';
import { loadSavedCurvaOperacion } from '../utils/storage';

interface CurvaOperacionLetrasCardProps {
  curvaOperacion?: CurvaOperacionData;
  records?: FactoringRecord[];
}

export const CurvaOperacionLetrasCard: React.FC<CurvaOperacionLetrasCardProps> = ({
  curvaOperacion,
  records = []
}) => {
  const [selectedBusiness, setSelectedBusiness] = useState<'Liverpool' | 'Suburbia' | 'Consolidado'>('Liverpool');
  const [metricMode, setMetricMode] = useState<'letras' | 'importe'>('letras');
  const [hoveredMonthIdx, setHoveredMonthIdx] = useState<number | null>(null);

  // Datos base: cargados de props, storage o agregados de records
  const baseData = useMemo(() => {
    return curvaOperacion || loadSavedCurvaOperacion();
  }, [curvaOperacion]);

  // Si records contiene fechas detalladas en fechaEmision/fechaVencimiento (extraídas de Col C y Col S),
  // permitir sincronización reactiva si no hubiese curvaOperacion
  const monthlyData: MesOperacionItem[] = useMemo(() => {
    if (baseData && Array.isArray(baseData.meses) && baseData.meses.length === 12) {
      return baseData.meses;
    }
    // Fallback inicial
    return [];
  }, [baseData]);

  // Formateador de moneda MXN
  const formatMxn = (val: number): string => {
    if (val >= 1_000_000_000) {
      return `$${(val / 1_000_000_000).toFixed(2)}B MXN`;
    }
    if (val >= 1_000_000) {
      return `$${(val / 1_000_000).toFixed(1)}M MXN`;
    }
    return `$${val.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} MXN`;
  };

  const formatMxnFull = (val: number): string => {
    return `$${val.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} MXN`;
  };

  // Cálculo de totales y valores máximos según filtro
  const { 
    totalLetras, 
    totalImporte, 
    peakMonth, 
    maxVal, 
    monthValues 
  } = useMemo(() => {
    let tLetras = 0;
    let tImporte = 0;
    let max = 1;
    let peakItem: MesOperacionItem = monthlyData[0] || {
      mesIndex: 0,
      mes: 'Ene',
      mesCompleto: 'Enero',
      liverpoolLetras: 0,
      liverpoolImporte: 0,
      suburbiaLetras: 0,
      suburbiaImporte: 0,
      totalLetras: 0,
      totalImporte: 0
    };
    let peakValue = -1;

    const values = monthlyData.map((m) => {
      let lCount = m.liverpoolLetras;
      let lImp = m.liverpoolImporte;
      let sCount = m.suburbiaLetras;
      let sImp = m.suburbiaImporte;

      let currentVal = 0;
      if (selectedBusiness === 'Liverpool') {
        currentVal = metricMode === 'letras' ? lCount : lImp;
        tLetras += lCount;
        tImporte += lImp;
      } else if (selectedBusiness === 'Suburbia') {
        currentVal = metricMode === 'letras' ? sCount : sImp;
        tLetras += sCount;
        tImporte += sImp;
      } else {
        currentVal = metricMode === 'letras' ? m.totalLetras : m.totalImporte;
        tLetras += m.totalLetras;
        tImporte += m.totalImporte;
      }

      if (currentVal > peakValue) {
        peakValue = currentVal;
        peakItem = m;
      }
      if (currentVal > max) {
        max = currentVal;
      }

      return {
        ...m,
        activeValue: currentVal
      };
    });

    return {
      totalLetras: tLetras,
      totalImporte: tImporte,
      peakMonth: peakItem,
      maxVal: max > 0 ? max : 1,
      monthValues: values
    };
  }, [monthlyData, selectedBusiness, metricMode]);

  // Generación de coordenadas para el área y curva SVG (1000px ancho x 220px alto)
  const svgWidth = 1000;
  const svgHeight = 220;
  const paddingX = 40;
  const paddingYTop = 30;
  const paddingYBottom = 35;
  const chartHeight = svgHeight - paddingYTop - paddingYBottom;
  const stepX = (svgWidth - paddingX * 2) / (Math.max(monthValues.length - 1, 1));

  const points = monthValues.map((m, idx) => {
    const x = paddingX + idx * stepX;
    const ratio = m.activeValue / (maxVal * 1.15); // margen superior
    const y = svgHeight - paddingYBottom - (ratio * chartHeight);
    return { x, y, ...m };
  });

  // Generador de curva Bézier suave (Catmull-Rom to Cubic Bezier)
  const pathD = useMemo(() => {
    if (points.length === 0) return '';
    let d = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    return d;
  }, [points]);

  const areaD = useMemo(() => {
    if (points.length === 0 || !pathD) return '';
    const lastPoint = points[points.length - 1];
    const firstPoint = points[0];
    const bottomY = svgHeight - paddingYBottom;
    return `${pathD} L ${lastPoint.x},${bottomY} L ${firstPoint.x},${bottomY} Z`;
  }, [pathD, points, svgHeight, paddingYBottom]);

  // Colores dinámicos según el negocio seleccionado
  const themeColor = selectedBusiness === 'Liverpool' 
    ? '#FF2D8D' 
    : selectedBusiness === 'Suburbia' 
    ? '#201B4B' 
    : '#9B30FF';

  const themeGradientId = selectedBusiness === 'Liverpool'
    ? 'curvaPinkGrad'
    : selectedBusiness === 'Suburbia'
    ? 'curvaPurpleGrad'
    : 'curvaConsolidadoGrad';

  const activeHover = hoveredMonthIdx !== null ? points[hoveredMonthIdx] : null;

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-pink-100/60 flex flex-col justify-between transition-all hover:shadow-md h-full">
      
      {/* Header & Badges */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-pink-100/90 text-[#FF2D8D]">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span>CURVA DE OPERACIÓN DE LETRAS</span>
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center gap-2">
              <span>Identificada por meses (Enero a Diciembre)</span>
              <span className="font-semibold text-slate-400">•</span>
              <span className="font-mono text-[#FF2D8D] font-bold">
                Pestaña “Resumen Letras”
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
              <span className="text-[9px] font-mono text-slate-400 font-normal hidden md:inline">(Col C)</span>
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
              <span className="text-[9px] font-mono text-slate-400 font-normal hidden md:inline">(Col S)</span>
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

        {/* Dynamic Metric Toggle & Peak Month Pill */}
        <div className="py-2.5 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500">Métrica:</span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[11px]">
              <button
                onClick={() => setMetricMode('letras')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                  metricMode === 'letras'
                    ? 'bg-white text-[#FF2D8D] shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cantidad de Letras
              </button>
              <button
                onClick={() => setMetricMode('importe')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                  metricMode === 'importe'
                    ? 'bg-white text-[#9B30FF] shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Importe Total ($)
              </button>
            </div>
          </div>

          {/* Peak month pill */}
          <div className="flex items-center gap-2 text-[11px] bg-pink-50/70 border border-pink-100 rounded-xl px-2.5 py-1">
            <Sparkles className="w-3.5 h-3.5 text-[#FF2D8D]" />
            <span className="text-slate-600">
              Mes con mayor operación: <strong className="text-slate-900 font-extrabold">{peakMonth.mesCompleto}</strong> ({
                metricMode === 'letras' 
                  ? `${(selectedBusiness === 'Liverpool' ? peakMonth.liverpoolLetras : selectedBusiness === 'Suburbia' ? peakMonth.suburbiaLetras : peakMonth.totalLetras).toLocaleString('es-MX')} letras`
                  : formatMxn(selectedBusiness === 'Liverpool' ? peakMonth.liverpoolImporte : selectedBusiness === 'Suburbia' ? peakMonth.suburbiaImporte : peakMonth.totalImporte)
              })
            </span>
          </div>

        </div>

        {/* SVG Curve Container with 12 Month Points */}
        <div className="relative w-full h-56 pt-2 select-none">
          
          {/* Floating Tooltip Callout on Hover */}
          {activeHover && (
            <div 
              className="absolute z-30 -translate-x-1/2 pointer-events-none transition-all duration-150"
              style={{ 
                left: `${(activeHover.x / svgWidth) * 100}%`, 
                top: `${Math.max(10, (activeHover.y / svgHeight) * 100 - 32)}%` 
              }}
            >
              <div className="bg-slate-900 text-white rounded-xl py-1.5 px-3 shadow-xl border border-slate-800 text-[11px] flex flex-col items-center whitespace-nowrap">
                <span className="font-extrabold text-[#FF2D8D] uppercase tracking-wider text-[10px]">
                  {activeHover.mesCompleto} 2026
                </span>
                <span className="font-mono font-bold text-xs">
                  {metricMode === 'letras'
                    ? `${activeHover.activeValue.toLocaleString('es-MX')} letras`
                    : formatMxn(activeHover.activeValue)
                  }
                </span>
                <span className="text-[9px] text-slate-300 font-mono">
                  {selectedBusiness === 'Liverpool'
                    ? `Liverpool: Col C · $${(activeHover.liverpoolImporte / 1_000_000).toFixed(1)}M`
                    : selectedBusiness === 'Suburbia'
                    ? `Suburbia: Col S · $${(activeHover.suburbiaImporte / 1_000_000).toFixed(1)}M`
                    : `Liv: ${activeHover.liverpoolLetras} | Sub: ${activeHover.suburbiaLetras}`
                  }
                </span>
                <div className="w-2 h-2 bg-slate-900 rotate-45 -mb-1 mt-0.5" />
              </div>
            </div>
          )}

          {/* SVG Smooth Curve */}
          <svg 
            className="w-full h-full overflow-visible" 
            viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
            preserveAspectRatio="none"
          >
            <defs>
              {/* Pink Gradient for Liverpool */}
              <linearGradient id="curvaPinkGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FF2D8D" stopOpacity="0.75" />
                <stop offset="60%" stopColor="#FF2D8D" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#FFF0F7" stopOpacity="0.02" />
              </linearGradient>

              {/* Purple Gradient for Suburbia */}
              <linearGradient id="curvaPurpleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#201B4B" stopOpacity="0.75" />
                <stop offset="60%" stopColor="#9B30FF" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#FAF5FF" stopOpacity="0.02" />
              </linearGradient>

              {/* Consolidado Gradient */}
              <linearGradient id="curvaConsolidadoGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#9B30FF" stopOpacity="0.75" />
                <stop offset="50%" stopColor="#FF2D8D" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#FFF5FA" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* Grid horizontal dashed guidelines */}
            <line x1={paddingX} y1={paddingYTop} x2={svgWidth - paddingX} y2={paddingYTop} stroke="#F1F5F9" strokeDasharray="4 4" strokeWidth="1" />
            <line x1={paddingX} y1={paddingYTop + chartHeight / 2} x2={svgWidth - paddingX} y2={paddingYTop + chartHeight / 2} stroke="#F1F5F9" strokeDasharray="4 4" strokeWidth="1" />
            <line x1={paddingX} y1={svgHeight - paddingYBottom} x2={svgWidth - paddingX} y2={svgHeight - paddingYBottom} stroke="#CBD5E1" strokeWidth="1.5" />

            {/* Filled Area under Curve */}
            {areaD && (
              <path
                d={areaD}
                fill={`url(#${themeGradientId})`}
                className="transition-all duration-500"
              />
            )}

            {/* Main Spline Curve Line */}
            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke={themeColor}
                strokeWidth="3"
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            )}

            {/* 12 Interactive Points */}
            {points.map((p, idx) => {
              const isHovered = hoveredMonthIdx === idx;
              const isPeak = p.mesIndex === peakMonth.mesIndex;

              return (
                <g 
                  key={p.mes}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredMonthIdx(idx)}
                  onMouseLeave={() => setHoveredMonthIdx(null)}
                >
                  {/* Invisible broad hover hit target */}
                  <circle cx={p.x} cy={p.y} r="18" fill="transparent" />

                  {/* Outer glow circle on hover or peak */}
                  {(isHovered || isPeak) && (
                    <circle 
                      cx={p.x} 
                      cy={p.y} 
                      r={isHovered ? 9 : 7} 
                      fill={themeColor} 
                      fillOpacity={isHovered ? 0.35 : 0.2} 
                    />
                  )}

                  {/* Core Pin Dot */}
                  <circle 
                    cx={p.x} 
                    cy={p.y} 
                    r={isHovered ? 5 : isPeak ? 4.5 : 3.5} 
                    fill="#FFFFFF" 
                    stroke={themeColor} 
                    strokeWidth={isHovered ? 3 : 2.5} 
                    className="transition-transform duration-150"
                  />
                </g>
              );
            })}
          </svg>

          {/* Month Labels under chart (Enero a Diciembre) */}
          <div className="flex justify-between px-2 sm:px-4 text-[10px] sm:text-[11px] font-mono font-bold text-slate-500 -mt-2">
            {monthValues.map((m, idx) => {
              const isHovered = hoveredMonthIdx === idx;
              const isPeak = m.mesIndex === peakMonth.mesIndex;

              return (
                <button
                  key={m.mes}
                  onMouseEnter={() => setHoveredMonthIdx(idx)}
                  onMouseLeave={() => setHoveredMonthIdx(null)}
                  className={`transition-all px-1 py-0.5 rounded text-center ${
                    isHovered 
                      ? 'text-[#FF2D8D] font-black scale-110' 
                      : isPeak
                      ? 'text-slate-900 font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title={`${m.mesCompleto}: ${m.activeValue.toLocaleString('es-MX')}`}
                >
                  <span>{m.mes}</span>
                </button>
              );
            })}
          </div>

        </div>
      </div>

      {/* Footer Info & Totals */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
        <div className="flex items-center gap-2">
          <span>Total Operado 2026: <strong className="text-slate-900 font-mono font-bold">{totalLetras.toLocaleString('es-MX')} letras</strong></span>
          <span>•</span>
          <span>Importe Total: <strong className="text-slate-900 font-mono font-bold">{formatMxnFull(totalImporte)}</strong></span>
        </div>

        <div className="text-[10px] text-slate-400 font-mono">
          {selectedBusiness === 'Liverpool'
            ? 'Liverpool: Fecha operada en Col C · Conteo Col D · Importe Col G'
            : selectedBusiness === 'Suburbia'
            ? 'Suburbia: Fecha operada en Col S · Conteo Col T · Importe Col W'
            : 'Liverpool (Col C) · Suburbia (Col S) · Pestaña Resumen Letras'}
        </div>
      </div>

    </div>
  );
};
