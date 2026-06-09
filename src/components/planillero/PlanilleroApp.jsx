import React, { useState, useMemo } from 'react';
import { Fuel, ListOrdered, Droplets, ArrowLeft, ClipboardCheck } from 'lucide-react';
import { useFleetData } from '../../hooks/useFleetData';
import { useFuelData } from '../../hooks/useFuelData';
import { CuadraturaCierre } from './CuadraturaCierre';
import './Planillero.css';

export function PlanilleroApp() {
  const [activeTab, setActiveTab] = useState('pendientes');
  const [searchCargas, setSearchCargas] = useState('');
  const { rows } = useFleetData();
  const { fuelRecords, telemetryRecords } = useFuelData();

  // 1. Calcular Pendientes por Terminal
  const pendientes = useMemo(() => {
    const ubicados = rows.filter(
      (r) => r.ubicacion === 'El Roble' || r.ubicacion === 'Los Agricultores'
    );
    
    const clean = (s) => (s || '').toString().trim().toLowerCase();

    const sinCarga = ubicados.filter((bus) => {
      const rPpu = clean(bus.ppu);
      const rNum = clean(bus.numero);
      
      const hasFuel = fuelRecords.some((f) => {
        const fPpu = clean(f.ppu);
        const fInt = clean(f.interno || f.cod);
        return (fPpu && rPpu && fPpu === rPpu) || (fInt && rNum && fInt === rNum);
      });
      return !hasFuel;
    });

    const conTelemetria = sinCarga.map(bus => {
      const rPpu = clean(bus.ppu);
      const rNum = clean(bus.numero);
      let pct = null;
      for (const t of telemetryRecords) {
        const tPpu = clean(t.codigoRegistro || t.ppu);
        const tInt = clean(t.codigoInterno || t.interno);
        if ((tPpu && tPpu === rPpu) || (tInt && tInt === rNum)) {
          pct = Number(t.valor ?? t.telemetry_pct);
          break;
        }
      }
      return { ...bus, pct };
    });

    const elRoble = conTelemetria.filter(b => b.ubicacion === 'El Roble').sort((a, b) => (a.pct ?? 100) - (b.pct ?? 100));
    const losAgri = conTelemetria.filter(b => b.ubicacion === 'Los Agricultores').sort((a, b) => (a.pct ?? 100) - (b.pct ?? 100));

    return { elRoble, losAgri };
  }, [rows, fuelRecords, telemetryRecords]);

  // 2. Orden de Carga con Buscador
  const ordenCarga = useMemo(() => {
    let list = [...fuelRecords].reverse();
    
    // Mapear porcentajes a las cargas también
    const clean = (s) => (s || '').toString().trim().toLowerCase();
    list = list.map(f => {
      let pct = null;
      const fPpu = clean(f.ppu);
      const fInt = clean(f.interno || f.cod);
      for (const t of telemetryRecords) {
        const tPpu = clean(t.codigoRegistro || t.ppu);
        const tInt = clean(t.codigoInterno || t.interno);
        if ((tPpu && tPpu === fPpu) || (tInt && tInt === fInt)) {
          pct = Number(t.valor ?? t.telemetry_pct);
          break;
        }
      }
      return { ...f, pct };
    });

    if (searchCargas.trim()) {
      const q = searchCargas.toLowerCase();
      list = list.filter(f => 
        (f.ppu && f.ppu.toLowerCase().includes(q)) || 
        (f.interno && String(f.interno).toLowerCase().includes(q))
      );
    }
    return list;
  }, [fuelRecords, telemetryRecords, searchCargas]);

  // 3. Estado de Surtidores (Por Islas)
  const islas = useMemo(() => {
    // Islas definidas
    const estructura = {
      'Isla 1': {
        surtidores: ['114', '115'],
        tanques: ['Pozo 16 (30kL)', 'Pozo 17 (30kL)'],
        data: []
      },
      'Isla 2': {
        surtidores: ['116', '117'],
        tanques: ['Pozo 118 (30kL)', 'AdBlue (4kL)'],
        data: []
      },
      'Isla 3': {
        surtidores: ['118', '119'],
        tanques: ['Pozo 19 (30kL)', 'AdBlue (4kL)'],
        data: []
      },
      'Otros / Sin Isla': {
        surtidores: [],
        tanques: [],
        data: []
      }
    };

    // Agrupar
    for (const f of fuelRecords) {
      const s = String(f.surtidor || '').trim();
      let foundIsla = 'Otros / Sin Isla';
      for (const [islaName, info] of Object.entries(estructura)) {
        if (info.surtidores.some(surt => s.includes(surt))) {
          foundIsla = islaName;
          break;
        }
      }
      
      let surtidorObj = estructura[foundIsla].data.find(x => x.name === s);
      if (!surtidorObj) {
        surtidorObj = { name: s || 'Desconocido', count: 0, litros: 0 };
        estructura[foundIsla].data.push(surtidorObj);
      }
      surtidorObj.count += 1;
      surtidorObj.litros += Number(f.litros) || 0;
    }

    // Filtrar islas vacías
    return Object.entries(estructura).filter(([_, info]) => info.data.length > 0 || info.surtidores.length > 0);
  }, [fuelRecords]);

  return (
    <div className="planillero-app">
      <header className="planillero-header">
        <button className="back-to-desktop" onClick={() => { window.location.hash = ''; window.location.reload(); }}>
          <ArrowLeft size={20} />
        </button>
        <div className="planillero-brand">
          <h1>Control Combustible</h1>
          <span>ERNOC Móvil</span>
        </div>
      </header>

      <main className="planillero-content">
        {activeTab === 'pendientes' && (
          <div className="planillero-section">
            <h2 className="section-title">Buses Pendientes</h2>
            
            <h3 className="terminal-subtitle">El Roble ({pendientes.elRoble.length})</h3>
            <div className="bus-list">
              {pendientes.elRoble.length === 0 && <p className="empty-state">No hay buses pendientes.</p>}
              {pendientes.elRoble.map(bus => (
                <div key={bus.id} className="bus-card">
                  <div className="bus-card-left">
                    <span className="bus-cod" style={{ fontSize: '1.4rem' }}>{bus.ppu}</span>
                    <span className="bus-ppu">N° {bus.numero || '-'} • {bus.tipo || 'Rígido'}</span>
                  </div>
                  <div className="bus-card-right" style={{ textAlign: 'right' }}>
                    {bus.pct !== null ? (
                      <span className={`fuel-badge ${bus.pct <= 30 ? 'critical' : bus.pct <= 50 ? 'warning' : 'ok'}`}>
                        {bus.pct}%
                      </span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <span className="fuel-badge unknown" style={{ fontSize: '0.75rem', padding: '2px 6px' }}>pendiente</span>
                        {bus.estado && <span style={{ fontSize: '0.7rem', color: bus.estado === 'Operativo' ? 'var(--success-600)' : 'var(--danger-600)', fontWeight: 'bold' }}>{bus.estado}</span>}
                        {bus.ubicacion && <span style={{ fontSize: '0.65rem', color: 'var(--gray-500)' }}>{bus.ubicacion}</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <h3 className="terminal-subtitle mt-4">Los Agricultores ({pendientes.losAgri.length})</h3>
            <div className="bus-list">
              {pendientes.losAgri.length === 0 && <p className="empty-state">No hay buses pendientes.</p>}
              {pendientes.losAgri.map(bus => (
                <div key={bus.id} className="bus-card">
                  <div className="bus-card-left">
                    <span className="bus-cod" style={{ fontSize: '1.4rem' }}>{bus.ppu}</span>
                    <span className="bus-ppu">N° {bus.numero || '-'} • {bus.tipo || 'Rígido'}</span>
                  </div>
                  <div className="bus-card-right" style={{ textAlign: 'right' }}>
                    {bus.pct !== null ? (
                      <span className={`fuel-badge ${bus.pct <= 30 ? 'critical' : bus.pct <= 50 ? 'warning' : 'ok'}`}>
                        {bus.pct}%
                      </span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <span className="fuel-badge unknown" style={{ fontSize: '0.75rem', padding: '2px 6px' }}>pendiente</span>
                        {bus.estado && <span style={{ fontSize: '0.7rem', color: bus.estado === 'Operativo' ? 'var(--success-600)' : 'var(--danger-600)', fontWeight: 'bold' }}>{bus.estado}</span>}
                        {bus.ubicacion && <span style={{ fontSize: '0.65rem', color: 'var(--gray-500)' }}>{bus.ubicacion}</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'orden' && (
          <div className="planillero-section">
            <h2 className="section-title">Orden de Carga ({fuelRecords.length})</h2>
            <input 
              type="text" 
              className="planillero-search" 
              placeholder="Buscar por PPU..." 
              value={searchCargas}
              onChange={(e) => setSearchCargas(e.target.value)}
              style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc', marginBottom: '8px', fontSize: '16px' }}
            />
            <div className="bus-list">
              {ordenCarga.length === 0 && <p className="empty-state">No hay coincidencias.</p>}
              {ordenCarga.map((f, i) => (
                <div key={i} className="bus-card carga-card">
                  <div className="carga-index">#{fuelRecords.length - i}</div>
                  <div className="bus-card-left">
                    <span className="bus-cod" style={{ fontSize: '1.3rem' }}>{f.ppu || f.interno}</span>
                    <span className="bus-surtidor">N° {f.interno} • Surtidor: {f.surtidor || '-'}</span>
                  </div>
                  <div className="bus-card-right">
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span className="litros-text">{Number(f.litros).toFixed(1)} L</span>
                      {f.pct !== null && (
                        <span className={`fuel-badge ${f.pct <= 30 ? 'critical' : f.pct <= 50 ? 'warning' : 'ok'}`} style={{ transform: 'scale(0.8)' }}>
                          {f.pct}%
                        </span>
                      )}
                    </div>
                    <span className="hora-text">{f.hora || ''}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'surtidores' && (
          <div className="planillero-section">
            <h2 className="section-title">Estado de Islas</h2>
            <div className="surtidores-grid">
              {islas.map(([islaName, info]) => (
                <div key={islaName} className="isla-card" style={{ background: 'white', borderRadius: '12px', padding: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
                  <h3 style={{ fontSize: '1.1rem', margin: '0 0 8px 0', color: 'var(--navy-700)' }}>{islaName}</h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginBottom: '12px' }}>
                    Pozos: {info.tanques.join(' / ')}
                  </div>
                  
                  {info.data.length === 0 ? (
                    <p className="empty-state" style={{ padding: '8px' }}>Sin cargas registradas</p>
                  ) : (
                    info.data.map(s => (
                      <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--gray-100)', paddingTop: '8px', marginTop: '8px' }}>
                        <div>
                          <strong style={{ display: 'block', fontSize: '0.95rem' }}>Surtidor {s.name}</strong>
                          <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{s.count} buses</span>
                        </div>
                        <div style={{ fontWeight: '800', color: 'var(--success-600)' }}>
                          {s.litros.toFixed(1)} L
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'cierre' && (
          <CuadraturaCierre />
        )}
      </main>

      <nav className="planillero-bottom-nav">
        <button className={`nav-item ${activeTab === 'pendientes' ? 'active' : ''}`} onClick={() => setActiveTab('pendientes')}>
          <Fuel size={24} /><span>Pendientes</span>
        </button>
        <button className={`nav-item ${activeTab === 'orden' ? 'active' : ''}`} onClick={() => setActiveTab('orden')}>
          <ListOrdered size={24} /><span>Cargas</span>
        </button>
        <button className={`nav-item ${activeTab === 'surtidores' ? 'active' : ''}`} onClick={() => setActiveTab('surtidores')}>
          <Droplets size={24} /><span>Islas</span>
        </button>
        <button className={`nav-item ${activeTab === 'cierre' ? 'active' : ''}`} onClick={() => setActiveTab('cierre')}>
          <ClipboardCheck size={24} /><span>Cierre</span>
        </button>
      </nav>
    </div>
  );
}
