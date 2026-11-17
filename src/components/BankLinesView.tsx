import React, { useState } from 'react';
import { BankCreditLine, FactoringRecord, BancoFactor } from '../types/factoring';
import { Building2, Shield, TrendingUp, AlertCircle, Edit2, Check, RefreshCw } from 'lucide-react';

interface BankLinesViewProps {
  bankLines: BankCreditLine[];
  onUpdateBankLines: (lines: BankCreditLine[]) => void;
  records: FactoringRecord[];
}

export const BankLinesView: React.FC<BankLinesViewProps> = ({
  bankLines,
  onUpdateBankLines,
  records
}) => {
  const [editingBank, setEditingBank] = useState<string | null>(null);
  const [newLimit, setNewLimit] = useState<string>('');

  // Calculate live utilization from active records (Vigente + Por Vencer)
  const bankUsageMap: Record<string, { nominal: number; count: number; rateSum: number }> = {};
  records
    .filter(r => r.estatus === 'Vigente' || r.estatus === 'Por Vencer')
    .forEach(r => {
      const b = r.banco;
      const val = r.montoNominal * r.tipoCambio;
      if (!bankUsageMap[b]) {
        bankUsageMap[b] = { nominal: 0, count: 0, rateSum: 0 };
      }
      bankUsageMap[b].nominal += val;
      bankUsageMap[b].count += 1;
      bankUsageMap[b].rateSum += (r.tasaDescuento * val);
    });

  const totalAuthorized = bankLines.reduce((s, b) => s + b.lineaAutorizada, 0);
  const totalUtilized = Object.values(bankUsageMap).reduce((s, b) => s + b.nominal, 0);
  const totalAvailable = totalAuthorized - totalUtilized;
  const globalUtilizationPct = totalAuthorized > 0 ? (totalUtilized / totalAuthorized) * 100 : 0;

  const fmt = (val: number) => {
    return `$${(val / 1_000_000).toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M MXN`;
  };

  const handleStartEdit = (line: BankCreditLine) => {
    setEditingBank(line.banco);
    setNewLimit(String(line.lineaAutorizada / 1_000_000));
  };

  const handleSaveEdit = (banco: BancoFactor) => {
    const num = parseFloat(newLimit);
    if (!isNaN(num) && num > 0) {
      const updated = bankLines.map(l => {
        if (l.banco === banco) {
          return { ...l, lineaAutorizada: num * 1_000_000 };
        }
        return l;
      });
      onUpdateBankLines(updated);
    }
    setEditingBank(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner KPI Summary */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 transition-colors">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Líneas de Crédito Bancario y Cupos de Factoraje
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Administración de disponibilidad, ocupación y costo financiero con instituciones financieras
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-medium">Capacidad Total Autorizada</span>
              <span className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                {fmt(totalAuthorized)}
              </span>
            </div>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="pt-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-300 font-medium">
              Ocupación Global de Líneas: <strong className="font-mono text-slate-900 dark:text-white">{globalUtilizationPct.toFixed(1)}%</strong>
            </span>
            <div className="flex items-center gap-3 font-mono text-xs">
              <span className="text-slate-500">Utilizado: <strong className="text-slate-900 dark:text-white">{fmt(totalUtilized)}</strong></span>
              <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                Disponible: {fmt(totalAvailable)}
              </span>
            </div>
          </div>

          <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                globalUtilizationPct > 85 ? 'bg-rose-500' : globalUtilizationPct > 65 ? 'bg-amber-500' : 'bg-[#E10075]'
              }`}
              style={{ width: `${Math.min(100, globalUtilizationPct)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Grid of Bank Lines */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bankLines.map((line) => {
          const usage = bankUsageMap[line.banco] || { nominal: 0, count: 0, rateSum: 0 };
          const usedAmount = usage.nominal;
          const availableAmount = Math.max(0, line.lineaAutorizada - usedAmount);
          const utilPct = line.lineaAutorizada > 0 ? (usedAmount / line.lineaAutorizada) * 100 : 0;
          const avgRate = usage.nominal > 0 ? (usage.rateSum / usage.nominal) : line.tasaPonderada;
          const isHigh = utilPct >= 80;

          return (
            <div 
              key={line.banco}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 transition-colors space-y-3.5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {line.banco}
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    Calificación: {line.calificacion}
                  </span>
                </div>

                <div className="text-right">
                  {editingBank === line.banco ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={newLimit}
                        onChange={(e) => setNewLimit(e.target.value)}
                        className="w-16 px-1.5 py-0.5 text-xs font-mono border rounded bg-slate-50 dark:bg-slate-800"
                        title="Millones MXN"
                      />
                      <button
                        onClick={() => handleSaveEdit(line.banco)}
                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleStartEdit(line)}
                      title="Editar cupo de línea autorizada"
                      className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 flex items-center gap-1"
                    >
                      <span>{fmt(line.lineaAutorizada)}</span>
                      <Edit2 className="w-3 h-3 text-slate-400" />
                    </button>
                  )}
                  <span className="text-[10px] text-slate-400 block">Línea Autorizada</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Uso actual</span>
                  <span className={`font-mono font-bold ${isHigh ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-200'}`}>
                    {utilPct.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      isHigh ? 'bg-amber-500' : 'bg-slate-800 dark:bg-slate-200'
                    }`}
                    style={{ width: `${Math.min(100, utilPct)}%` }}
                  />
                </div>
              </div>

              {/* Metrics breakdown */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Colocado Activo:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{fmt(usedAmount)}</span>
                  <span className="text-[10px] text-slate-400 font-sans block">({usage.count} letras)</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Disponible:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{fmt(availableAmount)}</span>
                  <span className="text-[10px] text-slate-400 font-sans block">Remanente</span>
                </div>
              </div>

              {/* Reference rate */}
              <div className="text-[11px] bg-slate-50 dark:bg-slate-800/50 p-2 rounded border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-slate-500">Ref: {line.tasaReferencia}</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {avgRate.toFixed(2)}%
                </span>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
