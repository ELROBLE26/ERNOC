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
                  
                  <div className="advanced-isla-container">
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
                        <div key={idx} className="advanced-isla-card">
                          <div className={`advanced-isla-header isla-${idx + 1}`}>
                            <span className="advanced-isla-number">{idx + 1}</span>
                            <div className="advanced-isla-title-box">
                              <h3>ISLA DE COMBUSTIBLE</h3>
                              <p>
                                {islaConfig.surtMatch.map(s => `Surt. ${s}`).join(' - ')}
                                {misTanques.length > 0 && ' - '}
                                {islaConfig.tankMatch.map(t => t.replace('Isla 2', 'AdBlue').replace('Isla 3', 'AdBlue')).join(' - ')}
                              </p>
                            </div>
                          </div>
                          
                          <div className="advanced-isla-grid" style={{ flexWrap: 'wrap' }}>
                            {/* Surtidores */}
                            {misSurtidores.map(s => {
                              const photo = misFotos.find(f => String(f.tank).includes(s.surtidor));
                              return (
                                <div key={s.surtidor} className="advanced-col" style={{ minWidth: '160px' }}>
                                  <div className="advanced-col-header">
                                    <span className="label">SURTIDOR</span>
                                    <span className="manual" style={{ color: s.desfase > 0 ? 'var(--danger-600)' : s.desfase < 0 ? 'var(--success-600)' : '' }}>
                                      {s.desfase === 0 ? 'OK' : `Desfase: ${s.desfase > 0 ? '+' : ''}${s.desfase.toFixed(1)}L`}
                                    </span>
                                  </div>
                                  <div className="advanced-col-main">
                                    <span className="big-number">{s.surtidor}</span>
                                    <div className="advanced-input-wrapper" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '4px' }}>
                                      <div style={{ fontSize: '0.7rem', color: '#64748B', textAlign: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: '2px' }}>{s.inicial}</div>
                                      <div style={{ fontSize: '1.05rem', fontWeight: '800', textAlign: 'center', color: '#0F172A', paddingTop: '2px' }}>{s.final}</div>
                                    </div>
                                  </div>
                                  <div className="advanced-col-footer-text">ODÓMETRO</div>

                                  <div className="advanced-photo-zone" style={{ cursor: 'default' }}>
                                    {photo ? (
                                      <>
                                        <a href={photo.url} target="_blank" rel="noreferrer" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}>
                                          <img src={photo.url} alt={photo.tank} className="advanced-photo-img" style={{ opacity: 0.95, transition: 'opacity 0.2s' }} onMouseOver={e=>e.currentTarget.style.opacity=1} onMouseOut={e=>e.currentTarget.style.opacity=0.95} />
                                        </a>
                                        <span className="advanced-photo-tag">{s.surtidor}</span>
                                      </>
                                    ) : (
                                      <div className="advanced-photo-placeholder">
                                        <p style={{ color: '#CBD5E1' }}>Sin foto</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}

                            {/* Pozos/Tanques */}
                            {misTanques.map(t => {
                              const isAdblue = t.tanque.toLowerCase().includes('adblue');
                              const photo = misFotos.find(f => f.tank === t.tanque || String(f.tank).includes(isAdblue ? 'AdBlue' : t.tanque.split(' ')[1]));
                              const displayNum = isAdblue ? 'Adblue' : t.tanque.split(' ')[1] || t.tanque;
                              
                              return (
                                <div key={t.tanque} className="advanced-col" style={{ minWidth: '140px' }}>
                                  <div className="advanced-col-header">
                                    <span className={`label ${isAdblue ? 'blue' : ''}`}>{isAdblue ? 'ADBLUE' : 'POZO'}</span>
                                    <span className="manual">MEDICIÓN</span>
                                  </div>
                                  <div className="advanced-col-main">
                                    <span className="big-number">{displayNum}</span>
                                    <div className="advanced-input-wrapper" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 4px' }}>
                                      <div style={{ fontSize: '1.05rem', fontWeight: '800', textAlign: 'center', color: '#0F172A' }}>{t.litros_medidos} L</div>
                                    </div>
                                  </div>
                                  <div className="advanced-col-footer-text">NIVEL</div>

                                  <div className="advanced-photo-zone" style={{ cursor: 'default' }}>
                                    {photo ? (
                                      <>
                                        <a href={photo.url} target="_blank" rel="noreferrer" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}>
                                          <img src={photo.url} alt={photo.tank} className="advanced-photo-img" style={{ opacity: 0.95, transition: 'opacity 0.2s' }} onMouseOver={e=>e.currentTarget.style.opacity=1} onMouseOut={e=>e.currentTarget.style.opacity=0.95} />
                                        </a>
                                        <span className="advanced-photo-tag">{displayNum}</span>
                                      </>
                                    ) : (
                                      <div className="advanced-photo-placeholder">
                                        <p style={{ color: '#CBD5E1' }}>Sin foto</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}

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
