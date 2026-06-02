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
            <Radio size={18} aria-hidden="true" />
            <h2>Lectura NFC</h2>
          </div>
          <div className="nfc-status-row">
            <StatusPill active={active} label={active ? 'Activo' : 'Inactivo'} />
            <span>HID teclado</span>
            <span>Serial: {serialStatus}</span>
            <span>Web NFC: {webNfcStatus}</span>
          </div>
        </div>

        <div className="nfc-actions">
          {active ? (
            <IconButton label="Desactivar" onClick={onDeactivate} variant="danger">
              <Power size={16} aria-hidden="true" />
            </IconButton>
          ) : (
            <IconButton label="Activar lectura NFC" onClick={onActivate} variant="primary">
              <CircleDot size={16} aria-hidden="true" />
            </IconButton>
          )}
          <IconButton label="Probar lectura" onClick={onTest}>
            <TestTube2 size={16} aria-hidden="true" />
          </IconButton>
          <IconButton label="Conectar lector serial" onClick={onConnectSerial}>
            <Cable size={16} aria-hidden="true" />
          </IconButton>
          <IconButton label="Web NFC" onClick={onStartWebNfc}>
            <Smartphone size={16} aria-hidden="true" />
          </IconButton>
        </div>
      </div>

      <div className="nfc-meta-grid">
        <MetaItem label="Ultima tarjeta" value={lastRead?.uid || 'Sin lectura'} />
        <MetaItem label="Ultimo bus" value={lastBus ? `${lastBus.cod} / ${lastBus.ppu}` : 'Sin bus'} />
        <MetaItem label="Hora" value={lastRead?.readAt ? formatTime(lastRead.readAt) : 'Sin lectura'} />
        <MetaItem label="Estado" value={lastMessage || 'Listo para trabajar'} />
      </div>
    </section>
  );
}

function StatusPill({ active, label }) {
  return <span className={`reader-pill ${active ? 'reader-active' : 'reader-idle'}`}>{label}</span>;
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
    <button className={`${variant}-button icon-button`} type="button" onClick={onClick} title={label} aria-label={label}>
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
