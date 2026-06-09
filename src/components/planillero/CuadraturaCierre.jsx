import React, { useState, useMemo } from 'react';
import { Camera, Save, CheckCircle } from 'lucide-react';
import { useCuadratura } from '../../hooks/useCuadratura';
import { useFuelData } from '../../hooks/useFuelData';

const ESTRUCTURA_ISLAS = [
  {
    nombre: 'Isla 1',
    surtidores: ['114', '115'],
    tanques: ['Pozo 16 (30kL)', 'Pozo 17 (30kL)']
  },
  {
    nombre: 'Isla 2',
    surtidores: ['116', '117'],
    tanques: ['Pozo 118 (30kL)', 'AdBlue (Isla 2)']
  },
  {
    nombre: 'Isla 3',
    surtidores: ['118', '119'],
    tanques: ['Pozo 19 (30kL)', 'AdBlue (Isla 3)']
  }
];

const SURTIDORES_LIST = ['114', '115', '116', '117', '118', '119'];
const TANQUES_LIST = [
  'Pozo 16 (30kL)', 'Pozo 17 (30kL)',
  'Pozo 118 (30kL)', 'AdBlue (Isla 2)',
  'Pozo 19 (30kL)', 'AdBlue (Isla 3)'
];

export function CuadraturaCierre() {
  const { fuelRecords } = useFuelData();
  const { saveShiftQuadrature, loading } = useCuadratura();
  
  const [numInicial, setNumInicial] = useState({});
  const [numFinal, setNumFinal] = useState({});
  const [litrosPozo, setLitrosPozo] = useState({});
  const [fotos, setFotos] = useState({});
  
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Calcula litros cargados por surtidor según el Excel
  const litrosPorSurtidor = useMemo(() => {
    const map = {};
    SURTIDORES_LIST.forEach(s => map[s] = 0);
    for (const f of fuelRecords) {
      const s = String(f.surtidor || '').trim();
      const matchedSurtidor = SURTIDORES_LIST.find(surt => s.includes(surt));
      if (matchedSurtidor) {
        map[matchedSurtidor] += Number(f.litros) || 0;
      }
    }
    return map;
  }, [fuelRecords]);

  // Manejar cambio de input de numerales
  const handleNumChange = (surtidor, type, value) => {
    const val = parseFloat(value) || 0;
    if (type === 'inicial') {
      setNumInicial(prev => ({ ...prev, [surtidor]: val }));
    } else {
      setNumFinal(prev => ({ ...prev, [surtidor]: val }));
    }
  };

  const handleLitrosPozoChange = (tanque, value) => {
    const val = parseFloat(value) || 0;
    setLitrosPozo(prev => ({ ...prev, [tanque]: val }));
  };

  // Manejar subida de foto
  const handlePhotoChange = (nombre, file) => {
    setFotos(prev => ({ ...prev, [nombre]: file }));
  };

  // Enviar formulario
  const handleSubmit = async () => {
    setErrorMsg('');
    
    // Preparar JSON de surtidores
    const surtidoresData = SURTIDORES_LIST.map(surtidor => {
      const inicial = numInicial[surtidor] || 0;
      const final = numFinal[surtidor] || 0;
      const consumo = final - inicial;
      const cargados = litrosPorSurtidor[surtidor];
      const desfase = consumo - cargados;

      return {
        surtidor,
        inicial,
        final,
        consumo,
        litros_cargados: cargados,
        desfase
      };
    });

    const tanquesData = TANQUES_LIST.map(tanque => ({
      tanque,
      litros_medidos: litrosPozo[tanque] || 0
    }));

    // Validar que subieron al menos alguna foto
    const hasAnyPhoto = Object.values(fotos).some(f => f !== null);
    if (!hasAnyPhoto) {
      if (!window.confirm('No has adjuntado ninguna foto. ¿Estás seguro de cerrar el turno así?')) {
        return;
      }
    }

    const res = await saveShiftQuadrature(surtidoresData, tanquesData, fotos);
    if (res.ok) {
      setSuccess(true);
    } else {
      setErrorMsg(res.message);
    }
  };

  if (success) {
    return (
      <div className="planillero-section" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <CheckCircle size={64} color="var(--success-600)" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ color: 'var(--success-700)' }}>Turno Cerrado Correctamente</h2>
        <p style={{ color: 'var(--gray-600)' }}>La cuadratura y las fotos han sido guardadas en la base de datos.</p>
        <button 
          onClick={() => window.location.reload()}
          style={{ marginTop: '24px', padding: '12px 24px', background: 'var(--navy-600)', color: 'white', border: 'none', borderRadius: '8px', width: '100%' }}
        >
          Volver al Inicio
        </button>
      </div>
    );
  }

  return (
    <div className="planillero-section">
      <h2 className="section-title">Cierre de Turno (Cuadratura)</h2>
      <p style={{ fontSize: '0.85rem', color: 'var(--gray-600)', marginBottom: '16px' }}>
        Registra la información de cada Isla: numerales de surtidores, litros actuales en los pozos y adjunta sus fotografías correspondientes.
      </p>

      {errorMsg && (
        <div style={{ background: 'var(--danger-100)', color: 'var(--danger-700)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem' }}>
          {errorMsg}
        </div>
      )}

      <div className="advanced-isla-container">
        {ESTRUCTURA_ISLAS.map((isla, index) => (
          <div key={isla.nombre} className="advanced-isla-card">
            <div className={`advanced-isla-header isla-${index + 1}`}>
              <span className="advanced-isla-number">{index + 1}</span>
              <div className="advanced-isla-title-box">
                <h3>ISLA DE COMBUSTIBLE</h3>
                <p>
                  {isla.surtidores.map(s => `Surt. ${s}`).join(' - ')}
                  {isla.tanques.length > 0 && ' - '}
                  {isla.tanques.map(t => t.replace(' (30kL)', '').replace(' (Isla 2)', '').replace(' (Isla 3)', '')).join(' - ')}
                </p>
              </div>
            </div>
            
            <div className="advanced-isla-grid">
              
              {/* SURTIDORES */}
              {isla.surtidores.map(surtidor => {
                const hasPhoto = fotos[`Surtidor ${surtidor}`];
                
                return (
                  <div key={surtidor} className="advanced-col">
                    <div className="advanced-col-header">
                      <span className="label">SURTIDOR</span>
                      <span className="manual">MANUAL</span>
                    </div>
                    <div className="advanced-col-main">
                      <span className="big-number">{surtidor}</span>
                      <div className="advanced-input-wrapper">
                        <input 
                          type="number" 
                          placeholder="Inicial" 
                          className="advanced-input-small"
                          onChange={e => handleNumChange(surtidor, 'inicial', e.target.value)}
                        />
                        <input 
                          type="number" 
                          placeholder="Odómetro" 
                          className="advanced-input"
                          onChange={e => handleNumChange(surtidor, 'final', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="advanced-col-footer-text">ODÓMETRO</div>

                    <label className="advanced-photo-zone">
                      {hasPhoto ? (
                        <>
                          <img src={URL.createObjectURL(hasPhoto)} className="advanced-photo-img" alt={`Surtidor ${surtidor}`} />
                          <span className="advanced-photo-tag">{surtidor}</span>
                        </>
                      ) : (
                        <div className="advanced-photo-placeholder">
                          <Camera size={24} />
                          <p>Arrastrar foto<br/>o hacer clic</p>
                        </div>
                      )}
                      <input 
                        type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
                        onChange={e => {
                          if (e.target.files && e.target.files[0]) {
                            handlePhotoChange(`Surtidor ${surtidor}`, e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                  </div>
                );
              })}

              {/* POZOS / TANQUES */}
              {isla.tanques.map(tanque => {
                const hasPhoto = fotos[tanque];
                const isAdblue = tanque.toLowerCase().includes('adblue');
                const nameParts = tanque.split(' ');
                const displayNum = isAdblue ? 'Adblue' : (nameParts[1] || tanque);

                return (
                  <div key={tanque} className="advanced-col">
                    <div className="advanced-col-header">
                      <span className={`label ${isAdblue ? 'blue' : ''}`}>{isAdblue ? 'ADBLUE' : 'POZO'}</span>
                      <span className="manual">MANUAL</span>
                    </div>
                    <div className="advanced-col-main">
                      <span className="big-number" style={{ fontSize: isAdblue ? '1.5rem' : '2.2rem' }}>{displayNum}</span>
                      <div className="advanced-input-wrapper" style={{ justifyContent: 'center' }}>
                        <input 
                          type="number" 
                          placeholder={isAdblue ? 'Nº' : 'Nivel'} 
                          className="advanced-input"
                          style={{ padding: '16px 4px' }}
                          onChange={e => handleLitrosPozoChange(tanque, e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="advanced-col-footer-text">{isAdblue ? 'MEDICIÓN' : 'NIVEL'}</div>

                    <label className="advanced-photo-zone">
                      {hasPhoto ? (
                        <>
                          <img src={URL.createObjectURL(hasPhoto)} className="advanced-photo-img" alt={tanque} />
                          <span className="advanced-photo-tag">{displayNum}</span>
                        </>
                      ) : (
                        <div className="advanced-photo-placeholder">
                          <Camera size={24} />
                          <p>Arrastrar foto<br/>o hacer clic</p>
                        </div>
                      )}
                      <input 
                        type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
                        onChange={e => {
                          if (e.target.files && e.target.files[0]) {
                            handlePhotoChange(tanque, e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                  </div>
                );
              })}

            </div>
          </div>
        ))}
      </div>

      {/* SECCIÓN GUARDAR */}
      <div style={{ marginTop: '32px', marginBottom: '32px' }}>
        <button 
          onClick={handleSubmit}
          disabled={loading}
          className="btn-guardar-cierre"
          style={{ opacity: loading ? 0.7 : 1 }}
        >
          <Save size={24} />
          {loading ? 'Procesando Cierre...' : 'Guardar y Cerrar Turno'}
        </button>
      </div>

    </div>
  );
}
