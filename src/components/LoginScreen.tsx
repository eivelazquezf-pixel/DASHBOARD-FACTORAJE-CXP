import React, { useState } from 'react';
import { ShieldCheck, FileSpreadsheet, RefreshCw, AlertCircle, Lock, Building2 } from 'lucide-react';
import {
  ALLOWED_CORPORATE_DOMAINS,
  GoogleUserProfile,
  isGoogleClientConfigured,
  signInWithCorporateGoogle,
} from '../services/googleAuthService';

interface LoginScreenProps {
  onLoginSuccess: (payload: { accessToken: string; user: GoogleUserProfile }) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);

  const clientConfigured = isGoogleClientConfigured();
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  const handleGoogleLogin = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const result = await signInWithCorporateGoogle();
      onLoginSuccess(result);
    } catch (err: any) {
      setError(
        err?.message || 'No se pudo completar el inicio de sesión con Google.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8FC] text-slate-900 flex items-center justify-center p-4 sm:p-8 font-sans antialiased">
      <div className="w-full max-w-5xl bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
        
        {/* Panel Izquierdo: Identidad Corporativa y Capacidades */}
        <div className="lg:col-span-6 bg-[#201B4B] text-white p-8 sm:p-12 flex flex-col justify-between">
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              {!logoError ? (
                <div className="w-14 h-14 rounded-full bg-white p-1 shrink-0 overflow-hidden">
                  <img
                    src="/assets/aistudio/image_390fa5f2.png"
                    alt="Cuentas por Pagar - El Puerto de Liverpool"
                    referrerPolicy="no-referrer"
                    onError={() => setLogoError(true)}
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                  <Building2 className="w-7 h-7 text-pink-300" />
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-pink-300">
                  Tesorería y Cuentas por Pagar
                </p>
                <h1 className="text-lg font-semibold text-white tracking-tight">
                  El Puerto de Liverpool &amp; Suburbia
                </h1>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight text-balance">
                Dashboard de Factoraje y Control de Letras
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Accede con tu cuenta corporativa de Google para consultar el resumen ejecutivo, la cartera por negocio y actualizar las cifras directamente desde tus libros en Google Drive o Excel.
              </p>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/10">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-pink-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Validación de cuenta corporativa
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                    Inicio de sesión mediante Google Identity Services para cuentas{' '}
                    {ALLOWED_CORPORATE_DOMAINS.map((d) => `@${d}`).join(' y ')}.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <FileSpreadsheet className="w-5 h-5 text-pink-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Sincronización directa con Google Sheets
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                    Consulta y actualiza el tablero directamente desde el libro corporativo vinculado a tu cuenta.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 mt-8 border-t border-white/10 flex items-center gap-2 text-xs text-slate-400">
            <Lock className="w-3.5 h-3.5 text-pink-300 shrink-0" />
            <span>
              El token de autorización se mantiene únicamente en memoria durante tu sesión activa.
            </span>
          </div>
        </div>

        {/* Panel Derecho: Formulario de Acceso Google */}
        <div className="lg:col-span-6 p-8 sm:p-12 flex flex-col justify-center bg-white">
          <div className="max-w-sm w-full mx-auto space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <span>Acceso Restringido</span>
                <span aria-hidden="true">·</span>
                <span>Google Workspace</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                Iniciar sesión
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Autentícate con tu correo corporativo de Google para visualizar el tablero y habilitar la sincronización de archivos.
              </p>
            </div>

            {!clientConfigured && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 space-y-2">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1.5 leading-relaxed">
                    <p className="font-semibold text-amber-950">
                      Configuración pendiente de Client ID
                    </p>
                    <p className="text-amber-900">
                      Reemplaza{' '}
                      <code className="font-mono bg-amber-100 px-1 py-0.5 rounded text-[11px]">
                        GOOGLE_CLIENT_ID
                      </code>{' '}
                      en{' '}
                      <code className="font-mono bg-amber-100 px-1 py-0.5 rounded text-[11px]">
                        src/services/googleAuthService.ts
                      </code>{' '}
                      o define la variable{' '}
                      <code className="font-mono bg-amber-100 px-1 py-0.5 rounded text-[11px]">
                        VITE_GOOGLE_CLIENT_ID
                      </code>{' '}
                      con el ID de tu proyecto.
                    </p>
                    {currentOrigin && (
                      <p className="text-[11px] text-amber-800 break-all">
                        Origen autorizado requerido en Google Cloud:{' '}
                        <span className="font-mono font-medium">{currentOrigin}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 leading-relaxed"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Botón Oficial Estilo Google Sign-In */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full min-h-[46px] px-5 py-3 bg-white hover:bg-slate-50 active:bg-slate-100 disabled:opacity-60 disabled:cursor-not-allowed text-slate-800 border border-slate-300 rounded-xl shadow-xs font-semibold text-sm flex items-center justify-center gap-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9258B] focus-visible:ring-offset-2 whitespace-nowrap"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#D9258B]" />
                    <span>Conectando con Google...</span>
                  </>
                ) : (
                  <>
                    <svg
                      version="1.1"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 48 48"
                      className="w-5 h-5 shrink-0"
                      aria-hidden="true"
                    >
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                      />
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      />
                      <path fill="none" d="M0 0h48v48H0z" />
                    </svg>
                    <span>Acceder con Google Corporativo</span>
                  </>
                )}
              </button>

              <p className="text-xs text-slate-500 text-center">
                Se solicitará permiso para leer tu perfil, Google Drive y Google Sheets.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
              <span>Dominios autorizados</span>
              <span className="font-mono text-slate-700">
                {ALLOWED_CORPORATE_DOMAINS.map((d) => `@${d}`).join(' · ')}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
