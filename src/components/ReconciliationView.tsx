import React from 'react';
import { TreasuryAnomaly, FactoringRecord } from '../types/factoring';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Copy, 
  FileSpreadsheet, 
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

interface ReconciliationViewProps {
  anomalies: TreasuryAnomaly[];
  records: FactoringRecord[];
  onSelectFolio: (folio: string) => void;
  onExportExcel: () => void;
}

export const ReconciliationView: React.FC<ReconciliationViewProps> = ({
  anomalies,
  records,
  onSelectFolio,
  onExportExcel
}) => {
  const criticas = anomalies.filter(a => a.severidad === 'alta');
  const medias = anomalies.filter(a => a.severidad === 'media');

  return (
    <div className="space-y-6">
      
      {/* Overview Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 transition-colors">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Módulo de Conciliación y Alertas de Tesorería
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Monitoreo automatizado de riesgos de liquidez, vencimientos inminentes, dispersión de tasas y duplicados entre archivos anuales
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onExportExcel}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
              <span>Exportar Auditoría</span>
            </button>
          </div>
        </div>

        {/* Status Counters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 p-3 rounded-lg flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 block">Alertas Críticas</span>
              <span className="text-xs text-rose-600 dark:text-rose-400">Vencidas / &lt;7 días</span>
            </div>
            <span className="text-xl font-bold font-mono text-rose-700 dark:text-rose-300">{criticas.length}</span>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-3 rounded-lg flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 block">Advertencias de Gestión</span>
              <span className="text-xs text-amber-600 dark:text-amber-400">Concentración / Tasas</span>
            </div>
            <span className="text-xl font-bold font-mono text-amber-700 dark:text-amber-300">{medias.length}</span>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 p-3 rounded-lg flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 block">Letras en Orden</span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400">Conforme a política</span>
            </div>
            <span className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-300">
              {Math.max(0, records.length - anomalies.length)}
            </span>
          </div>
        </div>
      </div>

      {/* Anomalies List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Registro de Observaciones Detectadas ({anomalies.length})
        </h3>

        {anomalies.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center">
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Conciliación Perfecta
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              No se detectaron discrepancias de tasas, concentración riesgosa ni vencimientos desatendidos en los archivos activos.
            </p>
          </div>
        ) : (
          anomalies.map((anom) => {
            const isHigh = anom.severidad === 'alta';

            return (
              <div
                key={anom.id}
                className={`bg-white dark:bg-slate-900 border rounded-xl p-4 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  isHigh 
                    ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/20' 
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                    isHigh ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                  }`}>
                    {anom.tipo === 'vencimiento_critico' && <Clock className="w-4 h-4" />}
                    {anom.tipo === 'concentracion_alta' && <TrendingUp className="w-4 h-4" />}
                    {anom.tipo === 'tasa_desviada' && <AlertTriangle className="w-4 h-4" />}
                    {anom.tipo === 'duplicado_potencial' && <Copy className="w-4 h-4" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {anom.titulo}
                      </span>
                      {anom.folio && (
                        <span className="font-mono text-[11px] text-slate-500">
                          [{anom.folio}]
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                      {anom.descripcion}
                    </p>
                  </div>
                </div>

                {anom.folio && (
                  <button
                    onClick={() => onSelectFolio(anom.folio!)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1 shrink-0 self-end sm:self-auto"
                  >
                    <span>Auditar Letra</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
