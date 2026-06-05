import { useEffect, useState } from 'react';
import { BusFront, X, PlusCircle } from 'lucide-react';
import { CREATE_DEFAULTS } from '../utils/fleet';

export function NfcRegisterModal({
  open,
  nfcUid,
  terminalFilter,
  saving,
  error,
  onCreate,
  onCancel,
}) {
  const [form, setForm] = useState({
    cod: nfcUid || '',
    ppu: '',
    numero: '',
    modelo: '',
    asignacion: '',
    ...CREATE_DEFAULTS,
  });

  useEffect(() => {
    if (open) {
      setForm({
        cod: nfcUid || '',
        ppu: '',
        numero: '',
        modelo: '',
        asignacion: '',
        ...CREATE_DEFAULTS,
        terminal: terminalFilter === 'Todos' ? 'El Roble' : terminalFilter || 'El Roble',
      });
    }
  }, [open, terminalFilter, nfcUid]);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, open]);

  if (!open) return null;

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate({ ...form, nfc_uid: nfcUid });
  };

  const canSave = Boolean(form.cod && form.ppu);

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="modal-card nfc-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nfc-register-title"
        style={{ maxWidth: 500 }}
      >
        <div className="modal-accent-bar" style={{ background: 'linear-gradient(90deg, var(--success-600), #10b981)' }} />
        <div className="modal-content">
          <div className="modal-header">
            <div>
              <h2 id="nfc-register-title">Registrar Nuevo Bus</h2>
              <p>
                UID NFC:{' '}
                <strong style={{ fontFamily: 'monospace', color: 'var(--navy-700)', padding: '2px 6px', background: '#f1f5f9', borderRadius: 4 }}>
                  {nfcUid}
                </strong>
                <br/>
                Complete los datos para guardar y asociar el bus.
              </p>
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

          <form className="create-grid" style={{ marginTop: 20 }} onSubmit={handleSubmit}>
            <FormField
              id="reg-bus-cod"
              label="Código bus"
              value={form.cod}
              onChange={(value) => handleChange('cod', value)}
              required
            />
            <FormField
              id="reg-bus-ppu"
              label="PPU"
              value={form.ppu}
              onChange={(value) => handleChange('ppu', value)}
              required
            />
            <FormField
              id="reg-bus-numero"
              label="N° interno"
              type="number"
              value={form.numero}
              onChange={(value) => handleChange('numero', value)}
            />
            <FormField
              id="reg-bus-modelo"
              label="Modelo"
              value={form.modelo}
              onChange={(value) => handleChange('modelo', value)}
            />
            <FormField
              id="reg-bus-asignacion"
              label="Asignación"
              value={form.asignacion}
              onChange={(value) => handleChange('asignacion', value)}
            />
            <SelectField
              id="reg-bus-tipo"
              label="Tipo"
              value={form.tipo}
              onChange={(value) => handleChange('tipo', value)}
              options={['RIGIDO', 'ARTICULADO']}
            />
            <SelectField
              id="reg-bus-terminal"
              label="Terminal"
              value={form.terminal}
              onChange={(value) => handleChange('terminal', value)}
              options={['El Roble', 'La Reina']}
            />
            <FormField
              id="reg-bus-zona"
              label="Zona"
              value={form.zona}
              onChange={(value) => handleChange('zona', value)}
            />
            <FormField
              id="reg-bus-ubicacion"
              label="Ubicación"
              value={form.ubicacion}
              onChange={(value) => handleChange('ubicacion', value)}
            />
            
            {error ? <p className="modal-error" style={{ gridColumn: '1 / -1' }}>⚠ {error}</p> : null}

            <div className="modal-actions" style={{ gridColumn: '1 / -1', marginTop: 16 }}>
              <button className="secondary-button" type="button" onClick={onCancel}>
                Cancelar
              </button>
              <button
                className="primary-button"
                type="submit"
                disabled={!canSave || saving}
              >
                {saving ? 'Guardando...' : 'Crear y Asociar Bus'}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}

function FormField({ id, label, value, onChange, required = false, type = 'text' }) {
  return (
    <label className="field" htmlFor={id}>
      <span>{label}{required && <span style={{ color: 'var(--danger-600)', marginLeft: 2 }}>*</span>}</span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
      />
    </label>
  );
}

function SelectField({ id, label, value, onChange, options }) {
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
