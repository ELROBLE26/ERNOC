export function FiltersBar({
  filters,
  onChange,
  onReset,
  onRefresh,
  zoneOptions,
  serviceOptions,
  estadoOptions,
  operOptions,
}) {
  return (
    <section className="panel filters-panel">
      <div className="panel-header">
        <div>
          <h2>Filtros</h2>
          <p>Control rapido por terminal, estado, zona, servicio y texto.</p>
        </div>
        <div className="panel-actions filters-actions">
          <button className="secondary-button" type="button" onClick={onReset}>
            Limpiar filtros
          </button>
          <button className="secondary-button" type="button" onClick={onRefresh}>
            Actualizar datos
          </button>
        </div>
      </div>

      <div className="filters-grid">
        <SelectField
          label="Terminal"
          value={filters.terminal}
          onChange={(value) => onChange('terminal', value)}
          options={['Todos', 'El Roble', 'La Reina']}
        />
        <SelectField
          label="Zona"
          value={filters.zona}
          onChange={(value) => onChange('zona', value)}
          options={zoneOptions}
        />
        <SelectField
          label="Servicio"
          value={filters.servicio}
          onChange={(value) => onChange('servicio', value)}
          options={serviceOptions}
        />
        <SelectField
          label="Estado"
          value={filters.estado}
          onChange={(value) => onChange('estado', value)}
          options={estadoOptions}
        />
        <SelectField
          label="Operatividad"
          value={filters.operatividad}
          onChange={(value) => onChange('operatividad', value)}
          options={operOptions}
        />
        <label className="field">
          <span>Búsqueda rápida</span>
          <input
            value={filters.search}
            onChange={(event) => onChange('search', event.target.value)}
            placeholder="COD, PPU o texto general"
          />
        </label>
      </div>
    </section>
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

