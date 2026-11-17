import * as XLSX from 'xlsx';
import { FactoringRecord, EmpresaTipo, BancoFactor, EstatusLetra, MonedaTipo, ProveedoresData, ProveedorDetalleItem, TopProveedoresData, TopProveedorItem, CurvaOperacionData, MesOperacionItem } from '../types/factoring';

/**
 * Extrae el índice del mes (0 = Ene, 11 = Dic) a partir de un valor de fecha
 */
export function extractMonthFromVal(val: any): number | null {
  if (val === undefined || val === null || val === '') return null;
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.getMonth(); // 0 to 11
  }
  if (typeof val === 'number' && val > 25000 && val < 60000) {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? null : d.getMonth();
  }
  const str = String(val).trim();
  const iso = str.match(/^\d{4}-(\d{2})-\d{2}/);
  if (iso) return parseInt(iso[1], 10) - 1;
  const dmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmy) {
    const m = parseInt(dmy[2], 10) - 1;
    if (m >= 0 && m <= 11) return m;
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.getMonth();
  }
  return null;
}

/**
 * Normaliza nombres de encabezados para mapeo flexible
 */
function cleanHeader(header: string): string {
  return String(header || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '');
}

/**
 * Convierte número de serie de fecha Excel o string a formato YYYY-MM-DD
 */
export function parseExcelDate(val: any): string {
  if (!val) return new Date().toISOString().split('T')[0];
  
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().split('T')[0];
  }
  
  // Si es número de serie de Excel (ej. 45281)
  if (typeof val === 'number' && val > 25000 && val < 60000) {
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    return date.toISOString().split('T')[0];
  }

  const str = String(val).trim();
  
  // Formato YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // Formato DD/MM/YYYY o DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Formato MM/DD/YYYY
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return new Date().toISOString().split('T')[0];
}

/**
 * Limpia y castea números (soporta negativos contables entre paréntesis, $, códigos de moneda, comas, espacios, %)
 */
export function parseNumeric(val: any, defaultVal: number = 0): number {
  if (typeof val === 'number') return Number.isFinite(val) ? val : defaultVal;
  if (val === undefined || val === null || val === '') return defaultVal;
  let str = String(val).trim();
  if (!str) return defaultVal;
  let isParenNegative = false;
  if (/^\(.*\)$/.test(str)) {
    isParenNegative = true;
    str = str.slice(1, -1).trim();
  }
  const cleaned = str
    .replace(/\b(MXN|USD|EUR|DLLS|MN)\b/gi, '')
    .replace(/[$€,\s%]/g, '')
    .trim();
  if (!cleaned) return defaultVal;
  const num = parseFloat(cleaned);
  if (!Number.isFinite(num)) return defaultVal;
  return isParenNegative ? -Math.abs(num) : num;
}

/**
 * Parsea un archivo Excel o CSV y devuelve una lista de registros de factoraje normalizados
 */
