export type EmpresaTipo = 'Liverpool' | 'Suburbia' | 'Distribuidora Liverpool';

export type BancoFactor = 
  | 'BBVA' 
  | 'Santander' 
  | 'Banorte' 
  | 'Citibanamex' 
  | 'Scotiabank' 
  | 'NAFIN' 
  | 'HSBC'
  | 'Otro';

export type EstatusLetra = 
  | 'Vigente' 
  | 'Liquidada' 
  | 'Por Vencer' 
  | 'En Aclaración' 
  | 'Vencida';

export type MonedaTipo = 'MXN' | 'USD';

export interface FactoringRecord {
  id: string;
  folio: string;               // e.g. "LET-2025-00481", "FAC-98412"
  empresa: EmpresaTipo;        // Liverpool, Suburbia, Distribuidora Liverpool
  proveedor: string;           // Razón Social
  rfc: string;                 // RFC del Proveedor
  noProveedorSap?: string;     // Número de acreedor SAP
  banco: BancoFactor;          // Institución fondeadora
  fechaEmision: string;        // YYYY-MM-DD
  fechaVencimiento: string;    // YYYY-MM-DD
  fechaPago?: string;          // YYYY-MM-DD (si ya fue liquidada)
  plazoDias: number;           // Días plazo (30, 60, 90, 120)
  moneda: MonedaTipo;
  tipoCambio: number;          // 1.0 para MXN o valor fix para USD (ej. 19.85)
  montoNominal: number;        // Importe bruto factura/letra
  tasaDescuento: number;       // Tasa anualizada % (ej. 11.45%)
  tasaSpread?: number;         // Spread sobre TIIE (ej. 1.25%)
  comisionFactoraje: number;   // Monto de comisión por transacción
  montoNeto: number;           // Monto liquidado al proveedor (Nominal - Descuento - Comisión)
  costoFinanciero: number;     // Descuento total + Comisiones
  estatus: EstatusLetra;
  archivoOrigen: string;       // Nombre del archivo Excel de origen
  año: number;                 // 2024, 2025, 2026
  notas?: string;
  categoria?: string;          // Línea de negocio (Electrónica, Moda, Hogar, Calzado, Perfumería)
  prioridad?: 'Normal' | 'Estratégico' | 'Urgente';
  operada?: boolean;           // true = Operada, false = NO Operada
  columnaOrigen?: 'D' | 'L' | 'T' | 'AB'; // Columna en el Excel de Liverpool/Suburbia
  pestañaOrigen?: string;      // Pestaña 'Resumen de Letras'
}

export interface Factoring5CardsSummary {
  pestaña: string;             // Pestaña 'Resumen de Letras'
  // 1ra tarjeta: Conteo (D, L, T, AB) y Suma Importe (G, O, W, AE)
  total2026: {
    nombre: string;
    subnombre?: string;
    conteo: number;
    importe: number;
    columnasConteo?: string;
    columnasImporte?: string;
  };
  // 2da tarjeta: Conteo (D) y Suma Importe (G)
  liverpoolOperadas: {
    nombre: string;
    subnombre?: string;
    conteo: number;
    importe: number;
    columnaConteo?: string;
    columnaImporte?: string;
  };
  // 3ra tarjeta: Conteo (L) y Suma Importe (O)
  liverpoolNoOperadas: {
    nombre: string;
    subnombre?: string;
    conteo: number;
    importe: number;
    columnaConteo?: string;
    columnaImporte?: string;
  };
  // 4ta tarjeta: Conteo (T) y Suma Importe (W)
  suburbiaOperadas: {
    nombre: string;
    subnombre?: string;
    conteo: number;
    importe: number;
    columnaConteo?: string;
    columnaImporte?: string;
  };
  // 5ta tarjeta: Conteo (AB) y Suma Importe (AE)
  suburbiaNoOperadas: {
    nombre: string;
    subnombre?: string;
    conteo: number;
    importe: number;
    columnaConteo?: string;
    columnaImporte?: string;
  };
}

export interface FileMetadata {
  id: string;
  name: string;
  uploadedAt: string;
  recordCount: number;
  totalNominalMXN: number;
  year: number;
  empresa: string;
  enabled: boolean;
}

