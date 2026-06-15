import { useEffect, useMemo, useState, useRef } from 'react';
import { PROBLEM_FIELDS, buildExclusiveProblemPatch } from '../utils/fleet';
import {
  X, ChevronDown, ChevronUp, Printer, Fuel, Gauge, Bus, MapPin,
  AlertTriangle, Wrench, ClipboardCheck, FileText, Zap, Clock, Shield
} from 'lucide-react';
import { getDocumentRevisionByPpu, upsertDocumentRevision } from '../lib/documentService';

const PROBLEM_COLUMNS = [
  { field: 'oper',    label: 'OPER',    icon: Bus },
  { field: 'vidrio',  label: 'VIDRIO',  icon: Shield },
  { field: 'mant',    label: 'MANT',    icon: Wrench },
  { field: 'calidad', label: 'CALIDAD', icon: ClipboardCheck },
  { field: 'adq',     label: 'ADQ',     icon: FileText },
  { field: 'aft',     label: 'AFT',     icon: AlertTriangle },
  { field: 'sinies',  label: 'SINIES',  icon: Zap },
];

export function NfcOperModal({
  open,
  nfcUid,
  bus,
  terminalFilter,
  scheduledMaintenance,
  otPannesData,
  fuelLitros,
  telemetryPct,
  saving,
  error,
  onSave,
  onCancel,
}) {
  const defaultTerminal = terminalFilter;
  const [form, setForm] = useState(() => buildInitialForm(defaultTerminal, scheduledMaintenance));
  const [otNumber, setOtNumber] = useState('');
  const [activeSection, setActiveSection] = useState('problem'); // 'problem' | 'docs'
  
  const [docs, setDocs] = useState({
    permiso_circulacion: true,
    soap: true,
    revision_tecnica: true,
    revision_gases: true,
    certificado_recorrido: true,
    certificado_inscripcion: true,
  });
  const [docsLoading, setDocsLoading] = useState(false);

  useEffect(() => {
    async function loadDocs() {
      if (open && bus?.ppu) {
        setDocsLoading(true);
        try {
          const rev = await getDocumentRevisionByPpu(bus.ppu);
          if (rev) {
            setDocs({
              permiso_circulacion: rev.permiso_circulacion,
              soap: rev.soap,
              revision_tecnica: rev.revision_tecnica,
              revision_gases: rev.revision_gases,
              certificado_recorrido: rev.certificado_recorrido,
              certificado_inscripcion: rev.certificado_inscripcion,
            });
          } else {
            setDocs({
              permiso_circulacion: true,
              soap: true,
              revision_tecnica: true,
              revision_gases: true,
              certificado_recorrido: true,
              certificado_inscripcion: true,
            });
          }
        } catch (err) {
          console.error(err);
        } finally {
          setDocsLoading(false);
        }
      }
    }
    loadDocs();
  }, [open, bus]);

  const handleSaveWrapper = async (payloadToSave) => {
    try {
      if (bus?.ppu && bus?.cod) {
        await upsertDocumentRevision({
          ppu: bus.ppu,
          cod: bus.cod,
          terminal: form.terminal,
          ...docs
        });
      }
    } catch (err) {
      console.error('Error guardando revisión de documentos:', err);
      alert('⚠️ No se pudieron guardar los documentos. Verifica que la tabla exista en Supabase.');
    } finally {
      onSave(payloadToSave);
    }
  };

  useEffect(() => {
    if (open) {
      setForm(buildInitialForm(defaultTerminal, scheduledMaintenance, bus));
      setOtNumber('');
      setActiveSection('problem');
    }
  }, [defaultTerminal, open, nfcUid, scheduledMaintenance, bus]);

  const otRecord = useMemo(() => {
    if (!otPannesData || !bus?.ppu) return null;
    return otPannesData.find(row => {
      const ppuRaw = (row['PPU'] || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
      const busPpu = (bus.ppu || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
      return ppuRaw && busPpu && ppuRaw === busPpu;
    });
  }, [otPannesData, bus]);

  const handleAutofillOT = () => {
    if (!otRecord) return;
    const isPreventiva = String(otRecord['Tipo OT'] || '').toUpperCase() === 'PREVENTIVA';
    const tipoOt = String(otRecord['Tipo OT'] || '').toUpperCase() || '';
    const otNum = String(otRecord['Número OT'] ?? '');
    const detalleStr = String(isPreventiva ? (otRecord['Detalle ingreso'] || '') : (otRecord['Detalle correctiva'] || ''));
    
    const isVidrio = detalleStr.toLowerCase().includes('vidrio') || String(otRecord['Motivo panne'] || '').toLowerCase().includes('vidrio');

    setForm((current) => ({
      ...current,
      ...buildExclusiveProblemPatch(isVidrio ? 'vidrio' : 'mant'),
      detalle_panne: tipoOt,
      observaciones: scheduledMaintenance?.turno ? `${detalleStr} - ${scheduledMaintenance.turno}` : detalleStr,
    }));
    
    setOtNumber(otNum);
  };

  const selectedProblem = PROBLEM_FIELDS.find((field) => String(form[field] ?? '').toUpperCase() === 'X');
  const showDetails = Boolean(selectedProblem);
  const canSave = Boolean(form.terminal && bus?.cod && bus?.ppu);

  const payload = useMemo(() => {
    const hasProblem = PROBLEM_FIELDS.some((field) => String(form[field] ?? '').toUpperCase() === 'X');

    if (!hasProblem) {
      return {
        ...buildInitialForm(form.terminal),
        terminal: form.terminal,
      };
    }

    let finalObservaciones = form.observaciones;
    if (otNumber.trim()) {
      finalObservaciones = finalObservaciones 
        ? `${finalObservaciones} (OT: ${otNumber.trim()})`
        : `OT: ${otNumber.trim()}`;
    }

    return {
      ...form,
      observaciones: finalObservaciones,
      estado: 'NO OPERATIVO',
    };
  }, [form, otNumber]);

  const payloadRef = useRef(payload);
  useEffect(() => {
    payloadRef.current = payload;
  }, [payload]);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        handleSaveWrapper(payloadRef.current);
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        handleSaveWrapper(payloadRef.current);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, onSave, open]);

  if (!open) return null;

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const setProblem = (field) => {
    setForm((current) => ({
      ...current,
      ...buildExclusiveProblemPatch(
        String(current[field] ?? '').toUpperCase() === 'X' ? '' : field,
      ),
    }));
  };

  const hasFuel = fuelLitros > 0;
  const hasProblem = Boolean(selectedProblem);
  const docsOk = Object.values(docs).filter(Boolean).length;
  const docsTotal = Object.values(docs).length;
  const now = new Date();
  const timeStr = now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

  // Determine accent color based on state
  const accentColor = scheduledMaintenance ? '#d97706' : otRecord ? '#dc2626' : '#2563eb';
  const accentGradient = scheduledMaintenance
    ? 'linear-gradient(90deg, #d97706, #f59e0b, #fbbf24)'
    : otRecord
    ? 'linear-gradient(90deg, #dc2626, #ef4444, #f87171)'
    : 'linear-gradient(90deg, #1e3a5f, #2563eb, #60a5fa)';

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="nfc-modal-v2"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nfc-oper-title"
      >
        {/* ── ACCENT BAR ──────────────────────────────── */}
        <div className="nfcv2-accent" style={{ background: accentGradient }} />

        {/* ── HEADER ──────────────────────────────────── */}
        <div className="nfcv2-header">
          <div className="nfcv2-header-left">
            <div className="nfcv2-bus-avatar" style={{ background: `${accentColor}15`, borderColor: `${accentColor}40`, color: accentColor }}>
              <Bus size={20} />
            </div>
            <div className="nfcv2-header-info">
              <div className="nfcv2-ppu">{bus?.ppu || '—'}</div>
              <div className="nfcv2-meta-row">
                <span className="nfcv2-cod-badge">COD {bus?.cod || '—'}</span>
                <span className="nfcv2-terminal-badge">
                  <MapPin size={10} /> {form.terminal || '—'}
                </span>
                <span className="nfcv2-time-badge">
                  <Clock size={10} /> {timeStr}
                </span>
              </div>
            </div>
          </div>
          <div className="nfcv2-header-right">
            <span className="nfcv2-uid">UID: {nfcUid}</span>
            <button className="nfcv2-close" type="button" onClick={onCancel} aria-label="Cerrar">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── QUICK STATUS STRIP ──────────────────────── */}
        <div className="nfcv2-status-strip">
          <div className={`nfcv2-status-card ${hasFuel ? 'nfcv2-status-ok' : 'nfcv2-status-warn'}`}>
            <Fuel size={16} />
            <div>
              <strong>{hasFuel ? `${fuelLitros} L` : 'PENDIENTE'}</strong>
              <span>Combustible</span>
            </div>
          </div>
          <div className={`nfcv2-status-card ${telemetryPct ? 'nfcv2-status-ok' : 'nfcv2-status-neutral'}`}>
            <Gauge size={16} />
            <div>
              <strong>{telemetryPct ? `${telemetryPct}%` : '—'}</strong>
              <span>Tanque</span>
            </div>
          </div>
          <div className={`nfcv2-status-card ${docsOk === docsTotal ? 'nfcv2-status-ok' : 'nfcv2-status-warn'}`}>
            <FileText size={16} />
            <div>
              <strong>{docsOk}/{docsTotal}</strong>
              <span>Documentos</span>
            </div>
          </div>
          <div className={`nfcv2-status-card ${hasProblem ? 'nfcv2-status-danger' : 'nfcv2-status-ok'}`}>
            <AlertTriangle size={16} />
            <div>
              <strong>{hasProblem ? selectedProblem.toUpperCase() : 'NINGUNO'}</strong>
              <span>Problema</span>
            </div>
          </div>
        </div>

        {/* ── ALERTS ──────────────────────────────────── */}
        {scheduledMaintenance && (
          <div className="nfcv2-alert nfcv2-alert-warning">
            <div className="nfcv2-alert-icon">
              <Wrench size={16} />
            </div>
            <div className="nfcv2-alert-body">
              <strong>MANTENCIÓN PROGRAMADA — {scheduledMaintenance.turno}</strong>
              <div className="nfcv2-alert-details">
                <span>Fecha: {new Date(scheduledMaintenance.fechaProgramada).toLocaleString('es-CL')}</span>
                <span>Obs: {scheduledMaintenance.detalle || 'Sin observaciones'}</span>
              </div>
            </div>
          </div>
        )}

        {otRecord && (
          <div className="nfcv2-alert nfcv2-alert-danger">
            <div className="nfcv2-alert-icon">
              <AlertTriangle size={16} />
            </div>
            <div className="nfcv2-alert-body">
              <strong>PANNE OT DETECTADA</strong>
              <div className="nfcv2-alert-details">
                <span>OT: {otRecord['Número OT']} · {otRecord['Tipo OT']}</span>
                <span>Detalle: {String(otRecord['Tipo OT'] || '').toUpperCase() === 'PREVENTIVA' ? otRecord['Detalle ingreso'] : otRecord['Detalle correctiva']}</span>
              </div>
            </div>
            <button type="button" className="nfcv2-autofill-btn" onClick={handleAutofillOT}>
              <Zap size={13} /> Rellenar
            </button>
          </div>
        )}

        {/* ── SCROLLABLE CONTENT ──────────────────────── */}
        <div className="nfcv2-body">
          {/* Tab Navigation */}
          <div className="nfcv2-tabs">
            <button
              type="button"
              className={`nfcv2-tab ${activeSection === 'problem' ? 'nfcv2-tab-active' : ''}`}
              onClick={() => setActiveSection('problem')}
            >
              <Wrench size={13} /> Operatividad
            </button>
            <button
              type="button"
              className={`nfcv2-tab ${activeSection === 'docs' ? 'nfcv2-tab-active' : ''}`}
              onClick={() => setActiveSection('docs')}
            >
              <FileText size={13} /> Documentos
              {docsOk < docsTotal && (
                <span className="nfcv2-tab-badge">{docsTotal - docsOk}</span>
              )}
            </button>
          </div>

          {/* ── PROBLEM SECTION ─────────────────────── */}
          {activeSection === 'problem' && (
            <div className="nfcv2-section">
              <div className="nfcv2-section-label">Marcar Problema</div>
              <div className="nfcv2-problem-grid">
                {PROBLEM_COLUMNS.map((column) => {
                  const active = String(form[column.field] ?? '').toUpperCase() === 'X';
                  const Icon = column.icon;
                  return (
                    <button
                      key={column.field}
                      className={`nfcv2-problem-btn ${active ? 'nfcv2-problem-active' : ''}`}
                      type="button"
                      onClick={() => setProblem(column.field)}
                      aria-pressed={active}
                    >
                      <Icon size={15} />
                      <span>{column.label}</span>
                      {active && <div className="nfcv2-problem-check">✓</div>}
                    </button>
                  );
                })}
              </div>

              {showDetails && (
                <div className="nfcv2-detail-fields">
                  <div className="nfcv2-field">
                    <label>Número de OT</label>
                    <input
                      type="text"
                      value={otNumber}
                      onChange={(e) => setOtNumber(e.target.value)}
                      placeholder="Ej: 123456"
                    />
                  </div>
                  <div className="nfcv2-field">
                    <label>Detalle Panne</label>
                    <input
                      type="text"
                      value={form.detalle_panne}
                      onChange={(e) => updateField('detalle_panne', String(e.target.value).toUpperCase())}
                      placeholder="Tipo de falla"
                    />
                  </div>
                  <div className="nfcv2-field nfcv2-field-full">
                    <label>Observaciones</label>
                    <textarea
                      value={form.observaciones}
                      onChange={(e) => updateField('observaciones', String(e.target.value).toUpperCase())}
                      rows={2}
                      placeholder="Descripción detallada..."
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── DOCS SECTION ────────────────────────── */}
          {activeSection === 'docs' && (
            <div className="nfcv2-section">
              {docsLoading ? (
                <p style={{ padding: '16px', color: '#64748b', textAlign: 'center' }}>Cargando documentos…</p>
              ) : (
                <div className="nfcv2-docs-grid">
                  <DocRow 
                    label="Permiso de Circulación" 
                    value={docs.permiso_circulacion} 
                    onChange={(v) => setDocs(d => ({ ...d, permiso_circulacion: v }))} 
                    driveLink={bus?.ppu ? `https://drive.google.com/drive/search?q=${encodeURIComponent(`"${bus.ppu}" parent:1Ps3s4gUF3l6Rf0k82rwoTVOTGtVh9mn0`)}` : "https://drive.google.com/drive/folders/1Ps3s4gUF3l6Rf0k82rwoTVOTGtVh9mn0"}
                  />
                  <DocRow 
                    label="SOAP" 
                    value={docs.soap} 
                    onChange={(v) => setDocs(d => ({ ...d, soap: v }))} 
                    driveLink={bus?.ppu ? `https://drive.google.com/drive/search?q=${encodeURIComponent(`"${bus.ppu}" parent:1MYrseSdneeob9mm3ap7wyFStrEax0PzN`)}` : "https://drive.google.com/drive/folders/1MYrseSdneeob9mm3ap7wyFStrEax0PzN"}
                  />
                  <DocRow label="Revisión Técnica" value={docs.revision_tecnica} onChange={(v) => setDocs(d => ({ ...d, revision_tecnica: v }))} />
                  <DocRow label="Revisión Gases" value={docs.revision_gases} onChange={(v) => setDocs(d => ({ ...d, revision_gases: v }))} />
                  <DocRow label="Cert. Recorrido" value={docs.certificado_recorrido} onChange={(v) => setDocs(d => ({ ...d, certificado_recorrido: v }))} />
                  <DocRow label="Cert. Inscripción" value={docs.certificado_inscripcion} onChange={(v) => setDocs(d => ({ ...d, certificado_inscripcion: v }))} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── ERROR ───────────────────────────────────── */}
        {error && (
          <div className="nfcv2-error">
            <AlertTriangle size={13} /> {error}
          </div>
        )}

        {/* ── FOOTER ACTIONS ─────────────────────────── */}
        <div className="nfcv2-footer">
          <div className="nfcv2-footer-status">
            <span className={`nfcv2-result-pill ${hasProblem ? 'nfcv2-result-danger' : 'nfcv2-result-ok'}`}>
              {hasProblem ? 'NO OPERATIVO' : 'OPERATIVO'}
            </span>
          </div>
          <div className="nfcv2-footer-actions">
            <button className="nfcv2-btn-secondary" type="button" onClick={onCancel}>
              Cancelar
            </button>
            {bus && PROBLEM_FIELDS.some(field => String(bus[field] ?? '').toUpperCase() === 'X') ? (
              <button
                className="nfcv2-btn-secondary nfcv2-btn-quick"
                style={{ backgroundColor: 'var(--success-600)', color: 'white', borderColor: 'var(--success-600)' }}
                type="button"
                onClick={() => {
                  if (window.confirm('¿Desea reparar la falla, limpiar los registros y dejar el bus OPERATIVO?')) {
                    handleSaveWrapper({ 
                      ...buildInitialForm(form.terminal), 
                      terminal: form.terminal,
                      servicio: 'OPERATIVO LIBRE',
                      estado: 'OPERATIVO'
                    });
                  }
                }}
                disabled={!canSave || saving}
              >
                <Zap size={12} color="white" /> Levantar Bus
              </button>
            ) : (
              <button
                className="nfcv2-btn-secondary nfcv2-btn-quick"
                type="button"
                onClick={() => handleSaveWrapper({ ...buildInitialForm(form.terminal), terminal: form.terminal, servicio: 'OPERATIVO LIBRE', estado: 'OPERATIVO' })}
                disabled={!canSave || saving}
              >
                <Zap size={12} /> Operativo Rápido
              </button>
            )}
            <button
              className="nfcv2-btn-primary"
              type="button"
              onClick={() => handleSaveWrapper(payload)}
              disabled={!canSave || saving}
            >
              {saving ? 'Guardando…' : 'Guardar Registro'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function buildInitialForm(terminal, scheduledMaintenance, bus) {
  if (scheduledMaintenance) {
    return {
      terminal,
      estado: 'PENDIENTE',
      oper: '',
      vidrio: '',
      mant: 'X',
      calidad: '',
      adq: '',
      aft: '',
      sinies: '',
      detalle_panne: 'PREVENTIVA',
      observaciones: scheduledMaintenance.turno,
      ubicacion: terminal,
      servicio: '',
    };
  }

  if (bus) {
    const hasExistingProblem = PROBLEM_FIELDS.some(field => String(bus[field] ?? '').toUpperCase() === 'X');
    if (hasExistingProblem) {
      return {
        terminal: bus.terminal || terminal,
        estado: bus.estado || 'PENDIENTE',
        oper: bus.oper || '',
        vidrio: bus.vidrio || '',
        mant: bus.mant || '',
        calidad: bus.calidad || '',
        adq: bus.adq || '',
        aft: bus.aft || '',
        sinies: bus.sinies || '',
        detalle_panne: bus.detalle_panne || '',
        observaciones: bus.observaciones || '',
        ubicacion: bus.ubicacion || terminal,
        servicio: bus.servicio || '',
      };
    }
  }

  return {
    terminal,
    estado: 'OPERATIVO',
    oper: '',
    vidrio: '',
    mant: '',
    calidad: '',
    adq: '',
    aft: '',
    sinies: '',
    detalle_panne: '',
    observaciones: '',
    ubicacion: terminal,
    servicio: 'OPERATIVO LIBRE',
  };
}

function DocRow({ label, value, onChange, driveLink }) {
  return (
    <div className={`nfcv2-doc-row ${value ? 'nfcv2-doc-ok' : 'nfcv2-doc-missing'}`}>
      <div className="nfcv2-doc-info">
        <span className="nfcv2-doc-label">{label}</span>
        {value === false && driveLink && (
          <a href={driveLink} target="_blank" rel="noreferrer" className="nfcv2-doc-print-link">
            <Printer size={12} /> Buscar e Imprimir
          </a>
        )}
      </div>
      <div className="nfcv2-doc-toggle">
        <button
          type="button"
          className={`nfcv2-toggle-btn ${value === true ? 'nfcv2-toggle-yes' : ''}`}
          onClick={() => onChange(true)}
        >SÍ</button>
        <button
          type="button"
          className={`nfcv2-toggle-btn ${value === false ? 'nfcv2-toggle-no' : ''}`}
          onClick={() => {
            onChange(false);
            if (value !== false && driveLink) {
              window.open(driveLink, '_blank');
            }
          }}
        >NO</button>
      </div>
    </div>
  );
}
