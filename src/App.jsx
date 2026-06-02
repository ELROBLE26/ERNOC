import { useMemo, useState } from 'react';
import { CalendarClock, Building2, LayoutGrid, Menu, Radio, Settings, ShieldCheck, X, Download } from 'lucide-react';
import { ConfigurationPanel } from './components/ConfigurationPanel';
import { EditableTable } from './components/EditableTable';
import { FiltersBar } from './components/FiltersBar';
import { MobileFleetCards } from './components/MobileFleetCards';
import { NfcNotRegisteredModal } from './components/NfcNotRegisteredModal';
import { NfcOperModal } from './components/NfcOperModal';
import { OperationsSummary } from './components/OperationsSummary';
import { MaintenancePanel } from './components/MaintenancePanel';
import { useFleetData } from './hooks/useFleetData';
import { useNfcReader } from './hooks/useNfcReader';
import { useMaintenanceSchedule } from './hooks/useMaintenanceSchedule';
import { isSupabaseConfigured } from './lib/supabase';
import {
  buildNfcLogPayload,
  createNfcAssociation,
  findFleetBusByCodOrPpu,
  findFleetBusFromCard,
  findNfcCard,
  insertNfcLog,
  updateFleetFromNfc,
} from './lib/nfcService';
import {
  FILTER_DEFAULTS,
  ESTADO_OPTIONS,
  applyFleetFilters,
  computeCounters,
  downloadCsv,
  getFieldOptions,
} from './utils/fleet';

