import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  FactoringRecord, 
  FileMetadata, 
  BankCreditLine, 
  FactoringFilters, 
  EstatusLetra,
  ProveedoresData,
  TopProveedoresData,
  CurvaOperacionData
} from './types/factoring';
import { 
  loadSavedRecords, 
  saveRecords, 
  loadSavedFiles, 
  saveFiles, 
  loadBankLines, 
  saveBankLines, 
  loadSavedProveedores,
  saveProveedores,
  loadSavedTopProveedores,
  saveTopProveedores,
  loadSavedCurvaOperacion,
  saveCurvaOperacion,
  detectTreasuryAnomalies 
} from './utils/storage';
import { exportToExcel, parseFactoringExcel } from './utils/excelParser';
import { Sidebar, SyncStatus } from './components/Sidebar';
import { TopSearchBar } from './components/TopSearchBar';
import { ImageExactDashboard } from './components/ImageExactDashboard';
import { LettersTable } from './components/LettersTable';
import { ProvidersListView } from './components/ProvidersListView';
import { LetterDetailModal } from './components/LetterDetailModal';
import { NewLetterModal } from './components/NewLetterModal';
import { ProvidersListModal } from './components/ProvidersListModal';
import { LoginScreen } from './components/LoginScreen';
import { 
  GoogleUserProfile, 
  clearGoogleSession, 
  refreshGoogleAccessToken 
} from './services/googleAuthService';
import { 
  fetchLinkedGoogleSheetAsFile, 
  isLinkedSheetConfigured 
} from './services/googleDriveService';
import { AlertCircle, RefreshCw, X } from 'lucide-react';

