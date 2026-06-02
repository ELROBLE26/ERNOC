import { useEffect, useRef, useState } from 'react';
import { ScanLine, PlusCircle } from 'lucide-react';
import { CREATE_DEFAULTS } from '../utils/fleet';

export function NewBusForm({
  visible,
  onSubmit,
  busy = false,
  capturedNfcUid = '',
  nfcScanArmed = false,
  onArmNfcScan,
  onClearCapturedNfc,
}) {
  const nfcInputRef = useRef(null);
  const [form, setForm] = useState({
    cod: '',
    ppu: '',
    nfc_uid: '',
    numero: '',
    modelo: '',
    asignacion: '',
    ...CREATE_DEFAULTS,
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!capturedNfcUid) return;
    setForm((current) => ({ ...current, nfc_uid: capturedNfcUid }));
    setMessage('Código NFC capturado desde la tarjeta.');
    onClearCapturedNfc?.();
  }, [capturedNfcUid, onClearCapturedNfc]);

  if (!visible) return null;

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    const result = await onSubmit(form);

    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    setForm({
      cod: '',
      ppu: '',
      nfc_uid: '',
      numero: '',
      modelo: '',
      asignacion: '',
      ...CREATE_DEFAULTS,
      terminal: form.terminal,
      zona: form.zona,
      ubicacion: form.ubicacion,
      tipo: form.tipo,
    });
    setMessage('');
  };

  return (
    <section className="panel">
      <div className="panel-header">
        <div className="panel-title-row">
          <PlusCircle size={14} style={{ color: 'var(--gray-600)' }} aria-hidden="true" />
          <div>
            <h2>Nuevo bus</h2>
            <p className="panel-subtitle">Crea registros directamente en Supabase.</p>
          </div>
        </div>
      </div>

      <form className="create-grid" onSubmit={handleSubmit}>
        <FormField
          id="new-bus-cod"
          label="Código bus"
          value={form.cod}
          onChange={(value) => handleChange('cod', value)}
          required
        />
        <FormField
          id="new-bus-ppu"
          label="PPU"
          value={form.ppu}
          onChange={(value) => handleChange('ppu', value)}
          required
        />
        <label className={`field nfc-code-field ${nfcScanArmed ? 'nfc-code-field-active' : ''}`}>
          <span>Código NFC tarjeta</span>
          <div className="nfc-code-control">
            <input
              id="new-bus-nfc"
              ref={nfcInputRef}
              value={form.nfc_uid}
              readOnly
              placeholder={nfcScanArmed ? 'Acerque la tarjeta…' : 'Click para escanear'}
              onFocus={() => onArmNfcScan?.()}
              onClick={() => onArmNfcScan?.()}
            />
            <button
              className="secondary-button nfc-scan-button"
              type="button"
              onClick={() => {
                onArmNfcScan?.();
                nfcInputRef.current?.focus();
              }}
              disabled={busy}
              title="Escanear tarjeta NFC"
              aria-label="Escanear tarjeta NFC"
            >
              <ScanLine size={13} aria-hidden="true" />
              <span>Escanear</span>
            </button>
          </div>
          <small>
            {nfcScanArmed
              ? 'Lectura armada: escanee una tarjeta.'
              : 'Se completa automáticamente con el UID del lector.'}
          </small>
        </label>
        <FormField
          id="new-bus-numero"
          label="N° interno"
          type="number"
          value={form.numero}
          onChange={(value) => handleChange('numero', value)}
        />
        <FormField
          id="new-bus-modelo"
          label="Modelo"
          value={form.modelo}
          onChange={(value) => handleChange('modelo', value)}
        />
        <FormField
          id="new-bus-asignacion"
          label="Asignación"
          value={form.asignacion}
          onChange={(value) => handleChange('asignacion', value)}
        />
        <SelectField
          id="new-bus-tipo"
          label="Tipo"
          value={form.tipo}
          onChange={(value) => handleChange('tipo', value)}
          options={['RIGIDO', 'ARTICULADO']}
        />
        <SelectField
          id="new-bus-terminal"
          label="Terminal"
          value={form.terminal}
          onChange={(value) => handleChange('terminal', value)}
          options={['El Roble', 'La Reina']}
        />
        <FormField
          id="new-bus-zona"
          label="Zona"
          value={form.zona}
          onChange={(value) => handleChange('zona', value)}
        />
        <FormField
          id="new-bus-ubicacion"
          label="Ubicación"
          value={form.ubicacion}
          onChange={(value) => handleChange('ubicacion', value)}
        />
        <div className="create-submit">
          <button className="primary-button" type="submit" disabled={busy} id="btn-create-bus">
            <PlusCircle size={13} />
            {busy ? 'Guardando…' : 'Crear registro'}
          </button>
        </div>
      </form>

      {message ? (
        <p
          className="inline-error"
          style={message.includes('capturado') ? { color: 'var(--success-600)', marginTop: 8 } : { marginTop: 8 }}
        >
          {message}
        </p>
      ) : null}
    </section>
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
