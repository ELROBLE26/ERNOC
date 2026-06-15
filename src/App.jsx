import { useMemo, useState, useEffect } from 'react';
import { CalendarClock, Building2, LayoutGrid, Menu, Radio, Settings, ShieldCheck, X, Download, Fuel, Eraser, ChevronLeft, ChevronRight, BarChart2, FileCheck, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import { ConfigurationPanel } from './components/ConfigurationPanel';
import { EditableTable } from './components/EditableTable';
import { FiltersBar } from './components/FiltersBar';
import { MobileFleetCards } from './components/MobileFleetCards';
import { NfcRegisterModal } from './components/NfcRegisterModal';
import { NfcOperModal } from './components/NfcOperModal';
import { OperationsSummary } from './components/OperationsSummary';
import { MaintenancePanel } from './components/MaintenancePanel';
import { FuelPanel } from './components/FuelPanel';
import { CuadraturaPanel } from './components/CuadraturaPanel';
import { ControlPannesPanel } from './components/ControlPannesPanel';
import { PlanilleroApp } from './components/planillero/PlanilleroApp';
import { DocumentReviewPanel } from './components/DocumentReviewPanel';
import { useFleetData } from './hooks/useFleetData';
import { useNfcReader } from './hooks/useNfcReader';
import { useMaintenanceSchedule } from './hooks/useMaintenanceSchedule';
import { useFuelData } from './hooks/useFuelData';
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
  downloadXlsx,
  getFieldOptions,
  normalizeText,
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
  
  const { schedule, lastUploadDate, parseFile, clearSchedule, updateEntry } = useMaintenanceSchedule();
  
  const [selectedRowId, setSelectedRowId] = useState('');
  const [formBusy, setFormBusy] = useState(false);
  const [nfcActive, setNfcActive] = useState(true);
  const [nfcMessage, setNfcMessage] = useState('');
  const [nfcError, setNfcError] = useState('');
  const [nfcSaving, setNfcSaving] = useState(false);

  const [otPannesData, setOtPannesData] = useState(() => {
    try {
      const stored = localStorage.getItem('ernoc_ot_pannes');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const parseExcelFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          
          const jsonRaw = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
          let headerRowIndex = 0;
          for (let i = 0; i < Math.min(10, jsonRaw.length); i++) {
            const rowStr = (jsonRaw[i] || []).join(' ').toLowerCase();
            if (rowStr.includes('ppu') || rowStr.includes('patente') || rowStr.includes('interno') || rowStr.includes('folio')) {
              headerRowIndex = i;
              break;
            }
          }

          const sheetData = XLSX.utils.sheet_to_json(firstSheet, { range: headerRowIndex, raw: true, defval: "" });
          resolve(sheetData);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo.'));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleUploadOtPannes = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await parseExcelFile(file);
      setOtPannesData(data);
      try { localStorage.setItem('ernoc_ot_pannes', JSON.stringify(data)); } catch {}
      alert(`Archivo OT cargado exitosamente (${data.length} registros). Se mantendrá guardado hasta que lo actualices o borres.`);
    } catch (err) {
      alert('Error cargando OT: ' + err.message);
    }
    e.target.value = null;
  };
  const [nfcSearching, setNfcSearching] = useState(false);
  const [currentNfcUid, setCurrentNfcUid] = useState('');
  const [currentNfcBus, setCurrentNfcBus] = useState(null);
  const [lastNfcBus, setLastNfcBus] = useState(null);
  const [nfcOperOpen, setNfcOperOpen] = useState(false);
  const [nfcRegisterOpen, setNfcRegisterOpen] = useState(false);
  const [highlightedRowId, setHighlightedRowId] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeView, setActiveView] = useState('operacion');
  const [scheduledMaintenance, setScheduledMaintenance] = useState(null);

  const fuelData = useFuelData();
  const { fuelRecords } = fuelData;

  const { currentFuelLitros, currentTelemetryPct } = useMemo(() => {
    if (!nfcOperOpen || !currentNfcBus) return { currentFuelLitros: 0, currentTelemetryPct: null };
    
    const clean = (s) => (s || '').toString().trim().toLowerCase();
    const rPpu = clean(currentNfcBus.ppu);
    const rCod = clean(currentNfcBus.cod);

    let litros = 0;
    for (const f of fuelRecords) {
      if ((f.ppu && clean(f.ppu) === rPpu) || (f.cod && clean(f.cod) === rCod) || (f.interno && clean(f.interno) === rCod)) {
        litros += Number(f.litros) || 0;
      }
    }

    let pct = null;
    if (fuelData.telemetryRecords) {
      const t = fuelData.telemetryRecords.find(t => 
        (t.codigoRegistro && clean(t.codigoRegistro) === rPpu) ||
        (t.codigoInterno && clean(t.codigoInterno) === rCod)
      );
      if (t) pct = t.valor;
    }

    return { currentFuelLitros: litros, currentTelemetryPct: pct };
  }, [nfcOperOpen, currentNfcBus, fuelRecords, fuelData.telemetryRecords]);

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

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        
        setActiveView('operacion');
        
        setFilters((current) => ({
          ...FILTER_DEFAULTS,
          search: current.search
        }));
        
        setTimeout(() => {
          const searchInput = document.getElementById('filter-search');
          if (searchInput) {
            searchInput.focus();
            searchInput.select();
          }
        }, 50);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNfcRead = async (nfcUid, source = 'keyboard') => {
    if (!isSupabaseConfigured) {
      setNfcMessage('Configura Supabase antes de usar NFC.');
      return;
    }

    if (nfcRegisterOpen || nfcSaving) {
      return;
    }

    setNfcError('');
    setNfcMessage(`Lectura recibida por ${source}.`);
    setCurrentNfcUid(nfcUid);
    setCurrentNfcBus(null);
    setScheduledMaintenance(null);

    try {
      const card = await findNfcCard(nfcUid);

      if (!card) {
        setNfcRegisterOpen(true);
        setNfcMessage('NFC no registrado. Complete el formulario de nuevo bus.');
        return;
      }

      let bus = rows.find((r) => r.cod === card.cod || r.ppu === card.ppu);
      if (!bus) {
        bus = await findFleetBusFromCard(card);
      }

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

      const terminalName = card.terminal_default || bus.terminal || '';
      
      const normalize = (str) => String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const busPpuNorm = normalize(bus.ppu);
      const busCodNorm = normalize(bus.cod);
      const termNorm = normalize(terminalName);

      const maintenanceMatch = schedule.find((s) => {
        const sPpuNorm = normalize(s.ppu);
        const sCodNorm = normalize(s.cod);
        const sTermNorm = normalize(s.terminal);
        
        const matchBus = (sPpuNorm && busPpuNorm && sPpuNorm === busPpuNorm) || 
                         (sCodNorm && busCodNorm && sCodNorm === busCodNorm);
        
        // Match flexible de terminal (o si uno de los dos no tiene terminal, dejamos que coincida igual)
        const matchTerm = (!sTermNorm || !termNorm || sTermNorm.includes(termNorm) || termNorm.includes(sTermNorm));
        
        return matchBus && matchTerm;
      });
      
      setScheduledMaintenance(maintenanceMatch || null);
      setCurrentNfcBus(bus);
      setLastNfcBus(bus);
      setNfcOperOpen(true);
      
      if (maintenanceMatch) {
        setNfcMessage(`¡Alerta! Bus programado para ${maintenanceMatch.turno}. Verifique y guarde.`);
      } else {
        setNfcMessage('Bus encontrado.');
      }
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

  const executeNfcSave = async (targetBus, targetUid, operation) => {
    if (!targetBus?.cod || !targetBus?.ppu) {
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
      const updatedBus = await updateFleetFromNfc(targetBus, normalizedOperation);
      await insertNfcLog(
        buildNfcLogPayload({
          nfcUid: targetUid,
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
          nfcUid: targetUid,
          bus: targetBus,
          operation: normalizedOperation,
          resultado: 'error',
          mensajeError: message,
        }),
      ).catch(() => undefined);
    } finally {
      setNfcSaving(false);
    }
  };

  const handleNfcSave = async (operation) => {
    await executeNfcSave(currentNfcBus, currentNfcUid, operation);
  };

  const handleNfcCreateBus = async (busFormData) => {
    setNfcSaving(true);
    setNfcError('');
    
    if (busFormData.id) {
      // It's an existing bus! 
      // Update its COD with the NFC UID (if changed), and save other details.
      const { nfc_uid: nfcUid, id, ...patch } = busFormData;
      const saveResult = await saveCell(id, patch);
      if (saveResult.ok && nfcUid) {
        try {
          await createNfcAssociation({
            nfc_uid: nfcUid,
            cod: patch.cod,
            ppu: patch.ppu,
            terminal_default: patch.terminal,
            observacion: 'Asociado desde modal de registro a bus existente',
          });
          setNfcRegisterOpen(false);
          setNfcMessage(`Tarjeta NFC ${nfcUid} asociada al bus existente ${patch.cod}.`);
          await loadFleet();
        } catch (associateError) {
          setNfcError(associateError.message || 'Se actualizó el bus pero no se pudo asociar la tarjeta NFC.');
        }
      } else {
        setNfcError(saveResult.message || 'No se pudo actualizar el bus existente.');
      }
    } else {
      // Create new bus
      const result = await handleCreate(busFormData);
      
      if (result.ok) {
         setNfcRegisterOpen(false);
         setNfcMessage(`Bus ${busFormData.cod} creado y asociado correctamente a la tarjeta ${busFormData.nfc_uid}.`);
         await loadFleet(); // Refrescamos la lista
      } else {
         setNfcError(result.message || 'No se pudo registrar el bus.');
      }
    }
    
    setNfcSaving(false);
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

  const handleClearReport = async () => {
    const pwd = window.prompt('Ingrese la contraseña de seguridad para limpiar el reporte de operatividad:');
    if (pwd === 'CLEAROPER2026') {
      const confirmReset = window.confirm('¿Está seguro de que desea limpiar el reporte de operatividad? Esto afectará a todos los buses del terminal activo.');
      if (confirmReset) {
        setFormBusy(true);
        try {
          // Afectamos a TODOS los buses del terminal activo, no solo los filtrados.
          const rowsToClear = rows.filter((r) => workTerminal === 'Todos' || normalizeText(r.terminal) === normalizeText(workTerminal));
          for (const row of rowsToClear) {
            await saveCell(row.id, {
              estado: 'PENDIENTE',
              oper: '',
              vidrio: '',
              mant: '',
              calidad: '',
              adq: '',
              aft: '',
              sinies: '',
              detalle_panne: '',
              observaciones: '',
              ubicacion: '',
              servicio: ''
            });
          }
          alert('Reporte limpiado correctamente.');
          await loadFleet();
        } catch (err) {
          alert('Ocurrió un error al limpiar el reporte.');
        } finally {
          setFormBusy(false);
        }
      }
    } else if (pwd !== null) {
      alert('Contraseña incorrecta.');
    }
  };

  const isPlanilleroView = window.location.hash.includes('#/planillero');
  if (isPlanilleroView) {
    return <PlanilleroApp />;
  }

  return (
    <main className="app-shell">
      <div className={`layout-shell ${sidebarOpen ? 'sidebar-open' : ''} ${sidebarCollapsed ? 'layout-collapsed' : ''}`}>
        <aside className={`enterprise-sidebar ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <div className="sidebar-top-bar" />
          <div className="brand-block" style={{ display: 'flex', alignItems: 'center', width: '100%', paddingRight: '12px' }}>
            <div className="brand-icon">
              <Building2 size={16} />
            </div>
            {!sidebarCollapsed && (
              <div className="brand-text">
                <strong>Turno Ernoc</strong>
                <span>Centro Operativo</span>
              </div>
            )}
            <button 
              className="icon-only-button" 
              style={{ marginLeft: 'auto', color: 'var(--text-400)', background: 'transparent' }}
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          </div>
          <nav className="sidebar-nav">
            {!sidebarCollapsed && <span className="sidebar-section-label">Módulos</span>}
            <button
              type="button"
              id="nav-operacion"
              className={`sidebar-link ${activeView === 'operacion' ? 'sidebar-link-active' : ''}`}
              onClick={() => {
                setActiveView('operacion');
                setSidebarOpen(false);
              }}
              title="Operación Flota"
            >
              <span className="sidebar-link-icon"><LayoutGrid size={14} /></span>
              {!sidebarCollapsed && <span className="sidebar-link-text">Operación Flota</span>}
            </button>
            <button
              type="button"
              id="nav-mantenciones"
              className={`sidebar-link ${activeView === 'mantenciones' ? 'sidebar-link-active' : ''}`}
              onClick={() => {
                setActiveView('mantenciones');
                setSidebarOpen(false);
              }}
              title="Mantenciones"
            >
              <span className="sidebar-link-icon"><CalendarClock size={14} /></span>
              {!sidebarCollapsed && <span className="sidebar-link-text">Mantenciones</span>}
            </button>
            <button
              type="button"
              id="nav-combustible"
              className={`sidebar-link ${activeView === 'combustible' ? 'sidebar-link-active' : ''}`}
              onClick={() => {
                setActiveView('combustible');
                setSidebarOpen(false);
              }}
              title="Combustible"
            >
              <span className="sidebar-link-icon"><Fuel size={14} /></span>
              {!sidebarCollapsed && <span className="sidebar-link-text">Combustible</span>}
            </button>
            <button
              type="button"
              id="nav-cuadratura"
              className={`sidebar-link ${activeView === 'cuadratura' ? 'sidebar-link-active' : ''}`}
              onClick={() => {
                setActiveView('cuadratura');
                setSidebarOpen(false);
              }}
              title="Cuadratura Islas"
            >
              <span className="sidebar-link-icon"><ShieldCheck size={14} /></span>
              {!sidebarCollapsed && <span className="sidebar-link-text">Cuadratura Islas</span>}
            </button>
            <button
              type="button"
              id="nav-control-pannes"
              className={`sidebar-link ${activeView === 'control-pannes' ? 'sidebar-link-active' : ''}`}
              onClick={() => {
                setActiveView('control-pannes');
                setSidebarOpen(false);
              }}
              title="Proyección"
            >
              <span className="sidebar-link-icon"><BarChart2 size={14} /></span>
              {!sidebarCollapsed && <span className="sidebar-link-text">Proyección</span>}
            </button>
            <button
              type="button"
              id="nav-documentacion"
              className={`sidebar-link ${activeView === 'documentacion' ? 'sidebar-link-active' : ''}`}
              onClick={() => {
                setActiveView('documentacion');
                setSidebarOpen(false);
              }}
              title="Revisión Documentación"
            >
              <span className="sidebar-link-icon"><FileCheck size={14} /></span>
              {!sidebarCollapsed && <span className="sidebar-link-text">Revisión Documentación</span>}
            </button>
            <button
              type="button"
              id="nav-configuracion"
              className={`sidebar-link ${activeView === 'configuracion' ? 'sidebar-link-active' : ''}`}
              onClick={() => {
                setActiveView('configuracion');
                setSidebarOpen(false);
              }}
              title="Configuración"
            >
              <span className="sidebar-link-icon"><Settings size={14} /></span>
              {!sidebarCollapsed && <span className="sidebar-link-text">Configuración</span>}
            </button>
          </nav>
          <div className="sidebar-foot" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span className="sidebar-status-pill">
              <span className="sidebar-status-dot" />
              {!sidebarCollapsed && (isSupabaseConfigured ? 'Supabase conectado' : 'Sin configurar')}
            </span>
            {!sidebarCollapsed && (
              <a 
                href="https://zyteron.cl" 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{
                  marginTop: '8px',
                  fontSize: '0.68rem',
                  color: 'var(--gray-400)',
                  textDecoration: 'none',
                  fontWeight: '500'
                }}
                onMouseEnter={(e) => { e.target.style.color = 'var(--navy-600)'; }}
                onMouseLeave={(e) => { e.target.style.color = 'var(--gray-400)'; }}
              >
                Creado por Zyteron
              </a>
            )}
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
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      id="btn-clear-report"
                      className="secondary-button"
                      type="button"
                      onClick={handleClearReport}
                      title="Limpiar reporte de operatividad"
                      style={{ color: 'var(--danger-600)', borderColor: 'var(--danger-200)', backgroundColor: 'var(--danger-50)' }}
                    >
                      <Eraser size={13} />
                      Limpiar Reporte
                    </button>
                    <label className="secondary-button" style={{ cursor: 'pointer' }} title="Subir archivo Excel de Pannes OT">
                      <Upload size={13} />
                      Subir Pannes OT
                      <input type="file" accept=".xlsx, .xls" style={{ display: 'none' }} onChange={handleUploadOtPannes} />
                    </label>
                    <button
                      id="btn-export-excel"
                      className="secondary-button"
                      type="button"
                      onClick={() => downloadXlsx(filteredRows)}
                      title="Exportar tabla a Excel"
                    >
                      <Download size={13} />
                      Excel
                    </button>
                  </div>
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
                    fuelRecords={fuelRecords}
                    selectedRowId={selectedRowId}
                    highlightedRowId={highlightedRowId}
                    rowStatuses={rowStatuses}
                    isOperativoMode={filters.estado?.toUpperCase() === 'OPERATIVO'}
                    onSelectRow={setSelectedRowId}
                    onSaveCell={saveCell}
                    onOpenConfiguration={() => setActiveView('configuracion')}
                  />
                  <MobileFleetCards
                    rows={filteredRows}
                    fuelRecords={fuelRecords}
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
              onTestNfcRead={handleTestRead}
              nfcStatus={{
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
            />
          ) : activeView === 'mantenciones' ? (
            <MaintenancePanel 
              schedule={schedule}
              lastUploadDate={lastUploadDate}
              onParseFile={parseFile}
              onClear={clearSchedule}
              onUpdateEntry={updateEntry}
              rows={filteredRows}
            />
          ) : activeView === 'combustible' ? (
            <FuelPanel rows={rows} fuelData={fuelData} onSaveCell={saveCell} />
          ) : activeView === 'cuadratura' ? (
            <CuadraturaPanel />
          ) : activeView === 'control-pannes' ? (
            <ControlPannesPanel rows={filteredRows} />
          ) : activeView === 'documentacion' ? (
            <DocumentReviewPanel rows={rows} />
          ) : null}

          <NfcOperModal
            open={nfcOperOpen}
            nfcUid={currentNfcUid}
            bus={currentNfcBus}
            terminalFilter={workTerminal}
            scheduledMaintenance={scheduledMaintenance}
            otPannesData={otPannesData}
            fuelLitros={currentFuelLitros}
            telemetryPct={currentTelemetryPct}
            saving={nfcSaving}
            error={nfcError}
            onSave={handleNfcSave}
            onCancel={() => {
              setNfcOperOpen(false);
              setNfcError('');
              setCurrentNfcBus(null);
            }}
          />

          <NfcRegisterModal
            open={nfcRegisterOpen}
            nfcUid={currentNfcUid}
            terminalFilter={filters.terminal}
            saving={nfcSaving || formBusy}
            error={nfcError}
            rows={rows}
            onCreate={handleNfcCreateBus}
            onCancel={() => {
              setNfcRegisterOpen(false);
              setNfcError('');
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
