import { RefreshCw, SlidersHorizontal, X } from 'lucide-react';

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
  const activeCount = [
    filters.terminal !== 'Todos',
    filters.zona !== 'Todos',
    filters.servicio !== 'Todos',
    filters.estado !== 'Todos',
    filters.operatividad !== 'Todos',
    Boolean(filters.search?.trim()),
  ].filter(Boolean).length;

  return (
    <section className="panel filters-panel">
      <div className="panel-header">
        <div className="panel-title-row">
          <SlidersHorizontal size={14} style={{ color: 'var(--gray-600)' }} aria-hidden="true" />
          <div>
            <h2>Filtros</h2>
            <p className="panel-subtitle">Terminal, estado, zona, servicio y búsqueda libre.</p>
          </div>
        </div>
        <div className="panel-actions filters-actions">
          <button className="ghost-button" type="button" onClick={onReset} title="Limpiar filtros" id="btn-reset-filters">
            <X size={13} />
            Limpiar
            {activeCount > 0 && <span className="active-filters-badge">{activeCount}</span>}
          </button>
          <button className="secondary-button" type="button" onClick={onRefresh} id="btn-refresh-data">
            <RefreshCw size={12} />
            Actualizar
          </button>
        </div>
      </div>

      <div className="filters-grid">
        <SelectField
          label="Terminal"
          id="filter-terminal"
          value={filters.terminal}
          onChange={(value) => onChange('terminal', value)}
          options={['Todos', 'El Roble', 'La Reina']}
        />
        <SelectField
          label="Zona"
          id="filter-zona"
          value={filters.zona}
          onChange={(value) => onChange('zona', value)}
          options={zoneOptions}
        />
        <SelectField
          label="Servicio"
          id="filter-servicio"
          value={filters.servicio}
          onChange={(value) => onChange('servicio', value)}
          options={serviceOptions}
        />
        <SelectField
          label="Estado"
          id="filter-estado"
          value={filters.estado}
          onChange={(value) => onChange('estado', value)}
          options={estadoOptions}
        />
        <SelectField
          label="Operatividad"
          id="filter-operatividad"
          value={filters.operatividad}
          onChange={(value) => onChange('operatividad', value)}
          options={operOptions}
        />
        <label className="field">
          <span>Búsqueda rápida</span>
          <div className="filter-search-icon">
            <input
              id="filter-search"
              value={filters.search}
              onChange={(event) => onChange('search', event.target.value)}
              placeholder="COD, PPU o texto…"
            />
          </div>
        </label>
      </div>
    </section>
  );
}

function SelectField({ label, id, value, onChange, options }) {
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
