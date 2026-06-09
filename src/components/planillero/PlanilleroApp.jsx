import React, { useState, useMemo } from 'react';
import { Fuel, ListOrdered, Droplets, ArrowLeft, ClipboardCheck, AlertTriangle, CheckCircle, MapPin, BusFront } from 'lucide-react';
import { useFleetData } from '../../hooks/useFleetData';
import { useFuelData } from '../../hooks/useFuelData';
import { CuadraturaCierre } from './CuadraturaCierre';
import './Planillero.css';

export function PlanilleroApp() {
  const [activeTab, setActiveTab] = useState('pendientes');
  const [searchCargas, setSearchCargas] = useState('');
  const [filtroTerminal, setFiltroTerminal] = useState('Todos');
  const { rows } = useFleetData();
  const { fuelRecords, telemetryRecords, addManualRecord } = useFuelData();

  // Estados para Mala Carga
  const [showMalaCargaModal, setShowMalaCargaModal] = useState(false);
  const [malaCargaForm, setMalaCargaForm] = useState({ ppu: '', surtidor: '', hora: '', litros: '' });
  const [isSubmittingMC, setIsSubmittingMC] = useState(false);

  const handleOpenMalaCarga = () => {
    setMalaCargaForm({ ppu: '', surtidor: '', hora: '', litros: '' });
    setShowMalaCargaModal(true);
  };

  const handleSubmitMalaCarga = async (e) => {
    e.preventDefault();
    if (!malaCargaForm.ppu || !malaCargaForm.surtidor || !malaCargaForm.hora || !malaCargaForm.litros) {
      alert("Por favor completa todos los campos");
      return;
    }
    
    // Auto-formatear hora si le falta los 2 puntos (e.g. 1430 -> 14:30)
    let horaFinal = malaCargaForm.hora;
    if (horaFinal.length === 4 && !horaFinal.includes(':')) {
      horaFinal = horaFinal.substring(0, 2) + ':' + horaFinal.substring(2);
    }
    
    setIsSubmittingMC(true);
    const busMatch = rows.find(r => r.ppu && r.ppu.replace(/\s/g,'').toLowerCase() === malaCargaForm.ppu.replace(/\s/g,'').toLowerCase());
    
    const record = {
      ppu: malaCargaForm.ppu.toUpperCase(),
      interno: busMatch ? busMatch.numero : '',
      surtidor: malaCargaForm.surtidor,
      litros: malaCargaForm.litros,
      hora: horaFinal
    };

    const res = await addManualRecord(record);
    setIsSubmittingMC(false);
    if (res?.ok) {
      setShowMalaCargaModal(false);
    } else {
      alert("Error guardando mala carga: " + (res?.error || 'Desconocido'));
    }
  };

  // 1. Calcular Pendientes
  const pendientes = useMemo(() => {
    const clean = (s) => (s || '').toString().trim().toLowerCase();

    // Mostrar todos los buses que no tengan carga, sin filtrar por una ubicación específica aquí
    const sinCarga = rows.filter((bus) => {
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

    return conTelemetria.sort((a, b) => (a.pct ?? 100) - (b.pct ?? 100));
  }, [rows, fuelRecords, telemetryRecords]);

  const pendientesFiltrados = useMemo(() => {
    if (filtroTerminal === 'Todos') return pendientes;
    
    const normalize = (str) => (str || '').toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const filtroNorm = normalize(filtroTerminal);
    
    return pendientes.filter(b => {
      const loc1 = normalize(b.ubicacion);
      const loc2 = normalize(b.terminal);
      return loc1.includes(filtroNorm) || loc2.includes(filtroNorm);
    });
  }, [pendientes, filtroTerminal]);

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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="section-title" style={{ margin: 0 }}>Buses Pendientes</h2>
              <button 
                onClick={handleOpenMalaCarga}
                style={{ background: 'var(--badge-crit-bg)', color: 'var(--badge-crit-text)', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <AlertTriangle size={14} /> Mala Carga
              </button>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <select 
                className="planillero-search"
                style={{ width: '100%', padding: '12px', background: 'white', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)' }}
                value={filtroTerminal}
                onChange={(e) => setFiltroTerminal(e.target.value)}
              >
                <option value="Todos">Todos ({pendientes.length})</option>
                <option value="El Roble">El Roble</option>
                <option value="La Reina">La Reina</option>
                <option value="Maria Angelica">Maria Angelica</option>
                <option value="Los Agricultores">Los Agricultores</option>
              </select>
            </div>
            
            <div className="bus-list">
              {pendientesFiltrados.length === 0 && <p className="empty-state">No hay buses pendientes para esta selección.</p>}
              {pendientesFiltrados.map(bus => (
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
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                        <span className="fuel-badge unknown">Pendiente</span>
                        {bus.estado && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: bus.estado === 'Operativo' ? 'var(--badge-ok-text)' : 'var(--badge-crit-text)', fontWeight: '800' }}>
                            {bus.estado === 'Operativo' ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                            {bus.estado}
                          </span>
                        )}
                        {bus.ubicacion && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                            <MapPin size={10} /> {bus.ubicacion}
                          </span>
                        )}
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
                      {f.pct !== null && f.pct !== undefined && (
                        <span className={`fuel-badge ${f.pct <= 30 ? 'critical' : f.pct <= 50 ? 'warning' : 'ok'}`} style={{ transform: 'scale(0.8)' }}>
                          {f.pct}%
                        </span>
                      )}
                      {f.esMalaCarga && (
                        <span className="fuel-badge critical" style={{ transform: 'scale(0.8)' }}>MALA CARGA</span>
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
                <div key={islaName} className="isla-card">
                  <h3>{islaName}</h3>
                  <div className="pozos-info">
                    <Droplets size={14} /> Pozos: {info.tanques.join(' / ')}
                  </div>
                  
                  {info.data.length === 0 ? (
                    <p className="empty-state">Sin cargas registradas</p>
                  ) : (
                    info.data.map(s => (
                      <div key={s.name} className="surtidor-card">
                        <div className="surtidor-icon">
                          <Droplets size={24} />
                        </div>
                        <div className="surtidor-info">
                          <span className="surtidor-name">Surtidor {s.name}</span>
                          <span className="surtidor-count">{s.count} cargas registradas</span>
                          <span className="surtidor-litros">{s.litros.toFixed(1)} L Totales</span>
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

      {/* MODAL MALA CARGA */}
      {showMalaCargaModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', animation: 'fadeIn 0.2s ease' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', color: 'var(--text-main)' }}>Agregar Mala Carga</h3>
            <form onSubmit={handleSubmitMalaCarga} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="cuadratura-input-label">PPU (Patente)</label>
                <input 
                  type="text" 
                  className="cuadratura-input" 
                  placeholder="Ej: AB1234" 
                  value={malaCargaForm.ppu} 
                  onChange={e => setMalaCargaForm({...malaCargaForm, ppu: e.target.value.toUpperCase()})} 
                  required 
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="cuadratura-input-label">Surtidor</label>
                  <input 
                    type="text" 
                    className="cuadratura-input" 
                    placeholder="Ej: 114" 
                    value={malaCargaForm.surtidor} 
                    onChange={e => setMalaCargaForm({...malaCargaForm, surtidor: e.target.value})} 
                    required 
                  />
                </div>
                <div>
                  <label className="cuadratura-input-label">Litros</label>
                  <input 
                    type="number" 
                    step="0.1"
                    className="cuadratura-input" 
                    placeholder="Ej: 150" 
                    value={malaCargaForm.litros} 
                    onChange={e => setMalaCargaForm({...malaCargaForm, litros: e.target.value})} 
                    required 
                  />
                </div>
              </div>
              <div>
                <label className="cuadratura-input-label">Hora</label>
                <input 
                  type="text" 
                  className="cuadratura-input" 
                  placeholder="Ej: 14:30 o 1430" 
                  value={malaCargaForm.hora} 
                  onChange={e => {
                    let val = e.target.value.replace(/[^0-9:]/g, '');
                    if (val.length === 2 && !val.includes(':') && malaCargaForm.hora.length < 2) val += ':';
                    setMalaCargaForm({...malaCargaForm, hora: val});
                  }} 
                  maxLength="5"
                  required 
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowMalaCargaModal(false)} style={{ flex: 1, padding: '12px', background: 'var(--badge-unk-bg)', color: 'var(--text-main)', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>Cancelar</button>
                <button type="submit" disabled={isSubmittingMC} style={{ flex: 1, padding: '12px', background: '#e11d48', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
                  {isSubmittingMC ? 'Guardando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
