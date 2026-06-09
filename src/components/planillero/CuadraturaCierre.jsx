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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {ESTRUCTURA_ISLAS.map(isla => (
          <div key={isla.nombre} style={{ background: 'white', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
            <div style={{ background: 'var(--navy-50)', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ margin: 0, color: 'var(--navy-800)', fontSize: '1.2rem' }}>{isla.nombre}</h3>
            </div>
            
            <div style={{ padding: '16px' }}>
              
              {/* SURTIDORES */}
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--gray-600)', textTransform: 'uppercase' }}>Surtidores</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                {isla.surtidores.map(surtidor => {
                  const inicial = numInicial[surtidor] || 0;
                  const final = numFinal[surtidor] || 0;
                  const consumo = final - inicial;
                  const cargados = litrosPorSurtidor[surtidor];
                  const desfase = consumo - cargados;
                  const hasPhoto = !!fotos[`Surtidor ${surtidor}`];

                  return (
                    <div key={surtidor} style={{ background: 'var(--gray-50)', padding: '12px', borderRadius: '8px', border: '1px solid var(--gray-200)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                        <strong style={{ fontSize: '1.05rem', color: 'var(--gray-900)' }}>Surtidor {surtidor}</strong>
                        <span style={{ fontSize: '0.8rem', background: 'var(--info-100)', color: 'var(--info-700)', padding: '4px 8px', borderRadius: '4px' }}>
                          Cargados App: {cargados.toFixed(1)} L
                        </span>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '4px' }}>Numeral Inicial</label>
                          <input 
                            type="number" placeholder="0.0" 
                            onChange={e => handleNumChange(surtidor, 'inicial', e.target.value)}
                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.9rem' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '4px' }}>Numeral Final</label>
                          <input 
                            type="number" placeholder="0.0" 
                            onChange={e => handleNumChange(surtidor, 'final', e.target.value)}
                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.9rem' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px dashed var(--gray-200)', marginBottom: '12px' }}>
                        <span style={{ color: 'var(--gray-600)', fontSize: '0.85rem' }}>Consumo Reloj: <b>{consumo > 0 ? consumo.toFixed(1) : '0.0'} L</b></span>
                        <span style={{ fontSize: '0.85rem', color: desfase === 0 ? 'var(--gray-500)' : desfase > 0 ? 'var(--danger-600)' : 'var(--success-600)', fontWeight: 'bold' }}>
                          Desfase: {desfase > 0 ? '+' : ''}{desfase.toFixed(1)} L
                        </span>
                      </div>

                      {/* Botón Foto Surtidor */}
                      <label style={{ cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', background: hasPhoto ? 'var(--success-100)' : 'white', border: `1px solid ${hasPhoto ? 'var(--success-400)' : 'var(--gray-300)'}`, padding: '8px 12px', borderRadius: '6px', color: hasPhoto ? 'var(--success-700)' : 'var(--gray-700)', fontSize: '0.85rem', fontWeight: '500' }}>
                        <Camera size={16} />
                        {hasPhoto ? 'Foto Surtidor Lista' : 'Tomar Foto Surtidor'}
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
              </div>

              {/* POZOS / TANQUES */}
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--gray-600)', textTransform: 'uppercase' }}>Pozos (Tanques)</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {isla.tanques.map(tanque => {
                  const hasPhoto = !!fotos[tanque];
                  return (
                    <div key={tanque} style={{ background: 'var(--gray-50)', padding: '12px', borderRadius: '8px', border: '1px solid var(--gray-200)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--gray-800)' }}>{tanque}</strong>
                      
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <input 
                            type="number" placeholder="Litros Medidos" 
                            onChange={e => handleLitrosPozoChange(tanque, e.target.value)}
                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.9rem' }}
                          />
                        </div>
                        
                        <label style={{ cursor: 'pointer', display: 'flex', flex: 1, justifyContent: 'center', alignItems: 'center', gap: '6px', background: hasPhoto ? 'var(--success-100)' : 'white', border: `1px solid ${hasPhoto ? 'var(--success-400)' : 'var(--gray-300)'}`, padding: '8px', borderRadius: '6px', color: hasPhoto ? 'var(--success-700)' : 'var(--gray-700)', fontSize: '0.85rem', fontWeight: '500' }}>
                          <Camera size={16} />
                          {hasPhoto ? 'Lista' : 'Tomar Foto'}
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
          style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: 'var(--success-600)', color: 'white', padding: '16px', borderRadius: '12px', border: 'none', fontSize: '1.1rem', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
        >
          <Save size={24} />
          {loading ? 'Procesando Cierre...' : 'Guardar y Cerrar Turno'}
        </button>
      </div>

    </div>
  );
}