export default function App() {
  // Corporate Google Auth State (in-memory only)
  const [authSession, setAuthSession] = useState<{
    accessToken: string;
    user: GoogleUserProfile;
  } | null>(null);

  // Sync state for the single linked Google Sheet
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [linkedSheetName, setLinkedSheetName] = useState<string | undefined>(undefined);

  // Navigation View matching sidebar items
  const [activeView, setActiveView] = useState<'dashboard' | 'table' | 'providers'>('dashboard');

  // Persistence State
  const [records, setRecords] = useState<FactoringRecord[]>(loadSavedRecords);
  const [files, setFiles] = useState<FileMetadata[]>(loadSavedFiles);
  const [bankLines, setBankLines] = useState<BankCreditLine[]>(loadBankLines);
  const [proveedores, setProveedores] = useState<ProveedoresData>(loadSavedProveedores);
  const [topProveedores, setTopProveedores] = useState<TopProveedoresData>(loadSavedTopProveedores);
  const [curvaOperacion, setCurvaOperacion] = useState<CurvaOperacionData>(loadSavedCurvaOperacion);

  // Sync to localStorage
  useEffect(() => {
    saveRecords(records);
  }, [records]);

  useEffect(() => {
    saveFiles(files);
  }, [files]);

  useEffect(() => {
    saveBankLines(bankLines);
  }, [bankLines]);

  useEffect(() => {
    saveProveedores(proveedores);
  }, [proveedores]);

  useEffect(() => {
    saveTopProveedores(topProveedores);
  }, [topProveedores]);

  useEffect(() => {
    saveCurvaOperacion(curvaOperacion);
  }, [curvaOperacion]);

  // Modals state
  const [isNewLetterOpen, setIsNewLetterOpen] = useState<boolean>(false);
  const [isProvidersModalOpen, setIsProvidersModalOpen] = useState<boolean>(false);
  const [selectedRecord, setSelectedRecord] = useState<FactoringRecord | null>(null);

  // Filters State
  const [filters, setFilters] = useState<FactoringFilters>({
    empresa: 'all',
    año: 'all',
    banco: 'all',
    estatus: 'all',
    moneda: 'all',
    search: '',
    vencimientoRango: 'all'
  });

  // 5 Tarjetas Filter State (all | liv_op | liv_noop | sub_op | sub_noop)
  const [cards5Filter, setCards5Filter] = useState<'all' | 'liv_op' | 'liv_noop' | 'sub_op' | 'sub_noop'>('all');

  // Sincronización directa desde el archivo Google Sheets vinculado
  const handleRefreshFromLinkedSheet = useCallback(async (tokenOverride?: string) => {
    const activeToken = tokenOverride || authSession?.accessToken;
    if (!activeToken) return;

    if (!isLinkedSheetConfigured()) {
      setSyncStatus('error');
      setSyncError(
        'Falta vincular el ID del archivo de Google Sheets en src/services/googleDriveService.ts.'
      );
      return;
    }

    setSyncStatus('syncing');
    setSyncError(null);

    const executeSync = async (token: string) => {
      const { file, sheetName } = await fetchLinkedGoogleSheetAsFile(token);
      setLinkedSheetName(sheetName);

      let guessedYear = new Date().getFullYear();
      const matchYear = sheetName.match(/\b(202[0-9])\b/);
      if (matchYear) {
        guessedYear = parseInt(matchYear[1], 10);
      }

      const parsed = await parseFactoringExcel(file, guessedYear);
      if (!parsed.records || parsed.records.length === 0) {
        throw new Error(
          `Se leyó el archivo "${sheetName}", pero no se encontraron registros de letras en las columnas esperadas.`
        );
      }

      const yearFromFirst = parsed.records[0]?.año || guessedYear;

      const meta: FileMetadata = {
        id: `gsheet_${Date.now()}`,
        name: file.name,
        uploadedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        recordCount: parsed.records.length,
        totalNominalMXN: parsed.totalNominal,
        year: yearFromFirst,
        empresa: 'Consolidado (Google Sheets)',
        enabled: true
      };

      setRecords(parsed.records);
      setFiles([meta]);

      if (parsed.proveedores && (parsed.proveedores.liverpool.length > 0 || parsed.proveedores.suburbia.length > 0)) {
        setProveedores(parsed.proveedores);
      }
      if (parsed.topProveedores && (parsed.topProveedores.liverpool.length > 0 || parsed.topProveedores.suburbia.length > 0)) {
        setTopProveedores(parsed.topProveedores);
      }
      if (parsed.curvaOperacion && parsed.curvaOperacion.totalGlobalLetras > 0) {
        setCurvaOperacion(parsed.curvaOperacion);
      }

      setSyncStatus('success');
      setLastSyncAt(new Date());
    };

    try {
      await executeSync(activeToken);
    } catch (err: any) {
      if (err?.message === 'TOKEN_EXPIRED') {
        try {
          const freshToken = await refreshGoogleAccessToken();
          setAuthSession((prev) =>
            prev ? { ...prev, accessToken: freshToken } : prev
          );
          await executeSync(freshToken);
          return;
        } catch (refreshErr: any) {
          setSyncStatus('error');
          setSyncError(
            refreshErr?.message || 'Tu sesión expiró. Vuelve a iniciar sesión para actualizar.'
          );
          return;
        }
      }

      setSyncStatus('error');
      setSyncError(
        err?.message || 'No se pudo actualizar la información desde Google Sheets.'
      );
    }
  }, [authSession?.accessToken]);

  // Sincronizar automáticamente al iniciar sesión si ya está configurado el archivo vinculado
  useEffect(() => {
    if (authSession?.accessToken && isLinkedSheetConfigured()) {
      handleRefreshFromLinkedSheet(authSession.accessToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authSession?.user?.email]);

  // Active records loaded from the linked Google Sheet (or initial state before first sync)
  const activeRecords = records;

  // Filtered records
  const filteredRecords = useMemo(() => {
    return activeRecords.filter(r => {
      // 5 Tarjetas filter (Columnas D, L, T, AB)
      if (cards5Filter === 'liv_op') {
        const isLiv = r.empresa === 'Liverpool' || r.empresa === 'Distribuidora Liverpool';
        if (r.columnaOrigen === 'D') return true;
        if (!isLiv || r.operada === false || r.estatus === 'En Aclaración' || r.estatus === 'Vencida') return false;
      } else if (cards5Filter === 'liv_noop') {
        const isLiv = r.empresa === 'Liverpool' || r.empresa === 'Distribuidora Liverpool';
        if (r.columnaOrigen === 'L') return true;
        if (!isLiv || (r.operada !== false && r.estatus !== 'En Aclaración' && r.estatus !== 'Vencida')) return false;
      } else if (cards5Filter === 'sub_op') {
        const isSub = r.empresa === 'Suburbia';
        if (r.columnaOrigen === 'T') return true;
        if (!isSub || r.operada === false || r.estatus === 'En Aclaración' || r.estatus === 'Vencida') return false;
      } else if (cards5Filter === 'sub_noop') {
        const isSub = r.empresa === 'Suburbia';
        if (r.columnaOrigen === 'AB') return true;
        if (!isSub || (r.operada !== false && r.estatus !== 'En Aclaración' && r.estatus !== 'Vencida')) return false;
      }

      if (filters.empresa !== 'all' && r.empresa !== filters.empresa) {
        return false;
      }
      if (filters.año !== 'all' && String(r.año) !== filters.año) {
        return false;
      }
      if (filters.banco !== 'all' && r.banco !== filters.banco) {
        return false;
      }
      if (filters.estatus !== 'all' && r.estatus !== filters.estatus) {
        return false;
      }
      if (filters.moneda !== 'all' && r.moneda !== filters.moneda) {
        return false;
      }
      if (filters.search.trim()) {
        const q = filters.search.toLowerCase().trim();
        const matchProv = r.proveedor.toLowerCase().includes(q);
        const matchFolio = r.folio.toLowerCase().includes(q);
        const matchRfc = r.rfc.toLowerCase().includes(q);
        const matchSap = r.noProveedorSap ? r.noProveedorSap.toLowerCase().includes(q) : false;
        if (!matchProv && !matchFolio && !matchRfc && !matchSap) {
          return false;
        }
      }
      return true;
    });
  }, [activeRecords, filters, cards5Filter]);

  // Treasury Anomalies
  const anomalies = useMemo(() => {
    return detectTreasuryAnomalies(activeRecords);
  }, [activeRecords]);

  // Handlers
  const handleLogout = () => {
    clearGoogleSession();
    setAuthSession(null);
    setSyncStatus('idle');
    setSyncError(null);
    setLastSyncAt(null);
  };

  const handleUpdateStatus = (id: string, newStatus: EstatusLetra) => {
    setRecords(prev => prev.map(r => {
      if (r.id === id) {
        const updated = { ...r, estatus: newStatus };
        if (newStatus === 'Liquidada' && !r.fechaPago) {
          updated.fechaPago = new Date().toISOString().split('T')[0];
        }
        return updated;
      }
      return r;
    }));

    if (selectedRecord && selectedRecord.id === id) {
      setSelectedRecord(prev => prev ? { ...prev, estatus: newStatus } : null);
    }
  };

  const handleSaveManualRecord = (newRec: FactoringRecord) => {
    setRecords(prev => [newRec, ...prev]);
  };

  const handleExportFiltered = () => {
    exportToExcel(filteredRecords, `Factoraje_Liverpool_Suburbia_${filters.empresa}_${filters.año}`);
  };

  if (!authSession) {
    return (
      <LoginScreen
        onLoginSuccess={(session) => {
          setAuthSession(session);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8FC] flex text-slate-800 font-sans antialiased">
      
      {/* 1. Left Sidebar */}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        userName='Factoraje "Puerto de Liverpool"'
        userProfile={authSession.user}
        onLogout={handleLogout}
        onRefreshData={() => handleRefreshFromLinkedSheet()}
        syncStatus={syncStatus}
        lastSyncAt={lastSyncAt}
        linkedSheetName={linkedSheetName}
      />

      {/* 2. Main Content Canvas */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Top Search Bar */}
        <div className="sticky top-0 z-30 bg-[#FFF8FC]/90 backdrop-blur-md px-6 pt-2 pb-0">
          <TopSearchBar
            filters={filters}
            setFilters={setFilters}
            anomalyCount={anomalies.length}
            onOpenNotifications={() => setActiveView('table')}
            onRefreshData={() => handleRefreshFromLinkedSheet()}
            onExportExcel={handleExportFiltered}
            onOpenNewLetter={() => setIsNewLetterOpen(true)}
            userEmail={authSession.user.email}
            syncStatus={syncStatus}
            lastSyncAt={lastSyncAt}
          />
        </div>

        {/* View Content */}
        <main className="p-6 space-y-6 max-w-[1600px] w-full">

          {/* Sync Error Banner */}
          {syncStatus === 'error' && syncError && (
            <div
              role="alert"
              className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center justify-between gap-4 text-xs"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">No se pudo sincronizar el archivo Google Sheets vinculado: </span>
                  <span>{syncError}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleRefreshFromLinkedSheet()}
                  className="px-3 py-1.5 bg-white border border-rose-200 text-rose-700 hover:bg-rose-100 rounded-lg font-semibold flex items-center gap-1.5 whitespace-nowrap"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reintentar</span>
                </button>
                <button
                  onClick={() => setSyncError(null)}
                  className="p-1 text-rose-500 hover:text-rose-800 rounded-lg"
                  aria-label="Cerrar aviso"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          
          {/* Dashboard View */}
          {activeView === 'dashboard' && (
            <div className="space-y-6">
              <ImageExactDashboard
                records={filteredRecords}
                allRecords={activeRecords}
                onSelectRecord={setSelectedRecord}
                onOpenUpload={() => handleRefreshFromLinkedSheet()}
                onViewTable={() => setActiveView('table')}
                active5CardsFilter={cards5Filter}
                on5CardsFilterChange={setCards5Filter}
                proveedores={proveedores}
                onOpenProveedores={() => setActiveView('providers')}
                topProveedores={topProveedores}
                curvaOperacion={curvaOperacion}
              />
            </div>
          )}

          {/* Control de Letras (Table View) */}
          {activeView === 'table' && (
            <div className="space-y-4">
              <LettersTable
                records={filteredRecords}
                onSelectRecord={setSelectedRecord}
                onUpdateStatus={handleUpdateStatus}
                onOpenNewLetter={() => setIsNewLetterOpen(true)}
                onExportExcel={handleExportFiltered}
              />
            </div>
          )}

          {/* Lista de Proveedores por Negocio */}
          {activeView === 'providers' && (
            <div className="space-y-4">
              <ProvidersListView
                proveedores={proveedores}
                onBackToDashboard={() => setActiveView('dashboard')}
              />
            </div>
          )}

        </main>

      </div>

      {/* Modals */}
      <NewLetterModal
        isOpen={isNewLetterOpen}
        onClose={() => setIsNewLetterOpen(false)}
        onSaveRecord={handleSaveManualRecord}
      />

      <LetterDetailModal
        record={selectedRecord}
        onClose={() => setSelectedRecord(null)}
        onUpdateStatus={handleUpdateStatus}
      />

      <ProvidersListModal
        isOpen={isProvidersModalOpen}
        onClose={() => setIsProvidersModalOpen(false)}
        proveedores={proveedores}
      />

    </div>
  );
}
