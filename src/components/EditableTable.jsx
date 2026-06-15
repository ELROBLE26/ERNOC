import { useState, useEffect } from 'react';
import {
  buildExclusiveProblemPatch,
  getStatusTone,
  hasProblemX,
} from '../utils/fleet';
import { InlineField, SaveIndicator } from './InlineField';
import { Table2, PlusSquare, Fuel, PlayCircle, StopCircle, ClipboardCheck } from 'lucide-react';

const WIZARD_SERVICES = [
  "T1302", "T1304", "T1304C", "T1314E", "T1315E", 
  "T1318", "T1322C", "T1344", "T1336", "T1391", "T1393", 
  "Operativo Libre", "Apoyo La Reina", "Apoyo Escuela Militar", 
  "Apoyo Colo Colo", "Apoyo Lo Barnechea", "Apoyo Lo Echevers", "Apoyo a Voy"
];

const UBICACIONES_INTERNAS = [
  "Isla 1", "Isla 2", "3 Marias", "Isla 3", "Isla 4", "Isla 5",
  "Frente a Taller", "Taller", "Vidrios", "Rodillos", "Bandejon"
];

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
  isOperativoMode,
  onSelectRow,
  onSaveCell,
  onOpenConfiguration,
}) {
  const [wizardActive, setWizardActive] = useState(false);
  const [wizardRowId, setWizardRowId] = useState(null);
  
  const copyPpu = (ppu) => {
    if (!ppu) return;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(ppu).catch(console.error);
    } else {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = ppu;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      } catch (err) {
        console.error('Error al copiar PPU', err);
      }
    }
  };

  const startWizard = () => {
    if (rows.length === 0) return;
    setWizardActive(true);
    const firstId = rows[0].id;
    setWizardRowId(firstId);
    copyPpu(rows[0].ppu);
    onSelectRow(firstId);
  };

  const stopWizard = () => {
    setWizardActive(false);
    setWizardRowId(null);
  };

  const advanceWizard = (currentIndex) => {
    if (currentIndex + 1 < rows.length) {
      const nextRow = rows[currentIndex + 1];
      setWizardRowId(nextRow.id);
      copyPpu(nextRow.ppu);
      onSelectRow(nextRow.id);
    } else {
      stopWizard();
      alert('Modo Rápido terminado. ¡Has completado toda la lista!');
    }
  };

  const handleWizardServiceChange = (row, index, val) => {
    if (wizardRowId !== row.id) return; // Evitar doble trigger (Enter + Blur)
    const patch = { servicio: String(val).toUpperCase() };
    if (val && val.toLowerCase() === 'operativo libre') {
      patch.estado = 'OPERATIVO';
    }
    onSaveCell(row.id, patch);
    if (val && val.toUpperCase().startsWith('T')) {
      advanceWizard(index);
    }
  };

  const hasRows = rows.length > 0;

  return (
    <section className="panel table-panel">
      <div className="table-panel-header">
        <div className="panel-title-row">
          <Table2 size={14} style={{ color: 'var(--gray-600)' }} aria-hidden="true" />
          <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2>Tabla operativa</h2>
              <p>
                {hasRows
                  ? `${rows.length} buses visibles · edición directa en celda`
                  : 'Sin buses visibles con los filtros actuales.'}
              </p>
            </div>
            {isOperativoMode && hasRows && (
              <div className="wizard-controls">
                {!wizardActive ? (
                  <button className="primary-button" onClick={startWizard}>
                    <PlayCircle size={16} /> Iniciar Modo Rápido
                  </button>
                ) : (
                  <button className="danger-button" onClick={stopWizard}>
                    <StopCircle size={16} /> Detener Modo Rápido
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="table-scroll">
        <table className="fleet-table" id="fleet-table">
          <thead>
            <tr>
              <th className="sticky-col sticky-num">N°</th>
              <th className="sticky-col sticky-ppu" style={{ minWidth: '90px', maxWidth: '90px', width: '90px' }}>PPU</th>
              <th className="zone-cell">ZONA</th>
              <th className="service-cell">SERVICIO</th>
              {PROBLEM_COLUMNS.map((column) => (
                <th className="problem-header" key={column.field} title={column.field.toUpperCase()}>
                  {column.label}
                </th>
              ))}
              <th style={{ minWidth: '100px', maxWidth: '100px', width: '100px', padding: '0 8px' }}>Detalle Panne</th>
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
                    <tr
                      key={row.id}
                      className={`${isSelected ? 'row-selected' : ''} ${hasProblem ? 'row-problem' : ''} ${row.id === highlightedRowId ? 'row-highlighted' : ''}`}
                      onClick={() => onSelectRow(row.id)}
                    >
                      <td className="sticky-col sticky-num">
                        <div className="number-cell">{row.numero ?? index + 1}</div>
                        <div className="terminal-tag">{row.terminal}</div>
                      </td>
                      <td className="sticky-col sticky-ppu emphasis-cell">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <ReadOnlyCell value={row.ppu} strong />
                          <Fuel 
                            size={14} 
                            style={{ 
                              color: hasFuel ? 'var(--success-600)' : 'var(--danger-600)',
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
                        {wizardActive && wizardRowId === row.id ? (
                          <>
                            <input
                              autoFocus
                              className="wizard-input"
                              list={`wizard-services-${row.id}`}
                              defaultValue={row.servicio || ''}
                              placeholder="Escribe o selecciona..."
                              onBlur={(e) => {
                                let val = e.target.value;
                                const typedVal = val.trim().toLowerCase();
                                if (typedVal) {
                                  const match = WIZARD_SERVICES.find(s => s.toLowerCase().startsWith(typedVal));
                                  if (match) val = match;
                                }
                                e.target.value = val;
                                handleWizardServiceChange(row, index, val);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === 'Tab') {
                                  e.preventDefault();
                                  let val = e.target.value;
                                  const typedVal = val.trim().toLowerCase();
                                  if (typedVal) {
                                    const match = WIZARD_SERVICES.find(s => s.toLowerCase().startsWith(typedVal));
                                    if (match) val = match;
                                  }
                                  e.target.value = val;
                                  handleWizardServiceChange(row, index, val);
                                }
                              }}
                            />
                            <datalist id={`wizard-services-${row.id}`}>
                              {WIZARD_SERVICES.map(s => <option key={s} value={s} />)}
                            </datalist>
                          </>
                        ) : (
                          <ServiceInput
                            row={row}
                            onSaveCell={onSaveCell}
                            wizardServices={WIZARD_SERVICES}
                          />
                        )}
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
                      <td style={{ minWidth: '100px', maxWidth: '100px', width: '100px' }}>
                        <InlineField
                          value={row.detalle_panne}
                          multiline
                          placeholder="Detalle de panne"
                          onSave={(value) => onSaveCell(row.id, { detalle_panne: String(value).toUpperCase() })}
                        />
                      </td>
                      <td className="wide-cell">
                        <InlineField
                          value={row.observaciones}
                          multiline
                          placeholder="Observaciones"
                          onSave={(value) => onSaveCell(row.id, { observaciones: String(value).toUpperCase() })}
                        />
                      </td>
                      <td>
                        {wizardActive && wizardRowId === row.id && row.servicio && !row.servicio.toUpperCase().startsWith('T') ? (
                          <input
                            autoFocus
                            className="wizard-input"
                            defaultValue={row.ubicacion || ''}
                            placeholder="Ubicación y Enter"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === 'Tab') {
                                e.preventDefault();
                                if (wizardRowId !== row.id) return;
                                onSaveCell(row.id, { ubicacion: String(e.target.value).toUpperCase() });
                                advanceWizard(index);
                              }
                            }}
                            onBlur={(e) => {
                              if (wizardRowId === row.id) {
                                onSaveCell(row.id, { ubicacion: String(e.target.value).toUpperCase() });
                              }
                            }}
                          />
                        ) : (
                          <InlineField
                            inputId={`ubicacion-${row.id}`}
                            value={row.ubicacion}
                            onSave={(value) => {
                              onSaveCell(row.id, { ubicacion: String(value).toUpperCase() });
                            }}
                          />
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                          <div className={`status-badge tone-${getStatusTone(row.estado)}`}>
                            {row.estado || 'PENDIENTE'}
                          </div>
                          {hasProblem && (
                            <button
                              type="button"
                              className="secondary-button"
                              style={{ padding: '2px 6px', fontSize: '10px', minHeight: '20px' }}
                              title="Marcar como Operativo"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm('¿Desea reparar la falla y dejar el bus OPERATIVO?')) {
                                  onSaveCell(row.id, {
                                    estado: 'OPERATIVO',
                                    oper: '',
                                    vidrio: '',
                                    mant: '',
                                    calidad: '',
                                    adq: '',
                                    aft: '',
                                    sinies: '',
                                    detalle_panne: '',
                                    observaciones: '',
                                    ubicacion: '',
                                    servicio: ''
                                  });
                                }
                              }}
                            >
                              Reparar
                            </button>
                          )}
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

function ServiceInput({ row, onSaveCell, wizardServices }) {
  const [val, setVal] = useState(row.servicio || '');
  
  useEffect(() => {
    setVal(row.servicio || '');
  }, [row.servicio]);
  
  return (
    <div className="inline-field">
      <input
        className="input-reset"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={(e) => {
          let finalVal = e.target.value;
          const typedVal = finalVal.trim().toLowerCase();
          
          if (typedVal === 'oper') {
            finalVal = 'OPERATIVO LIBRE';
          } else if (typedVal) {
            const match = wizardServices.find(s => s.toLowerCase().startsWith(typedVal));
            if (match) finalVal = match;
          }
          setVal(finalVal);
          
          if (finalVal !== (row.servicio || '') || finalVal.toLowerCase() === 'operativo libre') {
             const patch = { servicio: finalVal.toUpperCase() };
             if (finalVal.toLowerCase() === 'operativo libre') patch.estado = 'OPERATIVO';
             onSaveCell(row.id, patch);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Tab') {
            e.preventDefault();
            let finalVal = val;
            const typedVal = finalVal.trim().toLowerCase();
            
            if (typedVal === 'oper') {
              finalVal = 'OPERATIVO LIBRE';
            } else if (typedVal) {
              const match = wizardServices.find(s => s.toLowerCase().startsWith(typedVal));
              if (match) finalVal = match;
            }
            setVal(finalVal);
            
            if (finalVal !== (row.servicio || '') || finalVal.toLowerCase() === 'operativo libre') {
               const patch = { servicio: finalVal.toUpperCase() };
               if (finalVal.toLowerCase() === 'operativo libre') patch.estado = 'OPERATIVO';
               onSaveCell(row.id, patch);
            }
            
            const ubiInput = document.getElementById(`ubicacion-${row.id}`);
            if (ubiInput) ubiInput.focus();
          } else if (e.key === 'Enter') {
            e.currentTarget.blur();
          }
        }}
      />
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
