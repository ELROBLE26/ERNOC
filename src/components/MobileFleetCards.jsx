import { ESTADO_OPTIONS, OPER_OPTIONS, getStatusTone } from '../utils/fleet';
import { InlineField, SaveIndicator } from './InlineField';

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
            className={`mobile-card ${isSelected ? 'mobile-card-selected' : ''} ${row.id === highlightedRowId ? 'mobile-card-highlighted' : ''}`}
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

            <div className="mobile-edit-grid">
              <InlineField
                value={row.cod}
                onSave={(value) => onSaveCell(row.id, { cod: value })}
                className="mobile-inline"
              />
              <InlineField
                value={row.ppu}
                onSave={(value) => onSaveCell(row.id, { ppu: value })}
                className="mobile-inline"
              />
              <InlineField
                type="select"
                value={row.oper}
                options={OPER_OPTIONS.slice(1)}
                onSave={(value) => onSaveCell(row.id, { oper: value })}
                className="mobile-inline"
              />
              <InlineField
                type="select"
                value={row.estado}
                options={ESTADO_OPTIONS}
                onSave={(value) => onSaveCell(row.id, { estado: value })}
                className="mobile-inline"
              />
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
