import React, { useState, useEffect } from 'react';
import { FactoringRecord, EmpresaTipo, BancoFactor, EstatusLetra, MonedaTipo } from '../types/factoring';
import { X, Plus, Calculator, CheckCircle2 } from 'lucide-react';

interface NewLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveRecord: (record: FactoringRecord) => void;
}

export const NewLetterModal: React.FC<NewLetterModalProps> = ({
  isOpen,
  onClose,
  onSaveRecord
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [folio, setFolio] = useState<string>(`LET-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`);
  const [empresa, setEmpresa] = useState<EmpresaTipo>('Liverpool');
  const [proveedor, setProveedor] = useState<string>('');
  const [rfc, setRfc] = useState<string>('');
  const [noProveedorSap, setNoProveedorSap] = useState<string>('');
  const [banco, setBanco] = useState<BancoFactor>('BBVA');
  const [fechaEmision, setFechaEmision] = useState<string>(todayStr);
  const [plazoDias, setPlazoDias] = useState<number>(60);
  const [fechaVencimiento, setFechaVencimiento] = useState<string>('');
  const [moneda, setMoneda] = useState<MonedaTipo>('MXN');
  const [montoNominal, setMontoNominal] = useState<string>('500000');
  const [tasaDescuento, setTasaDescuento] = useState<string>('11.25');
  const [comisionFactoraje, setComisionFactoraje] = useState<string>('750');
  const [estatus, setEstatus] = useState<EstatusLetra>('Vigente');
  const [notas, setNotas] = useState<string>('');

  // Auto calculate expiration date based on emission + term days
  useEffect(() => {
    if (fechaEmision && plazoDias) {
      const emi = new Date(fechaEmision);
      if (!isNaN(emi.getTime())) {
        const ven = new Date(emi.getTime() + plazoDias * 24 * 60 * 60 * 1000);
        setFechaVencimiento(ven.toISOString().split('T')[0]);
      }
    }
  }, [fechaEmision, plazoDias]);

  // Calculations
  const nominalNum = parseFloat(montoNominal) || 0;
  const tasaNum = parseFloat(tasaDescuento) || 0;
  const comisionNum = parseFloat(comisionFactoraje) || 0;
  const interesesCalculados = (nominalNum * (tasaNum / 100) * plazoDias) / 360;
  const netoCalculado = Math.max(0, nominalNum - interesesCalculados - comisionNum);
  const costoTotal = nominalNum - netoCalculado;

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!proveedor.trim() || !folio.trim() || nominalNum <= 0) {
      return;
    }

    const newRecord: FactoringRecord = {
      id: `manual_${Date.now()}`,
      folio: folio.trim(),
      empresa,
      proveedor: proveedor.trim(),
      rfc: rfc.trim().toUpperCase() || 'XAXX010101000',
      noProveedorSap: noProveedorSap.trim() || undefined,
      banco,
      fechaEmision,
      fechaVencimiento,
      plazoDias,
      moneda,
      tipoCambio: moneda === 'USD' ? 19.85 : 1.0,
      montoNominal: nominalNum,
      tasaDescuento: tasaNum,
      tasaSpread: 1.25,
      comisionFactoraje: comisionNum,
      montoNeto: Number(netoCalculado.toFixed(2)),
      costoFinanciero: Number(costoTotal.toFixed(2)),
      estatus,
      archivoOrigen: 'Captura Manual en Sistema',
      año: new Date(fechaEmision).getFullYear(),
      notas: notas.trim() || undefined
    };

    onSaveRecord(newRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-xl w-full overflow-hidden transition-colors">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-pink-50 dark:bg-pink-950 flex items-center justify-center text-[#E10075]">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Registrar Nueva Letra de Factoraje
              </h3>
              <p className="text-xs text-slate-500">
                Endoso y alta de contra-recibo en cartera activa
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 font-medium mb-1">Folio / No. Letra *</label>
              <input
                type="text"
                required
                value={folio}
                onChange={(e) => setFolio(e.target.value)}
                className="w-full px-2.5 py-1.5 font-mono border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-medium mb-1">Empresa Pagadora *</label>
              <select
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value as EmpresaTipo)}
                className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="Liverpool">El Puerto de Liverpool</option>
                <option value="Suburbia">Suburbia</option>
                <option value="Distribuidora Liverpool">Distribuidora Liverpool</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-500 font-medium mb-1">Proveedor (Razón Social) *</label>
            <input
              type="text"
              required
              placeholder="Ej. Samsung Electronics México S.A. de C.V."
              value={proveedor}
              onChange={(e) => setProveedor(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 font-medium mb-1">RFC Proveedor</label>
              <input
                type="text"
                placeholder="SEM950212KM8"
                value={rfc}
                onChange={(e) => setRfc(e.target.value)}
                className="w-full px-2.5 py-1.5 font-mono uppercase border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-medium mb-1">No. Acreedor SAP</label>
              <input
                type="text"
                placeholder="P100214"
                value={noProveedorSap}
                onChange={(e) => setNoProveedorSap(e.target.value)}
                className="w-full px-2.5 py-1.5 font-mono border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-500 font-medium mb-1">Banco Factor</label>
              <select
                value={banco}
                onChange={(e) => setBanco(e.target.value as BancoFactor)}
                className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="BBVA">BBVA</option>
                <option value="Santander">Santander</option>
                <option value="Banorte">Banorte</option>
                <option value="Citibanamex">Citibanamex</option>
                <option value="NAFIN">NAFIN</option>
                <option value="Scotiabank">Scotiabank</option>
                <option value="HSBC">HSBC</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-500 font-medium mb-1">Moneda</label>
              <select
                value={moneda}
                onChange={(e) => setMoneda(e.target.value as MonedaTipo)}
                className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              >
                <option value="MXN">MXN ($)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-500 font-medium mb-1">Estatus Inicial</label>
              <select
                value={estatus}
                onChange={(e) => setEstatus(e.target.value as EstatusLetra)}
                className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="Vigente">Vigente</option>
                <option value="Por Vencer">Por Vencer</option>
                <option value="Liquidada">Liquidada</option>
                <option value="En Aclaración">En Aclaración</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-500 font-medium mb-1">Fecha Emisión</label>
              <input
                type="date"
                value={fechaEmision}
                onChange={(e) => setFechaEmision(e.target.value)}
                className="w-full px-2.5 py-1.5 font-mono border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-medium mb-1">Plazo (Días)</label>
              <input
                type="number"
                value={plazoDias}
                onChange={(e) => setPlazoDias(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 font-mono border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-medium mb-1">Fecha Vencimiento</label>
              <input
                type="date"
                value={fechaVencimiento}
                onChange={(e) => setFechaVencimiento(e.target.value)}
                className="w-full px-2.5 py-1.5 font-mono border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-500 font-medium mb-1">Importe Nominal *</label>
              <input
                type="number"
                step="any"
                required
                value={montoNominal}
                onChange={(e) => setMontoNominal(e.target.value)}
                className="w-full px-2.5 py-1.5 font-mono font-bold border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-medium mb-1">Tasa Descuento (% Anual)</label>
              <input
                type="number"
                step="0.01"
                value={tasaDescuento}
                onChange={(e) => setTasaDescuento(e.target.value)}
                className="w-full px-2.5 py-1.5 font-mono border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-medium mb-1">Comisión Factoraje</label>
              <input
                type="number"
                step="any"
                value={comisionFactoraje}
                onChange={(e) => setComisionFactoraje(e.target.value)}
                className="w-full px-2.5 py-1.5 font-mono border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Auto calculation live preview */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5 font-mono">
            <div className="flex items-center justify-between text-slate-500">
              <span>(-) Descuento de Intereses ({plazoDias}d):</span>
              <span>${interesesCalculados.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <span>(-) Comisión y Aforo:</span>
              <span>${comisionNum.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-700">
              <span>(=) Importe Neto Liquidado:</span>
              <span className="text-emerald-600 dark:text-emerald-400">
                ${netoCalculado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {moneda}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-slate-500 font-medium mb-1">Notas / Observaciones de Tesorería</label>
            <textarea
              rows={2}
              placeholder="Ej. Factura validada en portal de proveedores Liverpool..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {/* Footer */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="px-4 py-2 font-semibold text-white bg-[#E10075] hover:bg-[#c70067] rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Guardar Letra en Cartera</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
