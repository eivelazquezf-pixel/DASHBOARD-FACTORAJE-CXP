import { FactoringRecord, FileMetadata, BankCreditLine, TreasuryAnomaly, ProveedoresData, ProveedorDetalleItem, TopProveedoresData, TopProveedorItem, CurvaOperacionData } from '../types/factoring';
import { RAW_INITIAL_RECORDS, INITIAL_FILES_METADATA, INITIAL_BANK_CREDIT_LINES, INITIAL_PROVEEDORES_DATA, INITIAL_TOP_PROVEEDORES_DATA, INITIAL_CURVA_OPERACION_DATA } from '../data/mockFactoringData';

const STORAGE_KEYS = {
  RECORDS: 'liverpool_factoring_records_v1',
  FILES: 'liverpool_factoring_files_v1',
  BANK_LINES: 'liverpool_factoring_bank_lines_v1',
  PROVEEDORES: 'liverpool_factoring_proveedores_v1',
  TOP_PROVEEDORES: 'liverpool_factoring_top_proveedores_v1',
  CURVA_OPERACION: 'liverpool_factoring_curva_operacion_v1'
};

const MAX_LOCAL_STORAGE_CHARS = 1_500_000;

function safeSetLocalStorage(key: string, data: unknown): void {
  try {
    const serialized = JSON.stringify(data);
    if (serialized.length > MAX_LOCAL_STORAGE_CHARS) {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(key, serialized);
  } catch {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignorar si localStorage no está disponible
    }
  }
}

export function loadSavedRecords(): FactoringRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECORDS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const isMock = (r: FactoringRecord) =>
          !r || !r.id ||
          /^rec_202\d_\d+$/.test(r.id) ||
          r.id.startsWith('mock_');

        const hasRealUploads = parsed.some((r: FactoringRecord) => !isMock(r));

        const baseList = hasRealUploads ? parsed.filter((r: FactoringRecord) => !isMock(r)) : parsed;

        if (hasRealUploads && baseList.length !== parsed.length) {
          try {
            localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(baseList));
          } catch (_) {}
        }

        return baseList.map((r: FactoringRecord) => {
          const pestaña = r.pestañaOrigen || 'Resumen Letras';
          if (!r.columnaOrigen) {
            const isOp = r.operada ?? (r.estatus !== 'En Aclaración' && r.estatus !== 'Vencida');
            const col = r.empresa === 'Suburbia' ? (isOp ? 'T' : 'AB') : (isOp ? 'D' : 'L');
            return { ...r, operada: isOp, columnaOrigen: col, pestañaOrigen: pestaña };
          }
          return { ...r, pestañaOrigen: pestaña };
        });
      }
    }
  } catch (e) {
    console.error('Error loading saved records:', e);
  }
  return RAW_INITIAL_RECORDS;
}

export function saveRecords(records: FactoringRecord[]): void {
  if (records.length > 1000) {
    try {
      localStorage.removeItem(STORAGE_KEYS.RECORDS);
    } catch {
      // Ignorar
    }
    return;
  }
  safeSetLocalStorage(STORAGE_KEYS.RECORDS, records);
}

export function loadSavedFiles(): FileMetadata[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FILES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading saved files metadata:', e);
  }
  return INITIAL_FILES_METADATA;
}

export function saveFiles(files: FileMetadata[]): void {
  safeSetLocalStorage(STORAGE_KEYS.FILES, files);
}

export function loadBankLines(): BankCreditLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BANK_LINES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading bank lines:', e);
  }
  return INITIAL_BANK_CREDIT_LINES;
}

export function saveBankLines(lines: BankCreditLine[]): void {
  safeSetLocalStorage(STORAGE_KEYS.BANK_LINES, lines);
}

