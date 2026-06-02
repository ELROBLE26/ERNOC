import { Cable, CircleDot, Power, Radio, Smartphone, TestTube2 } from 'lucide-react';

export function NfcReaderPanel({
  active,
  lastRead,
  lastBus,
  lastMessage,
  serialStatus,
  webNfcStatus,
  onActivate,
  onDeactivate,
  onTest,
  onConnectSerial,
  onStartWebNfc,
}) {
  return (
    <section className="panel nfc-panel">
      <div className="nfc-panel-main">
        <div>
          <div className="panel-title-row">
            <Radio size={14} style={{ color: 'var(--gray-600)' }} aria-hidden="true" />
            <div>
              <h2>Lectura NFC</h2>
              <p className="panel-subtitle">HID teclado · Serial · Web NFC</p>
            </div>
          </div>
          <div className="nfc-status-row">
            <StatusPill active={active} label={active ? 'Activo' : 'Inactivo'} />
            <span>Serial: <strong style={{ color: 'var(--gray-800)' }}>{serialStatus}</strong></span>
            <span>Web NFC: <strong style={{ color: 'var(--gray-800)' }}>{webNfcStatus}</strong></span>
          </div>
        </div>

        <div className="nfc-actions">
          {active ? (
            <IconButton label="Desactivar" onClick={onDeactivate} variant="danger">
              <Power size={14} aria-hidden="true" />
            </IconButton>
          ) : (
            <IconButton label="Activar NFC" onClick={onActivate} variant="primary">
              <CircleDot size={14} aria-hidden="true" />
            </IconButton>
          )}
          <IconButton label="Probar lectura" onClick={onTest}>
            <TestTube2 size={14} aria-hidden="true" />
          </IconButton>
          <IconButton label="Lector serial" onClick={onConnectSerial}>
            <Cable size={14} aria-hidden="true" />
          </IconButton>
          <IconButton label="Web NFC" onClick={onStartWebNfc}>
            <Smartphone size={14} aria-hidden="true" />
          </IconButton>
        </div>
      </div>

      <div className="nfc-meta-grid">
        <MetaItem label="Última tarjeta" value={lastRead?.uid || 'Sin lectura'} />
        <MetaItem label="Último bus"     value={lastBus ? `${lastBus.cod} / ${lastBus.ppu}` : 'Sin bus'} />
        <MetaItem label="Hora"           value={lastRead?.readAt ? formatTime(lastRead.readAt) : '—'} />
        <MetaItem label="Estado"         value={lastMessage || 'Listo para trabajar'} />
      </div>
    </section>
  );
}

function StatusPill({ active, label }) {
  return (
    <span className={`reader-pill ${active ? 'reader-active' : 'reader-idle'}`}>
      {active && <span className="reader-pulse" />}
      {label}
    </span>
  );
}

function MetaItem({ label, value }) {
  return (
    <div className="nfc-meta-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function IconButton({ label, onClick, variant = 'secondary', children }) {
  return (
    <button
      className={`${variant}-button icon-button`}
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      {children}
      <span>{label}</span>
    </button>
  );
}

function formatTime(date) {
  return new Intl.DateTimeFormat('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}
