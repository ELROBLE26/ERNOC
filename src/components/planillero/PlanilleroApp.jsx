import React, { useState, useMemo } from 'react';
import { Fuel, ListOrdered, Droplets, ArrowLeft } from 'lucide-react';
import { useFleetData } from '../../hooks/useFleetData';
import { useFuelData } from '../../hooks/useFuelData';
import './Planillero.css';

export function PlanilleroApp() {
  const [activeTab, setActiveTab] = useState('pendientes'); // 'pendientes', 'orden', 'surtidores'
  const { rows } = useFleetData();
  const { fuelRecords, telemetryRecords } = useFuelData();

  // 1. Calcular Pendientes por Terminal
  const pendientes = useMemo(() => {
    // Filtrar buses que están en El Roble o Los Agricultores
    const ubicados = rows.filter(
      (r) => r.ubicacion === 'El Roble' || r.ubicacion === 'Los Agricultores'
    );
    
    // Función de limpieza para comparación
    const clean = (s) => (s || '').toString().trim().toLowerCase();

    // Encontrar buses que NO tienen carga
    const sinCarga = ubicados.filter((bus) => {
      const rPpu = clean(bus.ppu);
      const rCod = clean(bus.cod);
      const hasFuel = fuelRecords.some((f) => 
        (f.ppu && rPpu && clean(f.ppu) === rPpu) ||
        (f.cod && rCod && clean(f.cod) === rCod) ||
        (f.interno && rCod && clean(f.interno) === rCod)
      );
      return !hasFuel;
    });

    // Mapear el porcentaje de telemetría si existe
    const conTelemetria = sinCarga.map(bus => {
      const rCod = clean(bus.cod);
      let pct = null;
      for (const t of telemetryRecords) {
        if (t.cod && clean(t.cod) === rCod) {
          pct = Number(t.pct);
          break;
        }
      }
      return { ...bus, pct };
    });

    // Separar por terminal
    const elRoble = conTelemetria.filter(b => b.ubicacion === 'El Roble').sort((a, b) => (a.pct ?? 100) - (b.pct ?? 100));
    const losAgri = conTelemetria.filter(b => b.ubicacion === 'Los Agricultores').sort((a, b) => (a.pct ?? 100) - (b.pct ?? 100));

    return { elRoble, losAgri };
  }, [rows, fuelRecords, telemetryRecords]);

  // 2. Orden de Carga (Invertido para ver el último primero, o en orden de carga)
  const ordenCarga = useMemo(() => {
    // Si asuminos que fuelRecords viene en el orden que se cargó, 
    // podemos mostrarlo tal cual o revertirlo para ver el más reciente arriba.
    return [...fuelRecords].reverse();
  }, [fuelRecords]);

  // 3. Estado de Surtidores
  const surtidores = useMemo(() => {
    const map = {};
    for (const f of fuelRecords) {
      const s = String(f.surtidor || 'Sin Asignar').trim();
      if (!map[s]) map[s] = { count: 0, litros: 0 };
      map[s].count += 1;
      map[s].litros += Number(f.litros) || 0;
    }
    return Object.entries(map).map(([name, data]) => ({ name, ...data }));
  }, [fuelRecords]);

  return (
    <div className="planillero-app">
      <header className="planillero-header">
        <button 
          className="back-to-desktop"
          onClick={() => {
            window.location.hash = '';
            window.location.reload();
          }}
        >
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
                    <span className="bus-cod">{bus.cod}</span>
                    <span className="bus-ppu">{bus.ppu}</span>
                  </div>
                  <div className="bus-card-right">
                    {bus.pct !== null ? (
                      <span className={`fuel-badge ${bus.pct <= 30 ? 'critical' : bus.pct <= 50 ? 'warning' : 'ok'}`}>
                        {bus.pct}%
                      </span>
                    ) : (
                      <span className="fuel-badge unknown">N/A</span>
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
                    <span className="bus-cod">{bus.cod}</span>
                    <span className="bus-ppu">{bus.ppu}</span>
                  </div>
                  <div className="bus-card-right">
                    {bus.pct !== null ? (
                      <span className={`fuel-badge ${bus.pct <= 30 ? 'critical' : bus.pct <= 50 ? 'warning' : 'ok'}`}>
                        {bus.pct}%
                      </span>
                    ) : (
                      <span className="fuel-badge unknown">N/A</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'orden' && (
          <div className="planillero-section">
            <h2 className="section-title">Orden de Carga ({ordenCarga.length})</h2>
            <div className="bus-list">
              {ordenCarga.length === 0 && <p className="empty-state">Aún no se ha cargado combustible.</p>}
              {ordenCarga.map((f, i) => (
                <div key={i} className="bus-card carga-card">
                  <div className="carga-index">#{ordenCarga.length - i}</div>
                  <div className="bus-card-left">
                    <span className="bus-cod">{f.interno || f.cod}</span>
                    <span className="bus-surtidor">Surtidor: {f.surtidor || '-'}</span>
                  </div>
                  <div className="bus-card-right">
                    <span className="litros-text">{Number(f.litros).toFixed(1)} L</span>
                    <span className="hora-text">{f.hora || ''}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'surtidores' && (
          <div className="planillero-section">
            <h2 className="section-title">Estado de Surtidores</h2>
            <div className="surtidores-grid">
              {surtidores.length === 0 && <p className="empty-state">No hay surtidores activos aún.</p>}
              {surtidores.map((s, i) => (
                <div key={i} className="surtidor-card">
                  <div className="surtidor-icon">
                    <Droplets size={24} />
                  </div>
                  <div className="surtidor-info">
                    <span className="surtidor-name">{s.name}</span>
                    <span className="surtidor-count">{s.count} buses cargados</span>
                    <span className="surtidor-litros">{s.litros.toFixed(1)} Litros totales</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <nav className="planillero-bottom-nav">
        <button 
          className={`nav-item ${activeTab === 'pendientes' ? 'active' : ''}`}
          onClick={() => setActiveTab('pendientes')}
        >
          <Fuel size={24} />
          <span>Pendientes</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'orden' ? 'active' : ''}`}
          onClick={() => setActiveTab('orden')}
        >
          <ListOrdered size={24} />
          <span>Cargas</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'surtidores' ? 'active' : ''}`}
          onClick={() => setActiveTab('surtidores')}
        >
          <Droplets size={24} />
          <span>Surtidores</span>
        </button>
      </nav>
    </div>
  );
}
