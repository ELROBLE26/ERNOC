import { useEffect, useMemo, useState, useRef } from 'react';
import { PROBLEM_FIELDS, buildExclusiveProblemPatch } from '../utils/fleet';
import { X } from 'lucide-react';

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
        onSave(payloadRef.current);
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        onSave(payloadRef.current);
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

          {error ? <p className="modal-error">⚠ {error}</p> : null}

          <div className="modal-actions" style={{ marginTop: '24px' }}>
            <button className="secondary-button" type="button" onClick={onCancel}>
              Cancelar
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => onSave({ ...buildInitialForm(form.terminal), terminal: form.terminal })}
              disabled={!canSave || saving}
            >
              Operativo rápido
            </button>
            <button
              className="primary-button"
              type="button"
              onClick={() => onSave(payload)}
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
