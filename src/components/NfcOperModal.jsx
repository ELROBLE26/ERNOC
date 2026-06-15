import { useEffect, useMemo, useState, useRef } from 'react';
import { PROBLEM_FIELDS, buildExclusiveProblemPatch } from '../utils/fleet';
import { X, ChevronDown, ChevronUp, ExternalLink, Printer } from 'lucide-react';
import { getDocumentRevisionByPpu, upsertDocumentRevision } from '../lib/documentService';
const PROBLEM_COLUMNS = [
  { field: 'oper',    label: 'OPER' },
  { field: 'vidrio',  label: 'VIDRIO' },
  { field: 'mant',    label: 'MANT' },
  { field: 'calidad', label: 'CALIDAD' },
  { field: 'adq',     label: 'ADQ' },
  { field: 'aft',     label: 'AFT' },
  { field: 'sinies',  label: 'SINIES' },
];

export function NfcOperModal({
  open,
  nfcUid,
  bus,
  terminalFilter,
  scheduledMaintenance,
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
  
  const [docs, setDocs] = useState({
    permiso_circulacion: true,
    soap: true,
    revision_tecnica: true,
    revision_gases: true,
    certificado_recorrido: true,
    certificado_inscripcion: true,
  });
  const [showDocs, setShowDocs] = useState(false);
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
      setForm(buildInitialForm(defaultTerminal, scheduledMaintenance));
      setOtNumber('');
    }
  }, [defaultTerminal, open, nfcUid, scheduledMaintenance]);

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

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="modal-card nfc-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nfc-oper-title"
        style={{ maxWidth: '600px' }}
      >
        <div className={`modal-accent-bar ${scheduledMaintenance ? 'maintenance-accent-bar' : ''}`} style={scheduledMaintenance ? { background: 'var(--warning-500)' } : {}} />
        <div className="modal-content">
          <div className="modal-header">
            <div>
              <h2 id="nfc-oper-title">Lectura NFC detectada</h2>
              <p>UID: <strong style={{ fontFamily: 'monospace', color: 'var(--navy-700)' }}>{nfcUid}</strong></p>
            </div>
            <button
              className="icon-only-button"
              type="button"
              onClick={onCancel}
              aria-label="Cerrar"
            >
              <X size={14} />
            </button>
          </div>

          <div className="nfc-bus-strip">
            <DataPoint label="COD"      value={bus?.cod} />
            <DataPoint label="PPU"      value={<span style={{ fontSize: '1.4rem', fontWeight: 900, letterSpacing: '1px' }}>{bus?.ppu}</span>} />
            <DataPoint label="Terminal" value={form.terminal || 'Seleccionar'} />
          </div>

          {scheduledMaintenance && (
            <div className="banner banner-warning" style={{ margin: '16px 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div>
                <strong>¡MANTENCIÓN PROGRAMADA! ({scheduledMaintenance.turno})</strong>
              </div>
              <div style={{ fontSize: '13px' }}>
                <strong>Fecha:</strong> {new Date(scheduledMaintenance.fechaProgramada).toLocaleString('es-CL')}
              </div>
              <div style={{ fontSize: '13px' }}>
                <strong>Observación:</strong> {scheduledMaintenance.detalle || 'Sin observaciones'}
              </div>
            </div>
          )}

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            borderRadius: '8px',
            backgroundColor: hasFuel ? 'var(--success-50)' : 'var(--danger-50)',
            border: `2px solid ${hasFuel ? 'var(--success-200)' : 'var(--danger-200)'}`,
            margin: '16px 0'
          }}>
            <strong style={{
              fontSize: '28px',
              color: hasFuel ? 'var(--success-700)' : 'var(--danger-700)',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              {hasFuel ? 'CARGADO' : 'PENDIENTE'}
            </strong>
            <div style={{ display: 'flex', gap: '24px', marginTop: '8px' }}>
              {hasFuel && (
                <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--success-800)' }}>
                  {fuelLitros} L
                </span>
              )}
              {telemetryPct && (
                <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--navy-800)' }}>
                  {telemetryPct}% Tanque
                </span>
              )}
            </div>
          </div>

          <div className="modal-grid nfc-status-grid">
            <div className="modal-wide-field nfc-problem-picker">
              <span>Marcar problema</span>
              <div className="problem-picker-grid">
                {PROBLEM_COLUMNS.map((column) => {
                  const active = String(form[column.field] ?? '').toUpperCase() === 'X';
                  return (
                    <button
                      key={column.field}
                      className={`modal-problem-toggle ${active ? 'problem-toggle-active' : ''}`}
                      type="button"
                      onClick={() => setProblem(column.field)}
                      aria-pressed={active}
                    >
                      {active ? '✓' : ''}
                      <small>{column.label}</small>
                    </button>
                  );
                })}
              </div>
            </div>

            {showDetails ? (
              <>
                <TextInput
                  label="Número de OT (Opcional)"
                  value={otNumber}
                  onChange={setOtNumber}
                />
                <TextInput
                  label="Detalle Panne"
                  value={form.detalle_panne}
                  onChange={(value) => updateField('detalle_panne', value)}
                />
                <TextInput
                  label="Observaciones"
                  value={form.observaciones}
                  onChange={(value) => updateField('observaciones', value)}
                />
              </>
            ) : null}
          </div>

          <div style={{ marginTop: '16px', border: '1px solid var(--gray-200)', borderRadius: '8px', overflow: 'hidden' }}>
            <button 
              type="button" 
              onClick={() => setShowDocs(!showDocs)}
              style={{ width: '100%', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--gray-50)', border: 'none', cursor: 'pointer', fontWeight: 'bold', color: 'var(--gray-700)' }}
            >
              <span>Revisión de Documentos</span>
              {showDocs ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {showDocs && (
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'white' }}>
                {docsLoading ? (
                  <p>Cargando documentos...</p>
                ) : (
                  <>
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
                    <DocRow 
                      label="Revisión Técnica" 
                      value={docs.revision_tecnica} 
                      onChange={(v) => setDocs(d => ({ ...d, revision_tecnica: v }))} 
                    />
                    <DocRow 
                      label="Revisión Gases" 
                      value={docs.revision_gases} 
                      onChange={(v) => setDocs(d => ({ ...d, revision_gases: v }))} 
                    />
                    <DocRow 
                      label="Cert. Recorrido" 
                      value={docs.certificado_recorrido} 
                      onChange={(v) => setDocs(d => ({ ...d, certificado_recorrido: v }))} 
                    />
                    <DocRow 
                      label="Cert. Inscripción" 
                      value={docs.certificado_inscripcion} 
                      onChange={(v) => setDocs(d => ({ ...d, certificado_inscripcion: v }))} 
                    />
                  </>
                )}
              </div>
            )}
          </div>

          {error ? <p className="modal-error">⚠ {error}</p> : null}

          <div className="modal-actions" style={{ marginTop: '24px' }}>
            <button className="secondary-button" type="button" onClick={onCancel}>
              Cancelar
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => handleSaveWrapper({ ...buildInitialForm(form.terminal), terminal: form.terminal })}
              disabled={!canSave || saving}
            >
              Operativo rápido
            </button>
            <button
              className="primary-button"
              type="button"
              onClick={() => handleSaveWrapper(payload)}
              disabled={!canSave || saving}
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function buildInitialForm(terminal, scheduledMaintenance) {
  if (scheduledMaintenance) {
    return {
      terminal,
      estado: 'NO OPERATIVO',
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
    };
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
    servicio: 'Operativo Libre',
  };
}

