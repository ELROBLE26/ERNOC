import {
  ADQ_OPTIONS,
  AFT_OPTIONS,
  CALIDAD_OPTIONS,
  ESTADO_OPTIONS,
  MANT_OPTIONS,
  OPER_OPTIONS,
  SINIES_OPTIONS,
  VIDRIO_OPTIONS,
  getStatusTone,
} from '../utils/fleet';
import { InlineField, SaveIndicator } from './InlineField';

export function EditableTable({
  rows,
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
      <div className="panel-header">
        <div>
          <h2>Tabla operativa</h2>
          <p>{hasRows ? `${rows.length} buses visibles para edicion directa.` : 'Sin buses visibles con los filtros actuales.'}</p>
        </div>
      </div>

      <div className="table-scroll">
        <table className="fleet-table">
          <thead>
            <tr>
              <th className="sticky-col sticky-num">Nº</th>
              <th className="sticky-col sticky-cod">COD</th>
              <th className="sticky-col sticky-ppu">PPU</th>
              <th>ZONA</th>
              <th>SERVICIO</th>
              <th>OPER</th>
              <th>VIDRIO</th>
              <th>MANT</th>
              <th>CALIDAD</th>
              <th>ADQ</th>
              <th>AFT</th>
              <th>SINIES</th>
              <th>Detalle Panne</th>
              <th>Observaciones</th>
              <th>UBICACIÓN</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {hasRows ? rows.map((row, index) => {
              const isSelected = row.id === selectedRowId;

              return (
                <tr
                  key={row.id}
                  className={`${isSelected ? 'row-selected' : ''} ${row.id === highlightedRowId ? 'row-highlighted' : ''}`}
                  onClick={() => onSelectRow(row.id)}
                >
                  <td className="sticky-col sticky-num">
                    <div className="number-cell">{row.numero ?? index + 1}</div>
                    <div className="terminal-tag">{row.terminal}</div>
                  </td>
                  <td className="sticky-col sticky-cod emphasis-cell">
                    <InlineField value={row.cod} onSave={(value) => onSaveCell(row.id, { cod: value })} />
                  </td>
                  <td className="sticky-col sticky-ppu emphasis-cell">
                    <InlineField value={row.ppu} onSave={(value) => onSaveCell(row.id, { ppu: value })} />
                  </td>
                  <td>
                    <InlineField value={row.zona} onSave={(value) => onSaveCell(row.id, { zona: value })} />
                  </td>
                  <td>
                    <InlineField value={row.servicio} onSave={(value) => onSaveCell(row.id, { servicio: value })} />
                  </td>
                  <td>
                    <InlineField
                      type="select"
                      value={row.oper}
                      options={OPER_OPTIONS.slice(1)}
                      onSave={(value) => onSaveCell(row.id, { oper: value })}
                    />
                  </td>
                  <td>
                    <InlineField
                      type="select"
                      value={row.vidrio}
                      options={VIDRIO_OPTIONS}
                      onSave={(value) => onSaveCell(row.id, { vidrio: value })}
                    />
                  </td>
                  <td>
                    <InlineField
                      type="select"
                      value={row.mant}
                      options={MANT_OPTIONS}
                      onSave={(value) => onSaveCell(row.id, { mant: value })}
                    />
                  </td>
                  <td>
                    <InlineField
                      type="select"
                      value={row.calidad}
                      options={CALIDAD_OPTIONS}
                      onSave={(value) => onSaveCell(row.id, { calidad: value })}
                    />
                  </td>
                  <td>
                    <InlineField
                      type="select"
                      value={row.adq}
                      options={ADQ_OPTIONS}
                      onSave={(value) => onSaveCell(row.id, { adq: value })}
                    />
                  </td>
                  <td>
                    <InlineField
                      type="select"
                      value={row.aft}
                      options={AFT_OPTIONS}
                      onSave={(value) => onSaveCell(row.id, { aft: value })}
                    />
                  </td>
                  <td>
                    <InlineField
                      type="select"
                      value={row.sinies}
                      options={SINIES_OPTIONS}
                      onSave={(value) => onSaveCell(row.id, { sinies: value })}
                    />
                  </td>
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
                    <InlineField value={row.ubicacion} onSave={(value) => onSaveCell(row.id, { ubicacion: value })} />
                  </td>
                  <td>
                    <div className={`status-badge tone-${getStatusTone(row.estado)}`}>{row.estado || 'PENDIENTE'}</div>
                    <InlineField
                      type="select"
                      value={row.estado}
                      options={ESTADO_OPTIONS}
                      onSave={(value) => onSaveCell(row.id, { estado: value })}
                    />
                    <SaveIndicator state={rowStatuses[row.id]} />
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td className="empty-table-cell" colSpan={16}>
                  <div className="table-empty-state">
                    <strong>No hay buses para mostrar</strong>
                    <span>Agrega buses en Configuracion o ajusta los filtros activos para recuperar la vista operativa.</span>
                    <button className="primary-button" type="button" onClick={onOpenConfiguration}>
                      Ir a Configuracion
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
