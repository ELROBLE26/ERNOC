import { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Download, FileSpreadsheet, Info } from 'lucide-react';

const CATEGORIES = [
  { key: 'vidrio', label: 'VIDRIO', color: '#fdf3eb' },
  { key: 'torniquete', label: 'TORNIQUETE', color: '#fdf3eb' },
  { key: 'rtg', label: 'RTG', color: '#fdf3eb' },
  { key: 'sonda', label: 'SONDA', color: '#fdf3eb' },
  { key: 'camaras', label: 'CAMARAS', color: '#fdf3eb' },
  { key: 'cargaElectricos', label: 'CARGA DE BUSES ELECTRICOS', color: '#fdf3eb' },
  { key: 'capacitacion', label: 'CAPACITACION', color: '#fdf3eb' },
  { key: 'fueraServicioOtros', label: 'FUERA DE SERVICIOS (OTROS)', color: '#f9c59f' },
  { key: 'fueraServicioReserva', label: 'FUERA DE SERVICIO FLOTA RESERVA (OTROS)', color: '#fdf3eb' },
  { key: 'operativosLibres', label: 'OPERATIVOS LIBRES', color: '#fdf3eb' },
];

export function ControlPannesPanel({ rows }) {
  const [manualCounts, setManualCounts] = useState({
    RIGIDO: CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat.key]: 0 }), {}),
    ARTICULADO: CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat.key]: 0 }), {}),
  });
  
  const [po, setPo] = useState(() => {
    try {
      const stored = localStorage.getItem('ernoc_po');
      return stored ? JSON.parse(stored) : { RIGIDO: 0, ARTICULADO: 0 };
    } catch {
      return { RIGIDO: 0, ARTICULADO: 0 };
    }
  });

  const [otData, setOtData] = useState([]);
  const [rtgData, setRtgData] = useState([]);
  const [pastedImage, setPastedImage] = useState(null);
  const [manualPannes, setManualPannes] = useState({});

  const fueraServicioOT = useMemo(() => {
    const counts = { RIGIDO: 0, ARTICULADO: 0 };

    // We only count buses that are in the OT file AND in our system rows
    // OT file usually has 'PPU' or 'Código'
    const otBusSet = new Set();
    otData.forEach(row => {
      const ppuRaw = (row['PPU'] || row['Patente'] || row['Patente Bus'] || row['ppu'] || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
      const codRaw = (row['Código'] || row['N° Interno Bus'] || row['Nro interno'] || row['N° interno'] || '').toString().trim();
      
      if (ppuRaw) otBusSet.add(ppuRaw);
      if (codRaw) otBusSet.add(codRaw);
    });

    rows.forEach(bus => {
      const busPpu = (bus.ppu || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const busCod = (bus.cod || '').toString().trim();
      
      if ((busPpu && otBusSet.has(busPpu)) || (busCod && otBusSet.has(busCod))) {
        if (bus.tipo === 'RIGIDO') counts.RIGIDO++;
        else if (bus.tipo === 'ARTICULADO') counts.ARTICULADO++;
      }
    });

    return counts;
  }, [otData, rows]);

  // Calculations for Rigido
  const rigidoFlotaTotal = rows.filter(r => r.tipo === 'RIGIDO').length;
  const rigidoSumManual = CATEGORIES.reduce((sum, cat) => sum + (Number(manualCounts.RIGIDO[cat.key]) || 0), 0);
  const rigidoTotalDisponibles = rigidoFlotaTotal - fueraServicioOT.RIGIDO - rigidoSumManual;
  const rigidoDiferencia = rigidoTotalDisponibles - po.RIGIDO;

  // Calculations for Articulado
  const artFlotaTotal = rows.filter(r => r.tipo === 'ARTICULADO').length;
  const artSumManual = CATEGORIES.reduce((sum, cat) => sum + (Number(manualCounts.ARTICULADO[cat.key]) || 0), 0);
  const artTotalDisponibles = artFlotaTotal - fueraServicioOT.ARTICULADO - artSumManual;
  const artDiferencia = artTotalDisponibles - po.ARTICULADO;

  const handleManualCountChange = (tipo, key, value) => {
    setManualCounts(prev => ({
      ...prev,
      [tipo]: {
        ...prev[tipo],
        [key]: parseInt(value, 10) || 0
      }
    }));
  };

  const parseExcelFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          
          // Try to find the header row naturally or just convert starting from 1
          const jsonRaw = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
          let headerRowIndex = 0;
          for (let i = 0; i < Math.min(10, jsonRaw.length); i++) {
            const rowStr = (jsonRaw[i] || []).join(' ').toLowerCase();
            if (rowStr.includes('ppu') || rowStr.includes('patente') || rowStr.includes('interno') || rowStr.includes('folio')) {
              headerRowIndex = i;
              break;
            }
          }

          const sheetData = XLSX.utils.sheet_to_json(firstSheet, { range: headerRowIndex, raw: false });
          resolve(sheetData);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo.'));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleOTUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await parseExcelFile(file);
      setOtData(data);
    } catch (err) {
      alert('Error cargando OT: ' + err.message);
    }
  };

  const handleRTGUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await parseExcelFile(file);
      setRtgData(data);
    } catch (err) {
      alert('Error cargando RTG: ' + err.message);
    }
  };

  const formatDateToDDMMYYYY = (val) => {
    if (!val) return '';
    if (val instanceof Date) {
      const d = val.getDate().toString().padStart(2, '0');
      const m = (val.getMonth() + 1).toString().padStart(2, '0');
      const y = val.getFullYear();
      return `${d}/${m}/${y}`;
    }
    if (typeof val === 'number') {
      const utcDate = new Date((val - 25569) * 86400 * 1000);
      const d = utcDate.getUTCDate().toString().padStart(2, '0');
      const m = (utcDate.getUTCMonth() + 1).toString().padStart(2, '0');
      const y = utcDate.getUTCFullYear();
      return `${d}/${m}/${y}`;
    }
    const str = String(val).trim().split(' ')[0];
    const parts = str.split(/[-/]/);
    if (parts.length >= 3) {
      if (parts[0].length === 4) {
        return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
      } else {
        let y = parts[2];
        if (y.length === 2) y = '20' + y;
        return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${y}`;
      }
    }
    return str;
  };

  const removeAccents = (str) => {
    if (!str) return '';
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  };

  const findKey = (row, partialMatches) => {
     const key = Object.keys(row).find(k => {
       const cleanK = removeAccents(k.toLowerCase()).replace(/[^a-z0-9]/g, '');
       return partialMatches.some(p => {
         const cleanP = removeAccents(p.toLowerCase()).replace(/[^a-z0-9]/g, '');
         return cleanK.includes(cleanP);
       });
     });
     return key ? row[key] : null;
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        const reader = new FileReader();
        reader.onload = (ev) => {
          setPastedImage(ev.target.result);
        };
        reader.readAsDataURL(blob);
        break;
      }
    }
  };

  // Prepare RTG vencidas list
  const rtgVencidas = useMemo(() => {
    if (!rtgData.length || !rows.length) return [];
    
    const results = [];
    
    // Live date calculation helper
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const parseDateString = (ddmmyyyy) => {
      if (!ddmmyyyy) return null;
      const parts = ddmmyyyy.split('/');
      if (parts.length === 3) {
        return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      }
      return null;
    };

    rtgData.forEach(row => {
      const ppuRaw = (row['Patente Bus'] || row['Patente'] || row['PPU'] || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
      const codRaw = (row['N° Interno Bus'] || row['Código'] || '').toString().trim();
      
      const matchedBus = rows.find(b => {
        const bPpu = (b.ppu || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const bCod = (b.cod || '').toString().trim();
        return (bPpu && bPpu === ppuRaw) || (bCod && bCod === codRaw);
      });

      if (matchedBus) {
        const rawEmision = findKey(row, ['emision']);
        const rawVencimiento = findKey(row, ['vencimiento']);
        
        const fechaEmision = formatDateToDDMMYYYY(rawEmision);
        const fechaVencimiento = formatDateToDDMMYYYY(rawVencimiento);
        
        // Calculate live days
        let liveDays = 0;
        const vDate = parseDateString(fechaVencimiento);
        if (vDate) {
          liveDays = Math.round((vDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        } else {
          // Fallback to what's in the file if date parsing failed
          const daysStr = row['Dias Para Vencimiento RTG'] || row['Días Para Vencimiento RTG'] || '0';
          liveDays = parseInt(daysStr, 10) || 0;
        }

        if (liveDays < 0) {
          results.push({
            interno: matchedBus.cod,
            patente: matchedBus.ppu,
            taller: matchedBus.terminal || 'No asignado',
            tipo: matchedBus.tipo,
            fechaEmision,
            fechaVencimiento,
            dias: liveDays
          });
        }
      }
    });
    return results;
  }, [rtgData, rows]);

  // Cleanup manual pannes for buses that are no longer in the list
  useEffect(() => {
    setManualPannes(prev => {
      const next = { ...prev };
      let changed = false;
      const currentInternos = new Set(rtgVencidas.map(b => String(b.interno || b.patente || '')));
      Object.keys(next).forEach(k => {
        if (!currentInternos.has(k)) {
          delete next[k];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [rtgVencidas]);

  const TableBlock = ({ title, tipo, flotaTotal, fueraServicioOT, totalDisponibles, diferencia }) => (
    <div style={{ marginBottom: '10px', border: '1px solid #000', fontFamily: 'sans-serif', fontSize: '11px' }}>
      <div style={{ display: 'flex', backgroundColor: '#1a365d', color: '#fff', fontWeight: 'bold' }}>
        <div style={{ flex: 1, padding: '4px', borderRight: '1px solid #000', textAlign: 'center', alignContent: 'center' }}>
          {title}
        </div>
        <div style={{ width: '100px', padding: '4px', textAlign: 'center', backgroundColor: '#3182ce' }}>
          <div style={{ fontSize: '9px', marginBottom: '2px', color: '#e2e8f0' }}>EL ROBLE</div>
          <div>US6</div>
        </div>
      </div>
      
      {/* FLOTA TOTAL */}
      <div style={{ display: 'flex', borderTop: '1px solid #000', backgroundColor: '#e2e8f0', fontWeight: 'bold' }}>
        <div style={{ flex: 1, padding: '2px 4px', borderRight: '1px solid #000' }}>FLOTA {tipo === 'RIGIDO' ? 'TOTAL' : 'ARTICULADOS'}</div>
        <div style={{ width: '100px', padding: '2px 4px', textAlign: 'center' }}>{flotaTotal}</div>
      </div>

      {/* FUERA DE SERVICIO (OT) */}
      <div style={{ display: 'flex', borderTop: '1px solid #000', backgroundColor: '#fff' }}>
        <div style={{ flex: 1, padding: '2px 4px', borderRight: '1px solid #000' }}>FUERA DE SERVICIO (OT)</div>
        <div style={{ width: '100px', padding: '2px 4px', textAlign: 'center', fontWeight: 'bold' }}>{fueraServicioOT}</div>
      </div>

      {/* Manual Rows */}
      {CATEGORIES.map(cat => (
        <div key={cat.key} style={{ display: 'flex', borderTop: '1px solid #000', backgroundColor: cat.color }}>
          <div style={{ flex: 1, padding: '2px 4px', borderRight: '1px solid #000', display: 'flex', alignItems: 'center' }}>{cat.label}</div>
          <div style={{ width: '100px', padding: '2px 4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <input 
              type="number" 
              value={manualCounts[tipo][cat.key] !== undefined ? manualCounts[tipo][cat.key] : 0} 
              onChange={(e) => handleManualCountChange(tipo, cat.key, e.target.value)}
              style={{ width: '100%', border: 'none', textAlign: 'center', backgroundColor: 'transparent', outline: 'none' }}
              min="0"
            />
          </div>
        </div>
      ))}

      {/* TOTAL DISPONIBLES */}
      <div style={{ display: 'flex', borderTop: '1px solid #000', backgroundColor: '#90cdf4', fontWeight: 'bold' }}>
        <div style={{ flex: 1, padding: '2px 4px', borderRight: '1px solid #000' }}>TOTAL DISPONIBLES</div>
        <div style={{ width: '100px', padding: '2px 4px', textAlign: 'center' }}>{totalDisponibles}</div>
      </div>

      {/* PO */}
      <div style={{ display: 'flex', borderTop: '1px solid #000', backgroundColor: '#fff' }}>
        <div style={{ flex: 1, padding: '2px 4px', borderRight: '1px solid #000', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>PO</div>
        <div style={{ width: '100px', padding: '2px 4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
           <input 
              type="number" 
              value={po[tipo] !== undefined ? po[tipo] : 0} 
              onChange={(e) => setPo(prev => ({ ...prev, [tipo]: parseInt(e.target.value, 10) || 0 }))}
              style={{ width: '100%', border: 'none', textAlign: 'center', fontWeight: 'bold', outline: 'none' }}
            />
        </div>
      </div>

      {/* DIFERENCIA */}
      <div style={{ display: 'flex', borderTop: '1px solid #000', backgroundColor: '#63b3ed', fontWeight: 'bold' }}>
        <div style={{ flex: 1, padding: '2px 4px', borderRight: '1px solid #000' }}>DIFERENCIA</div>
        <div style={{ width: '100px', padding: '2px 4px', textAlign: 'center' }}>{diferencia}</div>
      </div>
    </div>
  );

  return (
    <div className="panel-container no-spinners" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px' }}>
      <style>{`
        .no-spinners input[type="number"]::-webkit-inner-spin-button,
        .no-spinners input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .no-spinners input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Proyección</h2>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>Análisis de flota operativa (OT y RTG)</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <label className="secondary-button" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileSpreadsheet size={16} />
            Subir Excel OT
            <input type="file" accept=".xlsx, .xls" style={{ display: 'none' }} onChange={handleOTUpload} />
          </label>
          <label className="primary-button" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Upload size={16} />
            Subir Excel RTG
            <input type="file" accept=".xlsx, .xls" style={{ display: 'none' }} onChange={handleRTGUpload} />
          </label>
          {rtgData.length > 0 && (
            <button 
              onClick={() => { setRtgData([]); setManualPannes({}); }} 
              className="danger-button" 
              style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#fc8181', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Limpiar Tabla
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'stretch', flexWrap: 'wrap' }}>
        {/* Tablas Resumen */}
        <div style={{ width: '350px', flexShrink: 0 }}>
          <TableBlock 
            title="CONTROL DE FLOTA RIGIDO" 
            tipo="RIGIDO"
            flotaTotal={rigidoFlotaTotal}
            fueraServicioOT={fueraServicioOT.RIGIDO}
            totalDisponibles={rigidoTotalDisponibles}
            diferencia={rigidoDiferencia}
          />
          <TableBlock 
            title="CONTROL FLOTA ARTICULADO" 
            tipo="ARTICULADO"
            flotaTotal={artFlotaTotal}
            fueraServicioOT={fueraServicioOT.ARTICULADO}
            totalDisponibles={artTotalDisponibles}
            diferencia={artDiferencia}
          />
        </div>

        {/* Right Column: RTG Table + Paste Box */}
        <div style={{ flex: 1, minWidth: '400px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Tabla RTG Vencidas */}
          <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
             <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <h3 style={{ margin: 0, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                 <Info size={14} style={{ color: 'var(--primary-600)' }}/>
                 Buses con RTG Vencida
               </h3>
               <span className="badge" style={{ backgroundColor: 'var(--danger-100)', color: 'var(--danger-700)', padding: '2px 6px', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold' }}>
                 {rtgVencidas.length} registros
               </span>
             </div>
             
             <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
             <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', fontFamily: 'sans-serif' }}>
               <thead style={{ backgroundColor: '#3182ce', color: '#fff', position: 'sticky', top: 0 }}>
                 <tr>
                   <th style={{ padding: '4px', border: '1px solid #cbd5e0', textAlign: 'center' }}>N° Interno</th>
                   <th style={{ padding: '4px', border: '1px solid #cbd5e0', textAlign: 'center' }}>Patente</th>
                   <th style={{ padding: '4px', border: '1px solid #cbd5e0', textAlign: 'center' }}>Taller</th>
                   <th style={{ padding: '4px', border: '1px solid #cbd5e0', textAlign: 'center' }}>TIPO</th>
                   <th style={{ padding: '4px', border: '1px solid #cbd5e0', textAlign: 'center' }}>Emisión RTG</th>
                   <th style={{ padding: '4px', border: '1px solid #cbd5e0', textAlign: 'center' }}>Vencimiento RTG</th>
                   <th style={{ padding: '4px', border: '1px solid #cbd5e0', textAlign: 'center' }}>Dias</th>
                   <th style={{ padding: '4px', border: '1px solid #cbd5e0', textAlign: 'center' }}>TIPO PANNE</th>
                 </tr>
               </thead>
               <tbody>
                 {rtgVencidas.length === 0 ? (
                   <tr>
                     <td colSpan="8" style={{ padding: '10px', textAlign: 'center', color: '#718096' }}>
                       No hay datos de RTG o no hay buses vencidos en la flota. Sube el Excel de RTG para analizar.
                     </td>
                   </tr>
                 ) : (
                   rtgVencidas.map((b, idx) => (
                     <tr key={idx} style={{ backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0' }}>
                       <td style={{ padding: '4px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{b.interno}</td>
                       <td style={{ padding: '4px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{b.patente}</td>
                       <td style={{ padding: '4px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{b.taller}</td>
                       <td style={{ padding: '4px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{b.tipo}</td>
                       <td style={{ padding: '4px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{b.fechaEmision}</td>
                       <td style={{ padding: '4px', border: '1px solid #e2e8f0', textAlign: 'center', backgroundColor: '#fc8181', color: '#fff', fontWeight: 'bold' }}>{b.fechaVencimiento}</td>
                       <td style={{ padding: '4px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{b.dias}</td>
                       <td style={{ padding: '0px', border: '1px solid #e2e8f0', textAlign: 'center', backgroundColor: '#fff' }}>
                         <input 
                           type="text" 
                           value={manualPannes[b.interno] !== undefined ? manualPannes[b.interno] : ''} 
                           onChange={(e) => setManualPannes(prev => ({ ...prev, [b.interno]: e.target.value }))}
                           placeholder="RTG"
                           style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', outline: 'none', padding: '4px', fontSize: '10px' }}
                         />
                       </td>
                     </tr>
                   ))
                 )}
               </tbody>
             </table>
           </div>
          </div>

          {/* Image Paste Box */}
          <div 
             onPaste={handlePaste} 
             tabIndex={0}
             style={{ 
               flex: 1, 
               minHeight: '200px',
               border: '2px dashed #cbd5e0', 
               borderRadius: '8px', 
               display: 'flex', 
               justifyContent: 'center', 
               alignItems: 'center',
               backgroundColor: pastedImage ? '#fff' : '#f7fafc',
               cursor: 'pointer',
               overflow: 'hidden',
               position: 'relative',
               outline: 'none'
             }}
             title="Haz clic aquí y presiona Cmd+V o Ctrl+V para pegar una imagen"
           >
             {pastedImage ? (
               <img src={pastedImage} alt="Pegado" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
             ) : (
               <div style={{ color: '#a0aec0', fontWeight: 'bold', fontSize: '24px', textAlign: 'center', opacity: 0.3, userSelect: 'none', padding: '20px' }}>
                 NO SE REGISTRAN OS EN TURNO
               </div>
             )}
             {pastedImage && (
               <button 
                 onClick={(e) => { e.stopPropagation(); setPastedImage(null); }} 
                 style={{ 
                   position: 'absolute', 
                   top: '10px', 
                   right: '10px', 
                   background: 'rgba(255,0,0,0.7)', 
                   color: '#fff', 
                   border: 'none', 
                   borderRadius: '50%', 
                   width: '30px', 
                   height: '30px', 
                   cursor: 'pointer',
                   display: 'flex',
                   alignItems: 'center',
                   justifyContent: 'center',
                   fontWeight: 'bold'
                 }}
               >
                 ✕
               </button>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