export interface BankCreditLine {
  banco: BancoFactor;
  lineaAutorizada: number;    // en MXN
  lineaUtilizada: number;     // en MXN
  tasaReferencia: string;
  tasaPonderada: number;
  calificacion: string;
}

export interface FactoringFilters {
  empresa: string;            // 'all' | 'Liverpool' | 'Suburbia' | 'Distribuidora Liverpool'
  año: string;                // 'all' | '2026' | '2025' | '2024'
  banco: string;              // 'all' | BancoFactor
  estatus: string;            // 'all' | EstatusLetra
  moneda: string;             // 'all' | 'MXN' | 'USD'
  search: string;             // Proveedor, RFC, Folio
  vencimientoRango: 'all' | 'vencidas' | '7dias' | '15dias' | '30dias' | '60dias+';
}

export interface TreasuryAnomaly {
  id: string;
  tipo: 'vencimiento_critico' | 'concentracion_alta' | 'tasa_desviada' | 'duplicado_potencial';
  severidad: 'alta' | 'media' | 'baja';
  titulo: string;
  descripcion: string;
  folio?: string;
  proveedor?: string;
  monto?: number;
  fecha?: string;
}

export interface ProveedorItem {
  nombre: string;
  empresa: 'Liverpool' | 'Suburbia';
  columnaOrigen: 'A' | 'H';
  pestañaOrigen: string; // 'Proveedores'
}

export interface ProveedorDetalleItem {
  noProveedor: string;         // Col A (Liverpool) / Col H (Suburbia)
  rfc: string;                 // Col B (Liverpool) / Col I (Suburbia)
  razonSocial: string;         // Col C (Liverpool) / Col J (Suburbia)
  sociedad: string;            // Col D (Liverpool: 110) / Col K (Suburbia)
  negocio: 'Liverpool' | 'Suburbia'; // Col E (Liverpool) / Col L (Suburbia)
  renglonExcel?: number;
}

export interface ProveedoresData {
  pestaña: string; // 'Proveedores'
  liverpool: string[]; // Columna A
  suburbia: string[];  // Columna H
  detallesLiverpool?: ProveedorDetalleItem[];
  detallesSuburbia?: ProveedorDetalleItem[];
  lastUpdated?: string;
}

export interface TopProveedorItem {
  ranking: number;
  noProveedor: string;         // Col E (Liverpool) / Col AC (Suburbia)
  razonSocial: string;         // Col F (Liverpool) / Col AD (Suburbia)
  empresa: 'Liverpool' | 'Suburbia';
  cantidadLetras: number;      // Conteo de letras en Col D / Col T
  totalImporte: number;        // Suma de importes en Col G / Col AE
  porcentajeLetras?: number;   // % respecto a total letras del negocio
  porcentajeImporte?: number;  // % respecto a total importe del negocio
}

export interface TopProveedoresData {
  pestaña: string; // 'Resumen Letras'
  liverpool: TopProveedorItem[];
  suburbia: TopProveedorItem[];
  lastUpdated?: string;
}

export interface MesOperacionItem {
  mesIndex: number;          // 0 = Ene, 11 = Dic
  mes: string;               // 'Ene', 'Feb', 'Mar', ...
  mesCompleto: string;       // 'Enero', 'Febrero', 'Marzo', ...
  liverpoolLetras: number;   // Conteo de letras operadas Liverpool (Col C)
  liverpoolImporte: number;  // Importe operado Liverpool (Col G)
  suburbiaLetras: number;    // Conteo de letras operadas Suburbia (Col S)
  suburbiaImporte: number;   // Importe operado Suburbia (Col W / AE)
  totalLetras: number;       // Suma letras ambos negocios
  totalImporte: number;      // Suma importe ambos negocios
}

export interface CurvaOperacionData {
  pestaña: string;           // 'Resumen Letras' (o 'Resumen de Letras')
  año: number;
  meses: MesOperacionItem[];
  totalLiverpoolLetras: number;
  totalLiverpoolImporte: number;
  totalSuburbiaLetras: number;
  totalSuburbiaImporte: number;
  totalGlobalLetras: number;
  totalGlobalImporte: number;
  columnaLiverpool: 'C';
  columnaSuburbia: 'S';
  lastUpdated?: string;
}
