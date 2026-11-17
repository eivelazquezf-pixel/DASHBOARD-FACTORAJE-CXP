import * as XLSX from 'xlsx';

// Fixed Google Sheets / Drive synchronization service
// Directly linked to a single corporate Google Spreadsheet ID without user-selectable file sources.

const ENV_SHEET_ID =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_SHEET_ID
    ? String(import.meta.env.VITE_GOOGLE_SHEET_ID).trim()
    : '';

/**
 * Extrae el ID de hoja de cálculo si se pega una URL completa de Google Sheets o Drive,
 * o devuelve el ID directamente si ya viene limpio.
 */
export function extractSpreadsheetId(urlOrId: string): string {
  const trimmed = (urlOrId || '').trim();
  const match = trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

// Configura aquí la URL o el ID del archivo de Google Sheets vinculado al tablero:
export const LINKED_SPREADSHEET_SOURCE =
  ENV_SHEET_ID || '1CxJByU5dy_doaqlPFGTSy4H5ivMsMmEvGGO92sRLmhk';

export const LINKED_SPREADSHEET_ID = extractSpreadsheetId(
  LINKED_SPREADSHEET_SOURCE
);

export function isLinkedSheetConfigured(): boolean {
  return (
    Boolean(LINKED_SPREADSHEET_ID) &&
    LINKED_SPREADSHEET_ID !== 'PENDIENTE_SPREADSHEET_ID'
  );
}

export interface LinkedSheetSyncResult {
  file: File;
  sheetName: string;
  modifiedTime?: string;
}

/**
 * Obtiene los valores exactos evaluados por Google Sheets API v4 (UNFORMATTED_VALUE + SERIAL_NUMBER)
 * para evitar redondeos, textos formateados ($/comas/paréntesis) o caché desactualizada en fórmulas.
 */
async function fetchSpreadsheetViaSheetsApi(
  accessToken: string,
  spreadsheetId: string,
  baseName: string,
  exportMime: string,
  cacheBust: number
): Promise<File> {
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties.title&_t=${cacheBust}`,
    {
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (metaRes.status === 401) {
    throw new Error('TOKEN_EXPIRED');
  }

  if (!metaRes.ok) {
    const errBody = await metaRes.json().catch(() => ({}));
    throw new Error(
      errBody?.error?.message || `Sheets metadata error ${metaRes.status}`
    );
  }

  const sheetMeta = (await metaRes.json()) as {
    properties?: { title?: string };
    sheets?: Array<{ properties?: { title?: string } }>;
  };

  const sheetTitles = (sheetMeta.sheets || [])
    .map((s) => s.properties?.title)
    .filter((t): t is string => Boolean(t));

  if (sheetTitles.length === 0) {
    throw new Error('La hoja de Google Sheets no contiene pestañas visibles.');
  }

  const workbook = XLSX.utils.book_new();
  const chunkSize = 8;

  for (let i = 0; i < sheetTitles.length; i += chunkSize) {
    const chunk = sheetTitles.slice(i, i + chunkSize);
    const params = new URLSearchParams({
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'SERIAL_NUMBER',
      _t: String(cacheBust),
    });
    chunk.forEach((title) => {
      const escaped = `'${title.replace(/'/g, "''")}'`;
      params.append('ranges', escaped);
    });

    const batchRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${params.toString()}`,
      {
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (batchRes.status === 401) {
      throw new Error('TOKEN_EXPIRED');
    }

    if (!batchRes.ok) {
      const errBody = await batchRes.json().catch(() => ({}));
      throw new Error(
        errBody?.error?.message || `Sheets values error ${batchRes.status}`
      );
    }

    const batchData = (await batchRes.json()) as {
      valueRanges?: Array<{ range?: string; values?: unknown[][] }>;
    };

    (batchData.valueRanges || []).forEach((vr, idx) => {
      const title = chunk[idx] || `Hoja_${i + idx + 1}`;
      const rows = Array.isArray(vr.values) && vr.values.length > 0 ? vr.values : [[]];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      // Excel tab names max 31 chars
      const safeName = title.slice(0, 31);
      XLSX.utils.book_append_sheet(workbook, ws, safeName);
    });
  }

  const xlsxBytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  const fileName = baseName.toLowerCase().endsWith('.xlsx')
    ? baseName
    : `${baseName}.xlsx`;

  return new File([xlsxBytes], fileName, { type: exportMime });
}

export async function fetchLinkedGoogleSheetAsFile(
  accessToken: string
): Promise<LinkedSheetSyncResult> {
  if (!isLinkedSheetConfigured()) {
    throw new Error(
      'Falta configurar el ID o URL del archivo Google Sheets vinculado (LINKED_SPREADSHEET_SOURCE).'
    );
  }

  const fileId = encodeURIComponent(LINKED_SPREADSHEET_ID);
  const cacheBust = Date.now();

  // 1. Obtener metadatos reales del archivo (nombre, tipo MIME, fecha de modificación)
  const metaRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,modifiedTime&supportsAllDrives=true&_t=${cacheBust}`,
    {
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (metaRes.status === 401) {
    throw new Error('TOKEN_EXPIRED');
  }

  if (metaRes.status === 404) {
    throw new Error(
      'No se encontró el archivo de Google Sheets configurado o tu cuenta no tiene permisos de lectura sobre él.'
    );
  }

  if (!metaRes.ok) {
    const errBody = await metaRes.json().catch(() => ({}));
    throw new Error(
      errBody?.error?.message ||
        `Error ${metaRes.status} al consultar el archivo vinculado en Google Drive.`
    );
  }

  const meta = (await metaRes.json()) as {
    id: string;
    name?: string;
    mimeType?: string;
    modifiedTime?: string;
  };

  const isGoogleSheet =
    meta.mimeType === 'application/vnd.google-apps.spreadsheet';
  const baseName = meta.name || 'Control_Letras_Factoraje';
  const exportMime =
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  // 2. Para Google Sheets nativos, priorizar Sheets API v4 con UNFORMATTED_VALUE para precisión exacta en sumas/fórmulas
  if (isGoogleSheet) {
    try {
      const sheetsFile = await fetchSpreadsheetViaSheetsApi(
        accessToken,
        fileId,
        baseName,
        exportMime,
        cacheBust
      );
      return {
        file: sheetsFile,
        sheetName: baseName,
        modifiedTime: meta.modifiedTime,
      };
    } catch (sheetsErr: any) {
      if (sheetsErr?.message === 'TOKEN_EXPIRED') {
        throw sheetsErr;
      }
      // Si la API de Sheets falla o no está habilitada, continuar con el export XLSX de Drive
      console.warn('Sheets API fallback to Drive export:', sheetsErr?.message || sheetsErr);
    }
  }

  const downloadUrl = isGoogleSheet
    ? `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${encodeURIComponent(
        exportMime
      )}&_t=${cacheBust}`
    : `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true&_t=${cacheBust}`;

  const fileRes = await fetch(downloadUrl, {
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (fileRes.status === 401) {
    throw new Error('TOKEN_EXPIRED');
  }

  if (!fileRes.ok) {
    const errBody = await fileRes.json().catch(() => ({}));
    throw new Error(
      errBody?.error?.message ||
        `No se pudo descargar el contenido de "${baseName}" (${fileRes.status}).`
    );
  }

  const blob = await fileRes.blob();
  const fileName = baseName.toLowerCase().endsWith('.xlsx')
    ? baseName
    : `${baseName}.xlsx`;

  return {
    file: new File([blob], fileName, { type: exportMime }),
    sheetName: baseName,
    modifiedTime: meta.modifiedTime,
  };
}