function App() {
  const {
    rows,
    loading,
    error,
    rowStatuses,
    loadFleet,
    addBus,
    saveCell,
  } = useFleetData();
  const [filters, setFilters] = useState(FILTER_DEFAULTS);
  const [workTerminal, setWorkTerminal] = useState('El Roble');
  
  const { schedule, lastUploadDate, parseFile, clearSchedule } = useMaintenanceSchedule();
  
  const [selectedRowId, setSelectedRowId] = useState('');
  const [formBusy, setFormBusy] = useState(false);
  const [nfcActive, setNfcActive] = useState(true);
  const [nfcMessage, setNfcMessage] = useState('');
  const [nfcError, setNfcError] = useState('');
  const [nfcSaving, setNfcSaving] = useState(false);
  const [nfcSearching, setNfcSearching] = useState(false);
  const [currentNfcUid, setCurrentNfcUid] = useState('');
  const [currentNfcBus, setCurrentNfcBus] = useState(null);
  const [lastNfcBus, setLastNfcBus] = useState(null);
  const [foundAssociationBus, setFoundAssociationBus] = useState(null);
  const [nfcOperOpen, setNfcOperOpen] = useState(false);
  const [nfcNotRegisteredOpen, setNfcNotRegisteredOpen] = useState(false);
  const [newBusNfcScanArmed, setNewBusNfcScanArmed] = useState(false);
  const [newBusCapturedNfcUid, setNewBusCapturedNfcUid] = useState('');
  const [highlightedRowId, setHighlightedRowId] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState('operacion');
  const [scheduledMaintenance, setScheduledMaintenance] = useState(null);

  const filteredRows = useMemo(() => applyFleetFilters(rows, filters), [rows, filters]);
  const counters = useMemo(() => computeCounters(filteredRows), [filteredRows]);
  const zoneOptions = useMemo(() => getFieldOptions(rows, 'zona'), [rows]);
  const serviceOptions = useMemo(() => getFieldOptions(rows, 'servicio'), [rows]);
  const activeFiltersCount = useMemo(
    () =>
      [
        filters.terminal !== 'Todos',
        filters.zona !== 'Todos',
        filters.servicio !== 'Todos',
        filters.estado !== 'Todos',
        filters.operatividad !== 'Todos',
        Boolean(filters.search?.trim()),
      ].filter(Boolean).length,
    [filters],
  );

  const handleNfcRead = async (nfcUid, source = 'keyboard') => {
    if (newBusNfcScanArmed && activeView === 'configuracion') {
      setNewBusCapturedNfcUid(nfcUid);
      setNewBusNfcScanArmed(false);
      setNfcMessage(`Codigo NFC capturado para nuevo bus: ${nfcUid}`);
      return;
    }

    if (!isSupabaseConfigured) {
      setNfcMessage('Configura Supabase antes de usar NFC.');
      return;
    }

    if (nfcOperOpen || nfcNotRegisteredOpen || nfcSaving) {
      return;
    }

    setNfcError('');
    setNfcMessage(`Lectura recibida por ${source}.`);
    setCurrentNfcUid(nfcUid);
    setCurrentNfcBus(null);
    setFoundAssociationBus(null);
    setScheduledMaintenance(null);

    try {
      const card = await findNfcCard(nfcUid);

      if (!card) {
        setNfcNotRegisteredOpen(true);
        setNfcMessage('NFC no registrado.');
        return;
      }

      const bus = await findFleetBusFromCard(card);

      if (!bus) {
        const message = 'NFC asociado, pero el bus no existe en reporte_oper_flota.';
        setNfcError(message);
        setNfcMessage(message);
        await insertNfcLog(
          buildNfcLogPayload({
            nfcUid,
            bus: card,
            operation: { terminal: card.terminal_default },
            resultado: 'error',
            mensajeError: message,
          }),
        );
        return;
      }

      const terminalName = card.terminal_default || bus.terminal;
      const maintenanceMatch = schedule.find(
        (s) => (s.cod === bus.cod || s.ppu === bus.ppu) && s.terminal === terminalName
      );
      
      setScheduledMaintenance(maintenanceMatch || null);
      setCurrentNfcBus(bus);
      setLastNfcBus(bus);
      setNfcOperOpen(true);
      setNfcMessage('Bus encontrado.');
    } catch (readError) {
      const message = readError.message || 'No fue posible procesar la lectura NFC.';
      setNfcError(message);
      setNfcMessage(message);
    }
  };

  const {
    lastRead,
    serialStatus,
    webNfcStatus,
    connectSerial,
    disconnectSerial,
    startWebNfc,
    stopWebNfc,
  } = useNfcReader({
    active: nfcActive,
    onRead: handleNfcRead,
  });

  const handleFilterChange = (field, value) => {
    setFilters((current) => ({
      ...current,
      [field]: value,
    }));

    if (field === 'terminal' && value !== 'Todos') {
      setWorkTerminal(value);
    }
  };

  const handleCreate = async (payload) => {
    setFormBusy(true);
    const { nfc_uid: nfcUid, ...busPayload } = payload;
    const result = await addBus(busPayload);

    if (result.ok && nfcUid) {
      try {
        await createNfcAssociation({
          nfc_uid: nfcUid,
          cod: busPayload.cod,
          ppu: busPayload.ppu,
          terminal_default: busPayload.terminal,
          observacion: 'Asociado al crear bus desde Configuracion',
        });
        setNfcMessage(`Tarjeta NFC ${nfcUid} asociada al bus ${busPayload.cod}.`);
      } catch (associateError) {
        setFormBusy(false);
        return {
          ok: false,
          message: associateError.message || 'El bus fue creado, pero no se pudo asociar la tarjeta NFC.',
        };
      }
    }

    setFormBusy(false);

    if (!result.ok) {
      return result;
    }

    return result;
  };

  const handleNfcSave = async (operation) => {
    if (!currentNfcBus?.cod || !currentNfcBus?.ppu) {
      setNfcError('No se puede guardar sin COD y PPU.');
      return;
    }

    const normalizedOperation = {
      ...operation,
      terminal: operation.terminal || workTerminal,
      ubicacion: operation.ubicacion || operation.terminal || workTerminal,
    };

    if (!normalizedOperation.terminal || normalizedOperation.terminal === 'Todos') {
      setNfcError('Selecciona El Roble o La Reina antes de guardar.');
      return;
    }

    setNfcSaving(true);
    setNfcError('');

    try {
      const updatedBus = await updateFleetFromNfc(currentNfcBus, normalizedOperation);
      await insertNfcLog(
        buildNfcLogPayload({
          nfcUid: currentNfcUid,
          bus: updatedBus,
          operation: normalizedOperation,
          resultado: 'guardado',
        }),
      );
      setNfcOperOpen(false);
      setCurrentNfcBus(null);
      setLastNfcBus(updatedBus);
      setSelectedRowId(updatedBus.id);
      setHighlightedRowId(updatedBus.id);
      setNfcMessage('Bus actualizado correctamente.');
      await loadFleet();
      window.setTimeout(() => setHighlightedRowId(''), 3000);
    } catch (saveError) {
      const message = saveError.message || 'No fue posible guardar la operacion NFC.';
      setNfcError(message);
      setNfcMessage(message);
      await insertNfcLog(
        buildNfcLogPayload({
          nfcUid: currentNfcUid,
          bus: currentNfcBus,
          operation: normalizedOperation,
          resultado: 'error',
          mensajeError: message,
        }),
      ).catch(() => undefined);
    } finally {
      setNfcSaving(false);
    }
  };

  const handleNfcAssociationSearch = async (searchValue) => {
    setNfcSearching(true);
    setNfcError('');
    setFoundAssociationBus(null);

    try {
      const bus = await findFleetBusByCodOrPpu(searchValue);

      if (!bus) {
        setNfcError('No se encontro un bus con ese COD o PPU.');
        return;
      }

      setFoundAssociationBus(bus);
    } catch (searchError) {
      setNfcError(searchError.message || 'No fue posible buscar el bus.');
    } finally {
      setNfcSearching(false);
    }
  };

  const handleNfcAssociate = async ({ bus, terminal }) => {
    if (!bus?.cod || !bus?.ppu) {
      setNfcError('Selecciona un bus valido antes de asociar.');
      return;
    }

    if (!terminal || terminal === 'Todos') {
      setNfcError('Selecciona terminal para la asociacion.');
      return;
    }

    setNfcSaving(true);
    setNfcError('');

    try {
      await createNfcAssociation({
        nfc_uid: currentNfcUid,
        cod: bus.cod,
        ppu: bus.ppu,
        terminal_default: terminal,
        observacion: 'Asociado desde Reporte Oper',
      });
      const nextBus = {
        ...bus,
        terminal,
      };
      setCurrentNfcBus(nextBus);
      setLastNfcBus(nextBus);
      setNfcNotRegisteredOpen(false);
      setNfcOperOpen(true);
      setNfcMessage('NFC asociado correctamente.');
    } catch (associateError) {
      setNfcError(associateError.message || 'No fue posible asociar el NFC.');
    } finally {
      setNfcSaving(false);
    }
  };

  const handleTestRead = () => {
    const value = window.prompt('Ingrese UID NFC para prueba manual');

    if (value) {
      handleNfcRead(value, 'manual');
    }
  };

  const handleConnectSerial = async () => {
    try {
      await connectSerial();
    } catch (serialError) {
      setNfcMessage(serialError.message || 'No fue posible conectar el lector serial.');
    }
  };

  const handleStartWebNfc = async () => {
    try {
      await startWebNfc();
    } catch (webNfcError) {
      setNfcMessage(webNfcError.message || 'Web NFC no esta disponible.');
    }
  };

  return (
    <main className="app-shell">
      <div className={`layout-shell ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <aside className="enterprise-sidebar">
          <div className="sidebar-top-bar" />
          <div className="brand-block">
            <div className="brand-icon">
              <Building2 size={16} />
            </div>
            <div className="brand-text">
              <strong>Turno Ernoc</strong>
              <span>Centro Operativo</span>
            </div>
          </div>
          <nav className="sidebar-nav">
            <span className="sidebar-section-label">Módulos</span>
            <button
              type="button"
              id="nav-operacion"
              className={`sidebar-link ${activeView === 'operacion' ? 'sidebar-link-active' : ''}`}
              onClick={() => {
                setActiveView('operacion');
                setSidebarOpen(false);
              }}
            >
              <span className="sidebar-link-icon"><LayoutGrid size={14} /></span>
              Operación Flota
            </button>
            <button
              type="button"
              id="nav-mantenciones"
              className={`sidebar-link ${activeView === 'mantenciones' ? 'sidebar-link-active' : ''}`}
              onClick={() => {
                setActiveView('mantenciones');
                setSidebarOpen(false);
              }}
            >
              <span className="sidebar-link-icon"><CalendarClock size={14} /></span>
              Mantenciones
            </button>
            <button
              type="button"
              id="nav-configuracion"
              className={`sidebar-link ${activeView === 'configuracion' ? 'sidebar-link-active' : ''}`}
              onClick={() => {
                setActiveView('configuracion');
                setSidebarOpen(false);
              }}
            >
              <span className="sidebar-link-icon"><Settings size={14} /></span>
              Configuración
            </button>
          </nav>
          <div className="sidebar-foot">
            <span className="sidebar-status-pill">
              <span className="sidebar-status-dot" />
              {isSupabaseConfigured ? 'Supabase conectado' : 'Sin configurar'}
            </span>
          </div>
        </aside>

        <section className="app-container">
          <header className="enterprise-header">
            <div className="header-accent-bar" />
            <div className="enterprise-header-top">
              <div className="enterprise-header-main">
                <button
                  type="button"
                  className="menu-toggle"
                  onClick={() => setSidebarOpen((current) => !current)}
                  aria-label="Abrir o cerrar menú"
                >
                  {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
                </button>
                <div className="header-title-group">
                  <h1>Centro Operativo</h1>
                  <p>Gestión diaria de flota · Lectura NFC · Control de disponibilidad</p>
                </div>
              </div>
              <div className="enterprise-header-meta">
                <div className="work-terminal-control">
                  <label htmlFor="terminal-select">Terminal</label>
                  <select
                    id="terminal-select"
                    value={workTerminal}
                    onChange={(event) => {
                      const terminal = event.target.value;
                      setWorkTerminal(terminal);
                      setFilters((current) => ({
                        ...current,
                        terminal,
                      }));
                    }}
                  >
                    <option value="El Roble">El Roble</option>
                    <option value="La Reina">La Reina</option>
                  </select>
                </div>
                <span className="header-meta-badge">
                  {new Date().toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit', month: 'short' })}
                </span>
                <span className="header-meta-badge badge-count">
                  {filteredRows.length} buses
                </span>
                {nfcActive && (
                  <span className="header-meta-badge badge-live">
                    <Radio size={10} />
                    NFC activo
                  </span>
                )}
                {activeView === 'operacion' && filteredRows.length > 0 && (
                  <button
                    id="btn-export-csv"
                    className="secondary-button"
                    type="button"
                    onClick={() => downloadCsv(filteredRows)}
                    title="Exportar tabla a CSV"
                  >
                    <Download size={13} />
                    CSV
                  </button>
                )}
              </div>
            </div>
          </header>

          {error ? <div className="banner banner-error">{error}</div> : null}

          {activeView === 'operacion' ? (
            <>
              <FiltersBar
                filters={filters}
                onChange={handleFilterChange}
                onReset={() => setFilters(FILTER_DEFAULTS)}
                onRefresh={loadFleet}
                zoneOptions={zoneOptions}
                serviceOptions={serviceOptions}
                estadoOptions={['Todos', ...ESTADO_OPTIONS]}
                operOptions={['Todos', 'Con problema', 'Sin problema']}
              />

              <OperationsSummary
                counters={counters}
                activeFiltersCount={activeFiltersCount}
                nfcActive={nfcActive}
                sourceReady={isSupabaseConfigured}
              />

              {loading ? (
                <LoadingState />
              ) : (
                <>
                  <EditableTable
                    rows={filteredRows}
                    selectedRowId={selectedRowId}
                    highlightedRowId={highlightedRowId}
                    rowStatuses={rowStatuses}
                    onSelectRow={setSelectedRowId}
                    onSaveCell={saveCell}
                    onOpenConfiguration={() => setActiveView('configuracion')}
                  />
                  <MobileFleetCards
                    rows={filteredRows}
                    selectedRowId={selectedRowId}
                    highlightedRowId={highlightedRowId}
                    rowStatuses={rowStatuses}
                    onSelectRow={setSelectedRowId}
                    onSaveCell={saveCell}
                    onOpenConfiguration={() => setActiveView('configuracion')}
                  />
                </>
              )}
            </>
          ) : activeView === 'configuracion' ? (
            <ConfigurationPanel
              nfcProps={{
                active: nfcActive,
                lastRead,
                lastBus: lastNfcBus,
                lastMessage: nfcMessage || 'Lectura automatica activa',
                serialStatus,
                webNfcStatus,
                onActivate: () => {
                  setNfcActive(true);
                  setNfcMessage('Lector NFC activo.');
                },
                onDeactivate: () => {
                  setNfcActive(false);
                  disconnectSerial();
                  stopWebNfc();
                  setNfcMessage('Lector NFC inactivo.');
                },
                onTest: handleTestRead,
                onConnectSerial: handleConnectSerial,
                onStartWebNfc: handleStartWebNfc,
              }}
              newBusProps={{
                visible: true,
                onSubmit: handleCreate,
                busy: formBusy,
                capturedNfcUid: newBusCapturedNfcUid,
                nfcScanArmed: newBusNfcScanArmed,
                onArmNfcScan: () => {
                  setNfcActive(true);
                  setNewBusNfcScanArmed(true);
                  setNfcMessage('Escaneo NFC armado para nuevo bus.');
                },
                onClearCapturedNfc: () => setNewBusCapturedNfcUid(''),
              }}
            />
          ) : activeView === 'mantenciones' ? (
            <MaintenancePanel 
              schedule={schedule}
              lastUploadDate={lastUploadDate}
              onParseFile={parseFile}
              onClear={clearSchedule}
            />
          ) : null}

          <NfcOperModal
            open={nfcOperOpen}
            nfcUid={currentNfcUid}
            bus={currentNfcBus}
            terminalFilter={workTerminal}
            scheduledMaintenance={scheduledMaintenance}
            saving={nfcSaving}
            error={nfcError}
            onSave={handleNfcSave}
            onCancel={() => {
              setNfcOperOpen(false);
              setNfcError('');
              setCurrentNfcBus(null);
            }}
          />

          <NfcNotRegisteredModal
            open={nfcNotRegisteredOpen}
            nfcUid={currentNfcUid}
            terminalFilter={filters.terminal}
            searching={nfcSearching}
            saving={nfcSaving}
            error={nfcError}
            foundBus={foundAssociationBus}
            onSearch={handleNfcAssociationSearch}
            onAssociate={handleNfcAssociate}
            onCancel={() => {
              setNfcNotRegisteredOpen(false);
              setNfcError('');
              setFoundAssociationBus(null);
            }}
          />
        </section>
      </div>
    </main>
  );
}

function LoadingState() {
  return (
    <section className="loading-grid">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="loading-card" />
      ))}
      <div className="loading-table" />
    </section>
  );
}

export default App;