function DataPoint({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value || '—'}</strong>
    </div>
  );
}

function TextArea({ label, value, onChange }) {
  return (
    <label className="field modal-wide-field">
      <span>{label}</span>
      <textarea
        value={value}
        rows={3}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function TextInput({ label, value, onChange }) {
  return (
    <label className="field modal-wide-field">
      <span>{label}</span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Ej: 12345"
      />
    </label>
  );
}

function DocRow({ label, value, onChange, driveLink }) {
  return (
    <div style={{ 
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
      padding: '12px 16px', border: '1px solid', 
      borderColor: value === true ? '#bbf7d0' : (value === false ? '#fecaca' : '#e5e7eb'), 
      borderRadius: '10px', marginBottom: '8px', 
      background: value === true ? '#f0fdf4' : (value === false ? '#fef2f2' : '#ffffff'),
      transition: 'all 0.2s ease-in-out'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{ 
          fontWeight: '700', fontSize: '15px', 
          color: value === true ? '#166534' : (value === false ? '#991b1b' : '#374151') 
        }}>{label}</span>
        {value === false && driveLink && (
          <a 
            href={driveLink} 
            target="_blank" 
            rel="noreferrer"
            style={{ 
              display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', 
              color: '#b91c1c', textDecoration: 'none', background: '#ffffff', 
              padding: '6px 10px', borderRadius: '6px', fontWeight: 'bold', width: 'fit-content', 
              border: '1px solid #fca5a5', marginTop: '2px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            <Printer size={14} /> Buscar e Imprimir
          </a>
        )}
      </div>
      <div style={{ display: 'flex', background: '#f3f4f6', padding: '4px', borderRadius: '8px', gap: '4px' }}>
        <button
          type="button"
          onClick={() => onChange(true)}
          style={{
            padding: '8px 16px', borderRadius: '6px', border: 'none',
            background: value === true ? '#22c55e' : 'transparent',
            color: value === true ? '#ffffff' : '#6b7280',
            cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s', 
            boxShadow: value === true ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
          }}
        >
          SÍ
        </button>
        <button
          type="button"
          onClick={() => {
            onChange(false);
            if (value !== false && driveLink) {
              window.open(driveLink, '_blank');
            }
          }}
          style={{
            padding: '8px 16px', borderRadius: '6px', border: 'none',
            background: value === false ? '#ef4444' : 'transparent',
            color: value === false ? '#ffffff' : '#6b7280',
            cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s', 
            boxShadow: value === false ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
          }}
        >
          NO
        </button>
      </div>
    </div>
  );
}