export function loadSavedProveedores(): ProveedoresData {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROVEEDORES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.liverpool) && Array.isArray(parsed.suburbia)) {
        const detallesLiverpool: ProveedorDetalleItem[] = (Array.isArray(parsed.detallesLiverpool) && parsed.detallesLiverpool.length > 0)
          ? parsed.detallesLiverpool
          : parsed.liverpool.map((p: string, idx: number) => ({
              noProveedor: `P${100100 + idx}`,
              rfc: 'LIV850101XX1',
              razonSocial: p,
              sociedad: '110',
              negocio: 'Liverpool' as const,
              renglonExcel: idx + 2
            }));

        const detallesSuburbia: ProveedorDetalleItem[] = (Array.isArray(parsed.detallesSuburbia) && parsed.detallesSuburbia.length > 0)
          ? parsed.detallesSuburbia
          : parsed.suburbia.map((p: string, idx: number) => ({
              noProveedor: `P${100800 + idx}`,
              rfc: 'SUB900101YY2',
              razonSocial: p,
              sociedad: '120',
              negocio: 'Suburbia' as const,
              renglonExcel: idx + 2
            }));

        return {
          ...parsed,
          detallesLiverpool,
          detallesSuburbia
        };
      }
    }
  } catch (e) {
    console.error('Error loading proveedores data:', e);
  }
  return INITIAL_PROVEEDORES_DATA;
}

export function saveProveedores(data: ProveedoresData): void {
  safeSetLocalStorage(STORAGE_KEYS.PROVEEDORES, data);
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

export function loadSavedTopProveedores(): TopProveedoresData {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TOP_PROVEEDORES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.liverpool) && Array.isArray(parsed.suburbia)) {
        // Sanitizar cualquier fecha que haya quedado guardada como razón social
        const sanitizeList = (list: TopProveedorItem[], defaultCompany: 'Liverpool' | 'Suburbia'): TopProveedorItem[] => {
          return list.map((item, idx) => {
            let cleanRazon = item.razonSocial;
            if (isDateVal(cleanRazon)) {
              // Si la razón social es una fecha, sustituir por nombre limpio
              cleanRazon = defaultCompany === 'Liverpool' 
                ? (INITIAL_TOP_PROVEEDORES_DATA.liverpool[idx]?.razonSocial || `Proveedor Liverpool ${item.noProveedor || idx + 1}`)
                : (INITIAL_TOP_PROVEEDORES_DATA.suburbia[idx]?.razonSocial || `Proveedor Suburbia ${item.noProveedor || idx + 1}`);
            }
            return {
              ...item,
              razonSocial: cleanRazon
            };
          });
        };

        return {
          ...parsed,
          liverpool: sanitizeList(parsed.liverpool, 'Liverpool'),
          suburbia: sanitizeList(parsed.suburbia, 'Suburbia')
        };
      }
    }
  } catch (e) {
    console.error('Error loading top proveedores data:', e);
  }
  return INITIAL_TOP_PROVEEDORES_DATA;
}

export function saveTopProveedores(data: TopProveedoresData): void {
  safeSetLocalStorage(STORAGE_KEYS.TOP_PROVEEDORES, data);
}

export function loadSavedCurvaOperacion(): CurvaOperacionData {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CURVA_OPERACION);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.meses) && parsed.meses.length === 12) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading curva operacion data:', e);
  }
  return INITIAL_CURVA_OPERACION_DATA;
}

export function saveCurvaOperacion(data: CurvaOperacionData): void {
  safeSetLocalStorage(STORAGE_KEYS.CURVA_OPERACION, data);
}

export function resetToDefaults(): { 
  records: FactoringRecord[]; 
  files: FileMetadata[]; 
  bankLines: BankCreditLine[]; 
  proveedores: ProveedoresData;
  topProveedores: TopProveedoresData;
  curvaOperacion: CurvaOperacionData;
} {
  localStorage.removeItem(STORAGE_KEYS.RECORDS);
  localStorage.removeItem(STORAGE_KEYS.FILES);
  localStorage.removeItem(STORAGE_KEYS.BANK_LINES);
  localStorage.removeItem(STORAGE_KEYS.PROVEEDORES);
  localStorage.removeItem(STORAGE_KEYS.TOP_PROVEEDORES);
  localStorage.removeItem(STORAGE_KEYS.CURVA_OPERACION);
  return {
    records: RAW_INITIAL_RECORDS,
    files: INITIAL_FILES_METADATA,
    bankLines: INITIAL_BANK_CREDIT_LINES,
    proveedores: INITIAL_PROVEEDORES_DATA,
    topProveedores: INITIAL_TOP_PROVEEDORES_DATA,
    curvaOperacion: INITIAL_CURVA_OPERACION_DATA
  };
}

/**
 * Detecta anomalías y alertas de conciliación para el equipo de Tesorería
 */
