const fs = require('fs');
const content = fs.readFileSync('src/components/NfcOperModal.jsx', 'utf8');

let newContent = content.replace(
  "import { X } from 'lucide-react';",
  "import { X, ChevronDown, ChevronUp, ExternalLink, Printer } from 'lucide-react';\nimport { getDocumentRevisionByPpu, upsertDocumentRevision } from '../lib/documentService';"
);

const stateCode = `  const [otNumber, setOtNumber] = useState('');
  
  const [docs, setDocs] = useState({
    permiso_circulacion: true,
    soap: true,
    revision_tecnica: true,
    revision_gases: true,
    certificado_recorrido: true,
    certificado_inscripcion: true,
  });
  const [showDocs, setShowDocs] = useState(false);
  const [docsLoading, setDocsLoading] = useState(false);

  useEffect(() => {
    async function loadDocs() {
      if (open && bus?.ppu) {
        setDocsLoading(true);
        try {
          const rev = await getDocumentRevisionByPpu(bus.ppu);
          if (rev) {
            setDocs({
              permiso_circulacion: rev.permiso_circulacion,
              soap: rev.soap,
              revision_tecnica: rev.revision_tecnica,
              revision_gases: rev.revision_gases,
              certificado_recorrido: rev.certificado_recorrido,
              certificado_inscripcion: rev.certificado_inscripcion,
            });
          } else {
            setDocs({
              permiso_circulacion: true,
              soap: true,
              revision_tecnica: true,
              revision_gases: true,
              certificado_recorrido: true,
              certificado_inscripcion: true,
            });
          }
        } catch (err) {
          console.error(err);
        } finally {
          setDocsLoading(false);
        }
      }
    }
    loadDocs();
  }, [open, bus]);

  const handleSaveWrapper = async (payloadToSave) => {
    try {
      if (bus?.ppu && bus?.cod) {
        await upsertDocumentRevision({
          ppu: bus.ppu,
          cod: bus.cod,
          terminal: form.terminal,
          ...docs
        });
      }
      onSave(payloadToSave);
    } catch (err) {
      console.error(err);
      onSave(payloadToSave);
    }
  };
`;
newContent = newContent.replace("  const [otNumber, setOtNumber] = useState('');", stateCode);

newContent = newContent.replace("onSave(payloadRef.current);", "handleSaveWrapper(payloadRef.current);");
newContent = newContent.replace("onSave(payloadRef.current);", "handleSaveWrapper(payloadRef.current);");
newContent = newContent.replace("onClick={() => onSave({ ...buildInitialForm(form.terminal), terminal: form.terminal })}", "onClick={() => handleSaveWrapper({ ...buildInitialForm(form.terminal), terminal: form.terminal })}");
newContent = newContent.replace("onClick={() => onSave(payload)}", "onClick={() => handleSaveWrapper(payload)}");

const accordionCode = `          </div>

          <div style={{ marginTop: '16px', border: '1px solid var(--gray-200)', borderRadius: '8px', overflow: 'hidden' }}>
            <button 
              type="button" 
              onClick={() => setShowDocs(!showDocs)}
              style={{ width: '100%', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--gray-50)', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
            >
              <span>Revisión de Documentos</span>
              {showDocs ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {showDocs && (
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {docsLoading ? (
                  <p>Cargando documentos...</p>
                ) : (
                  <>
                    <DocRow 
                      label="Permiso de Circulación" 
                      value={docs.permiso_circulacion} 
                      onChange={(v) => setDocs(d => ({ ...d, permiso_circulacion: v }))} 
                      driveLink="https://drive.google.com/drive/folders/1Ps3s4gUF3l6Rf0k82rwoTVOTGtVh9mn0?usp=drive_link"
                    />
                    <DocRow 
                      label="SOAP" 
                      value={docs.soap} 
                      onChange={(v) => setDocs(d => ({ ...d, soap: v }))} 
                      driveLink="https://drive.google.com/drive/folders/1MYrseSdneeob9mm3ap7wyFStrEax0PzN?usp=sharing"
                    />
                    <DocRow 
                      label="Revisión Técnica" 
                      value={docs.revision_tecnica} 
                      onChange={(v) => setDocs(d => ({ ...d, revision_tecnica: v }))} 
                    />
                    <DocRow 
                      label="Revisión Gases" 
                      value={docs.revision_gases} 
                      onChange={(v) => setDocs(d => ({ ...d, revision_gases: v }))} 
                    />
                    <DocRow 
                      label="Cert. Recorrido" 
                      value={docs.certificado_recorrido} 
                      onChange={(v) => setDocs(d => ({ ...d, certificado_recorrido: v }))} 
                    />
                    <DocRow 
                      label="Cert. Inscripción" 
                      value={docs.certificado_inscripcion} 
                      onChange={(v) => setDocs(d => ({ ...d, certificado_inscripcion: v }))} 
                    />
                  </>
                )}
              </div>
            )}
          </div>

          {error ? <p className="modal-error">⚠ {error}</p> : null}`;

newContent = newContent.replace("          {error ? <p className=\"modal-error\">⚠ {error}</p> : null}", accordionCode);

const docRowComponent = `
function DocRow({ label, value, onChange, driveLink }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--gray-100)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontWeight: '500' }}>{label}</span>
        {!value && driveLink && (
          <a 
            href={driveLink} 
            target="_blank" 
            rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--primary-600)', textDecoration: 'none', background: 'var(--primary-50)', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}
          >
            <Printer size={12} /> Buscar en Drive e Imprimir
          </a>
        )}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          type="button"
          onClick={() => onChange(true)}
          style={{
            padding: '6px 12px', borderRadius: '4px', border: '1px solid',
            background: value ? 'var(--success-500)' : 'transparent',
            color: value ? 'white' : 'var(--gray-500)',
            borderColor: value ? 'var(--success-500)' : 'var(--gray-300)',
            cursor: 'pointer', fontWeight: 'bold'
          }}
        >
          SÍ
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          style={{
            padding: '6px 12px', borderRadius: '4px', border: '1px solid',
            background: !value ? 'var(--danger-500)' : 'transparent',
            color: !value ? 'white' : 'var(--gray-500)',
            borderColor: !value ? 'var(--danger-500)' : 'var(--gray-300)',
            cursor: 'pointer', fontWeight: 'bold'
          }}
        >
          NO
        </button>
      </div>
    </div>
  );
}
`;

newContent += docRowComponent;

fs.writeFileSync('src/components/NfcOperModal.jsx', newContent);
