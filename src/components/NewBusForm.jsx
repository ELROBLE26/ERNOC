import { useEffect, useRef, useState } from 'react';
import { ScanLine } from 'lucide-react';
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
    if (!capturedNfcUid) {
      return;
    }

    setForm((current) => ({
      ...current,
      nfc_uid: capturedNfcUid,
    }));
    setMessage('Codigo NFC capturado desde la tarjeta.');
    onClearCapturedNfc?.();
  }, [capturedNfcUid, onClearCapturedNfc]);

  if (!visible) {
    return null;
  }

  const handleChange = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
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
  };

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Nuevo bus</h2>
          <p>Crea registros directamente en Supabase.</p>
        </div>
      </div>

      <form className="create-grid" onSubmit={handleSubmit}>
        <FormField label="Codigo bus" value={form.cod} onChange={(value) => handleChange('cod', value)} required />
        <FormField label="PPU" value={form.ppu} onChange={(value) => handleChange('ppu', value)} required />
        <label className={`field nfc-code-field ${nfcScanArmed ? 'nfc-code-field-active' : ''}`}>
          <span>Codigo NFC tarjeta</span>
          <div className="nfc-code-control">
            <input
              ref={nfcInputRef}
              value={form.nfc_uid}
              readOnly
              placeholder={nfcScanArmed ? 'Acerque la tarjeta al lector...' : 'Click para escanear'}
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
              <ScanLine size={15} aria-hidden="true" />
              <span>Escanear</span>
            </button>
          </div>
          <small>
            {nfcScanArmed ? 'Lectura armada: escanee una tarjeta.' : 'Se completa automaticamente con el UID real del lector.'}
          </small>
        </label>
        <FormField
          label="Numero interno"
          type="number"
          value={form.numero}
          onChange={(value) => handleChange('numero', value)}
        />
        <FormField label="Modelo" value={form.modelo} onChange={(value) => handleChange('modelo', value)} />
        <FormField label="Asignacion" value={form.asignacion} onChange={(value) => handleChange('asignacion', value)} />
        <SelectField
          label="Tipo"
          value={form.tipo}
          onChange={(value) => handleChange('tipo', value)}
          options={['RIGIDO', 'ARTICULADO']}
        />
        <SelectField
          label="Terminal"
          value={form.terminal}
          onChange={(value) => handleChange('terminal', value)}
          options={['El Roble', 'La Reina']}
        />
        <FormField label="Zona" value={form.zona} onChange={(value) => handleChange('zona', value)} />
        <FormField label="Ubicación" value={form.ubicacion} onChange={(value) => handleChange('ubicacion', value)} />
        <div className="create-submit">
          <button className="primary-button" type="submit" disabled={busy}>
            {busy ? 'Guardando…' : 'Crear registro'}
          </button>
        </div>
      </form>

      {message ? <p className="inline-error">{message}</p> : null}
    </section>
  );
}

function FormField({ label, value, onChange, required = false, type = 'text' }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} />
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
