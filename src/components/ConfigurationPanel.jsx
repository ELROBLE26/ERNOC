import { Settings2 } from 'lucide-react';
import { NewBusForm } from './NewBusForm';
import { NfcReaderPanel } from './NfcReaderPanel';

export function ConfigurationPanel({ nfcProps, newBusProps }) {
  return (
    <section className="configuration-view">
      <div className="panel configuration-header">
        <div className="panel-title-row">
          <Settings2 size={14} style={{ color: 'var(--gray-600)' }} aria-hidden="true" />
          <div>
            <h2>Configuración</h2>
            <p className="panel-subtitle">
              Parámetros operativos, alta de buses y lectura NFC automática.
            </p>
          </div>
        </div>
      </div>

      <div className="configuration-grid">
        <NfcReaderPanel {...nfcProps} />
        <NewBusForm {...newBusProps} />
      </div>
    </section>
  );
}