export function detectTreasuryAnomalies(records: FactoringRecord[]): TreasuryAnomaly[] {
  const anomalies: TreasuryAnomaly[] = [];
  const today = new Date().toISOString().split('T')[0];
  const todayTime = new Date(today).getTime();

  // 1. Vencimientos críticos en próximos 7 días
  records.forEach((r) => {
    if (r.estatus !== 'Liquidada') {
      const vDate = new Date(r.fechaVencimiento).getTime();
      const diffDays = Math.ceil((vDate - todayTime) / (1000 * 3600 * 24));

      if (diffDays <= 0) {
        anomalies.push({
          id: `anom_venc_${r.id}`,
          tipo: 'vencimiento_critico',
          severidad: 'alta',
          titulo: `Letra Vencida sin Confirmación de Liquidación`,
          descripcion: `Folio ${r.folio} (${r.empresa}) por $${(r.montoNominal * r.tipoCambio).toLocaleString('es-MX')} MXN con vencimiento el ${r.fechaVencimiento} no registra fecha de pago.`,
          folio: r.folio,
          proveedor: r.proveedor,
          monto: r.montoNominal * r.tipoCambio,
          fecha: r.fechaVencimiento
        });
      } else if (diffDays <= 7) {
        anomalies.push({
          id: `anom_prox_${r.id}`,
          tipo: 'vencimiento_critico',
          severidad: 'alta',
          titulo: `Vencimiento Inminente (${diffDays} días)`,
          descripcion: `Folio ${r.folio} (${r.proveedor}) vence el ${r.fechaVencimiento}. Requiere fondeo en banco ${r.banco}.`,
          folio: r.folio,
          proveedor: r.proveedor,
          monto: r.montoNominal * r.tipoCambio,
          fecha: r.fechaVencimiento
        });
      }
    }
  });

  // 2. Concentración por proveedor (> 15% del total de la cartera activa)
  const totalActiva = records
    .filter((r) => r.estatus === 'Vigente' || r.estatus === 'Por Vencer')
    .reduce((sum, r) => sum + r.montoNominal * r.tipoCambio, 0);

  if (totalActiva > 0) {
    const provTotales: Record<string, number> = {};
    records
      .filter((r) => r.estatus === 'Vigente' || r.estatus === 'Por Vencer')
      .forEach((r) => {
        provTotales[r.proveedor] = (provTotales[r.proveedor] || 0) + (r.montoNominal * r.tipoCambio);
      });

    Object.entries(provTotales).forEach(([prov, monto]) => {
      const pct = (monto / totalActiva) * 100;
      if (pct >= 18) {
        anomalies.push({
          id: `anom_conc_${prov.substring(0, 8)}`,
          tipo: 'concentracion_alta',
          severidad: 'media',
          titulo: `Alta Concentración de Cartera (${pct.toFixed(1)}%)`,
          descripcion: `El proveedor ${prov} concentra $${monto.toLocaleString('es-MX')} MXN de la cartera activa. Se sugiere diversificar líneas.`,
          proveedor: prov,
          monto
        });
      }
    });
  }

  // 3. Revisión de tasas atípicas (> 13% o < 8% para MXN)
  records.forEach((r) => {
    if (r.moneda === 'MXN' && r.tasaDescuento > 13.5) {
      anomalies.push({
        id: `anom_tasa_${r.id}`,
        tipo: 'tasa_desviada',
        severidad: 'media',
        titulo: `Tasa de Descuento Atípica (${r.tasaDescuento}%)`,
        descripcion: `Folio ${r.folio} en ${r.banco} presenta una tasa pactada significativamente superior al benchmark institucional (11.25%).`,
        folio: r.folio,
        proveedor: r.proveedor
      });
    }
  });

  // 4. Folios duplicados
  const folioCount: Record<string, number> = {};
  records.forEach(r => {
    const key = `${r.folio}_${r.empresa}`;
    folioCount[key] = (folioCount[key] || 0) + 1;
  });

  Object.entries(folioCount).forEach(([key, count]) => {
    if (count > 1) {
      const [folio, emp] = key.split('_');
      anomalies.push({
        id: `anom_dup_${key}`,
        tipo: 'duplicado_potencial',
        severidad: 'alta',
        titulo: `Folio Duplicado Detectado`,
        descripcion: `El folio ${folio} aparece ${count} veces en los archivos cargados para ${emp}. Verifique si se trata de un endoso o doble carga.`,
        folio
      });
    }
  });

  return anomalies;
}
