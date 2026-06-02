import { buildExclusiveProblemPatch, getStatusTone, hasProblemX } from '../utils/fleet';
import { InlineField, SaveIndicator } from './InlineField';

const PROBLEM_COLUMNS = [
  { field: 'oper', label: 'OPER' },
  { field: 'vidrio', label: 'VIDRIO' },
  { field: 'mant', label: 'MANT' },
  { field: 'calidad', label: 'CALIDAD' },
  { field: 'adq', label: 'ADQ' },
  { field: 'aft', label: 'AFT' },
  { field: 'sinies', label: 'SINIES' },
];

export function MobileFleetCards({ rows, selectedRowId, highlightedRowId, rowStatuses, onSelectRow, onSaveCell, onOpenConfiguration }) {
  if (!rows.length) {
    return (
      <section className="mobile-cards">
        <article className="mobile-card mobile-empty-state">
          <h3>No hay buses para mostrar</h3>
          <p>Agrega buses en Configuracion o ajusta los filtros activos.</p>
          <button className="primary-button" type="button" onClick={onOpenConfiguration}>
            Ir a Configuracion
          </button>
        </article>
      </section>
    );
  }

  return (
    <section className="mobile-cards">
      {rows.map((row, index) => {
        const isSelected = row.id === selectedRowId;

        return (
          <article
            key={row.id}
            className={`mobile-card ${isSelected ? 'mobile-card-selected' : ''} ${hasProblemX(row) ? 'mobile-card-problem' : ''} ${row.id === highlightedRowId ? 'mobile-card-highlighted' : ''}`}
            onClick={() => onSelectRow(row.id)}
          >
            <div className="mobile-card-header">
              <div>
                <span className="mobile-index">Nº {row.numero ?? index + 1}</span>
                <h3>{row.cod || 'Sin COD'}</h3>
                <p>{row.ppu || 'Sin PPU'}</p>
              </div>
              <div className={`status-badge tone-${getStatusTone(row.estado)}`}>{row.estado || 'PENDIENTE'}</div>
            </div>

            <div className="mobile-card-grid">
              <FieldLabel label="Terminal" value={row.terminal} />
              <FieldLabel label="Zona" value={row.zona} />
              <FieldLabel label="Servicio" value={row.servicio} />
              <FieldLabel label="Ubicación" value={row.ubicacion} />
            </div>

            <div className="mobile-problem-grid">
              {PROBLEM_COLUMNS.map((column) => (
                <button
                  key={column.field}
                  className={`problem-toggle mobile-problem-toggle ${String(row[column.field] ?? '').toUpperCase() === 'X' ? 'problem-toggle-active' : ''}`}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSaveCell(
                      row.id,
                      String(row[column.field] ?? '').toUpperCase() === 'X'
                        ? buildExclusiveProblemPatch('')
                        : buildExclusiveProblemPatch(column.field),
                    );
                  }}
                >
                  <span>{column.label}</span>
                  <strong>{String(row[column.field] ?? '').toUpperCase() === 'X' ? 'X' : ''}</strong>
                </button>
              ))}
            </div>

            <div className="mobile-edit-grid">
              <InlineField
                value={row.detalle_panne}
                multiline
                placeholder="Detalle de panne"
                onSave={(value) => onSaveCell(row.id, { detalle_panne: value })}
                className="mobile-inline mobile-textarea"
              />
              <InlineField
                value={row.observaciones}
                multiline
                placeholder="Observaciones"
                onSave={(value) => onSaveCell(row.id, { observaciones: value })}
                className="mobile-inline mobile-textarea"
              />
            </div>

            <SaveIndicator state={rowStatuses[row.id]} />
          </article>
        );
      })}
    </section>
  );
}

function FieldLabel({ label, value }) {
  return (
    <div className="field-label">
      <span>{label}</span>
      <strong>{value || '—'}</strong>
    </div>
  );
}
