import React from 'react';
import { FactoringRecord } from '../types/factoring';
import { DollarSign, Percent, Calendar, ShieldCheck, Clock, TrendingUp } from 'lucide-react';

interface SummaryKpisProps {
  records: FactoringRecord[];
  allRecords: FactoringRecord[];
}

export const SummaryKpis: React.FC<SummaryKpisProps> = ({ records, allRecords }) => {
  // Cálculos consolidados en MXN
  const totalNominalMXN = records.reduce((sum, r) => sum + r.montoNominal * r.tipoCambio, 0);
  const totalNetoMXN = records.reduce((sum, r) => sum + r.montoNeto * r.tipoCambio, 0);
  const totalCostoFinanciero = totalNominalMXN - totalNetoMXN;

  // Desglose por empresa
  const liverpoolNominal = records
    .filter(r => r.empresa === 'Liverpool' || r.empresa === 'Distribuidora Liverpool')
    .reduce((sum, r) => sum + r.montoNominal * r.tipoCambio, 0);
  const suburbiaNominal = records
    .filter(r => r.empresa === 'Suburbia')
    .reduce((sum, r) => sum + r.montoNominal * r.tipoCambio, 0);

  // Cartera Vigente vs Liquidada
  const carteraVigenteMXN = records
    .filter(r => r.estatus === 'Vigente' || r.estatus === 'Por Vencer')
    .reduce((sum, r) => sum + r.montoNominal * r.tipoCambio, 0);

  const porVencerCount = records.filter(r => r.estatus === 'Por Vencer').length;
  const liquidadasCount = records.filter(r => r.estatus === 'Liquidada').length;
  const totalLetras = records.length;

  // Tasa ponderada por monto nominal
  const sumaPonderada = records.reduce((sum, r) => sum + (r.tasaDescuento * (r.montoNominal * r.tipoCambio)), 0);
  const tasaPonderada = totalNominalMXN > 0 ? (sumaPonderada / totalNominalMXN) : 0;

  // Plazo promedio ponderado (DPO)
  const sumaPlazo = records.reduce((sum, r) => sum + (r.plazoDias * (r.montoNominal * r.tipoCambio)), 0);
  const plazoPonderado = totalNominalMXN > 0 ? Math.round(sumaPlazo / totalNominalMXN) : 0;

  // Formateador de moneda en Millones o completo
  const formatMxn = (val: number) => {
    if (val >= 1_000_000) {
      return `$${(val / 1_000_000).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M`;
    }
    return `$${val.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      
      {/* KPI 1: Monto Total Operado */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 transition-colors">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
          <span className="font-medium">Monto Total Colocado</span>
          <DollarSign className="w-4 h-4 text-[#E10075]" />
        </div>
        <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums">
          {formatMxn(totalNominalMXN)}
        </div>
        <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <span>Liverpool: <strong className="font-mono text-slate-700 dark:text-slate-200">{formatMxn(liverpoolNominal)}</strong></span>
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
          <span>Suburbia: <strong className="font-mono text-slate-700 dark:text-slate-200">{formatMxn(suburbiaNominal)}</strong></span>
        </div>
      </div>

      {/* KPI 2: Monto Neto Liquidado */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 transition-colors">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
          <span className="font-medium">Neto Liquidado a Proveedores</span>
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums">
          {formatMxn(totalNetoMXN)}
        </div>
        <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <span>Descuentos: <strong className="font-mono text-slate-700 dark:text-slate-200">{formatMxn(totalCostoFinanciero)}</strong></span>
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
          <span>Spread: <strong className="font-mono text-slate-700 dark:text-slate-200">1.21%</strong></span>
        </div>
      </div>

      {/* KPI 3: Cartera Activa y Vencimientos */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 transition-colors">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
          <span className="font-medium">Cartera Vigente / En Fondeo</span>
          <Clock className="w-4 h-4 text-blue-500" />
        </div>
        <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums">
          {formatMxn(carteraVigenteMXN)}
        </div>
        <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className={porVencerCount > 0 ? 'text-amber-600 dark:text-amber-400 font-semibold' : ''}>
            Por vencer: <strong className="font-mono">{porVencerCount} letras</strong>
          </span>
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
          <span>Liquidadas: <strong className="font-mono text-slate-700 dark:text-slate-200">{liquidadasCount}</strong></span>
        </div>
      </div>

      {/* KPI 4: Tasa Ponderada Anualizada */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 transition-colors">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
          <span className="font-medium">Tasa Ponderada (TIIE + Sp.)</span>
          <Percent className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums">
          {tasaPonderada.toFixed(2)}%
        </div>
        <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <span>TIIE 28d: <strong className="font-mono text-slate-700 dark:text-slate-200">10.00%</strong></span>
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
          <span>Spread avg: <strong className="font-mono text-slate-700 dark:text-slate-200">+1.24%</strong></span>
        </div>
      </div>

      {/* KPI 5: DPO Promedio y Total Operaciones */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 transition-colors">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
          <span className="font-medium">Plazo Promedio (DPO)</span>
          <Calendar className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums">
          {plazoPonderado} <span className="text-sm font-normal text-slate-500">días</span>
        </div>
        <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <span>Letras procesadas: <strong className="font-mono text-slate-700 dark:text-slate-200">{totalLetras}</strong></span>
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
          <span>Línea bancaria: <strong className="font-mono text-emerald-600 dark:text-emerald-400">Ok</strong></span>
        </div>
      </div>

    </div>
  );
};