export async function parseFactoringExcel(
  file: File, 
  defaultYear?: number
): Promise<{ 
  records: FactoringRecord[]; 
  fileName: string; 
  totalNominal: number; 
  proveedores?: ProveedoresData;
  topProveedores?: TopProveedoresData;
  curvaOperacion?: CurvaOperacionData;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });

        // Buscar con prioridad máxima la pestaña "Resumen de Letras" (insensible a mayúsculas, acentos y espacios)
        const normalizeSheet = (str: string) => 
          str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

        let targetSheetName = workbook.SheetNames.find(name => {
          const norm = normalizeSheet(name);
          return norm === 'resumendeletras' || norm === 'resumenletras' || norm.includes('resumendeletras');
        });

        if (!targetSheetName) {
          // Buscar una pestaña que contenga "resumen" o "letras"
          targetSheetName = workbook.SheetNames.find(name => {
            const norm = normalizeSheet(name);
            return norm.includes('resumen') || (norm.includes('letras') && !norm.includes('instruccion'));
          }) || workbook.SheetNames[0];
        }

        const sheetName = targetSheetName;
        if (!sheetName) {
          throw new Error('El archivo no contiene hojas de cálculo legibles.');
        }

        const worksheet = workbook.Sheets[sheetName];
        
        // Revisar si el archivo viene en formato multi-columna (columnas D, G, L, O, T, W, AB, AE)
        // Buscar hoja de Proveedores (insensible a mayúsculas, acentos y espacios)
        const provSheetName = workbook.SheetNames.find(name => {
          const norm = normalizeSheet(name);
          return norm === 'proveedores' || norm === 'proveedor' || norm.includes('proveedor') || norm.includes('cartera');
        });

        let proveedoresExtracted: ProveedoresData | undefined = undefined;

        if (provSheetName) {
          const provWorksheet = workbook.Sheets[provSheetName];
          const provGrid: any[][] = XLSX.utils.sheet_to_json(provWorksheet, { header: 1, defval: '' });

          const isFooterOrEmpty = (val: any): boolean => {
            if (val === undefined || val === null) return true;
            const s = String(val).trim().toUpperCase();
            if (!s) return true;
            return s === 'TOTAL' || s === 'TOTAL GENERAL' || s === 'SUBTOTAL' || s === 'SUMA' || s.startsWith('TOTAL:');
          };

          const livList: string[] = [];
          const subList: string[] = [];
          const detallesLiverpool: ProveedorDetalleItem[] = [];
          const detallesSuburbia: ProveedorDetalleItem[] = [];

          // El conteo e información inicia estrictamente en el renglón 2 de Excel (índice 1 en provGrid de 0-indexed)
          for (let r = 1; r < provGrid.length; r++) {
            const row = provGrid[r];
            if (!row) continue;

            // Liverpool:
            // Columna A (idx 0): Proveedor (número de proveedor)
            // Columna B (idx 1): RFC
            // Columna C (idx 2): Razón Social (nombre del proveedor)
            // Columna D (idx 3): Soc (número de sociedad, para Liverpool será 110)
            // Columna E (idx 4): Negocio (Liverpool)
            const rawNoProvLiv = row[0] !== undefined && row[0] !== null ? String(row[0]).trim() : '';
            const rawRfcLiv = row[1] !== undefined && row[1] !== null ? String(row[1]).trim() : '';
            const rawRazonLiv = row[2] !== undefined && row[2] !== null ? String(row[2]).trim() : '';
            const rawSocLiv = row[3] !== undefined && row[3] !== null && String(row[3]).trim() !== '' ? String(row[3]).trim() : '110';
            const rawNegLiv = row[4] !== undefined && row[4] !== null && String(row[4]).trim() !== '' ? String(row[4]).trim() : 'Liverpool';

            if (rawNoProvLiv !== '' && !isFooterOrEmpty(rawNoProvLiv)) {
              livList.push(rawRazonLiv || rawNoProvLiv);
              detallesLiverpool.push({
                noProveedor: rawNoProvLiv,
                rfc: rawRfcLiv || 'LIV850101XX1',
                razonSocial: rawRazonLiv || `Proveedor Liverpool ${rawNoProvLiv}`,
                sociedad: rawSocLiv || '110',
                negocio: 'Liverpool',
                renglonExcel: r + 1
              });
            }

            // Suburbia:
            // Columna H (idx 7): Proveedor (número de proveedor)
            // Columna I (idx 8): RFC
            // Columna J (idx 9): Razón Social (nombre del proveedor)
            // Columna K (idx 10): Soc (número de sociedad)
            // Columna L (idx 11): Negocio (Suburbia)
            const rawNoProvSub = row[7] !== undefined && row[7] !== null ? String(row[7]).trim() : '';
            const rawRfcSub = row[8] !== undefined && row[8] !== null ? String(row[8]).trim() : '';
            const rawRazonSub = row[9] !== undefined && row[9] !== null ? String(row[9]).trim() : '';
            const rawSocSub = row[10] !== undefined && row[10] !== null && String(row[10]).trim() !== '' ? String(row[10]).trim() : '120';
            const rawNegSub = row[11] !== undefined && row[11] !== null && String(row[11]).trim() !== '' ? String(row[11]).trim() : 'Suburbia';

            if (rawNoProvSub !== '' && !isFooterOrEmpty(rawNoProvSub)) {
              subList.push(rawRazonSub || rawNoProvSub);
              detallesSuburbia.push({
                noProveedor: rawNoProvSub,
                rfc: rawRfcSub || 'SUB900101YY2',
                razonSocial: rawRazonSub || `Proveedor Suburbia ${rawNoProvSub}`,
                sociedad: rawSocSub || '120',
                negocio: 'Suburbia',
                renglonExcel: r + 1
              });
            }
          }

          if (livList.length > 0 || subList.length > 0) {
            proveedoresExtracted = {
              pestaña: 'Proveedores',
              liverpool: livList,
              suburbia: subList,
              detallesLiverpool,
              detallesSuburbia,
              lastUpdated: new Date().toISOString()
            };
          }
        }

        const rawGrid: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        const yearMatch = file.name.match(/\b(202[0-9])\b/);
        const fileYear = yearMatch ? parseInt(yearMatch[1], 10) : (defaultYear || new Date().getFullYear());

        const isResumenSheet = normalizeSheet(sheetName).includes('resumen') || normalizeSheet(sheetName).includes('letras');

        // Verificar si existen columnas hacia la derecha (AB = idx 27, AE = idx 30) o si es la hoja Resumen de Letras
        let isMultiColumnLayout = isResumenSheet;
        if (!isMultiColumnLayout && rawGrid.length > 2) {
          for (let r = 0; r < Math.min(rawGrid.length, 12); r++) {
            const row = rawGrid[r];
            if (row && (row[3] || row[11] || row[19] || row[27])) {
              const countCols = (row[3] ? 1 : 0) + (row[11] ? 1 : 0) + (row[19] ? 1 : 0) + (row[27] ? 1 : 0);
              if (countCols >= 1 && (row[6] || row[14] || row[22] || row[30])) {
                isMultiColumnLayout = true;
                break;
              }
            }
          }
        }

        let records: FactoringRecord[] = [];
        let totalNominal = 0;

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

        const isTotalWord = (val: any): boolean => {
          if (val === undefined || val === null) return false;
          const s = String(val).trim().toUpperCase();
          if (!s) return false;
          return (
            s === 'TOTAL' ||
            s === 'TOTAL GENERAL' ||
            s === 'GRAN TOTAL' ||
            s === 'SUBTOTAL' ||
            s === 'SUMA' ||
            s === 'TOTALES' ||
            s.startsWith('TOTAL:') ||
            s.startsWith('TOTAL ')
          );
        };

        const isHeaderWord = (val: any): boolean => {
          if (val === undefined || val === null) return true;
          const s = String(val).trim().toUpperCase();
          if (!s) return true;
          const forbidden = [
            'FOLIO', 'LETRA', 'LETRAS', 'NO.', 'NUMERO', 'NUM', 'CONTEO', 'CANTIDAD',
            'NO LETRA', 'NO. LETRA', 'TOTAL', 'SUMA', 'TOTAL GENERAL', 'GRAN TOTAL',
            'SUBTOTAL', 'TOTALES', 'IMPORTE', 'IMPORTE TOTAL', 'IMPORTE NOMINAL',
            'MONTO', 'VALOR', 'PROVEEDOR', 'BANCO', 'FECHA', 'VENCIMIENTO', 'DIAS',
            'TASA', 'LIVERPOOL', 'SUBURBIA', 'OPERADA', 'OPERADAS', 'NO OPERADA',
            'NO OPERADAS', 'STATUS', 'ESTATUS', 'NO.PROVEEDOR', 'NO PROVEEDOR',
            'RAZON SOCIAL', 'SOCIEDAD', 'MONEDA'
          ];
          return forbidden.includes(s) || isTotalWord(s);
        };

        // Detectar índices de columna de Importe por bloque (por defecto G=6, O=14, W=22, AE=30)
        const detectImporteCol = (
          countCol: number,
          defaultImpCol: number,
          maxCol: number
        ): number => {
          const maxRow = Math.min(rawGrid.length, 12);
          // Pasada 1: confirmar si la columna por defecto tiene encabezado de Importe/Monto en cualquier fila de cabecera
          for (let r = 0; r < maxRow; r++) {
            const row = rawGrid[r];
            if (!row) continue;
            const defaultClean = cleanHeader(String(row[defaultImpCol] || ''));
            if (
              defaultClean.includes('IMPORTE') ||
              defaultClean.includes('MONTO') ||
              defaultClean.includes('VALOR')
            ) {
              return defaultImpCol;
            }
          }
          // Pasada 2: solo si la columna por defecto no tiene cabecera de Importe/Monto, buscar en columnas vecinas del mismo bloque (de fila inferior a superior)
          for (let r = maxRow - 1; r >= 0; r--) {
            const row = rawGrid[r];
            if (!row) continue;
            for (let c = countCol + 1; c <= Math.min(maxCol, row.length - 1); c++) {
              const h = cleanHeader(String(row[c] || ''));
              if (
                (h.includes('IMPORTE') || h.includes('MONTO')) &&
                !h.includes('NETO') &&
                !h.includes('DESCUENTO') &&
                !h.includes('COMISION')
              ) {
                return c;
              }
            }
          }
          return defaultImpCol;
        };

        const colImpLivOp = detectImporteCol(3, 6, 10);
        const colImpLivNoOp = detectImporteCol(11, 14, 18);
        const colImpSubOp = detectImporteCol(19, 22, 26);
        const colImpSubNoOp = detectImporteCol(27, 30, 35);

        // 1. Detectar si la hoja contiene una tabla resumen directa (Negocio | Estatus | Letras | Importe) en una sola fila
        let foundDirectSummaryTable = false;
        let headerRowIdx = -1;
        let colNegocio = -1;
        let colEstatus = -1;
        let colLetras = -1;
        let colImporte = -1;

        // Solo buscar tabla resumen directa si no hay columnas del layout multi-columna (D, L, T, AB)
        const hasMultiColsHeader = rawGrid.slice(0, 12).some(
          (r) => r && ((r[3] && r[6]) || (r[11] && r[14]) || (r[19] && r[22]) || (r[27] && r[30]))
        );

        if (!hasMultiColsHeader) {
          for (let r = 0; r < Math.min(rawGrid.length, 25); r++) {
            const row = rawGrid[r];
            if (!row || row.length < 3) continue;
            let cNeg = -1;
            let cEst = -1;
            let cLet = -1;
            let cImp = -1;
            for (let c = 0; c < row.length; c++) {
              const cellVal = cleanHeader(String(row[c] || ''));
              if (!cellVal) continue;
              if (cellVal.includes('NEGOCIO')) cNeg = c;
              if (cellVal.includes('ESTATUS') || cellVal.includes('ESTADO')) cEst = c;
              if (cellVal.includes('LETRAS') || cellVal.includes('CANTIDAD') || cellVal.includes('CONTEO')) cLet = c;
              if (cellVal.includes('IMPORTE') || cellVal.includes('MONTO') || cellVal.includes('TOTAL')) cImp = c;
            }
            if (cNeg !== -1 && cEst !== -1 && cLet !== -1 && cImp !== -1) {
              colNegocio = cNeg;
              colEstatus = cEst;
              colLetras = cLet;
              colImporte = cImp;
              headerRowIdx = r;
              foundDirectSummaryTable = true;
              break;
            }
          }
        }

        if (foundDirectSummaryTable && headerRowIdx !== -1) {
          // Extraer las filas de resumen exactas (Liverpool Operadas, etc.)
          for (let r = headerRowIdx + 1; r < rawGrid.length; r++) {
            const row = rawGrid[r];
            if (!row || row.length === 0) continue;
            const negocio = String(row[colNegocio] || '').trim();
            const estatus = String(row[colEstatus] || '').trim();
            const rawLetras = parseNumeric(row[colLetras], 0);
            const rawImporte = parseNumeric(row[colImporte], 0);

            if (!negocio && !estatus && rawLetras > 0) {
              // Fila de Total general
              continue;
            }

            const isLiv = negocio.toLowerCase().includes('liverpool');
            const isSub = negocio.toLowerCase().includes('suburbia');
            const isOp = estatus.toLowerCase().includes('operada') && !estatus.toLowerCase().includes('no');
            const isNoOp = estatus.toLowerCase().includes('no operada') || estatus.toLowerCase().includes('no');

            if ((isLiv || isSub) && (isOp || isNoOp)) {
              const empresa = isLiv ? 'Liverpool' : 'Suburbia';
              const colOrigen = isLiv ? (isOp ? 'D' : 'L') : (isOp ? 'T' : 'AB');
              const finalMonto = rawImporte;
              totalNominal += Math.abs(finalMonto);

              // Generar registro consolidado oficial
              records.push({
                id: `rec_${colOrigen.toLowerCase()}_${fileYear}_summary_${r}`,
                folio: `RESUMEN-${empresa.toUpperCase()}-${isOp ? 'OP' : 'NOOP'}-2026`,
                empresa,
                proveedor: `Cartera Consolidada ${empresa} (${isOp ? 'Operadas' : 'No Operadas'})`,
                rfc: isLiv ? 'LIV850101XX1' : 'SUB900101YY2',
                banco: isLiv ? 'BBVA' : 'Santander',
                fechaEmision: `${fileYear}-01-01`,
                fechaVencimiento: `${fileYear}-12-31`,
                plazoDias: 60,
                moneda: 'MXN',
                tipoCambio: 1.0,
                montoNominal: finalMonto,
                tasaDescuento: 11.25,
                comisionFactoraje: 0,
                montoNeto: finalMonto,
                costoFinanciero: 0,
                estatus: isOp ? 'Liquidada' : 'En Aclaración',
                archivoOrigen: file.name,
                pestañaOrigen: 'Resumen Letras',
                año: fileYear,
                operada: isOp,
                columnaOrigen: colOrigen
              });
            }
          }
        }

        if (isMultiColumnLayout && records.length === 0) {
          // Extracción desde las 4 secciones multi-columna de la pestaña "Resumen Letras":
          // 1. Liverpool Operadas: Conteo Col D (idx 3), Importe Col G (idx 6)
          // 2. Liverpool NO Operadas: Conteo Col L (idx 11), Importe Col O (idx 14)
          // 3. Suburbia Operadas: Conteo Col T (idx 19), Importe Col W (idx 22)
          // 4. Suburbia NO Operadas: Conteo Col AB (idx 27), Importe Col AE (idx 30)
          
          for (let r = 0; r < rawGrid.length; r++) {
            const row = rawGrid[r];
            if (!row || row.length === 0) continue;

            // Bloque 1: Liverpool Operadas
            // Col D (idx 3: Conteo / Folio), Col E (idx 4: No. Proveedor), Col F (idx 5: Razón Social), Col G (idx 6: Importe)
            const rawD = row[3] !== undefined && row[3] !== null ? String(row[3]).trim() : '';
            const rawE = row[4] !== undefined && row[4] !== null ? String(row[4]).trim() : '';
            const rawF = row[5] !== undefined && row[5] !== null ? String(row[5]).trim() : '';
            const montoG = parseNumeric(row[colImpLivOp], 0);
            const isBlock1Total = isTotalWord(rawD) || isTotalWord(rawE) || isTotalWord(rawF);

            if (!isBlock1Total && ((rawD !== '' && !isHeaderWord(rawD)) || (Math.abs(montoG) > 0 && !isHeaderWord(rawD)))) {
              const folio = rawD || `LET-LIV-OP-${r + 1}`;
              
              // Extraer No. Proveedor (Col E)
              const noSap = (!isHeaderWord(rawE) && !isDateVal(rawE) && rawE) 
                ? rawE 
                : (rawF && !isDateVal(rawF) && !isHeaderWord(rawF) ? `P${100000 + (r + 1)}` : '');

              // Extraer Razón Social (Col F) - Nunca permitir fechas
              let prov = (!isHeaderWord(rawF) && !isDateVal(rawF) && rawF) ? rawF : '';
              if (!prov && noSap) {
                prov = `Proveedor Liverpool ${noSap}`;
              } else if (!prov) {
                // Si Col F viene vacía o es fecha, buscar si Col B/A tiene texto no fecha
                const candidate = (!isDateVal(row[1]) && !isHeaderWord(row[1]) && row[1]) ? String(row[1]).trim() : '';
                prov = candidate || `Proveedor Liverpool ${r + 1}`;
              }

              const banco: BancoFactor = 'BBVA';
              const fechaC = (row[2] !== undefined && row[2] !== null && String(row[2]).trim() !== '') 
                ? parseExcelDate(row[2]) 
                : `${fileYear}-09-15`;
              totalNominal += Math.abs(montoG);
              records.push({
                id: `rec_d_${fileYear}_${r}_${Math.random().toString(36).substring(2, 6)}`,
                folio,
                empresa: 'Liverpool',
                proveedor: prov,
                noProveedorSap: noSap || undefined,
                rfc: 'LIV850101XX1',
                banco,
                fechaEmision: fechaC,
                fechaVencimiento: fechaC,
                plazoDias: 60,
                moneda: 'MXN',
                tipoCambio: 1.0,
                montoNominal: montoG,
                tasaDescuento: 11.20,
                comisionFactoraje: Math.round(Math.abs(montoG) * 0.0015),
                montoNeto: Number((montoG * 0.98).toFixed(2)),
                costoFinanciero: Number((montoG * 0.02).toFixed(2)),
                estatus: 'Liquidada',
                archivoOrigen: file.name,
                pestañaOrigen: 'Resumen Letras',
                año: fileYear,
                operada: true,
                columnaOrigen: 'D'
              });
            }

            // Bloque 2: Liverpool NO Operadas (Col L = idx 11, Col O = idx 14)
            const rawL = row[11] !== undefined && row[11] !== null ? String(row[11]).trim() : '';
            const montoO = parseNumeric(row[colImpLivNoOp], 0);
            const isBlock2Total = isTotalWord(rawL) || isTotalWord(row[12]) || isTotalWord(row[13]);
            if (!isBlock2Total && ((rawL !== '' && !isHeaderWord(rawL)) || (Math.abs(montoO) > 0 && !isHeaderWord(rawL)))) {
              const folio = rawL || `LET-LIV-NOOP-${r + 1}`;
              const provCandidate = (!isDateVal(row[10]) && !isHeaderWord(row[10]) && row[10]) 
                ? String(row[10]).trim() 
                : ((!isDateVal(row[9]) && !isHeaderWord(row[9]) && row[9]) ? String(row[9]).trim() : '');
              const prov = provCandidate || `Proveedor Retenido Liverpool ${r + 1}`;
              totalNominal += Math.abs(montoO);
              records.push({
                id: `rec_l_${fileYear}_${r}_${Math.random().toString(36).substring(2, 6)}`,
                folio,
                empresa: 'Liverpool',
                proveedor: prov,
                rfc: 'LIV850101XX1',
                banco: 'BBVA',
                fechaEmision: `${fileYear}-10-01`,
                fechaVencimiento: `${fileYear}-12-15`,
                plazoDias: 60,
                moneda: 'MXN',
                tipoCambio: 1.0,
                montoNominal: montoO,
                tasaDescuento: 11.25,
                comisionFactoraje: 0,
                montoNeto: montoO,
                costoFinanciero: 0,
                estatus: 'En Aclaración',
                archivoOrigen: file.name,
                pestañaOrigen: 'Resumen Letras',
                año: fileYear,
                operada: false,
                columnaOrigen: 'L',
                notas: 'Letra No Operada - Pendiente de validación de entrega o aclaración comercial'
              });
            }

            // Bloque 3: Suburbia Operadas
            // Col T (idx 19: Conteo), Col U (idx 20: No. Prov), Col V (idx 21: Razón Social), Col W (idx 22: Importe)
            const rawT = row[19] !== undefined && row[19] !== null ? String(row[19]).trim() : '';
            const rawU = row[20] !== undefined && row[20] !== null ? String(row[20]).trim() : '';
            const rawV = row[21] !== undefined && row[21] !== null ? String(row[21]).trim() : '';
            const montoW = parseNumeric(row[colImpSubOp], 0);
            const isBlock3Total = isTotalWord(rawT) || isTotalWord(rawU) || isTotalWord(rawV);

            const finalNoSub = (!isHeaderWord(rawU) && !isDateVal(rawU) && rawU) ? rawU : '';
            let finalRazonSub = (!isHeaderWord(rawV) && !isDateVal(rawV) && rawV) ? rawV : '';

            if (!finalRazonSub && finalNoSub) {
              finalRazonSub = `Proveedor Suburbia ${finalNoSub}`;
            }

            if (!isBlock3Total && ((rawT !== '' && !isHeaderWord(rawT)) || (Math.abs(montoW) > 0 && !isHeaderWord(rawT)))) {
              const folio = rawT || `LET-SUB-OP-${r + 1}`;
              const prov = finalRazonSub || `Proveedor Suburbia ${r + 1}`;
              const banco: BancoFactor = 'Santander';
              const fechaS = (row[18] !== undefined && row[18] !== null && String(row[18]).trim() !== '') 
                ? parseExcelDate(row[18]) 
                : `${fileYear}-09-20`;
              totalNominal += Math.abs(montoW);
              records.push({
                id: `rec_t_${fileYear}_${r}_${Math.random().toString(36).substring(2, 6)}`,
                folio,
                empresa: 'Suburbia',
                proveedor: prov,
                noProveedorSap: finalNoSub || undefined,
                rfc: 'SUB900101YY2',
                banco,
                fechaEmision: fechaS,
                fechaVencimiento: fechaS,
                plazoDias: 60,
                moneda: 'MXN',
                tipoCambio: 1.0,
                montoNominal: montoW,
                tasaDescuento: 11.45,
                comisionFactoraje: Math.round(Math.abs(montoW) * 0.0015),
                montoNeto: Number((montoW * 0.98).toFixed(2)),
                costoFinanciero: Number((montoW * 0.02).toFixed(2)),
                estatus: 'Liquidada',
                archivoOrigen: file.name,
                pestañaOrigen: 'Resumen Letras',
                año: fileYear,
                operada: true,
                columnaOrigen: 'T'
              });
            }

            // Bloque 4: Suburbia NO Operadas (Col AB = idx 27, Col AE = idx 30)
            const rawAB = row[27] !== undefined && row[27] !== null ? String(row[27]).trim() : '';
            const montoAE = parseNumeric(row[colImpSubNoOp], 0);
            const isBlock4Total = isTotalWord(rawAB) || isTotalWord(row[28]) || isTotalWord(row[29]);
            if (!isBlock4Total && ((rawAB !== '' && !isHeaderWord(rawAB)) || (Math.abs(montoAE) > 0 && !isHeaderWord(rawAB)))) {
              const folio = rawAB || `LET-SUB-NOOP-${r + 1}`;
              const prov = (row[26] || row[29] || row[28] || row[25] || `Proveedor Retenido Suburbia`).toString().trim();
              totalNominal += Math.abs(montoAE);
              records.push({
                id: `rec_ab_${fileYear}_${r}_${Math.random().toString(36).substring(2, 6)}`,
                folio,
                empresa: 'Suburbia',
                proveedor: isHeaderWord(prov) ? `Proveedor Retenido Suburbia ${r + 1}` : prov,
                rfc: 'SUB900101YY2',
                banco: 'NAFIN',
                fechaEmision: `${fileYear}-10-05`,
                fechaVencimiento: `${fileYear}-12-05`,
                plazoDias: 60,
                moneda: 'MXN',
                tipoCambio: 1.0,
                montoNominal: montoAE,
                tasaDescuento: 11.50,
                comisionFactoraje: 0,
                montoNeto: montoAE,
                costoFinanciero: 0,
                estatus: 'En Aclaración',
                archivoOrigen: file.name,
                pestañaOrigen: 'Resumen Letras',
                año: fileYear,
                operada: false,
                columnaOrigen: 'AB',
                notas: 'Letra No Operada Suburbia - En aclaración con área comercial'
              });
            }
          }
        }

        // Si no fue formato multi-columna, parsear como tabla estándar fila por fila
        if (!isMultiColumnLayout || records.length === 0) {
          const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

          if (!rawJson || rawJson.length === 0) {
            throw new Error('La hoja seleccionada está vacía.');
          }

          // Inspeccionar encabezados para mapear columnas
          const sampleRow = rawJson[0];
          const headerMap: Record<string, string> = {};

          Object.keys(sampleRow).forEach((key) => {
            const norm = cleanHeader(key);
            
            if (norm.includes('FOLIO') || norm.includes('NOLETRA') || norm.includes('LETRA') || norm.includes('FACTURA') || norm.includes('DOCUMENTO')) {
              headerMap['folio'] = key;
            } else if (norm.includes('EMPRESA') || norm.includes('SOCIEDAD') || norm.includes('COMPANIA') || norm.includes('PAGADOR')) {
              headerMap['empresa'] = key;
            } else if (norm.includes('PROVEEDOR') || norm.includes('RAZONSOCIAL') || norm.includes('BENEFICIARIO') || norm.includes('NOMBRE')) {
              headerMap['proveedor'] = key;
            } else if (norm.includes('RFC') || norm.includes('TAXID') || norm.includes('RUT')) {
              headerMap['rfc'] = key;
            } else if (norm.includes('BANCO') || norm.includes('FACTOR') || norm.includes('FONDEADOR') || norm.includes('INSTITUCION')) {
              headerMap['banco'] = key;
            } else if (norm.includes('EMISION') || norm.includes('EXPEDICION') || norm.includes('RADICACION')) {
              headerMap['fechaEmision'] = key;
            } else if (norm.includes('VENCIMIENTO') || norm.includes('VENCE') || norm.includes('EXPIRACION')) {
              headerMap['fechaVencimiento'] = key;
            } else if (norm.includes('PAGO') || norm.includes('LIQUIDACION')) {
              headerMap['fechaPago'] = key;
            } else if (norm.includes('NOMINAL') || norm.includes('IMPORTEBRUTO') || norm.includes('VALORBRUTO') || norm.includes('MONTO') || norm.includes('IMPORTE') || norm.includes('TOTAL')) {
              if (!headerMap['montoNominal']) headerMap['montoNominal'] = key;
            } else if (norm.includes('NETO') || norm.includes('LIQUIDADO') || norm.includes('PAGADO')) {
              headerMap['montoNeto'] = key;
            } else if (norm.includes('TASA') || norm.includes('INTERES') || norm.includes('DESCUENTO')) {
              headerMap['tasaDescuento'] = key;
            } else if (norm.includes('COMISION') || norm.includes('GASTO') || norm.includes('AFORO')) {
              headerMap['comisionFactoraje'] = key;
            } else if (norm.includes('MONEDA') || norm.includes('DIVISA')) {
              headerMap['moneda'] = key;
            } else if (norm.includes('ESTATUS') || norm.includes('ESTADO') || norm.includes('SITUACION')) {
              headerMap['estatus'] = key;
            } else if (norm.includes('SAP') || norm.includes('ACREEDOR') || norm.includes('NOPROV')) {
              headerMap['noProveedorSap'] = key;
            } else if (norm.includes('PLAZO') || norm.includes('DIAS')) {
              headerMap['plazoDias'] = key;
            }
          });

          records = rawJson.map((row, idx) => {
            const rawFolio = headerMap['folio'] ? String(row[headerMap['folio']]).trim() : `LET-${fileYear}-${String(idx + 1).padStart(5, '0')}`;
            
            let empresaRaw = headerMap['empresa'] ? String(row[headerMap['empresa']]).trim() : '';
            let empresa: EmpresaTipo = 'Liverpool';
            if (empresaRaw.toUpperCase().includes('SUBURBIA')) {
              empresa = 'Suburbia';
            } else if (empresaRaw.toUpperCase().includes('DISTRIBUIDORA')) {
              empresa = 'Distribuidora Liverpool';
            }

            const proveedor = headerMap['proveedor'] ? String(row[headerMap['proveedor']]).trim() : `Proveedor General ${idx + 1}`;
            const rfc = headerMap['rfc'] ? String(row[headerMap['rfc']]).trim().toUpperCase() : 'XAXX010101000';
            const noSap = headerMap['noProveedorSap'] ? String(row[headerMap['noProveedorSap']]).trim() : `P${100000 + idx}`;

            let rawBanco = headerMap['banco'] ? String(row[headerMap['banco']]).trim().toUpperCase() : 'BBVA';
            let banco: BancoFactor = 'BBVA';
            if (rawBanco.includes('SANTANDER')) banco = 'Santander';
            else if (rawBanco.includes('BANORTE')) banco = 'Banorte';
            else if (rawBanco.includes('CITI') || rawBanco.includes('BANAMEX')) banco = 'Citibanamex';
            else if (rawBanco.includes('SCOTIA')) banco = 'Scotiabank';
            else if (rawBanco.includes('NAFIN')) banco = 'NAFIN';
            else if (rawBanco.includes('HSBC')) banco = 'HSBC';
            else if (rawBanco.includes('BBVA')) banco = 'BBVA';
            else banco = 'Otro';

            const fechaEmision = headerMap['fechaEmision'] ? parseExcelDate(row[headerMap['fechaEmision']]) : `${fileYear}-01-15`;
            const fechaVencimiento = headerMap['fechaVencimiento'] ? parseExcelDate(row[headerMap['fechaVencimiento']]) : `${fileYear}-03-15`;
            const fechaPago = headerMap['fechaPago'] ? parseExcelDate(row[headerMap['fechaPago']]) : undefined;

            let plazoDias = 60;
            if (headerMap['plazoDias'] && row[headerMap['plazoDias']]) {
              plazoDias = Math.round(parseNumeric(row[headerMap['plazoDias']], 60));
            } else {
              const emi = new Date(fechaEmision).getTime();
              const ven = new Date(fechaVencimiento).getTime();
              if (!isNaN(emi) && !isNaN(ven) && ven > emi) {
                plazoDias = Math.max(15, Math.round((ven - emi) / (1000 * 60 * 60 * 24)));
              }
            }

            const rawMoneda = headerMap['moneda'] ? String(row[headerMap['moneda']]).trim().toUpperCase() : 'MXN';
            const moneda: MonedaTipo = rawMoneda.includes('USD') || rawMoneda.includes('DLL') ? 'USD' : 'MXN';
            const tipoCambio = moneda === 'USD' ? 19.85 : 1.0;

            const montoNominal = Math.abs(headerMap['montoNominal'] ? parseNumeric(row[headerMap['montoNominal']], 150000) : 150000);
            
            let tasaDescuento = headerMap['tasaDescuento'] ? parseNumeric(row[headerMap['tasaDescuento']], 11.25) : 11.25;
            if (tasaDescuento > 0 && tasaDescuento < 1) {
              tasaDescuento = Number((tasaDescuento * 100).toFixed(2));
            }

            const comisionFactoraje = headerMap['comisionFactoraje'] ? parseNumeric(row[headerMap['comisionFactoraje']], 0) : Math.round(montoNominal * 0.0015);

            let montoNeto = 0;
            if (headerMap['montoNeto'] && row[headerMap['montoNeto']]) {
              montoNeto = parseNumeric(row[headerMap['montoNeto']]);
            } else {
              const descuentoInteres = (montoNominal * (tasaDescuento / 100) * plazoDias) / 360;
              montoNeto = Number((montoNominal - descuentoInteres - comisionFactoraje).toFixed(2));
            }

            const costoFinanciero = Number((montoNominal - montoNeto).toFixed(2));

            let estatus: EstatusLetra = 'Vigente';
            const today = new Date().toISOString().split('T')[0];
            if (headerMap['estatus'] && row[headerMap['estatus']]) {
              const rawEst = String(row[headerMap['estatus']]).trim().toUpperCase();
              if (rawEst.includes('LIQUID') || rawEst.includes('PAGAD')) estatus = 'Liquidada';
              else if (rawEst.includes('ACLAR') || rawEst.includes('DISPUTA')) estatus = 'En Aclaración';
              else if (rawEst.includes('VENCID') || rawEst.includes('MORA')) estatus = 'Vencida';
              else if (rawEst.includes('VIGENT') || rawEst.includes('ACTIVA')) estatus = 'Vigente';
              else if (rawEst.includes('POR VENCER') || rawEst.includes('PROXIM')) estatus = 'Por Vencer';
            } else {
              if (fechaPago) {
                estatus = 'Liquidada';
              } else if (fechaVencimiento < today) {
                estatus = 'Vencida';
              } else {
                const diffDays = (new Date(fechaVencimiento).getTime() - new Date(today).getTime()) / (1000 * 3600 * 24);
                if (diffDays <= 15) {
                  estatus = 'Por Vencer';
                } else {
                  estatus = 'Vigente';
                }
              }
            }

            totalNominal += montoNominal * tipoCambio;

            // Determinar operada y columnaOrigen
            const isOperada = estatus !== 'En Aclaración' && estatus !== 'Vencida';
            const columnaOrigen = empresa === 'Suburbia' 
              ? (isOperada ? 'T' : 'AB') 
              : (isOperada ? 'D' : 'L');

            return {
              id: `parsed_row_${fileYear}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
              folio: rawFolio || `LET-${fileYear}-${idx + 100}`,
              empresa,
              proveedor,
              rfc,
              noProveedorSap: noSap,
              banco,
              fechaEmision,
              fechaVencimiento,
              fechaPago,
              plazoDias,
              moneda,
              tipoCambio,
              montoNominal,
              tasaDescuento,
              tasaSpread: 1.25,
              comisionFactoraje,
              montoNeto,
              costoFinanciero,
              estatus,
              archivoOrigen: file.name,
              año: fileYear,
              notas: row['NOTAS'] || row['OBSERVACIONES'] || undefined,
              operada: isOperada,
              columnaOrigen
            };
          });
        }

        // Extracción de TOP 10 de Proveedores por Negocio desde pestaña "Resumen Letras":
        // Liverpool: Col D (Letra, idx 3), Col E (No. Prov, idx 4), Col F (Razón Social, idx 5), Col G (Importe, idx 6)
        // Suburbia: Col T (Letra, idx 19), Col AC (No. Prov, idx 28), Col AD (Razón Social, idx 29), Col AE (Importe, idx 30)
        let topProveedoresExtracted: TopProveedoresData | undefined = undefined;

        if (rawGrid && rawGrid.length > 1) {
          const livProvMap = new Map<string, { noProv: string; razon: string; conteo: number; importe: number }>();
          const subProvMap = new Map<string, { noProv: string; razon: string; conteo: number; importe: number }>();

          for (let r = 1; r < rawGrid.length; r++) {
            const row = rawGrid[r];
            if (!row || row.length === 0) continue;

            // Liverpool (a partir de fila 2: Col D conteo/letra, Col E No. Prov, Col F Razón Social, Col G Importe)
            const rawD = row[3] !== undefined && row[3] !== null ? String(row[3]).trim() : '';
            const rawE = row[4] !== undefined && row[4] !== null ? String(row[4]).trim() : '';
            const rawF = row[5] !== undefined && row[5] !== null ? String(row[5]).trim() : '';
            const rawG = parseNumeric(row[colImpLivOp], 0);

            // Validar que no sea encabezado ni fecha
            if (!isHeaderWord(rawD) && !isHeaderWord(rawF) && !isDateVal(rawF) && (rawD || rawE || rawF || Math.abs(rawG) > 0)) {
              // No. Proveedor (Col E)
              const noProv = (!isDateVal(rawE) && !isHeaderWord(rawE) && rawE) 
                ? rawE 
                : (rawF && !isDateVal(rawF) && !isHeaderWord(rawF) ? `P${100000 + (livProvMap.size + 1)}` : '');

              // Razón Social (Col F) - Estrictamente no permitir fechas
              let razon = (!isDateVal(rawF) && !isHeaderWord(rawF) && rawF) ? rawF : '';
              if (!razon && noProv) {
                razon = `Proveedor Liverpool ${noProv}`;
              } else if (!razon) {
                const candB = (!isDateVal(row[1]) && !isHeaderWord(row[1]) && row[1]) ? String(row[1]).trim() : '';
                razon = candB || `Proveedor Liverpool ${noProv || r}`;
              }

              if (razon && !isDateVal(razon)) {
                const key = (noProv || razon).trim().toLowerCase();
                const existing = livProvMap.get(key) || { noProv: noProv || `P${100100 + livProvMap.size}`, razon, conteo: 0, importe: 0 };
                existing.conteo += 1;
                existing.importe += Math.abs(rawG);
                livProvMap.set(key, existing);
              }
            }

            // Suburbia (a partir de fila 2:
            // Col T (idx 19 conteo), Col U (idx 20 No. Prov), Col V (idx 21 Razón Social), Col W (idx 22 Importe))
            const rawT = row[19] !== undefined && row[19] !== null ? String(row[19]).trim() : '';
            const rawU = row[20] !== undefined && row[20] !== null ? String(row[20]).trim() : '';
            const rawV = row[21] !== undefined && row[21] !== null ? String(row[21]).trim() : '';
            const rawW = parseNumeric(row[colImpSubOp], 0);

            const finalNoSub = (!isDateVal(rawU) && !isHeaderWord(rawU) && rawU) ? rawU : '';
            const finalRazonSub = (!isDateVal(rawV) && !isHeaderWord(rawV) && rawV) ? rawV : '';

            if (!isHeaderWord(rawT) && !isDateVal(finalRazonSub) && (rawT || finalNoSub || finalRazonSub || Math.abs(rawW) > 0)) {
              const noProv = finalNoSub || (finalRazonSub ? `P${100800 + (subProvMap.size + 1)}` : '');
              let razon = finalRazonSub || (noProv ? `Proveedor Suburbia ${noProv}` : `Proveedor ${rawT}`);
              if (!razon || isDateVal(razon)) {
                razon = `Proveedor Suburbia ${noProv || r}`;
              }

              if (razon && !isDateVal(razon)) {
                const key = (noProv || razon).trim().toLowerCase();
                const existing = subProvMap.get(key) || { noProv: noProv || `P${100800 + subProvMap.size}`, razon, conteo: 0, importe: 0 };
                existing.conteo += 1;
                existing.importe += Math.abs(rawW);
                subProvMap.set(key, existing);
              }
            }
          }

          if (livProvMap.size > 0 || subProvMap.size > 0) {
            const livListRaw = Array.from(livProvMap.values());
            const subListRaw = Array.from(subProvMap.values());

            const totalLivLetras = livListRaw.reduce((sum, item) => sum + item.conteo, 0) || 1;
            const totalLivImp = livListRaw.reduce((sum, item) => sum + item.importe, 0) || 1;
            const totalSubLetras = subListRaw.reduce((sum, item) => sum + item.conteo, 0) || 1;
            const totalSubImp = subListRaw.reduce((sum, item) => sum + item.importe, 0) || 1;

            const topLiv: TopProveedorItem[] = livListRaw
              .sort((a, b) => b.conteo - a.conteo)
              .slice(0, 10)
              .map((it, idx) => ({
                ranking: idx + 1,
                noProveedor: it.noProv || `P${100100 + idx}`,
                razonSocial: it.razon,
                empresa: 'Liverpool',
                cantidadLetras: it.conteo,
                totalImporte: Number(it.importe.toFixed(2)),
                porcentajeLetras: Number(((it.conteo / totalLivLetras) * 100).toFixed(1)),
                porcentajeImporte: Number(((it.importe / totalLivImp) * 100).toFixed(1))
              }));

            const topSub: TopProveedorItem[] = subListRaw
              .sort((a, b) => b.conteo - a.conteo)
              .slice(0, 10)
              .map((it, idx) => ({
                ranking: idx + 1,
                noProveedor: it.noProv || `P${100800 + idx}`,
                razonSocial: it.razon,
                empresa: 'Suburbia',
                cantidadLetras: it.conteo,
                totalImporte: Number(it.importe.toFixed(2)),
                porcentajeLetras: Number(((it.conteo / totalSubLetras) * 100).toFixed(1)),
                porcentajeImporte: Number(((it.importe / totalSubImp) * 100).toFixed(1))
              }));

            topProveedoresExtracted = {
              pestaña: 'Resumen Letras',
              liverpool: topLiv,
              suburbia: topSub,
              lastUpdated: new Date().toISOString()
            };
          }
        }

        // Extracción de Curva de Operación de Letras (Enero a Diciembre):
        // Liverpool: Fecha en Columna C (idx 2), Conteo Col D (idx 3), Importe Col G (idx 6)
        // Suburbia: Fecha en Columna S (idx 18), Conteo Col T (idx 19), Importe Col W (idx 22) / Col AE (idx 30)
        let curvaOperacionExtracted: CurvaOperacionData | undefined = undefined;

        if (rawGrid && rawGrid.length > 1) {
          const MONTH_NAMES_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
          const MONTH_NAMES_FULL = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
          ];

          const mesesStats: MesOperacionItem[] = MONTH_NAMES_SHORT.map((mes, idx) => ({
            mesIndex: idx,
            mes,
            mesCompleto: MONTH_NAMES_FULL[idx],
            liverpoolLetras: 0,
            liverpoolImporte: 0,
            suburbiaLetras: 0,
            suburbiaImporte: 0,
            totalLetras: 0,
            totalImporte: 0
          }));

          let totalLivLetrasCurva = 0;
          let totalLivImpCurva = 0;
          let totalSubLetrasCurva = 0;
          let totalSubImpCurva = 0;

          for (let r = 1; r < rawGrid.length; r++) {
            const row = rawGrid[r];
            if (!row || row.length === 0) continue;

            // Liverpool: Col C (idx 2: Fecha), Col D (idx 3: Conteo/Folio), Col G (idx 6: Importe)
            const rawC = row[2];
            const rawG = parseNumeric(row[colImpLivOp], 0);
            if (rawC !== undefined && rawC !== null && String(rawC).trim() !== '') {
              const mIndex = extractMonthFromVal(rawC);
              if (mIndex !== null && mIndex >= 0 && mIndex <= 11) {
                mesesStats[mIndex].liverpoolLetras += 1;
                mesesStats[mIndex].liverpoolImporte += Math.abs(rawG);
                totalLivLetrasCurva += 1;
                totalLivImpCurva += Math.abs(rawG);
              }
            }

            // Suburbia: Col S (idx 18: Fecha), Col T (idx 19: Conteo/Folio), Col W (idx 22: Importe)
            const rawS = row[18];
            const rawW = parseNumeric(row[colImpSubOp], 0);
            if (rawS !== undefined && rawS !== null && String(rawS).trim() !== '') {
              const mIndex = extractMonthFromVal(rawS);
              if (mIndex !== null && mIndex >= 0 && mIndex <= 11) {
                mesesStats[mIndex].suburbiaLetras += 1;
                mesesStats[mIndex].suburbiaImporte += Math.abs(rawW);
                totalSubLetrasCurva += 1;
                totalSubImpCurva += Math.abs(rawW);
              }
            }
          }

          mesesStats.forEach(item => {
            item.totalLetras = item.liverpoolLetras + item.suburbiaLetras;
            item.totalImporte = Number((item.liverpoolImporte + item.suburbiaImporte).toFixed(2));
            item.liverpoolImporte = Number(item.liverpoolImporte.toFixed(2));
            item.suburbiaImporte = Number(item.suburbiaImporte.toFixed(2));
          });

          if (totalLivLetrasCurva > 0 || totalSubLetrasCurva > 0) {
            curvaOperacionExtracted = {
              pestaña: 'Resumen Letras',
              año: fileYear,
              columnaLiverpool: 'C',
              columnaSuburbia: 'S',
              meses: mesesStats,
              totalLiverpoolLetras: totalLivLetrasCurva,
              totalLiverpoolImporte: Number(totalLivImpCurva.toFixed(2)),
              totalSuburbiaLetras: totalSubLetrasCurva,
              totalSuburbiaImporte: Number(totalSubImpCurva.toFixed(2)),
              totalGlobalLetras: totalLivLetrasCurva + totalSubLetrasCurva,
              totalGlobalImporte: Number((totalLivImpCurva + totalSubImpCurva).toFixed(2)),
              lastUpdated: new Date().toISOString()
            };
          }
        }

        resolve({
          records,
          fileName: file.name,
          totalNominal,
          proveedores: proveedoresExtracted,
          topProveedores: topProveedoresExtracted,
          curvaOperacion: curvaOperacionExtracted
        });
      } catch (err: any) {
        reject(new Error(`Error al procesar el archivo Excel: ${err?.message || err}`));
      }
    };

    reader.onerror = () => reject(new Error('Fallo en la lectura del archivo.'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Exporta registros filtrados a un archivo Excel (.xlsx) con formato formal
 */
export function exportToExcel(records: FactoringRecord[], fileNamePrefix = 'Control_Letras_Factoraje_Consolidado'): void {
  const data = records.map((r, i) => ({
    'No.': i + 1,
    'Folio / Letra': r.folio,
    'Empresa': r.empresa,
    'Proveedor (Razón Social)': r.proveedor,
    'RFC': r.rfc,
    'ID SAP': r.noProveedorSap || '',
    'Banco Factor': r.banco,
    'Fecha Emisión': r.fechaEmision,
    'Fecha Vencimiento': r.fechaVencimiento,
    'Fecha Liquidación': r.fechaPago || 'Pendiente',
    'Plazo (Días)': r.plazoDias,
    'Moneda': r.moneda,
    'Tipo de Cambio': r.tipoCambio,
    'Importe Nominal': r.montoNominal,
    'Tasa Descuento (% Anual)': r.tasaDescuento,
    'Comisión Factoraje': r.comisionFactoraje,
    'Importe Neto Pagado': r.montoNeto,
    'Costo Financiero': r.costoFinanciero,
    'Estatus': r.estatus,
    'Año': r.año,
    'Archivo Origen': r.archivoOrigen
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);

  // Anchos automáticos de columna
  const colWidths = [
    { wch: 6 },  // No.
    { wch: 18 }, // Folio
    { wch: 22 }, // Empresa
    { wch: 34 }, // Proveedor
    { wch: 15 }, // RFC
    { wch: 12 }, // ID SAP
    { wch: 14 }, // Banco
    { wch: 14 }, // Emision
    { wch: 16 }, // Vencimiento
    { wch: 16 }, // Liquidacion
    { wch: 12 }, // Plazo
    { wch: 8 },  // Moneda
    { wch: 12 }, // TC
    { wch: 18 }, // Nominal
    { wch: 16 }, // Tasa
    { wch: 16 }, // Comision
    { wch: 18 }, // Neto
    { wch: 16 }, // Costo
    { wch: 14 }, // Estatus
    { wch: 8 },  // Año
    { wch: 28 }, // Archivo
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Control de Letras');

  const today = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${fileNamePrefix}_${today}.xlsx`);
}

/**
 * Genera y descarga una plantilla modelo de Excel para captura de Factoraje
 */
export function downloadExcelTemplate(): void {
  const sampleData = [
    {
      'FOLIO': 'LET-2025-00101',
      'EMPRESA': 'Liverpool',
      'PROVEEDOR': 'Mabe S.A. de C.V.',
      'RFC': 'MAB760315XX9',
      'NO_PROVEEDOR_SAP': 'P100452',
      'BANCO': 'BBVA',
      'FECHA_EMISION': '2025-01-15',
      'FECHA_VENCIMIENTO': '2025-03-15',
      'FECHA_PAGO': '2025-03-15',
      'PLAZO_DIAS': 60,
      'MONEDA': 'MXN',
      'IMPORTE_NOMINAL': 2450000.00,
      'TASA_DESCUENTO': 11.20,
      'COMISION': 3675.00,
      'IMPORTE_NETO': 2398500.00,
      'ESTATUS': 'Liquidada'
    },
    {
      'FOLIO': 'LET-2025-00102',
      'EMPRESA': 'Suburbia',
      'PROVEEDOR': 'Distribuidora Textil Azteca S.A.',
      'RFC': 'DTA880419KM2',
      'NO_PROVEEDOR_SAP': 'P100890',
      'BANCO': 'Santander',
      'FECHA_EMISION': '2025-02-01',
      'FECHA_VENCIMIENTO': '2025-04-02',
      'FECHA_PAGO': '',
      'PLAZO_DIAS': 60,
      'MONEDA': 'MXN',
      'IMPORTE_NOMINAL': 980000.00,
      'TASA_DESCUENTO': 11.45,
      'COMISION': 1470.00,
      'IMPORTE_NETO': 960500.00,
      'ESTATUS': 'Vigente'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla Factoraje');
  XLSX.writeFile(workbook, 'Plantilla_Control_Letras_Factoraje_Liverpool_Suburbia.xlsx');
}
