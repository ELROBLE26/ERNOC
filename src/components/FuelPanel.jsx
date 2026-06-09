import { useState, useMemo, useRef } from 'react';
import {
  Fuel,
  UploadCloud,
  Trash2,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Droplet,
  BarChart3,
  FileSpreadsheet,
  TrendingUp,
  Bus,
  Hash,
  Download,
  ChevronDown,
  ChevronUp,
  Filter,
  GaugeCircle,
  X,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useFuelData } from '../hooks/useFuelData';

/* ── Helpers ────────────────────────────────────────────────── */
const fmt = (n) =>
  typeof n === 'number'
    ? n.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 1 })
    : '0';

const pct = (part, total) =>
  total > 0 ? ((part / total) * 100).toFixed(1) : '0.0';

/* ── Component ──────────────────────────────────────────────── */
export function FuelPanel({ rows, fuelData, onSaveCell }) {
  const { fuelRecords, telemetryRecords, lastUploadDate, fileName, telemetryFileName, parseFile, parseTelemetryFile, clearFuelData } = fuelData;
  const fileRef = useRef(null);
  const telemetryRef = useRef(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('surtidores');
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [terminalFilter, setTerminalFilter] = useState('Todos');
  const [ubicacionFilter, setUbicacionFilter] = useState('Todas');

  /* ── File Upload ──────────────────────────────────────────── */
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      await parseFile(file);
    } catch (err) {
      setError(err.message || 'Error al procesar el archivo.');
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleTelemetryUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      await parseTelemetryFile(file);
    } catch (err) {
      setError(err.message || 'Error al procesar el archivo de telemetría.');
    } finally {
      setLoading(false);
      if (telemetryRef.current) telemetryRef.current.value = '';
    }
  };

  /* ── Analytics ────────────────────────────────────────────── */
  const analytics = useMemo(() => {
    // Per-surtidor
    const surtMap = new Map();
    let totalLitros = 0;
    let totalRegistros = 0;
    const turnoMap = new Map();
    const terminalSet = new Set();

    fuelRecords.forEach((r) => {
      const s = surtMap.get(r.surtidor) || { litros: 0, count: 0, buses: new Set() };
      s.litros += r.litros;
      s.count += 1;
      if (r.cod) s.buses.add(r.cod);
      if (r.ppu) s.buses.add(r.ppu);
      surtMap.set(r.surtidor, s);

      totalLitros += r.litros;
      totalRegistros += 1;

      if (r.turno) {
        const t = turnoMap.get(r.turno) || { litros: 0, count: 0 };
        t.litros += r.litros;
        t.count += 1;
        turnoMap.set(r.turno, t);
      }

      if (r.terminal) terminalSet.add(r.terminal);
    });

    const surtidores = Array.from(surtMap.entries())
      .map(([nombre, d]) => ({
        nombre,
        litros: d.litros,
        count: d.count,
        busesUnicos: d.buses.size,
        promedio: d.count > 0 ? d.litros / d.count : 0,
        pctTotal: totalLitros > 0 ? (d.litros / totalLitros) * 100 : 0,
      }))
      .sort((a, b) => b.litros - a.litros);

    const turnos = Array.from(turnoMap.entries())
      .map(([nombre, d]) => ({ nombre, ...d }))
      .sort((a, b) => b.litros - a.litros);

    // Unique buses in file
    const fuelBusesSet = new Set();
    fuelRecords.forEach((r) => {
      const key = r.cod || r.ppu;
      if (key) fuelBusesSet.add(key);
    });

    // Max surtidor
    const maxSurt = surtidores.length > 0 ? surtidores[0] : null;
    const promedioGlobal = totalRegistros > 0 ? totalLitros / totalRegistros : 0;

    return {
      surtidores,
      turnos,
      totalLitros,
      totalRegistros,
      uniqueBusesInFile: fuelBusesSet.size,
      maxSurt,
      promedioGlobal,
      terminals: Array.from(terminalSet),
    };
  }, [fuelRecords]);

  /* ── Fleet Cross-reference ────────────────────────────────── */
  const { cargados, noCargados, desconocidos } = useMemo(() => {
    // Build lookup maps from fuel records
    const fuelByCod = new Map();
    const fuelByPpu = new Map();

    fuelRecords.forEach((r) => {
      if (r.cod) {
        const key = r.cod.toString().trim();
        if (!fuelByCod.has(key)) fuelByCod.set(key, []);
        fuelByCod.get(key).push(r);
      }
      if (r.ppu) {
        const key = r.ppu.toString().trim().toUpperCase();
        if (!fuelByPpu.has(key)) fuelByPpu.set(key, []);
        fuelByPpu.get(key).push(r);
      }
    });

    const matchedCods = new Set();
    const matchedPpus = new Set();
    const cargadosList = [];
    const noCargadosList = [];

    rows.forEach((bus) => {
      const busCod = bus.cod ? bus.cod.toString().trim() : '';
      const busPpu = bus.ppu ? bus.ppu.toString().trim().toUpperCase() : '';

      const cargas = [];
      if (busCod && fuelByCod.has(busCod)) {
        cargas.push(...fuelByCod.get(busCod));
        matchedCods.add(busCod);
      }
      if (busPpu && fuelByPpu.has(busPpu)) {
        // Avoid duplicates if same record already added by cod
        const existingIdxs = new Set(cargas.map((c) => c._idx));
        fuelByPpu.get(busPpu).forEach((c) => {
          if (!existingIdxs.has(c._idx)) cargas.push(c);
        });
        matchedPpus.add(busPpu);
      }

      let pctComb = '-';
      if (telemetryRecords && telemetryRecords.length > 0) {
        const tRecord = telemetryRecords.find(t => 
           (t.codigoRegistro && t.codigoRegistro === busPpu) || 
           (t.codigoInterno && t.codigoInterno === busCod)
        );
        if (tRecord && tRecord.valor !== undefined && tRecord.valor !== '') {
          pctComb = tRecord.valor + '%';
        }
      }

      if (cargas.length > 0) {
        const totalLitros = cargas.reduce((sum, c) => sum + c.litros, 0);
        const surtidoresUsados = [...new Set(cargas.map((c) => c.surtidor))];
        cargadosList.push({
          ...bus,
          totalLitros,
          cargasCount: cargas.length,
          surtidores: surtidoresUsados.join(', '),
          promedioCarga: cargas.length > 0 ? totalLitros / cargas.length : 0,
          pctComb,
        });
      } else {
        noCargadosList.push({ ...bus, pctComb });
      }
    });

    // Detect fuel records that don't match any fleet bus → desconocidos
    const desconocidosList = [];
    const seenDesconocidos = new Set();
    fuelRecords.forEach((r) => {
      const codKey = r.cod ? r.cod.toString().trim() : '';
      const ppuKey = r.ppu ? r.ppu.toString().trim().toUpperCase() : '';
      const isMatched =
        (codKey && matchedCods.has(codKey)) ||
        (ppuKey && matchedPpus.has(ppuKey));
      if (!isMatched) {
        const uniqueKey = codKey || ppuKey;
        if (uniqueKey && !seenDesconocidos.has(uniqueKey)) {
          seenDesconocidos.add(uniqueKey);
          desconocidosList.push(r);
        }
      }
    });

    return {
      cargados: cargadosList,
      noCargados: noCargadosList,
      desconocidos: desconocidosList,
    };
  }, [fuelRecords, rows, telemetryRecords]);

  /* ── Filter + Search + Sort ───────────────────────────────── */
  const applyFilters = (list) => {
    let result = list;
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(
        (b) =>
          (b.cod && b.cod.toString().toLowerCase().includes(lower)) ||
          (b.ppu && b.ppu.toLowerCase().includes(lower)) ||
          (b.terminal && b.terminal.toLowerCase().includes(lower))
      );
    }
    if (terminalFilter !== 'Todos') {
      result = result.filter(
        (b) => b.terminal && b.terminal.toLowerCase() === terminalFilter.toLowerCase()
      );
    }
    if (ubicacionFilter !== 'Todas') {
      result = result.filter(
        (b) => {
          const ubi = b.ubicacion ? b.ubicacion.toLowerCase() : '';
          const filterLower = ubicacionFilter.toLowerCase();
          return ubi.includes(filterLower);
        }
      );
    }
    if (sortField) {
      result = [...result].sort((a, b) => {
        const va = a[sortField] ?? '';
        const vb = b[sortField] ?? '';
        if (typeof va === 'number' && typeof vb === 'number') {
          return sortDir === 'asc' ? va - vb : vb - va;
        }
        return sortDir === 'asc'
          ? va.toString().localeCompare(vb.toString())
          : vb.toString().localeCompare(va.toString());
      });
    }
    return result;
  };

  const filteredCargados = applyFilters(cargados);
  const filteredNoCargados = applyFilters(noCargados);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? (
      <ChevronUp size={12} />
    ) : (
      <ChevronDown size={12} />
    );
  };

  /* ── Terminal options ─────────────────────────────────────── */
  const terminalOptions = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => { if (r.terminal) set.add(r.terminal); });
    return ['Todos', ...Array.from(set).sort()];
  }, [rows]);

  const ubicacionOptions = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => { if (r.ubicacion && r.ubicacion.trim() !== '') set.add(r.ubicacion.trim()); });
    return ['Todas', ...Array.from(set).sort()];
  }, [rows]);

  /* ── XLSX Export ────────────────────────────────────────────── */
  const exportXlsx = (data, name) => {
    if (!data || data.length === 0) return;
    
    let rowsForExport = [];
    
    if (name === 'nocargados') {
      rowsForExport = data.map(r => ({
        PPU: r.ppu || '',
        'N° Interno': r.cod || '',
        Estado: r.estado || '',
        'Ubicación Interna': r.ubicacion || '',
        '% Tanque': r.pctComb || '-',
      }));
    } else {
      const keys = Object.keys(data[0]).filter((k) => !k.startsWith('_'));
      rowsForExport = data.map(r => {
        const obj = {};
        keys.forEach(k => obj[k] = r[k]);
        return obj;
      });
    }

    const worksheet = XLSX.utils.json_to_sheet(rowsForExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");
    const filename = `combustible_${name}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  /* ── RENDER: Empty state ──────────────────────────────────── */
  if (fuelRecords.length === 0) {
    return (
      <div className="fuel-panel">
        <FuelHeaderBar />
        {error && (
          <div className="banner banner-error">
            <AlertCircle size={14} /> {error}
          </div>
        )}
        <div className="fuel-empty-state">
          <div className="fuel-empty-card">
            <div className="fuel-empty-icon-ring">
              <Fuel size={40} />
            </div>
            <h3>Subir Reporte de Combustible</h3>
            <p>
              Importa el archivo Excel o HTML con los registros de carga de
              combustible para analizar surtidores, cruzar con la flota y generar
              informes detallados.
            </p>
            <div className="fuel-empty-formats">
              <span><FileSpreadsheet size={14} /> .xlsx</span>
              <span><FileSpreadsheet size={14} /> .xls</span>
              <span><FileSpreadsheet size={14} /> .html</span>
            </div>
            <div className="fuel-empty-cols">
              <strong>Columnas detectadas automáticamente:</strong>
              <div className="fuel-empty-cols-list">
                <span>Turno</span>
                <span>Fecha / Hora</span>
                <span>Terminal</span>
                <span>N° Interno</span>
                <span>Patente</span>
                <span>Cantidad Litros</span>
                <span>Surtidor</span>
                <span>Odómetro</span>
                <span>Captador</span>
              </div>
            </div>
            <label className="fuel-upload-btn">
              <UploadCloud size={18} />
              {loading ? 'Procesando archivo...' : 'Seleccionar Archivo'}
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.html,.htm"
                onChange={handleFileUpload}
                disabled={loading}
              />
            </label>
          </div>
        </div>
      </div>
    );
  }

  /* ── RENDER: Dashboard ────────────────────────────────────── */
  return (
    <div className="fuel-panel">
      <FuelHeaderBar
        fileName={fileName}
        telemetryFileName={telemetryFileName}
        lastUploadDate={lastUploadDate}
        recordCount={fuelRecords.length}
        onClear={clearFuelData}
        onReUpload={() => fileRef.current?.click()}
        onTelemetryUpload={() => telemetryRef.current?.click()}
        loading={loading}
      />
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.html,.htm"
        onChange={handleFileUpload}
        disabled={loading}
        style={{ display: 'none' }}
      />
      <input
        ref={telemetryRef}
        type="file"
        accept=".xlsx,.xls,.html,.htm"
        onChange={handleTelemetryUpload}
        disabled={loading}
        style={{ display: 'none' }}
      />

      {error && (
        <div className="banner banner-error">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* ── KPI Cards ───────────────────────────────────────── */}
      <div className="fuel-kpi-grid">
        <KpiCard
          icon={<Droplet size={22} />}
          label="Total Litros"
          value={`${fmt(analytics.totalLitros)} L`}
          sub={`${analytics.totalRegistros} registros`}
          tone="info"
        />
        <KpiCard
          icon={<GaugeCircle size={22} />}
          label="Promedio por Carga"
          value={`${fmt(analytics.promedioGlobal)} L`}
          sub="litros/carga"
          tone="purple"
        />
        <KpiCard
          icon={<CheckCircle2 size={22} />}
          label="Buses Cargados"
          value={cargados.length.toString()}
          sub={`${pct(cargados.length, rows.length)}% de la flota`}
          tone="success"
        />
        <KpiCard
          icon={<XCircle size={22} />}
          label="Sin Carga"
          value={noCargados.length.toString()}
          sub={`${pct(noCargados.length, rows.length)}% sin combustible`}
          tone="danger"
        />
        <KpiCard
          icon={<BarChart3 size={22} />}
          label="Surtidores Activos"
          value={analytics.surtidores.length.toString()}
          sub={analytics.maxSurt ? `Top: ${analytics.maxSurt.nombre}` : '—'}
          tone="navy"
        />
        <KpiCard
          icon={<Bus size={22} />}
          label="Flota Total"
          value={rows.length.toString()}
          sub={`${desconocidos.length} fuera de flota`}
          tone="muted"
        />
      </div>

      {/* ── Tabs + Toolbar ──────────────────────────────────── */}
      <div className="fuel-content-card">
        <div className="fuel-toolbar">
          <div className="fuel-tabs-row">
            {[
              { key: 'surtidores', label: 'Surtidores', count: analytics.surtidores.length },
              { key: 'cargados', label: 'Cargados', count: cargados.length },
              { key: 'nocargados', label: 'Sin Carga', count: noCargados.length },
              { key: 'detalle', label: 'Detalle Completo', count: fuelRecords.length },
            ].map((tab) => (
              <button
                key={tab.key}
                className={`fuel-tab ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
                <span className="fuel-tab-badge">{tab.count}</span>
              </button>
            ))}
          </div>
          <div className="fuel-toolbar-actions">
            <div className="fuel-search-box">
              <Search size={14} />
              <input
                type="text"
                placeholder="Buscar por PPU, N° Interno..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button className="fuel-search-clear" onClick={() => setSearchTerm('')}>
                  <X size={12} />
                </button>
              )}
            </div>
            <div className="fuel-terminal-filter">
              <Filter size={12} />
              <select
                value={terminalFilter}
                onChange={(e) => setTerminalFilter(e.target.value)}
              >
                {terminalOptions.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="fuel-terminal-filter">
              <Filter size={12} />
              <select
                value={ubicacionFilter}
                onChange={(e) => setUbicacionFilter(e.target.value)}
              >
                {ubicacionOptions.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── Tab Content ─────────────────────────────────── */}
        <div className="fuel-tab-body">
          {activeTab === 'surtidores' && (
            <SurtidoresView
              surtidores={analytics.surtidores}
              turnos={analytics.turnos}
              totalLitros={analytics.totalLitros}
            />
          )}
          {activeTab === 'cargados' && (
            <CargadosTable
              data={filteredCargados}
              totalFlota={rows.length}
              sortField={sortField}
              toggleSort={toggleSort}
              SortIcon={SortIcon}
              onExport={() => exportXlsx(filteredCargados, 'cargados')}
            />
          )}
          {activeTab === 'nocargados' && (
            <NoCargadosTable
              data={filteredNoCargados}
              totalFlota={rows.length}
              sortField={sortField}
              toggleSort={toggleSort}
              SortIcon={SortIcon}
              onExport={() => exportXlsx(filteredNoCargados, 'nocargados')}
              onSaveCell={onSaveCell}
            />
          )}
          {activeTab === 'detalle' && (
            <DetalleTable
              records={fuelRecords}
              searchTerm={searchTerm}
              onExport={() => exportXlsx(fuelRecords, 'detalle_completo')}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────── */

function FuelHeaderBar({ fileName, telemetryFileName, lastUploadDate, recordCount, onClear, onReUpload, onTelemetryUpload, loading }) {
  return (
    <section className="panel fuel-header-panel">
      <div className="fuel-header-row">
        <div className="fuel-header-left">
          <div className="panel-title-row">
            <Fuel size={14} style={{ color: 'var(--navy-700)' }} aria-hidden="true" />
            <div>
              <h2>Control de Combustible</h2>
              <p className="panel-subtitle">
                Análisis de cargas por surtidor · Cuadre con flota operativa · Informes detallados
              </p>
            </div>
          </div>
        </div>
        {(fileName || recordCount > 0) && (
          <div className="fuel-header-right">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div className="fuel-file-pill">
                <FileSpreadsheet size={12} />
                <span>{fileName || 'Datos de Combustible'}</span>
                <span className="fuel-file-meta">
                  {recordCount} registros · {lastUploadDate
                    ? new Date(lastUploadDate).toLocaleString('es-CL')
                    : '—'}
                </span>
              </div>
              {telemetryFileName && (
                <div className="fuel-file-pill" style={{ backgroundColor: 'var(--blue-50)', color: 'var(--blue-700)' }}>
                  <FileSpreadsheet size={12} />
                  <span>{telemetryFileName}</span>
                  <span className="fuel-file-meta">Telemetría (%)</span>
                </div>
              )}
            </div>
            <div className="fuel-header-btns">
              <button
                className="secondary-button icon-button"
                type="button"
                onClick={onTelemetryUpload}
                disabled={loading}
              >
                <UploadCloud size={14} />
                <span>Subir Telemetría (%)</span>
              </button>
              <button
                className="secondary-button icon-button"
                type="button"
                onClick={onReUpload}
                disabled={loading}
              >
                <UploadCloud size={14} />
                <span>Subir Cargas</span>
              </button>
              <button
                className="danger-button icon-button"
                type="button"
                onClick={() => {
                  if (window.confirm('¿Seguro que deseas limpiar todo el análisis de combustible de la base de datos? Esto afectará a todos los usuarios.')) {
                    onClear();
                  }
                }}
              >
                <Trash2 size={14} />
                <span>Limpiar Base de Datos</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function KpiCard({ icon, label, value, sub, tone }) {
  return (
    <div className={`fuel-kpi fuel-kpi-${tone}`}>
      <div className="fuel-kpi-icon">{icon}</div>
      <div className="fuel-kpi-body">
        <span className="fuel-kpi-label">{label}</span>
        <strong className="fuel-kpi-value">{value}</strong>
        <span className="fuel-kpi-sub">{sub}</span>
      </div>
    </div>
  );
}

/* ── Surtidores View ────────────────────────────────────────── */
function SurtidoresView({ surtidores, turnos, totalLitros }) {
  const maxLitros = surtidores.length > 0 ? surtidores[0].litros : 1;

  return (
    <div className="surtidores-view">
      <div className="surtidores-chart-section">
        <div className="surtidores-chart-header">
          <h3><BarChart3 size={16} /> Distribución por Surtidor</h3>
          <span className="surtidores-total">Total: {fmt(totalLitros)} L</span>
        </div>
        <div className="surtidores-bars">
          {surtidores.map((s) => (
            <div key={s.nombre} className="surt-bar-row">
              <span className="surt-bar-label">{s.nombre}</span>
              <div className="surt-bar-track">
                <div
                  className="surt-bar-fill"
                  style={{ width: `${(s.litros / maxLitros) * 100}%` }}
                />
              </div>
              <span className="surt-bar-value">{fmt(s.litros)} L</span>
              <span className="surt-bar-pct">{s.pctTotal.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="surtidores-details-grid">
        {surtidores.map((s) => (
          <div key={s.nombre} className="surt-detail-card">
            <div className="surt-detail-top">
              <div className="surt-detail-name">
                <Fuel size={16} />
                <h4>{s.nombre}</h4>
              </div>
              <span className="surt-detail-pct-badge">{s.pctTotal.toFixed(1)}%</span>
            </div>
            <div className="surt-detail-stats">
              <div className="surt-stat">
                <span>Total Litros</span>
                <strong>{fmt(s.litros)}</strong>
              </div>
              <div className="surt-stat">
                <span>Cargas</span>
                <strong>{s.count}</strong>
              </div>
              <div className="surt-stat">
                <span>Buses Únicos</span>
                <strong>{s.busesUnicos}</strong>
              </div>
              <div className="surt-stat">
                <span>Promedio</span>
                <strong>{fmt(s.promedio)} L</strong>
              </div>
            </div>
          </div>
        ))}
      </div>

      {turnos.length > 0 && (
        <div className="turnos-section">
          <h3><TrendingUp size={16} /> Resumen por Turno</h3>
          <div className="turnos-grid">
            {turnos.map((t) => (
              <div key={t.nombre} className="turno-card">
                <span className="turno-label">{t.nombre || 'Sin turno'}</span>
                <strong className="turno-value">{fmt(t.litros)} L</strong>
                <span className="turno-count">{t.count} cargas</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Cargados Table ─────────────────────────────────────────── */
function CargadosTable({ data, totalFlota, sortField, toggleSort, SortIcon, onExport }) {
  return (
    <div className="fuel-table-section">
      <div className="fuel-table-header">
        <div className="fuel-table-info">
          <CheckCircle2 size={16} style={{ color: 'var(--success-600)' }} />
          <strong>{data.length}</strong> buses cargaron combustible
          <span className="fuel-table-pct">
            ({pct(data.length, totalFlota)}% de la flota)
          </span>
        </div>
        <button className="secondary-button" onClick={onExport} disabled={data.length === 0}>
          <Download size={13} /> Exportar Excel
        </button>
      </div>
      <div className="fuel-table-scroll">
        <table className="fuel-table">
          <thead>
            <tr>
              <th className="fuel-th-sortable" onClick={() => toggleSort('cod')}>
                N° Interno <SortIcon field="cod" />
              </th>
              <th className="fuel-th-sortable" onClick={() => toggleSort('ppu')}>
                PPU <SortIcon field="ppu" />
              </th>
              <th>Terminal</th>
              <th className="fuel-th-sortable" onClick={() => toggleSort('totalLitros')}>
                Total Litros <SortIcon field="totalLitros" />
              </th>
              <th className="fuel-th-sortable" onClick={() => toggleSort('pctComb')}>
                % Comb. <SortIcon field="pctComb" />
              </th>
              <th className="fuel-th-sortable" onClick={() => toggleSort('cargasCount')}>
                N° Cargas <SortIcon field="cargasCount" />
              </th>
              <th>Promedio</th>
              <th>Surtidor(es)</th>
              <th>Ubicación</th>
              <th>Ubic. Interna</th>
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? (
              data.map((bus) => (
                <tr key={bus.id || bus.cod || bus.ppu}>
                  <td><strong>{bus.cod}</strong></td>
                  <td className="fuel-td-mono">{bus.ppu}</td>
                  <td>{bus.terminal}</td>
                  <td className="fuel-td-highlight">{fmt(bus.totalLitros)} L</td>
                  <td className="fuel-td-center"><strong>{bus.pctComb}</strong></td>
                  <td className="fuel-td-center">{bus.cargasCount}</td>
                  <td className="fuel-td-muted">{fmt(bus.promedioCarga)} L</td>
                  <td><span className="fuel-surtidor-pill">{bus.surtidores}</span></td>
                  <td>{bus.ubicacion || '—'}</td>
                  <td>{bus.ubicacion_interna || '—'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} className="fuel-td-empty">
                  No se encontraron resultados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── No Cargados Table ──────────────────────────────────────── */
const UBICACIONES_INTERNAS = [
  "Isla 1", "Isla 2", "3 Marias", "Isla 3", "Isla 4", "Isla 5", 
  "Frente a Taller", "Taller", "Vidrios", "Rodillos", "Bandejon"
];

function NoCargadosTable({ data, totalFlota, sortField, toggleSort, SortIcon, onExport, onSaveCell }) {
  return (
    <div className="fuel-table-section">
      <div className="fuel-table-header">
        <div className="fuel-table-info">
          <XCircle size={16} style={{ color: 'var(--danger-600)' }} />
          <strong>{data.length}</strong> buses NO cargaron combustible
          <span className="fuel-table-pct">
            ({pct(data.length, totalFlota)}% de la flota)
          </span>
        </div>
        <button className="secondary-button" onClick={onExport} disabled={data.length === 0}>
          <Download size={13} /> Exportar Excel
        </button>
      </div>
      <div className="fuel-table-scroll">
        <table className="fuel-table">
          <thead>
            <tr>
              <th className="fuel-th-sortable" onClick={() => toggleSort('cod')}>
                N° Interno <SortIcon field="cod" />
              </th>
              <th className="fuel-th-sortable" onClick={() => toggleSort('ppu')}>
                PPU <SortIcon field="ppu" />
              </th>
              <th>Terminal</th>
              <th>Zona</th>
              <th>Servicio</th>
              <th className="fuel-th-sortable" onClick={() => toggleSort('pctComb')}>
                % Comb. <SortIcon field="pctComb" />
              </th>
              <th>Ubicación</th>
              <th>Ubic. Interna</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? (
              data.map((bus) => (
                <tr key={bus.id || bus.cod || bus.ppu}>
                  <td><strong>{bus.cod}</strong></td>
                  <td className="fuel-td-mono">{bus.ppu}</td>
                  <td>{bus.terminal}</td>
                  <td>{bus.zona || '—'}</td>
                  <td>{bus.servicio || '—'}</td>
                  <td className="fuel-td-center"><strong>{bus.pctComb}</strong></td>
                  <td>{bus.ubicacion || '—'}</td>
                  <td>
                    <select
                      className="fleet-select"
                      style={{
                        width: '100%',
                        padding: '4px',
                        borderRadius: '4px',
                        border: '1px solid var(--gray-200)',
                        backgroundColor: 'white',
                        color: 'var(--gray-900)',
                        fontSize: '12px'
                      }}
                      value={bus.ubicacion_interna || ''}
                      onChange={(e) => {
                        if (onSaveCell) {
                          onSaveCell(bus.id, { ubicacion_interna: e.target.value });
                        }
                      }}
                    >
                      <option value="">-- Seleccionar --</option>
                      {UBICACIONES_INTERNAS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <span className={`status-badge ${
                      bus.estado === 'Operativo' ? 'tone-success' :
                      bus.estado === 'Fuera de servicio' ? 'tone-danger' :
                      'tone-muted'
                    }`}>
                      {bus.estado || 'Sin estado'}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="fuel-td-empty">
                  No se encontraron resultados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Detalle Completo Table ─────────────────────────────────── */
function DetalleTable({ records, searchTerm, onExport }) {
  const filtered = searchTerm
    ? records.filter(
        (r) =>
          r.cod.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.ppu.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : records;

  return (
    <div className="fuel-table-section">
      <div className="fuel-table-header">
        <div className="fuel-table-info">
          <Hash size={16} style={{ color: 'var(--navy-700)' }} />
          <strong>{filtered.length}</strong> registros de carga
        </div>
        <button className="secondary-button" onClick={onExport} disabled={filtered.length === 0}>
          <Download size={13} /> Exportar Excel
        </button>
      </div>
      <div className="fuel-table-scroll">
        <table className="fuel-table fuel-table-compact">
          <thead>
            <tr>
              <th>#</th>
              <th>Turno</th>
              <th>Fecha</th>
              <th>Hora</th>
              <th>Terminal</th>
              <th>N° Interno</th>
              <th>PPU</th>
              <th>Litros</th>
              <th>Surtidor</th>
              <th>Captador</th>
              <th>Cargado por</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((r) => (
                <tr key={r._idx}>
                  <td className="fuel-td-muted">{r._idx}</td>
                  <td>
                    {r.turno && (
                      <span className={`status-pill ${r.turno.toLowerCase().includes('pm') || r.turno.toLowerCase().includes('noche') ? 'status-pill-purple' : 'status-pill-blue'}`}>
                        {r.turno}
                      </span>
                    )}
                  </td>
                  <td className="fuel-td-muted">{r.fecha}</td>
                  <td className="fuel-td-muted">{r.hora}</td>
                  <td>{r.terminal}</td>
                  <td><strong>{r.cod}</strong></td>
                  <td className="fuel-td-mono">{r.ppu}</td>
                  <td className="fuel-td-highlight">{fmt(r.litros)} L</td>
                  <td><span className="fuel-surtidor-pill">{r.surtidor}</span></td>
                  <td className="fuel-td-muted">{r.captador || '—'}</td>
                  <td className="fuel-td-muted">{r.cargadoPor || '—'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={11} className="fuel-td-empty">No se encontraron registros</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
