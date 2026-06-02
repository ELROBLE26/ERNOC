import { useEffect, useMemo, useState } from 'react';
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
        onSave(payload);
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        onSave(payload);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [form.estado, onCancel, onSave, open, payload]);

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

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="modal-card nfc-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nfc-oper-title"
      >
        <div className={`modal-accent-bar ${scheduledMaintenance ? 'maintenance-accent-bar' : ''}`} style={scheduledMaintenance ? { background: 'var(--warning-500)' } : {}} />
        <div className="modal-content">
          {scheduledMaintenance && (
            <div className="banner banner-warning" style={{ marginBottom: 16 }}>
              <strong>¡Bus programado!</strong> {scheduledMaintenance.turno} — {scheduledMaintenance.detalle}
            </div>
          )}
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
            <DataPoint label="PPU"      value={bus?.ppu} />
            <DataPoint label="Terminal" value={form.terminal || 'Seleccionar'} />
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
                <TextArea
                  label="Detalle Panne"
                  value={form.detalle_panne}
                  onChange={(value) => updateField('detalle_panne', value)}
                />
                <TextArea
                  label="Observaciones"
                  value={form.observaciones}
                  onChange={(value) => updateField('observaciones', value)}
                />
              </>
            ) : null}
          </div>

          {error ? <p className="modal-error">⚠ {error}</p> : null}

          <div className="modal-actions">
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
