import { useEffect, useMemo, useState } from 'react';
import { PROBLEM_FIELDS, buildExclusiveProblemPatch } from '../utils/fleet';

const PROBLEM_COLUMNS = [
  { field: 'oper', label: 'OPER' },
  { field: 'vidrio', label: 'VIDRIO' },
  { field: 'mant', label: 'MANT' },
  { field: 'calidad', label: 'CALIDAD' },
  { field: 'adq', label: 'ADQ' },
  { field: 'aft', label: 'AFT' },
  { field: 'sinies', label: 'SINIES' },
];

export function NfcOperModal({
  open,
  nfcUid,
  bus,
  terminalFilter,
  saving,
  error,
  onSave,
  onCancel,
}) {
  const defaultTerminal = terminalFilter;
  const [form, setForm] = useState(() => buildInitialForm(defaultTerminal));

  useEffect(() => {
    if (open) {
      setForm(buildInitialForm(defaultTerminal));
    }
  }, [defaultTerminal, open, nfcUid]);

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

    return {
      ...form,
      estado: 'NO OPERATIVO',
    };
  }, [form]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

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

  if (!open) {
    return null;
  }

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
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
      <section className="modal-card nfc-modal" role="dialog" aria-modal="true" aria-labelledby="nfc-oper-title">
        <div className="modal-header">
          <div>
            <h2 id="nfc-oper-title">Lectura NFC detectada</h2>
            <p>UID NFC: {nfcUid}</p>
          </div>
          <button className="icon-only-button" type="button" onClick={onCancel} aria-label="Cerrar">
            x
          </button>
        </div>

        <div className="nfc-bus-strip">
          <DataPoint label="COD" value={bus?.cod} />
          <DataPoint label="PPU" value={bus?.ppu} />
          <DataPoint label="Terminal" value={form.terminal || 'Seleccionar'} />
        </div>

        <div className="modal-grid nfc-status-grid">
          <div className="modal-wide-field nfc-problem-picker">
            <span>Marcar problema</span>
            <div className="problem-picker-grid">
              {PROBLEM_COLUMNS.map((column) => (
                <button
                  key={column.field}
                  className={`problem-toggle modal-problem-toggle ${String(form[column.field] ?? '').toUpperCase() === 'X' ? 'problem-toggle-active' : ''}`}
                  type="button"
                  onClick={() => setProblem(column.field)}
                >
                  {String(form[column.field] ?? '').toUpperCase() === 'X' ? 'X' : ''}
                  <small>{column.label}</small>
                </button>
              ))}
            </div>
          </div>
          {showDetails ? (
            <>
              <TextArea label="Detalle Panne" value={form.detalle_panne} onChange={(value) => updateField('detalle_panne', value)} />
              <TextArea label="Observaciones" value={form.observaciones} onChange={(value) => updateField('observaciones', value)} />
            </>
          ) : null}
        </div>

        {error ? <p className="modal-error">{error}</p> : null}

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
            Marcar operativo rapido
          </button>
          <button className="primary-button" type="button" onClick={() => onSave(payload)} disabled={!canSave || saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </section>
    </div>
  );
}

function buildInitialForm(terminal) {
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
      <strong>{value || '-'}</strong>
    </div>
  );
}

function TextArea({ label, value, onChange }) {
  return (
    <label className="field modal-wide-field">
      <span>{label}</span>
      <textarea value={value} rows={3} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
