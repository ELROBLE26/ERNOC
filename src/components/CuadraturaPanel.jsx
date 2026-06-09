import React from 'react';
import { useCuadratura } from '../hooks/useCuadratura';
import { Camera, Calendar, Droplets, AlertTriangle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

export function CuadraturaPanel() {
  const { quadratures, loading, error } = useCuadratura();
  const [expandedId, setExpandedId] = useState(null);

  const toggleExpand = (id) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <div className="panel-container" style={{ padding: '24px', overflowY: 'auto', height: '100%', background: 'var(--surface)' }}>
      <div className="panel-header" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--gray-900)' }}>Cuadratura de Islas</h2>
        <p style={{ color: 'var(--gray-600)' }}>Historial de cierres de turno, desfases de combustible y evidencia fotográfica.</p>
      </div>

      {loading && <p>Cargando historial...</p>}
      {error && <div style={{ color: 'red' }}>{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {quadratures.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '40px', background: 'var(--surface-muted)', borderRadius: '12px' }}>
            <p style={{ color: 'var(--gray-500)' }}>No hay cierres de turno registrados aún.</p>
          </div>
        )}

        {quadratures.map((q) => {
          const isExpanded = expandedId === q.id;
          const fecha = new Date(q.fecha || q.created_at).toLocaleString('es-CL');
          const data = q.surtidores_data || [];
          const fotos = q.fotos_tanques || q.photos || [];

          // Calcular totales del turno
          const totalCargado = data.reduce((acc, curr) => acc + (curr.litros_cargados || 0), 0);
          const totalConsumo = data.reduce((acc, curr) => acc + (curr.consumo || 0), 0);
          const totalDesfase = totalConsumo - totalCargado;

          return (
            <div key={q.id} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              {/* Header del Turno */}
              <div 
                onClick={() => toggleExpand(q.id)}
                style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: isExpanded ? 'var(--navy-50)' : 'white' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: 'var(--navy-100)', color: 'var(--navy-700)', padding: '10px', borderRadius: '8px' }}>
                    <Calendar size={24} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--gray-900)' }}>Cierre: {fecha}</h3>
                    <div style={{ display: 'flex', gap: '16px', marginTop: '4px', fontSize: '0.85rem', color: 'var(--gray-600)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Droplets size={14} /> Total Surtidores: {totalConsumo.toFixed(1)} L</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle size={14} /> Total App: {totalCargado.toFixed(1)} L</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)', display: 'block' }}>Desfase Global</span>
                    <span style={{ fontWeight: '800', fontSize: '1.1rem', color: totalDesfase === 0 ? 'var(--gray-600)' : totalDesfase > 0 ? 'var(--danger-600)' : 'var(--success-600)' }}>
                      {totalDesfase > 0 ? '+' : ''}{totalDesfase.toFixed(1)} L
                    </span>
                  </div>
                  {isExpanded ? <ChevronUp color="var(--gray-500)" /> : <ChevronDown color="var(--gray-500)" />}
                </div>
              </div>

              {/* Contenido Expandido */}
              {isExpanded && (
                <div style={{ padding: '24px', borderTop: '1px solid var(--border)', background: 'var(--surface-muted)' }}>
                  
                  {/* Desglose por Surtidor */}
                  <h4 style={{ marginBottom: '12px', color: 'var(--gray-800)' }}>Desglose por Surtidor</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                    {data.map(s => (
                      <div key={s.surtidor} style={{ background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid var(--gray-200)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <strong style={{ color: 'var(--navy-700)' }}>Surtidor {s.surtidor}</strong>
                          <span style={{ fontWeight: 'bold', color: s.desfase === 0 ? 'var(--gray-500)' : s.desfase > 0 ? 'var(--danger-600)' : 'var(--success-600)' }}>
                            {s.desfase > 0 ? '+' : ''}{s.desfase.toFixed(1)} L
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--gray-600)', marginBottom: '4px' }}>
                          <span>Numeral Inical:</span>
                          <span>{s.inicial}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--gray-600)', marginBottom: '4px' }}>
                          <span>Numeral Final:</span>
                          <span>{s.final}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--gray-600)', marginBottom: '4px', paddingTop: '4px', borderTop: '1px solid var(--gray-100)' }}>
                          <span>Consumo Reloj:</span>
                          <strong>{s.consumo.toFixed(1)} L</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--gray-600)' }}>
                          <span>Cargados en App:</span>
                          <strong>{s.litros_cargados.toFixed(1)} L</strong>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Fotografías */}
                  <h4 style={{ marginBottom: '12px', color: 'var(--gray-800)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Camera size={18} /> Evidencia Fotográfica
                  </h4>
                  {fotos.length === 0 ? (
                    <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem', fontStyle: 'italic' }}>No se adjuntaron fotografías en este turno.</p>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                      {fotos.map((foto, idx) => (
                        <div key={idx} style={{ background: 'white', padding: '8px', borderRadius: '8px', border: '1px solid var(--gray-200)', width: '200px' }}>
                          <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--gray-700)', marginBottom: '8px', textAlign: 'center' }}>
                            {foto.tank}
                          </span>
                          <a href={foto.url} target="_blank" rel="noreferrer" style={{ display: 'block', height: '140px', overflow: 'hidden', borderRadius: '4px', border: '1px solid var(--gray-100)' }}>
                            <img src={foto.url} alt={foto.tank} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </a>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
