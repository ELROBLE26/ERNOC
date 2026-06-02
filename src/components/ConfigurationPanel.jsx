import { Settings } from 'lucide-react';
import { NewBusForm } from './NewBusForm';
import { NfcReaderPanel } from './NfcReaderPanel';

export function ConfigurationPanel({
  nfcProps,
  newBusProps,
}) {
  return (
    <section className="configuration-view">
      <div className="panel configuration-header">
        <div className="panel-title-row">
          <Settings size={18} aria-hidden="true" />
          <div>
            <h2>Configuracion</h2>
            <p>Parametros operativos, alta de buses y lectura NFC automatica.</p>
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

