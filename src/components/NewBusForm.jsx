import { useState } from 'react';
import { CREATE_DEFAULTS } from '../utils/fleet';

export function NewBusForm({ visible, onSubmit, busy = false }) {
  const [form, setForm] = useState({
    cod: '',
    ppu: '',
    numero: '',
    modelo: '',
    asignacion: '',
    ...CREATE_DEFAULTS,
  });
  const [message, setMessage] = useState('');

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
        <FormField label="Codigo" value={form.cod} onChange={(value) => handleChange('cod', value)} required />
        <FormField label="PPU" value={form.ppu} onChange={(value) => handleChange('ppu', value)} required />
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
        <SelectField
          label="Estado"
          value={form.estado}
          onChange={(value) => handleChange('estado', value)}
          options={['OPERATIVO', 'NO OPERATIVO', 'EN PANNE', 'EN MANTENCIÓN', 'OBSERVADO', 'PENDIENTE']}
        />
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
