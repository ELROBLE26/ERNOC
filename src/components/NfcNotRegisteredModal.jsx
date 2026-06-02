import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';

export function NfcNotRegisteredModal({
  open,
  nfcUid,
  terminalFilter,
  searching,
  saving,
  error,
  foundBus,
  onSearch,
  onAssociate,
  onCancel,
}) {
  const [searchValue, setSearchValue] = useState('');
  const [terminal, setTerminal] = useState(terminalFilter === 'Todos' ? '' : terminalFilter);

  useEffect(() => {
    if (open) {
      setSearchValue('');
      setTerminal(terminalFilter === 'Todos' ? '' : terminalFilter);
    }
  }, [open, terminalFilter, nfcUid]);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, open]);

  if (!open) return null;

  const canAssociate = Boolean(foundBus?.cod && foundBus?.ppu && terminal);

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="modal-card nfc-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nfc-unregistered-title"
      >
        <div className="modal-accent-bar" style={{ background: 'linear-gradient(90deg, var(--warning-600), #f59e0b)' }} />
        <div className="modal-content">
          <div className="modal-header">
            <div>
              <h2 id="nfc-unregistered-title">NFC no registrado</h2>
              <p>
                UID leído:{' '}
                <strong style={{ fontFamily: 'monospace', color: 'var(--navy-700)' }}>
                  {nfcUid}
                </strong>
                . Busca y asocia un bus para continuar.
              </p>
            </div>
            <button
              className="icon-only-button"
              type="button"
              onClick={onCancel}
              aria-label="Cerrar"
            >
              <X size={14} />
            </button>
          </div>

          <div className="associate-grid" style={{ marginTop: 16 }}>
            <label className="field">
              <span>Buscar COD o PPU</span>
              <input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    onSearch(searchValue);
                  }
                }}
                placeholder="Ej: 1234 o ABCD12"
              />
            </label>
            <button
              className="secondary-button associate-search-button"
              type="button"
              onClick={() => onSearch(searchValue)}
              disabled={searching}
            >
              <Search size={13} />
              {searching ? 'Buscando…' : 'Buscar bus'}
            </button>
            <label className="field">
              <span>Terminal</span>
              <select value={terminal} onChange={(event) => setTerminal(event.target.value)}>
                <option value="">Seleccionar</option>
                <option value="El Roble">El Roble</option>
                <option value="La Reina">La Reina</option>
              </select>
            </label>
          </div>

          {foundBus ? (
            <div className="nfc-bus-strip" style={{ marginTop: 14 }}>
              <DataPoint label="COD"            value={foundBus.cod} />
              <DataPoint label="PPU"            value={foundBus.ppu} />
              <DataPoint label="Terminal actual" value={foundBus.terminal} />
            </div>
          ) : null}

          {error ? <p className="modal-error">⚠ {error}</p> : null}

          <div className="modal-actions">
            <button className="secondary-button" type="button" onClick={onCancel}>
              Cancelar
            </button>
            <button
              className="primary-button"
              type="button"
              disabled={!canAssociate || saving}
              onClick={() => onAssociate({ bus: foundBus, terminal })}
            >
              {saving ? 'Guardando…' : 'Guardar asociación'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function DataPoint({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value || '—'}</strong>
    </div>
  );
}
