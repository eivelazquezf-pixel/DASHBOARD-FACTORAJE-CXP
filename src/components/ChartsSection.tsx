import React, { useState } from 'react';
import { FactoringRecord } from '../types/factoring';
import { BarChart3, PieChart, Users, CalendarRange, TrendingDown, Info } from 'lucide-react';

interface ChartsSectionProps {
  records: FactoringRecord[];
}

export const ChartsSection: React.FC<ChartsSectionProps> = ({ records }) => {
  const [activeTab, setActiveTab] = useState<'monthly' | 'banks' | 'suppliers' | 'aging'>('monthly');

  // Format currency in millions or thousands
  const fmtM = (val: number) => {
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}k`;
    return `$${val.toFixed(0)}`;
  };

  // 1. Data for Monthly Evolution (Group by Year-Month of emission)
  const monthlyDataMap: Record<string, { liverpool: number; suburbia: number; total: number; count: number }> = {};
  records.forEach((r) => {
    const ym = r.fechaEmision.substring(0, 7); // "YYYY-MM"
    if (!monthlyDataMap[ym]) {
      monthlyDataMap[ym] = { liverpool: 0, suburbia: 0, total: 0, count: 0 };
    }
    const val = r.montoNominal * r.tipoCambio;
    if (r.empresa === 'Suburbia') {
      monthlyDataMap[ym].suburbia += val;
    } else {
      monthlyDataMap[ym].liverpool += val;
    }
    monthlyDataMap[ym].total += val;
    monthlyDataMap[ym].count += 1;
  });

  const sortedMonths = Object.keys(monthlyDataMap).sort().slice(-8); // Last 8 active months
  const maxMonthlyVal = Math.max(...sortedMonths.map(m => monthlyDataMap[m].total), 1);

  // 2. Data for Banks Distribution
  const bankDataMap: Record<string, { nominal: number; count: number; avgRate: number; rateSum: number }> = {};
  records.forEach(r => {
    const b = r.banco;
    const val = r.montoNominal * r.tipoCambio;
    if (!bankDataMap[b]) {
      bankDataMap[b] = { nominal: 0, count: 0, avgRate: 0, rateSum: 0 };
    }
    bankDataMap[b].nominal += val;
    bankDataMap[b].count += 1;
    bankDataMap[b].rateSum += (r.tasaDescuento * val);
  });

  const totalAllBanks = Object.values(bankDataMap).reduce((s, b) => s + b.nominal, 0) || 1;
  const sortedBanks = Object.entries(bankDataMap)
    .map(([banco, d]) => ({
      banco,
      nominal: d.nominal,
      count: d.count,
      pct: (d.nominal / totalAllBanks) * 100,
      avgRate: d.nominal > 0 ? (d.rateSum / d.nominal) : 0
    }))
    .sort((a, b) => b.nominal - a.nominal);

  // 3. Data for Top Suppliers
  const supplierDataMap: Record<string, { nominal: number; count: number; empresa: string }> = {};
  records.forEach(r => {
    const prov = r.proveedor;
    const val = r.montoNominal * r.tipoCambio;
    if (!supplierDataMap[prov]) {
      supplierDataMap[prov] = { nominal: 0, count: 0, empresa: r.empresa };
    }
    supplierDataMap[prov].nominal += val;
    supplierDataMap[prov].count += 1;
  });

  const topSuppliers = Object.entries(supplierDataMap)
    .map(([proveedor, d]) => ({
      proveedor,
      nominal: d.nominal,
      count: d.count,
      empresa: d.empresa,
      pct: (d.nominal / totalAllBanks) * 100
    }))
    .sort((a, b) => b.nominal - a.nominal)
    .slice(0, 7);

  const maxSupplierVal = topSuppliers[0]?.nominal || 1;

  // 4. Data for Aging (Vencimientos)
  const today = new Date().toISOString().split('T')[0];
  const todayTime = new Date(today).getTime();
  const agingBuckets = {
    vencidas: { label: 'Vencidas sin Liquidar', amount: 0, count: 0, color: 'bg-rose-500' },
    d0_30: { label: '0 a 30 Días (Inmediato)', amount: 0, count: 0, color: 'bg-amber-500' },
    d31_60: { label: '31 a 60 Días (Corto Plazo)', amount: 0, count: 0, color: 'bg-blue-500' },
    d61_90: { label: '61 a 90 Días (Mediano Plazo)', amount: 0, count: 0, color: 'bg-indigo-500' },
    d90_mas: { label: 'Más de 90 Días', amount: 0, count: 0, color: 'bg-emerald-500' }
  };

  records.filter(r => r.estatus !== 'Liquidada').forEach(r => {
    const vTime = new Date(r.fechaVencimiento).getTime();
    const diffDays = Math.ceil((vTime - todayTime) / (1000 * 3600 * 24));
    const val = r.montoNominal * r.tipoCambio;

    if (diffDays < 0) {
      agingBuckets.vencidas.amount += val;
      agingBuckets.vencidas.count += 1;
    } else if (diffDays <= 30) {
      agingBuckets.d0_30.amount += val;
      agingBuckets.d0_30.count += 1;
    } else if (diffDays <= 60) {
      agingBuckets.d31_60.amount += val;
      agingBuckets.d31_60.count += 1;
    } else if (diffDays <= 90) {
      agingBuckets.d61_90.amount += val;
      agingBuckets.d61_90.count += 1;
    } else {
      agingBuckets.d90_mas.amount += val;
      agingBuckets.d90_mas.count += 1;
    }
  });

  const totalAgingAmount = Object.values(agingBuckets).reduce((s, b) => s + b.amount, 0) || 1;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 transition-colors space-y-4">
      
      {/* Chart Header & Tab Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Analítica Financiera de Factoraje</span>
            <span className="text-[11px] font-normal text-slate-400">
              Liverpool &amp; Suburbia
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Comportamiento de colocación, exposición por entidad fondeadora y vencimientos
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg self-stretch sm:self-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('monthly')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'monthly'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Evolución Mensual</span>
          </button>

          <button
            onClick={() => setActiveTab('banks')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'banks'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
            <span>Bancos y Líneas</span>
          </button>

          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'suppliers'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Top Proveedores</span>
          </button>

          <button
            onClick={() => setActiveTab('aging')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'aging'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5" />
            <span>Aging Cartera</span>
          </button>
        </div>
      </div>

      {/* View 1: Monthly Evolution Stacked Bar Chart */}
      {activeTab === 'monthly' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Volumen mensual operado en Factoraje (Millones MXN)</span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#E10075] inline-block" />
                <span className="text-slate-700 dark:text-slate-300">Liverpool</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#5F259F] inline-block" />
                <span className="text-slate-700 dark:text-slate-300">Suburbia</span>
              </div>
            </div>
          </div>

          {/* Bar Chart Canvas */}
          <div className="h-64 flex items-end gap-3 sm:gap-6 pt-6 pb-2 px-2 border-b border-slate-200 dark:border-slate-800">
            {sortedMonths.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                No hay datos disponibles para el periodo seleccionado
              </div>
            ) : (
              sortedMonths.map((ym) => {
                const item = monthlyDataMap[ym];
                const livHeightPct = (item.liverpool / maxMonthlyVal) * 100;
                const subHeightPct = (item.suburbia / maxMonthlyVal) * 100;
                const totalHeightPct = Math.min(100, Math.max(10, livHeightPct + subHeightPct));

                return (
                  <div key={ym} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                    {/* Tooltip */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 z-20 bg-slate-900 text-white text-[11px] rounded px-2.5 py-1 pointer-events-none whitespace-nowrap shadow-lg">
                      <div className="font-bold">{ym}</div>
                      <div>Total: {fmtM(item.total)} ({item.count} letras)</div>
                      <div className="text-slate-300 text-[10px]">Liv: {fmtM(item.liverpool)} · Sub: {fmtM(item.suburbia)}</div>
                    </div>

                    {/* Bars stacked */}
                    <div 
                      className="w-full max-w-[42px] rounded-t flex flex-col justify-end overflow-hidden transition-all duration-300 group-hover:brightness-110"
                      style={{ height: `${totalHeightPct}%` }}
                    >
                      {/* Suburbia Bar (Top) */}
                      <div 
                        className="bg-[#5F259F] w-full transition-all"
                        style={{ height: `${(item.suburbia / (item.total || 1)) * 100}%` }}
                      />
                      {/* Liverpool Bar (Bottom) */}
                      <div 
                        className="bg-[#E10075] w-full transition-all"
                        style={{ height: `${(item.liverpool / (item.total || 1)) * 100}%` }}
                      />
                    </div>

                    {/* Amount label on top */}
                    <span className="text-[10px] font-mono text-slate-500 mb-1 font-semibold">
                      {fmtM(item.total)}
                    </span>

                    {/* X-axis Label */}
                    <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400 mt-2 truncate w-full text-center">
                      {ym}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* View 2: Banks and Credit Lines Distribution */}
      {activeTab === 'banks' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          
          {/* Bank Distribution Bars */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Distribución de Fondeo por Banco Factor
            </h3>
            <div className="space-y-2.5">
              {sortedBanks.map(b => (
                <div key={b.banco} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{b.banco}</span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-slate-900 dark:text-white font-bold">{fmtM(b.nominal)}</span>
                      <span className="text-slate-400 text-[11px]">({b.pct.toFixed(1)}%)</span>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-slate-800 dark:bg-slate-200 rounded-full transition-all duration-500"
                      style={{ width: `${b.pct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>{b.count} operaciones</span>
                    <span>Tasa pond: <strong>{b.avgRate.toFixed(2)}%</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Key Insights & Headroom */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-500" />
              <span>Diagnóstico de Líneas de Factoraje</span>
            </h3>
            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              <p>
                • <strong>BBVA México</strong> y <strong>Santander</strong> mantienen la mayor concentración de la cartera activa de Liverpool con un costo promedio competitivo de <span className="font-mono text-slate-900 dark:text-white font-bold">11.20%</span>.
              </p>
              <p>
                • <strong>NAFIN (Cadenas Productivas)</strong> ofrece la tasa más atractiva (<span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">10.98%</span>) enfocada a proveedores PyME de Suburbia y calzado nacional.
              </p>
              <p>
                • <strong>Disponibilidad Total:</strong> Más de $1,400M MXN en cupo remanente para campañas de alta demanda comercial (Buen Fin, Venta Nocturna y Temporada Decembrina).
              </p>
            </div>
          </div>

        </div>
      )}

      {/* View 3: Top Suppliers Pareto Distribution */}
      {activeTab === 'suppliers' && (
        <div className="space-y-4 pt-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Principales proveedores con operaciones de factoraje (Riesgo y Concentración)</span>
            <span className="text-slate-400">Umbral prudencial sugerido: &lt; 20%</span>
          </div>

          <div className="space-y-3">
            {topSuppliers.map((s, idx) => {
              const widthPct = (s.nominal / maxSupplierVal) * 100;
              const isHighConcentration = s.pct > 18;

              return (
                <div key={s.proveedor} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-slate-400 w-4">{idx + 1}.</span>
                      <span className="font-semibold text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md">
                        {s.proveedor}
                      </span>
                      <span className="text-[10px] text-slate-500 hidden sm:inline">
                        ({s.empresa})
                      </span>
                    </div>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="font-bold text-slate-900 dark:text-white">{fmtM(s.nominal)}</span>
                      <span className={`text-[11px] ${isHighConcentration ? 'text-amber-600 font-bold' : 'text-slate-500'}`}>
                        {s.pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        isHighConcentration ? 'bg-amber-500' : 'bg-slate-800 dark:bg-slate-200'
                      }`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* View 4: Aging & Matriz de Vencimientos */}
      {activeTab === 'aging' && (
        <div className="space-y-4 pt-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Exigibilidad de liquidez para Tesorería por plazos de vencimiento</span>
            <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
              Total Cartera por Liquidar: {fmtM(totalAgingAmount)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {Object.entries(agingBuckets).map(([key, bucket]) => {
              const pct = (bucket.amount / totalAgingAmount) * 100;

              return (
                <div key={key} className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-lg border border-slate-200/80 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      {bucket.label}
                    </span>
                    <span className={`w-2 h-2 rounded-full ${bucket.color}`} />
                  </div>
                  <div className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                    {fmtM(bucket.amount)}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1 border-t border-slate-200/50 dark:border-slate-700">
                    <span>{bucket.count} letras</span>
                    <span>{pct.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};
