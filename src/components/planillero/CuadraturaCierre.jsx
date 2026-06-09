import React, { useState, useMemo } from 'react';
import { Camera, Save, CheckCircle } from 'lucide-react';
import { useCuadratura } from '../../hooks/useCuadratura';
import { useFuelData } from '../../hooks/useFuelData';

const TANQUES_FOTOS = [
  'Tanque 16 (Isla 1)',
  'Tanque 17 (Isla 1)',
  'Tanque 118 (Isla 2)',
  'Tanque 19 (Isla 3)',
  'AdBlue (Isla 2)',
  'AdBlue (Isla 3)'
];

const SURTIDORES_LIST = ['114', '115', '116', '117', '118', '119'];

export function CuadraturaCierre() {
  const { fuelRecords } = useFuelData();
  const { saveShiftQuadrature, loading } = useCuadratura();
  
  const [numInicial, setNumInicial] = useState({});
  const [numFinal, setNumFinal] = useState({});
  const [fotos, setFotos] = useState({});
  
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Calcula litros cargados por surtidor según el Excel
  const litrosPorSurtidor = useMemo(() => {
    const map = {};
    SURTIDORES_LIST.forEach(s => map[s] = 0);
    for (const f of fuelRecords) {
      const s = String(f.surtidor || '').trim();
      if (map[s] !== undefined) {
        map[s] += Number(f.litros) || 0;
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

  // Manejar subida de foto
  const handlePhotoChange = (tanque, file) => {
    setFotos(prev => ({ ...prev, [tanque]: file }));
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

    // Validar que subieron al menos alguna foto (opcional, pero recomendado)
    const hasAnyPhoto = Object.values(fotos).some(f => f !== null);
    if (!hasAnyPhoto) {
      if (!window.confirm('No has adjuntado ninguna foto. ¿Estás seguro de cerrar el turno así?')) {
        return;
      }
    }

    const res = await saveShiftQuadrature(surtidoresData, fotos);
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
        Ingresa los numerales de cada surtidor y adjunta las fotos de los tanques para calcular el desfase del turno.
      </p>

      {errorMsg && (
        <div style={{ background: 'var(--danger-100)', color: 'var(--danger-700)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem' }}>
          {errorMsg}
        </div>
      )}

      {/* SECCIÓN 1: NUMERALES */}
      <h3 className="terminal-subtitle">1. Numerales de Surtidores</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {SURTIDORES_LIST.map(surtidor => {
          const inicial = numInicial[surtidor] || 0;
          const final = numFinal[surtidor] || 0;
          const consumo = final - inicial;
          const cargados = litrosPorSurtidor[surtidor];
          const desfase = consumo - cargados;

          return (
            <div key={surtidor} style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                <strong style={{ fontSize: '1.1rem' }}>Surtidor {surtidor}</strong>
                <span style={{ fontSize: '0.85rem', background: 'var(--info-100)', color: 'var(--info-700)', padding: '4px 8px', borderRadius: '4px' }}>
                  Cargados: {cargados.toFixed(1)} L
                </span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--gray-500)', marginBottom: '4px' }}>Numeral Inicial</label>
                  <input 
                    type="number" 
                    placeholder="0.0" 
                    onChange={e => handleNumChange(surtidor, 'inicial', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--gray-500)', marginBottom: '4px' }}>Numeral Final</label>
                  <input 
                    type="number" 
                    placeholder="0.0" 
                    onChange={e => handleNumChange(surtidor, 'final', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1rem' }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed var(--gray-200)', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--gray-600)' }}>Consumo Surtidor: <b>{consumo > 0 ? consumo.toFixed(1) : '0.0'} L</b></span>
                <span style={{ color: desfase === 0 ? 'var(--gray-500)' : desfase > 0 ? 'var(--danger-600)' : 'var(--success-600)', fontWeight: 'bold' }}>
                  Desfase: {desfase > 0 ? '+' : ''}{desfase.toFixed(1)} L
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* SECCIÓN 2: FOTOS */}
      <h3 className="terminal-subtitle" style={{ marginTop: '24px' }}>2. Fotografías de Tanques</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {TANQUES_FOTOS.map(tanque => {
          const hasPhoto = !!fotos[tanque];
          return (
            <div key={tanque} style={{ background: 'white', padding: '12px 16px', borderRadius: '8px', border: `1px solid ${hasPhoto ? 'var(--success-400)' : 'var(--border)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: '500', color: hasPhoto ? 'var(--success-700)' : 'var(--gray-700)' }}>{tanque}</span>
              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', background: hasPhoto ? 'var(--success-100)' : 'var(--gray-100)', padding: '6px 12px', borderRadius: '6px', color: hasPhoto ? 'var(--success-700)' : 'var(--gray-600)', fontSize: '0.85rem' }}>
                <Camera size={18} />
                {hasPhoto ? 'Cambiar Foto' : 'Tomar Foto'}
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  style={{ display: 'none' }}
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

      {/* SECCIÓN 3: GUARDAR */}
      <div style={{ marginTop: '32px', marginBottom: '32px' }}>
        <button 
          onClick={handleSubmit}
          disabled={loading}
          style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: 'var(--success-600)', color: 'white', padding: '16px', borderRadius: '12px', border: 'none', fontSize: '1.1rem', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
        >
          <Save size={24} />
          {loading ? 'Subiendo Fotos y Guardando...' : 'Guardar y Cerrar Turno'}
        </button>
      </div>

    </div>
  );
}
