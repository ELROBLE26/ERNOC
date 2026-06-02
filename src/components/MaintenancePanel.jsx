import { useRef, useState } from 'react';
import { CalendarClock, CheckCircle2, FileSpreadsheet, Trash2, UploadCloud } from 'lucide-react';

export function MaintenancePanel({ schedule, lastUploadDate, onParseFile, onClear }) {
  const fileInputRef = useRef(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setParsing(true);
    setError('');

    try {
      await onParseFile(file);
    } catch (err) {
      setError(err.message || 'Error al procesar el archivo Excel.');
    } finally {
      setParsing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const countNight = schedule.filter((s) => s.turno === 'Mantención noche').length;
  const countDay = schedule.filter((s) => s.turno === 'Mantención día').length;

  return (
    <section className="configuration-view">
      <div className="panel configuration-header">
        <div className="panel-title-row">
          <CalendarClock size={14} style={{ color: 'var(--gray-600)' }} aria-hidden="true" />
          <div>
            <h2>Mantenciones Programadas</h2>
            <p className="panel-subtitle">
              Sube el archivo Excel de programación para cruzar automáticamente con las lecturas NFC.
            </p>
          </div>
        </div>
      </div>

      <div className="configuration-grid" style={{ gridTemplateColumns: '1fr' }}>
        <section className="panel nfc-panel" style={{ maxWidth: '600px' }}>
          <div className="nfc-panel-main">
            <div>
              <div className="panel-title-row">
                <FileSpreadsheet size={14} style={{ color: 'var(--gray-600)' }} aria-hidden="true" />
                <div>
                  <h2>Carga de archivo</h2>
                  <p className="panel-subtitle">Formato soportado: .xlsx, .xls</p>
                </div>
              </div>
            </div>

            <div className="nfc-actions">
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
              />
              <button
                className="primary-button icon-button"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={parsing}
              >
                <UploadCloud size={14} aria-hidden="true" />
                <span>{parsing ? 'Procesando...' : 'Subir Excel'}</span>
              </button>
              
              {schedule.length > 0 && (
                <button
                  className="danger-button icon-button"
                  type="button"
                  onClick={onClear}
                  title="Limpiar programación"
                >
                  <Trash2 size={14} aria-hidden="true" />
                  <span>Limpiar data</span>
                </button>
              )}
            </div>
          </div>

          {error && <p className="modal-error" style={{ margin: '16px 20px 0' }}>⚠ {error}</p>}

          <div className="nfc-meta-grid" style={{ marginTop: '16px' }}>
            <MetaItem 
              label="Estado actual" 
              value={schedule.length > 0 ? `${schedule.length} buses programados` : 'Sin programación activa'} 
              valueColor={schedule.length > 0 ? 'var(--success-600)' : 'var(--gray-600)'} 
              icon={schedule.length > 0 ? <CheckCircle2 size={12} color="var(--success-600)" /> : null}
            />
            <MetaItem 
              label="Mantención Día" 
              value={countDay.toString()} 
            />
            <MetaItem 
              label="Mantención Noche" 
              value={countNight.toString()} 
            />
            <MetaItem 
              label="Última carga" 
              value={lastUploadDate ? new Date(lastUploadDate).toLocaleString('es-CL') : '—'} 
            />
          </div>
        </section>
      </div>
    </section>
  );
}

function MetaItem({ label, value, valueColor, icon }) {
  return (
    <div className="nfc-meta-item">
      <span>{label}</span>
      <strong style={{ color: valueColor, display: 'flex', alignItems: 'center', gap: '4px' }}>
        {icon}
        {value}
      </strong>
    </div>
  );
}
