// Google Identity Services (GIS) authentication service for corporate access
// Client ID can be configured via VITE_GOOGLE_CLIENT_ID env var or directly below.

const ENV_CLIENT_ID =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_CLIENT_ID
    ? String(import.meta.env.VITE_GOOGLE_CLIENT_ID).trim()
    : '';

export const GOOGLE_CLIENT_ID =
  ENV_CLIENT_ID || '1761125251-08vlk28h93t670ovidav3tdlq5tode3e.apps.googleusercontent.com';

// Dominio corporativo sugerido (hint para el selector de cuentas Google)
export const CORPORATE_HOSTED_DOMAIN = 'liverpool.com.mx';

// Dominios corporativos permitidos para acceder al tablero (deja vacío [] para permitir cualquier cuenta Google)
export const ALLOWED_CORPORATE_DOMAINS: string[] = [
  'liverpool.com.mx',
  'suburbia.com.mx',
];

// Scopes requeridos: perfil corporativo + lectura de Google Drive y Google Sheets para actualizar datos del dashboard
export const OAUTH_SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
].join(' ');

export interface GoogleUserProfile {
  sub: string;
  email: string;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  hd?: string;
  email_verified?: boolean;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            hd?: string;
            callback: (response: {
              access_token?: string;
              expires_in?: number;
              scope?: string;
              error?: string;
              error_description?: string;
            }) => void;
            error_callback?: (error: { type?: string; message?: string }) => void;
          }) => {
            requestAccessToken: (options?: { prompt?: string }) => void;
          };
          revoke?: (token: string, callback?: () => void) => void;
        };
      };
    };
  }
}

// Almacenamiento exclusivo en memoria para el access token (nunca en localStorage/sessionStorage)
let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

export function isGoogleClientConfigured(): boolean {
  return (
    Boolean(GOOGLE_CLIENT_ID) &&
    GOOGLE_CLIENT_ID !== 'TU_CLIENT_ID.apps.googleusercontent.com' &&
    GOOGLE_CLIENT_ID.endsWith('.apps.googleusercontent.com')
  );
}

export function getInMemoryAccessToken(): string | null {
  if (!cachedAccessToken) return null;
  if (tokenExpiresAt > 0 && Date.now() >= tokenExpiresAt) {
    cachedAccessToken = null;
    tokenExpiresAt = 0;
    return null;
  }
  return cachedAccessToken;
}

export function clearGoogleSession(): void {
  const tokenToRevoke = cachedAccessToken;
  cachedAccessToken = null;
  tokenExpiresAt = 0;

  if (tokenToRevoke && window.google?.accounts?.oauth2?.revoke) {
    try {
      window.google.accounts.oauth2.revoke(tokenToRevoke, () => {});
    } catch {
      // Ignorar si GIS no pudo revocar en red
    }
  }
}

export function requestGoogleAccessToken(
  onSuccess: (token: string) => void,
  onError: (error: string) => void,
  options?: { prompt?: '' | 'none' | 'consent' | 'select_account' }
): void {
  if (!isGoogleClientConfigured()) {
    onError(
      'Falta configurar el GOOGLE_CLIENT_ID en src/services/googleAuthService.ts o en la variable VITE_GOOGLE_CLIENT_ID.'
    );
    return;
  }

  if (!window.google?.accounts?.oauth2) {
    onError(
      'Google Identity Services aún no ha cargado. Verifica tu conexión e intenta de nuevo en unos segundos.'
    );
    return;
  }

  try {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: OAUTH_SCOPES,
      hd: CORPORATE_HOSTED_DOMAIN,
      callback: (response) => {
        if (response.error) {
          onError(
            `Error al autorizar con Google: ${response.error_description || response.error}`
          );
          return;
        }
        if (response.access_token) {
          cachedAccessToken = response.access_token;
          const ttlMs = ((response.expires_in || 3500) - 60) * 1000;
          tokenExpiresAt = Date.now() + Math.max(ttlMs, 60_000);
          onSuccess(response.access_token);
        } else {
          onError('No se recibió el token de acceso de Google.');
        }
      },
      error_callback: (err) => {
        if (err?.type === 'popup_closed') {
          onError('Se cerró la ventana de inicio de sesión antes de completar la autorización.');
          return;
        }
        if (err?.type === 'popup_failed_to_open') {
          onError('El navegador bloqueó la ventana emergente de Google. Permite popups para continuar.');
          return;
        }
        onError(`Fallo en inicio de sesión: ${err?.message || JSON.stringify(err)}`);
      },
    });

    tokenClient.requestAccessToken({ prompt: options?.prompt ?? 'consent' });
  } catch (err: any) {
    onError(err?.message || 'Error inesperado al iniciar autenticación.');
  }
}

export async function fetchGoogleUserInfo(
  accessToken: string
): Promise<GoogleUserProfile> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(
      `No se pudo obtener el perfil corporativo de Google (${res.status}). ${detail}`.trim()
    );
  }

  const profile = (await res.json()) as GoogleUserProfile;
  if (!profile.email) {
    throw new Error('La cuenta de Google no devolvió un correo electrónico válido.');
  }

  return profile;
}

export function isAllowedCorporateEmail(email: string, hd?: string): boolean {
  if (ALLOWED_CORPORATE_DOMAINS.length === 0) return true;
  const domainFromEmail = email.split('@')[1]?.toLowerCase() || '';
  const hostedDomain = hd?.toLowerCase() || '';
  return ALLOWED_CORPORATE_DOMAINS.some(
    (allowed) => domainFromEmail === allowed || hostedDomain === allowed
  );
}

export function signInWithCorporateGoogle(): Promise<{
  accessToken: string;
  user: GoogleUserProfile;
}> {
  return new Promise((resolve, reject) => {
    requestGoogleAccessToken(
      async (token) => {
        try {
          const user = await fetchGoogleUserInfo(token);
          if (!isAllowedCorporateEmail(user.email, user.hd)) {
            clearGoogleSession();
            reject(
              new Error(
                `Acceso restringido a cuentas corporativas (${ALLOWED_CORPORATE_DOMAINS.map((d) => `@${d}`).join(', ')}). Iniciaste sesión con ${user.email}.`
              )
            );
            return;
          }
          resolve({ accessToken: token, user });
        } catch (err) {
          clearGoogleSession();
          reject(err);
        }
      },
      (errMsg) => {
        reject(new Error(errMsg));
      }
    );
  });
}

export function refreshGoogleAccessToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    requestGoogleAccessToken(
      (token) => resolve(token),
      (errMsg) => reject(new Error(errMsg)),
      { prompt: '' }
    );
  });
}
