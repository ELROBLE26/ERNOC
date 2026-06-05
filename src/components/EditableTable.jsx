import {
  buildExclusiveProblemPatch,
  getStatusTone,
  hasProblemX,
} from '../utils/fleet';
import { InlineField, SaveIndicator } from './InlineField';
import { Table2, PlusSquare, Fuel } from 'lucide-react';

const PROBLEM_COLUMNS = [
  { field: 'oper',    label: 'OPER' },
  { field: 'vidrio',  label: 'VID' },
  { field: 'mant',    label: 'MANT' },
  { field: 'calidad', label: 'CALI' },
  { field: 'adq',     label: 'ADQ' },
  { field: 'aft',     label: 'AFT' },
  { field: 'sinies',  label: 'SIN' },
];

export function EditableTable({
  rows,
  fuelRecords = [],
  selectedRowId,
  highlightedRowId,
  rowStatuses,
  onSelectRow,
  onSaveCell,
  onOpenConfiguration,
}) {
  const hasRows = rows.length > 0;

  return (
    <section className="panel table-panel">
      <div className="table-panel-header">
        <div className="panel-title-row">
          <Table2 size={14} style={{ color: 'var(--gray-600)' }} aria-hidden="true" />
          <div>
            <h2>Tabla operativa</h2>
            <p>
              {hasRows
                ? `${rows.length} buses visibles · edición directa en celda`
                : 'Sin buses visibles con los filtros actuales.'}
            </p>
          </div>
        </div>
      </div>

      <div className="table-scroll">
        <table className="fleet-table" id="fleet-table">
          <thead>
            <tr>
              <th className="sticky-col sticky-num">N°</th>
              <th className="sticky-col sticky-cod">COD</th>
              <th className="sticky-col sticky-ppu">PPU</th>
              <th className="zone-cell">ZONA</th>
              <th className="service-cell">SERVICIO</th>
              {PROBLEM_COLUMNS.map((column) => (
                <th className="problem-header" key={column.field} title={column.field.toUpperCase()}>
                  {column.label}
                </th>
              ))}
              <th>Detalle Panne</th>
              <th>Observaciones</th>
              <th>Ubicación</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {hasRows
              ? rows.map((row, index) => {
                  const isSelected = row.id === selectedRowId;
                  const hasProblem = hasProblemX(row);
                  const hasFuel = fuelRecords.some(
                    (f) =>
                      (f.ppu && row.ppu && f.ppu === row.ppu) ||
                      (f.cod && row.cod && f.cod === row.cod) ||
                      (f.interno && row.cod && f.interno === row.cod)
                  );

                  return (
                    <tr
                      key={row.id}
                      className={`${isSelected ? 'row-selected' : ''} ${hasProblem ? 'row-problem' : ''} ${row.id === highlightedRowId ? 'row-highlighted' : ''}`}
                      onClick={() => onSelectRow(row.id)}
                    >
                      <td className="sticky-col sticky-num">
                        <div className="number-cell">{row.numero ?? index + 1}</div>
                        <div className="terminal-tag">{row.terminal}</div>
                      </td>
                      <td className="sticky-col sticky-cod emphasis-cell">
                        <ReadOnlyCell value={row.cod} strong />
                      </td>
                      <td className="sticky-col sticky-ppu emphasis-cell">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <ReadOnlyCell value={row.ppu} strong />
                          <Fuel 
                            size={14} 
                            style={{ 
                              color: hasFuel ? 'var(--success-500)' : 'var(--danger-500)',
                              flexShrink: 0 
                            }} 
                            title={hasFuel ? 'Con carga de combustible' : 'Sin carga de combustible'}
                          />
                        </div>
                      </td>
                      <td className="zone-cell">
                        <ReadOnlyCell value={row.zona} />
                      </td>
                      <td className="service-cell">
                        <InlineField
                          value={row.servicio}
                          onSave={(value) => onSaveCell(row.id, { servicio: value })}
                        />
                      </td>
                      {PROBLEM_COLUMNS.map((column) => (
                        <td className="problem-cell" key={column.field}>
                          <ProblemToggle
                            active={String(row[column.field] ?? '').toUpperCase() === 'X'}
                            label={column.label}
                            onToggle={() =>
                              onSaveCell(
                                row.id,
                                String(row[column.field] ?? '').toUpperCase() === 'X'
                                  ? buildExclusiveProblemPatch('')
                                  : buildExclusiveProblemPatch(column.field),
                              )
                            }
                          />
                        </td>
                      ))}
                      <td className="wide-cell">
                        <InlineField
                          value={row.detalle_panne}
                          multiline
                          placeholder="Detalle de panne"
                          onSave={(value) => onSaveCell(row.id, { detalle_panne: value })}
                        />
                      </td>
                      <td className="wide-cell">
                        <InlineField
                          value={row.observaciones}
                          multiline
                          placeholder="Observaciones"
                          onSave={(value) => onSaveCell(row.id, { observaciones: value })}
                        />
                      </td>
                      <td>
                        <InlineField
                          value={row.ubicacion}
                          onSave={(value) => onSaveCell(row.id, { ubicacion: value })}
                        />
                      </td>
                      <td>
                        <div className={`status-badge tone-${getStatusTone(row.estado)}`}>
                          {row.estado || 'PENDIENTE'}
                        </div>
                        <SaveIndicator state={rowStatuses[row.id]} />
                      </td>
                    </tr>
                  );
                })
              : (
                <tr>
                  <td className="empty-table-cell" colSpan={16}>
                    <div className="table-empty-state">
                      <div className="empty-icon">
                        <PlusSquare size={22} />
                      </div>
                      <strong>No hay buses para mostrar</strong>
                      <span>
                        Agrega buses en Configuración o ajusta los filtros para recuperar la vista operativa.
                      </span>
                      <button className="primary-button" type="button" onClick={onOpenConfiguration} id="btn-goto-config">
                        Ir a Configuración
                      </button>
                    </div>
                  </td>
                </tr>
              )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ReadOnlyCell({ value, strong = false }) {
  return (
    <div className={`read-only-cell ${strong ? 'read-only-strong' : ''}`}>
      {value || '—'}
    </div>
  );
}

function ProblemToggle({ active, label, onToggle }) {
  return (
    <button
      className={`problem-toggle ${active ? 'problem-toggle-active' : ''}`}
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      title={active ? `Quitar problema ${label}` : `Marcar problema ${label}`}
      aria-label={active ? `Quitar problema ${label}` : `Marcar problema ${label}`}
      aria-pressed={active}
    >
      {active ? label : '—'}
    </button>
  );
}
