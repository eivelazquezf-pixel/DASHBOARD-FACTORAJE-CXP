import React from 'react';
import { FactoringRecord } from '../types/factoring';
import { X, Building2, Calendar, DollarSign, Percent, FileText, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

interface LetterDetailModalProps {
  record: FactoringRecord | null;
  onClose: () => void;
  onUpdateStatus: (id: string, newStatus: any) => void;
}

export const LetterDetailModal: React.FC<LetterDetailModalProps> = ({
  record,
  onClose,
  onUpdateStatus
}) => {
  if (!record) return null;

  const fmt = (val: number) => {
    return `${record.moneda === 'USD' ? 'USD $' : '$'}${val.toLocaleString('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const calculatedInterest = (record.montoNominal * (record.tasaDescuento / 100) * record.plazoDias) / 360;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden transition-colors">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-500">DETALLE DE LETRA</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {record.empresa}
              </span>
            </div>
            <h3 className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-0.5">
              {record.folio}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Supplier Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200/80 dark:border-slate-800">
            <div>
              <span className="text-[11px] font-medium text-slate-400 block">Proveedor / Razón Social</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white block mt-0.5">
                {record.proveedor}
              </span>
              <span className="text-xs font-mono text-slate-500 block mt-0.5">
                RFC: {record.rfc}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-medium text-slate-400 block">Acreedor SAP &amp; Categoría</span>
              <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 block mt-0.5">
                ID SAP: {record.noProveedorSap || 'No registrado'}
              </span>
              <span className="text-xs text-slate-500 block mt-0.5">
                Línea: {record.categoria || 'Mercancía General'}
              </span>
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Desglose de Liquidación y Costo Financiero
            </h4>

            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden text-xs">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                
                <div className="p-2.5 flex items-center justify-between">
                  <span className="text-slate-500">Importe Bruto / Valor Nominal:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                    {fmt(record.montoNominal)}
                  </span>
                </div>

                <div className="p-2.5 flex items-center justify-between">
                  <span className="text-slate-500">Tasa de Descuento Anualizada:</span>
                  <span className="font-mono text-slate-900 dark:text-white tabular-nums">
                    {record.tasaDescuento.toFixed(2)}% (Spread: +{record.tasaSpread || 1.25}%)
                  </span>
                </div>

                <div className="p-2.5 flex items-center justify-between">
                  <span className="text-slate-500">Plazo en Días:</span>
                  <span className="font-mono text-slate-900 dark:text-white tabular-nums">
                    {record.plazoDias} días (Base cálculo: 360)
                  </span>
                </div>

                <div className="p-2.5 flex items-center justify-between text-rose-600 dark:text-rose-400">
                  <span>(-) Intereses Devengados por Descuento:</span>
                  <span className="font-mono font-semibold tabular-nums">
                    -{fmt(calculatedInterest)}
                  </span>
                </div>

                <div className="p-2.5 flex items-center justify-between text-rose-600 dark:text-rose-400">
                  <span>(-) Comisión de Factoraje / Aforo:</span>
                  <span className="font-mono font-semibold tabular-nums">
                    -{fmt(record.comisionFactoraje)}
                  </span>
                </div>

                <div className="p-3 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80 font-bold text-slate-900 dark:text-white text-sm">
                  <span>(=) Importe Neto Liquidado a Proveedor:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {fmt(record.montoNeto)}
                  </span>
                </div>

              </div>
            </div>
          </div>

          {/* Bank & Audit Details */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg">
              <span className="text-slate-400 block text-[10px]">Banco Fondeador</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">{record.banco}</span>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg">
              <span className="text-slate-400 block text-[10px]">Fecha de Emisión</span>
              <span className="font-mono text-slate-800 dark:text-slate-200 mt-0.5 block">{record.fechaEmision}</span>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg">
              <span className="text-slate-400 block text-[10px]">Fecha de Vencimiento</span>
              <span className="font-mono text-slate-800 dark:text-slate-200 mt-0.5 block">{record.fechaVencimiento}</span>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg">
              <span className="text-slate-400 block text-[10px]">Fecha Liquidación</span>
              <span className="font-mono text-slate-800 dark:text-slate-200 mt-0.5 block">
                {record.fechaPago || 'Pendiente de pago'}
              </span>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg">
              <span className="text-slate-400 block text-[10px]">Año Ejercicio</span>
              <span className="font-mono text-slate-800 dark:text-slate-200 mt-0.5 block">{record.año}</span>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg">
              <span className="text-slate-400 block text-[10px]">Archivo de Origen</span>
              <span className="text-slate-800 dark:text-slate-200 mt-0.5 block truncate" title={record.archivoOrigen}>
                {record.archivoOrigen}
              </span>
            </div>
          </div>

          {record.notas && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 rounded-lg text-xs text-amber-900 dark:text-amber-200">
              <div className="font-bold mb-0.5">Notas de Tesorería:</div>
              <div>{record.notas}</div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Cambiar Estatus:</span>
            <select
              value={record.estatus}
              onChange={(e) => onUpdateStatus(record.id, e.target.value)}
              className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-slate-900 dark:text-white"
            >
              <option value="Vigente">Vigente</option>
              <option value="Por Vencer">Por Vencer</option>
              <option value="Liquidada">Liquidada</option>
              <option value="En Aclaración">En Aclaración</option>
              <option value="Vencida">Vencida</option>
            </select>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
