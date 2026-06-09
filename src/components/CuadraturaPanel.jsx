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
          const tanquesData = q.tanques_data || [];
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
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                    {[
                      {
                        title: 'Isla 1',
                        surtMatch: ['114', '115'],
                        tankMatch: ['16', '17']
                      },
                      {
                        title: 'Bomba 2',
                        surtMatch: ['116', '117'],
                        tankMatch: ['118', 'Isla 2']
                      },
                      {
                        title: 'Isla 3',
                        surtMatch: ['118', '119'],
                        tankMatch: ['19', 'Isla 3']
                      }
                    ].map((islaConfig, idx) => {
                      const misSurtidores = data.filter(s => islaConfig.surtMatch.some(m => String(s.surtidor).includes(m)));
                      const misTanques = tanquesData.filter(t => islaConfig.tankMatch.some(m => String(t.tanque).includes(m)));
                      
                      const misFotos = fotos.filter(f => {
                        const name = String(f.tank || '');
                        const isSurt = islaConfig.surtMatch.some(m => name.includes(m));
                        const isTank = islaConfig.tankMatch.some(m => name.includes(m));
                        return isSurt || isTank;
                      });

                      if (misSurtidores.length === 0 && misTanques.length === 0 && misFotos.length === 0) return null;

                      return (
                        <div key={idx} style={{ background: 'white', borderRadius: '16px', border: '1px solid var(--gray-200)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column' }}>
                          <div style={{ background: 'var(--navy-600)', color: 'white', padding: '16px', textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem', letterSpacing: '1px' }}>
                            {islaConfig.title.toUpperCase()}
                          </div>
                          
                          <div style={{ padding: '20px', flex: 1 }}>
                            {/* Surtidores */}
                            {misSurtidores.length > 0 && (
                              <div style={{ marginBottom: '24px' }}>
                                <h5 style={{ color: 'var(--navy-700)', borderBottom: '2px solid var(--navy-100)', paddingBottom: '8px', marginBottom: '16px', fontSize: '1rem' }}>Surtidores</h5>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                  {misSurtidores.map(s => (
                                    <div key={s.surtidor} style={{ background: 'var(--surface-muted)', padding: '16px', borderRadius: '12px', border: '1px solid var(--gray-200)' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                                        <strong style={{ color: 'var(--navy-900)', fontSize: '1.1rem' }}>Surtidor {s.surtidor}</strong>
                                        <span style={{ fontWeight: '800', background: s.desfase === 0 ? 'var(--gray-200)' : s.desfase > 0 ? 'var(--danger-100)' : 'var(--success-100)', color: s.desfase === 0 ? 'var(--gray-600)' : s.desfase > 0 ? 'var(--danger-700)' : 'var(--success-700)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.9rem' }}>
                                          {s.desfase > 0 ? '+' : ''}{s.desfase.toFixed(1)} L
                                        </span>
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--gray-600)', marginBottom: '6px' }}>
                                        <span>Num. Inicial:</span>
                                        <strong style={{ color: 'var(--gray-800)' }}>{s.inicial}</strong>
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--gray-600)', marginBottom: '8px' }}>
                                        <span>Num. Final:</span>
                                        <strong style={{ color: 'var(--gray-800)' }}>{s.final}</strong>
                                      </div>
                                      <div style={{ height: '1px', background: 'var(--gray-200)', margin: '12px 0' }}></div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--gray-600)', marginBottom: '6px' }}>
                                        <span>Consumo Reloj:</span>
                                        <strong style={{ color: 'var(--gray-900)' }}>{s.consumo.toFixed(1)} L</strong>
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--gray-600)' }}>
                                        <span>Cargados (App):</span>
                                        <strong style={{ color: 'var(--navy-600)' }}>{s.litros_cargados.toFixed(1)} L</strong>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Pozos/Tanques */}
                            {misTanques.length > 0 && (
                              <div style={{ marginBottom: '24px' }}>
                                <h5 style={{ color: 'var(--navy-700)', borderBottom: '2px solid var(--navy-100)', paddingBottom: '8px', marginBottom: '16px', fontSize: '1rem' }}>Pozos / Tanques</h5>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  {misTanques.map(t => (
                                    <div key={t.tanque} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-muted)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--gray-200)' }}>
                                      <span style={{ color: 'var(--gray-700)', fontWeight: '600' }}>{t.tanque}</span>
                                      <span style={{ color: 'var(--navy-800)', fontWeight: '800' }}>{t.litros_medidos} L</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Fotos */}
                            {misFotos.length > 0 && (
                              <div>
                                <h5 style={{ color: 'var(--navy-700)', borderBottom: '2px solid var(--navy-100)', paddingBottom: '8px', marginBottom: '16px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Camera size={16} /> Fotografías
                                </h5>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
                                  {misFotos.map((foto, idx) => (
                                    <div key={idx} style={{ background: 'var(--gray-100)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--gray-200)' }}>
                                      <a href={foto.url} target="_blank" rel="noreferrer" style={{ display: 'block', height: '120px', background: '#000' }}>
                                        <img src={foto.url} alt={foto.tank} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9, transition: 'opacity 0.2s ease-in-out' }} onMouseOver={e => e.currentTarget.style.opacity = 1} onMouseOut={e => e.currentTarget.style.opacity = 0.9} />
                                      </a>
                                      <div style={{ padding: '8px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--gray-700)' }}>
                                        {foto.tank}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
