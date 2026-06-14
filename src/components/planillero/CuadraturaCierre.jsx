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

const DB_NAME = 'PlanilleroDB';
const STORE_NAME = 'fotos_cierre';

const openDB = () => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, 1);
  request.onupgradeneeded = (e) => e.target.result.createObjectStore(STORE_NAME);
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const saveFotoIDB = async (key, file) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(file, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const getFotosIDB = async () => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    const reqKeys = store.getAllKeys();
    tx.oncomplete = () => {
      const result = {};
      reqKeys.result.forEach((k, i) => { result[k] = req.result[i]; });
      resolve(result);
    };
    tx.onerror = () => reject(tx.error);
  });
};

const clearFotosIDB = async () => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export function CuadraturaCierre() {
  const { fuelRecords } = useFuelData();
  const { saveShiftQuadrature, loading } = useCuadratura();
  
  const [numInicial, setNumInicial] = useState(() => JSON.parse(localStorage.getItem('cierre_numInicial')) || {});
  const [numFinal, setNumFinal] = useState(() => JSON.parse(localStorage.getItem('cierre_numFinal')) || {});
  const [litrosPozo, setLitrosPozo] = useState(() => JSON.parse(localStorage.getItem('cierre_litrosPozo')) || {});
  const [fotos, setFotos] = useState({});
  
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  React.useEffect(() => {
    getFotosIDB()
      .then(storedFotos => setFotos(storedFotos))
      .catch(err => console.error("Error loading fotos from IDB", err));
  }, []);

  React.useEffect(() => {
    localStorage.setItem('cierre_numInicial', JSON.stringify(numInicial));
  }, [numInicial]);

  React.useEffect(() => {
    localStorage.setItem('cierre_numFinal', JSON.stringify(numFinal));
  }, [numFinal]);

  React.useEffect(() => {
    localStorage.setItem('cierre_litrosPozo', JSON.stringify(litrosPozo));
  }, [litrosPozo]);

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
  const handlePhotoChange = async (nombre, file) => {
    setFotos(prev => ({ ...prev, [nombre]: file }));
    await saveFotoIDB(nombre, file);
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
      localStorage.removeItem('cierre_numInicial');
      localStorage.removeItem('cierre_numFinal');
      localStorage.removeItem('cierre_litrosPozo');
      await clearFotosIDB();
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {ESTRUCTURA_ISLAS.map(isla => (
          <div key={isla.nombre} className="cuadratura-isla-card">
            <div className="cuadratura-isla-header">
              <h3>{isla.nombre}</h3>
            </div>
            
            <div style={{ padding: '16px' }}>
              
              {/* SURTIDORES */}
              <h4 style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Surtidores</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                {isla.surtidores.map(surtidor => {
                  const inicial = numInicial[surtidor] || 0;
                  const final = numFinal[surtidor] || 0;
                  const consumo = final - inicial;
                  const cargados = litrosPorSurtidor[surtidor];
                  const desfase = consumo - cargados;
                  const hasPhoto = !!fotos[`Surtidor ${surtidor}`];

                  return (
                    <div key={surtidor} className="cuadratura-surtidor-box">
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
                        <strong style={{ fontSize: '1.15rem', color: 'var(--text-main)', fontWeight: '800' }}>Surtidor {surtidor}</strong>
                        <span style={{ fontSize: '0.8rem', background: 'rgba(37, 99, 235, 0.1)', color: 'var(--accent-primary)', padding: '6px 10px', borderRadius: '8px', fontWeight: '700' }}>
                          Cargados App: {cargados.toFixed(1)} L
                        </span>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div>
                          <label className="cuadratura-input-label">Numeral Inicial</label>
                          <input 
                            type="number" placeholder="0.0" 
                            className="cuadratura-input"
                            value={numInicial[surtidor] ?? ''}
                            onChange={e => handleNumChange(surtidor, 'inicial', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="cuadratura-input-label">Numeral Final</label>
                          <input 
                            type="number" placeholder="0.0" 
                            className="cuadratura-input"
                            value={numFinal[surtidor] ?? ''}
                            onChange={e => handleNumChange(surtidor, 'final', e.target.value)}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px dashed rgba(0,0,0,0.1)', marginBottom: '16px' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '500' }}>Consumo Reloj: <b style={{ color: 'var(--text-main)' }}>{consumo > 0 ? consumo.toFixed(1) : '0.0'} L</b></span>
                        <span style={{ fontSize: '0.95rem', color: desfase === 0 ? 'var(--text-light)' : desfase > 0 ? 'var(--badge-crit-text)' : 'var(--badge-ok-text)', fontWeight: '800' }}>
                          Desfase: {desfase > 0 ? '+' : ''}{desfase.toFixed(1)} L
                        </span>
                      </div>

                      {/* Botón Foto Surtidor */}
                      <label className={`cuadratura-btn-camara ${hasPhoto ? 'done' : 'pending'}`}>
                        <Camera size={20} />
                        {hasPhoto ? 'Foto Surtidor Lista' : 'Tomar Foto Surtidor'}
                        <input 
                          type="file" accept="image/*" style={{ display: 'none' }}
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
              </div>

              {/* POZOS / TANQUES */}
              <h4 style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pozos</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {isla.tanques.map(tanque => {
                  const hasPhoto = !!fotos[tanque];
                  return (
                    <div key={tanque} className="cuadratura-surtidor-box" style={{ marginBottom: 0 }}>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--text-main)', fontWeight: '800', display: 'block', marginBottom: '12px' }}>{tanque}</strong>
                      
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <input 
                            type="number" placeholder="Litros Medidos" 
                            className="cuadratura-input"
                            value={litrosPozo[tanque] ?? ''}
                            onChange={e => handleLitrosPozoChange(tanque, e.target.value)}
                          />
                        </div>
                        
                        <label className={`cuadratura-btn-camara ${hasPhoto ? 'done' : 'pending'}`} style={{ flex: 1, padding: '12px' }}>
                          <Camera size={18} />
                          {hasPhoto ? 'Lista' : 'Tomar Foto'}
                          <input 
                            type="file" accept="image/*" style={{ display: 'none' }}
                            onChange={e => {
                              if (e.target.files && e.target.files[0]) {
                                handlePhotoChange(tanque, e.target.files[0]);
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>

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
