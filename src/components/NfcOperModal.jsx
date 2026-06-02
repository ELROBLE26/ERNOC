import { useEffect, useMemo, useState } from 'react';
import {
  ADQ_OPTIONS,
  AFT_OPTIONS,
  CALIDAD_OPTIONS,
  ESTADO_OPTIONS,
  MANT_OPTIONS,
  SINIES_OPTIONS,
  VIDRIO_OPTIONS,
} from '../utils/fleet';

const OPER_VALUES = ['OK', 'NO', 'PENDIENTE'];
const TERMINALS = ['El Roble', 'La Reina'];

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
  const needsTerminal = terminalFilter === 'Todos';
  const defaultTerminal = needsTerminal ? '' : terminalFilter;
  const [form, setForm] = useState(() => buildInitialForm(defaultTerminal));

  useEffect(() => {
    if (open) {
      setForm(buildInitialForm(defaultTerminal));
    }
  }, [defaultTerminal, open, nfcUid]);

  const showDetails = form.estado !== 'OPERATIVO';
  const canSave = Boolean(form.terminal && bus?.cod && bus?.ppu);

  const payload = useMemo(() => {
    if (form.estado === 'OPERATIVO') {
      return {
        ...buildInitialForm(form.terminal),
        terminal: form.terminal,
      };
    }

    return form;
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

      if (event.key === 'Enter' && form.estado === 'OPERATIVO') {
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
      ...(field === 'terminal' && !current.ubicacion ? { ubicacion: value } : {}),
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

        <div className="modal-grid">
          {needsTerminal ? (
            <SelectField
              label="Terminal obligatorio"
              value={form.terminal}
              onChange={(value) => updateField('terminal', value)}
              options={['', ...TERMINALS]}
            />
          ) : null}
          <SelectField
            label="Estado"
            value={form.estado}
            onChange={(value) => updateField('estado', value)}
            options={ESTADO_OPTIONS.filter((option) => option !== 'PENDIENTE')}
          />
          {showDetails ? (
            <>
              <SelectField label="OPER" value={form.oper} onChange={(value) => updateField('oper', value)} options={OPER_VALUES} />
              <SelectField label="VIDRIO" value={form.vidrio} onChange={(value) => updateField('vidrio', value)} options={VIDRIO_OPTIONS} />
              <SelectField label="MANT" value={form.mant} onChange={(value) => updateField('mant', value)} options={MANT_OPTIONS} />
              <SelectField label="CALIDAD" value={form.calidad} onChange={(value) => updateField('calidad', value)} options={CALIDAD_OPTIONS} />
              <SelectField label="ADQ" value={form.adq} onChange={(value) => updateField('adq', value)} options={ADQ_OPTIONS} />
              <SelectField label="AFT" value={form.aft} onChange={(value) => updateField('aft', value)} options={AFT_OPTIONS} />
              <SelectField label="SINIES" value={form.sinies} onChange={(value) => updateField('sinies', value)} options={SINIES_OPTIONS} />
              <TextField label="Ubicacion" value={form.ubicacion} onChange={(value) => updateField('ubicacion', value)} />
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
    oper: 'OK',
    vidrio: 'OK',
    mant: 'OK',
    calidad: 'OK',
    adq: 'OK',
    aft: 'OK',
    sinies: 'NO',
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

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option || 'empty'} value={option}>
            {option || 'Seleccionar'}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextField({ label, value, onChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
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

