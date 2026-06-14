import { useState, useEffect, useMemo } from 'react';
import { Search, Download, CheckCircle2, XCircle } from 'lucide-react';
import { fetchDocumentRevisions, subscribeToDocumentRevisions } from '../lib/documentService';
import { downloadXlsx } from '../utils/fleet';

function StatusIcon({ value }) {
  if (value) {
    return <CheckCircle2 size={18} style={{ color: 'var(--success-500)' }} />;
  }
  return <XCircle size={18} style={{ color: 'var(--danger-500)' }} />;
}

export function DocumentReviewPanel({ rows }) {
  const [revisions, setRevisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMissing, setFilterMissing] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchDocumentRevisions();
        setRevisions(data);
      } catch (err) {
        console.error('Error fetching document revisions:', err);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
    const unsubscribe = subscribeToDocumentRevisions(() => {
      loadData();
    });

    return () => unsubscribe();
  }, []);

  const mergedData = useMemo(() => {
    return rows.map((bus) => {
      const rev = revisions.find(r => r.ppu === bus.ppu) || {
        permiso_circulacion: true,
        soap: true,
        revision_tecnica: true,
        revision_gases: true,
        certificado_recorrido: true,
        certificado_inscripcion: true,
      };
      return {
        ...bus,
        ...rev,
      };
    }).filter(item => {
      if (filterMissing) {
        const hasMissing = !item.permiso_circulacion || !item.soap || !item.revision_tecnica || 
                           !item.revision_gases || !item.certificado_recorrido || !item.certificado_inscripcion;
        if (!hasMissing) return false;
      }
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        return (item.cod || '').toLowerCase().includes(s) || (item.ppu || '').toLowerCase().includes(s);
      }
      return true;
    });
  }, [rows, revisions, searchTerm, filterMissing]);

  const handleDownload = () => {
    const dataToExport = mergedData.map((r) => ({
      'Terminal': r.terminal,
      'COD': r.cod,
      'PPU': r.ppu,
      'Permiso Circ.': r.permiso_circulacion ? 'SÍ' : 'NO',
      'SOAP': r.soap ? 'SÍ' : 'NO',
      'Rev. Técnica': r.revision_tecnica ? 'SÍ' : 'NO',
      'Rev. Gases': r.revision_gases ? 'SÍ' : 'NO',
      'Cert. Recorrido': r.certificado_recorrido ? 'SÍ' : 'NO',
      'Cert. Inscripción': r.certificado_inscripcion ? 'SÍ' : 'NO',
    }));
    downloadXlsx(dataToExport, 'Revision_Documentos');
  };

  if (loading) {
    return <div style={{ padding: '24px' }}>Cargando datos de documentos...</div>;
  }

  return (
    <div className="panel-container">
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Revisión de Documentación</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div className="search-bar" style={{ display: 'flex', alignItems: 'center', background: 'var(--gray-50)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--gray-200)' }}>
            <Search size={18} color="var(--gray-500)" style={{ marginRight: '8px' }} />
            <input 
              type="text" 
              placeholder="Buscar COD o PPU..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none' }}
            />
          </div>
          <button 
            onClick={() => setFilterMissing(!filterMissing)}
            style={{ 
              padding: '8px 16px', 
              borderRadius: '8px', 
              border: '1px solid', 
              background: filterMissing ? 'var(--danger-50)' : 'white',
              borderColor: filterMissing ? 'var(--danger-500)' : 'var(--gray-300)',
              color: filterMissing ? 'var(--danger-700)' : 'var(--gray-700)',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            {filterMissing ? 'Mostrando Faltantes' : 'Ver Faltantes'}
          </button>
          <button className="primary-button" onClick={handleDownload} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={18} /> Exportar
          </button>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Terminal</th>
              <th>COD</th>
              <th>PPU</th>
              <th style={{ textAlign: 'center' }}>Permiso Circ.</th>
              <th style={{ textAlign: 'center' }}>SOAP</th>
              <th style={{ textAlign: 'center' }}>Rev. Técnica</th>
              <th style={{ textAlign: 'center' }}>Rev. Gases</th>
              <th style={{ textAlign: 'center' }}>Cert. Recorrido</th>
              <th style={{ textAlign: 'center' }}>Cert. Inscrip.</th>
            </tr>
          </thead>
          <tbody>
            {mergedData.map((row) => (
              <tr key={row.id}>
                <td>{row.terminal}</td>
                <td><strong>{row.cod}</strong></td>
                <td>{row.ppu}</td>
                <td style={{ textAlign: 'center' }}><StatusIcon value={row.permiso_circulacion} /></td>
                <td style={{ textAlign: 'center' }}><StatusIcon value={row.soap} /></td>
                <td style={{ textAlign: 'center' }}><StatusIcon value={row.revision_tecnica} /></td>
                <td style={{ textAlign: 'center' }}><StatusIcon value={row.revision_gases} /></td>
                <td style={{ textAlign: 'center' }}><StatusIcon value={row.certificado_recorrido} /></td>
                <td style={{ textAlign: 'center' }}><StatusIcon value={row.certificado_inscripcion} /></td>
              </tr>
            ))}
            {mergedData.length === 0 && (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-500)' }}>
                  No se encontraron registros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
