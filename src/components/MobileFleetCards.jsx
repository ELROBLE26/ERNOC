import { buildExclusiveProblemPatch, getStatusTone, hasProblemX } from '../utils/fleet';
import { InlineField, SaveIndicator } from './InlineField';
import { Fuel } from 'lucide-react';

const PROBLEM_COLUMNS = [
  { field: 'oper',    label: 'OPER' },
  { field: 'vidrio',  label: 'VID' },
  { field: 'mant',    label: 'MANT' },
  { field: 'calidad', label: 'CALI' },
  { field: 'adq',     label: 'ADQ' },
  { field: 'aft',     label: 'AFT' },
  { field: 'sinies',  label: 'SIN' },
];

export function MobileFleetCards({
  rows,
  fuelRecords = [],
  selectedRowId,
  highlightedRowId,
  rowStatuses,
  onSelectRow,
  onSaveCell,
  onOpenConfiguration,
}) {
  if (!rows.length) {
    return (
      <section className="mobile-cards">
        <article className="mobile-card">
          <div className="mobile-card-body">
            <div className="table-empty-state">
              <strong>No hay buses para mostrar</strong>
              <span>Agrega buses en Configuración o ajusta los filtros activos.</span>
              <button className="primary-button" type="button" onClick={onOpenConfiguration}>
                Ir a Configuración
              </button>
            </div>
          </div>
        </article>
      </section>
    );
  }

  return (
    <section className="mobile-cards">
      {rows.map((row, index) => {
        const isSelected = row.id === selectedRowId;
        const hasProblem = hasProblemX(row);
        const hasFuel = fuelRecords.some((f) => {
          const clean = (s) => (s || '').toString().trim().toLowerCase();
          const rPpu = clean(row.ppu);
          const rCod = clean(row.cod);
          return (
            (f.ppu && rPpu && clean(f.ppu) === rPpu) ||
            (f.cod && rCod && clean(f.cod) === rCod) ||
            (f.interno && rCod && clean(f.interno) === rCod)
          );
        });

        return (
          <article
            key={row.id}
            className={`mobile-card ${isSelected ? 'mobile-card-selected' : ''} ${hasProblem ? 'mobile-card-problem' : ''} ${row.id === highlightedRowId ? 'mobile-card-highlighted' : ''}`}
            onClick={() => onSelectRow(row.id)}
          >
            <div className="mobile-card-top" />
            <div className="mobile-card-body">
              <div className="mobile-card-header">
                <div>
                  <span className="mobile-index">N° {row.numero ?? index + 1}</span>
                  <h3>{row.cod || 'Sin COD'}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 1 }}>
                    <p style={{ fontSize: '0.72rem', color: 'var(--gray-600)', margin: 0 }}>{row.ppu || 'Sin PPU'}</p>
                    <Fuel 
                      size={12} 
                      style={{ 
                        color: hasFuel ? 'var(--success-600)' : 'var(--danger-600)',
                        flexShrink: 0
                      }} 
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <div className={`status-badge tone-${getStatusTone(row.estado)}`}>
                    {row.estado || 'PENDIENTE'}
                  </div>
                  {hasProblem && (
                    <button
                      type="button"
                      className="secondary-button"
                      style={{ padding: '2px 6px', fontSize: '10px', height: 'auto', minHeight: 'auto' }}
                      title="Marcar como Operativo"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('¿Desea reparar la falla y dejar el bus PENDIENTE?')) {
                          onSaveCell(row.id, {
                            estado: 'PENDIENTE',
                            oper: '',
                            vidrio: '',
                            mant: '',
                            calidad: '',
                            adq: '',
                            aft: '',
                            sinies: ''
                          });
                        }
                      }}
                    >
                      Reparar
                    </button>
                  )}
                </div>
              </div>

              <div className="mobile-card-grid">
                <FieldLabel label="Terminal" value={row.terminal} />
                <FieldLabel label="Zona"     value={row.zona} />
                <FieldLabel label="Servicio" value={row.servicio} />
                <FieldLabel label="Ubicación" value={row.ubicacion} />
              </div>

              <div className="mobile-problem-grid">
                {PROBLEM_COLUMNS.map((column) => {
                  const active = String(row[column.field] ?? '').toUpperCase() === 'X';
                  return (
                    <button
                      key={column.field}
                      className={`mobile-problem-toggle ${active ? 'problem-toggle-active' : ''}`}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSaveCell(
                          row.id,
                          active
                            ? buildExclusiveProblemPatch('')
                            : buildExclusiveProblemPatch(column.field),
                        );
                      }}
                      aria-pressed={active}
                    >
                      <span>{column.label}</span>
                      <strong>{active ? '✓' : '—'}</strong>
                    </button>
                  );
                })}
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
            </div>
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
