import { useRef, useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  CalendarClock,
  CheckCircle2,
  FileSpreadsheet,
  Trash2,
  UploadCloud,
  Search,
  Moon,
  Sun,
  Wrench,
  AlertTriangle,
  ClipboardCheck,
  Clock,
  Hash,
  Bus,
  Filter,
  Download,
  ChevronDown,
  ChevronUp,
  X,
  Shield,
  Factory,
  Eye,
} from 'lucide-react';

/* ── Helpers ────────────────────────────────────────────────── */
const fmt = (n) => (typeof n === 'number' ? n.toLocaleString('es-CL') : '0');
const pct = (part, total) => (total > 0 ? ((part / total) * 100).toFixed(1) : '0.0');

const formatDate = (isoString) => {
  if (!isoString) return '—';
  const d = new Date(isoString);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const CATEGORY_COLORS = {
  danger: { bg: 'var(--danger-100)', color: 'var(--danger-600)', border: '#fca5a5' },
  warning: { bg: 'var(--warning-100)', color: 'var(--warning-600)', border: '#fcd34d' },
  info: { bg: 'var(--info-100)', color: 'var(--info-600)', border: '#7dd3fc' },
  purple: { bg: 'var(--purple-100)', color: 'var(--purple-600)', border: '#c4b5fd' },
  muted: { bg: 'var(--gray-100)', color: 'var(--gray-600)', border: 'var(--border)' },
};

const STATUS_OPTIONS = ['Pendiente', 'Llegó', 'En proceso', 'Finalizado'];

/* ── Component ──────────────────────────────────────────────── */
export function MaintenancePanel({ schedule, lastUploadDate, onParseFile, onClear, onUpdateEntry, rows }) {
  const fileInputRef = useRef(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('todos');
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [categoryFilter, setCategoryFilter] = useState('Todos');

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setParsing(true);
    setError('');
    try {
      await onParseFile(file);
    } catch (err) {
      setError(err.message || 'Error al procesar el archivo Excel.');
    } finally {
      setParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  /* ── Analytics ────────────────────────────────────────────── */
  const analytics = useMemo(() => {
    const countNight = schedule.filter((s) => s.turno === 'Mantención noche').length;
    const countDay = schedule.filter((s) => s.turno === 'Mantención día').length;

    const arrived = schedule.filter((s) => s.horaLlegada).length;
    const pending = schedule.filter((s) => !s.horaLlegada).length;

    // Category counts
    const catCounts = {};
    schedule.forEach((s) => {
      (s.categories || []).forEach((c) => {
        catCounts[c.key] = (catCounts[c.key] || 0) + 1;
      });
    });

    // Unique terminals
    const terminals = [...new Set(schedule.map((s) => s.terminal).filter(Boolean))];

    // Status counts
    const statusCounts = {};
    schedule.forEach((s) => {
      const st = s.estado || 'Pendiente';
      statusCounts[st] = (statusCounts[st] || 0) + 1;
    });

    // Fleet match: how many scheduled buses are actually in fleet?
    const fleetCods = new Set(rows.map((r) => r.cod?.toString().trim()));
    const fleetPpus = new Set(rows.map((r) => r.ppu?.toString().trim().toUpperCase()));
    const inFleet = schedule.filter(
      (s) => fleetCods.has(s.cod) || fleetPpus.has(s.ppu?.toUpperCase())
    ).length;

    // Inspector categories
    const rtgCount = catCounts['rtg'] || 0;
    const applusCount = catCounts['applus'] || 0;
    const dtpmCount = catCounts['dtpm'] || 0;
    const rechazoCount = catCounts['rechazo'] || 0;

    return {
      total: schedule.length,
      countNight,
      countDay,
      arrived,
      pending,
      catCounts,
      terminals,
      statusCounts,
      inFleet,
      rtgCount,
      applusCount,
      dtpmCount,
      rechazoCount,
    };
  }, [schedule, rows]);

  /* ── Filtering ────────────────────────────────────────────── */
  const filteredSchedule = useMemo(() => {
    let result = [...schedule];

    // Tab filter
    if (activeTab === 'noche') {
      result = result.filter((s) => s.turno === 'Mantención noche');
    } else if (activeTab === 'dia') {
      result = result.filter((s) => s.turno === 'Mantención día');
    } else if (activeTab === 'rtg') {
      result = result.filter((s) => (s.categories || []).some((c) => c.key === 'rtg'));
    } else if (activeTab === 'applus') {
      result = result.filter((s) => (s.categories || []).some((c) => c.key === 'applus'));
    } else if (activeTab === 'dtpm') {
      result = result.filter((s) => (s.categories || []).some((c) => c.key === 'dtpm'));
    }

    // Category filter dropdown
    if (categoryFilter !== 'Todos') {
      result = result.filter((s) => (s.categories || []).some((c) => c.key === categoryFilter));
    }

    // Search
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(
        (s) =>
          s.cod?.toLowerCase().includes(lower) ||
          s.ppu?.toLowerCase().includes(lower) ||
          s.detalle?.toLowerCase().includes(lower) ||
          s.terminal?.toLowerCase().includes(lower) ||
          s.numeroOT?.toLowerCase().includes(lower)
      );
    }

    // Sort
    if (sortField) {
      result.sort((a, b) => {
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
  }, [schedule, activeTab, categoryFilter, searchTerm, sortField, sortDir]);

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
    return sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />;
  };

  /* ── Excel Export ──────────────────────────────────────────── */
  const exportExcel = () => {
    if (filteredSchedule.length === 0) return;

    const data = filteredSchedule.map((s) => ({
      Turno: s.turno,
      COD: s.cod,
      PPU: s.ppu,
      Terminal: s.terminal,
      Fecha: formatDate(s.fechaProgramada),
      'Hora Llegada': s.horaLlegada || '',
      'N° OT': s.numeroOT || '',
      Estado: s.estado || 'Pendiente',
      Categorías: (s.categories || []).map((c) => c.label).join('; '),
      'Detalle Mantenimiento': s.detalle || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mantenciones");
    
    const colWidths = [
      { wch: 18 }, // Turno
      { wch: 8 },  // COD
      { wch: 10 }, // PPU
      { wch: 15 }, // Terminal
      { wch: 12 }, // Fecha
      { wch: 15 }, // Hora Llegada
      { wch: 10 }, // N° OT
      { wch: 12 }, // Estado
      { wch: 25 }, // Categorías
      { wch: 80 }  // Detalle Mantenimiento
    ];
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `mantenciones_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  /* ── Inline edit handlers ─────────────────────────────────── */
  const handleFieldChange = (scheduleItem, field, value) => {
    const idx = schedule.indexOf(scheduleItem);
    if (idx !== -1) onUpdateEntry(idx, { [field]: value });
  };

  /* ── Category filter options ──────────────────────────────── */
  const categoryOptions = useMemo(() => {
    const allCats = new Set();
    schedule.forEach((s) => (s.categories || []).forEach((c) => allCats.add(c.key)));
    return ['Todos', ...Array.from(allCats)];
  }, [schedule]);

  /* ── Render: Empty state ──────────────────────────────────── */
  if (schedule.length === 0) {
    return (
      <div className="maint-panel">
        <MaintHeader />
        {error && <div className="banner banner-error"><AlertTriangle size={14} /> {error}</div>}
        <div className="maint-empty-state">
          <div className="maint-empty-card">
            <div className="maint-empty-icon-ring">
              <Wrench size={40} />
            </div>
            <h3>Cargar Programación de Mantenciones</h3>
            <p>
              Importa el archivo Excel con la programación de mantenciones para analizar turnos,
              cruzar con la flota operativa y preparar las inspecciones.
            </p>
            <div className="maint-empty-formats">
              <span><FileSpreadsheet size={14} /> .xlsx</span>
              <span><FileSpreadsheet size={14} /> .xls</span>
            </div>
            <label className="maint-upload-btn">
              <UploadCloud size={18} />
              {parsing ? 'Procesando...' : 'Seleccionar Archivo'}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                disabled={parsing}
              />
            </label>
          </div>
        </div>
      </div>
    );
  }

  /* ── Render: Dashboard ────────────────────────────────────── */
  return (
    <div className="maint-panel">
      <MaintHeader
        lastUploadDate={lastUploadDate}
        total={schedule.length}
        onClear={onClear}
        onReUpload={() => fileInputRef.current?.click()}
        parsing={parsing}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileChange}
        disabled={parsing}
        style={{ display: 'none' }}
      />

      {error && <div className="banner banner-error"><AlertTriangle size={14} /> {error}</div>}

      {/* ── KPI Cards ───────────────────────────────────────── */}
      <div className="maint-kpi-grid">
        <KpiCard icon={<Wrench size={20} />} label="Total Programados" value={analytics.total} sub={`${analytics.countNight + analytics.countDay} buses`} tone="navy" />
        <KpiCard icon={<Moon size={20} />} label="Mantención Noche" value={analytics.countNight} sub={`${pct(analytics.countNight, analytics.total)}%`} tone="purple" />
        <KpiCard icon={<Sun size={20} />} label="Mantención Día" value={analytics.countDay} sub={`${pct(analytics.countDay, analytics.total)}%`} tone="info" />
        <KpiCard icon={<CheckCircle2 size={20} />} label="Llegaron" value={analytics.arrived} sub={`${pct(analytics.arrived, analytics.total)}% registrados`} tone="success" />
        <KpiCard icon={<Clock size={20} />} label="Pendientes" value={analytics.pending} sub="sin llegar" tone="warning" />
        <KpiCard icon={<Bus size={20} />} label="En Flota Activa" value={analytics.inFleet} sub={`de ${rows.length} buses`} tone="muted" />
      </div>

      {/* ── Inspector Tags Row ──────────────────────────────── */}
      {(analytics.rtgCount > 0 || analytics.applusCount > 0 || analytics.dtpmCount > 0 || analytics.rechazoCount > 0) && (
        <div className="maint-inspector-strip">
          <div className="maint-inspector-title">
            <Shield size={14} />
            <span>Categorías para Inspección</span>
          </div>
          <div className="maint-inspector-tags">
            {analytics.rtgCount > 0 && (
              <button
                className={`maint-cat-tag cat-danger ${activeTab === 'rtg' ? 'active' : ''}`}
                onClick={() => setActiveTab(activeTab === 'rtg' ? 'todos' : 'rtg')}
              >
                <Factory size={12} /> Planta RTG <strong>{analytics.rtgCount}</strong>
              </button>
            )}
            {analytics.applusCount > 0 && (
              <button
                className={`maint-cat-tag cat-warning ${activeTab === 'applus' ? 'active' : ''}`}
                onClick={() => setActiveTab(activeTab === 'applus' ? 'todos' : 'applus')}
              >
                <Eye size={12} /> APPLUS <strong>{analytics.applusCount}</strong>
              </button>
            )}
            {analytics.dtpmCount > 0 && (
              <button
                className={`maint-cat-tag cat-info ${activeTab === 'dtpm' ? 'active' : ''}`}
                onClick={() => setActiveTab(activeTab === 'dtpm' ? 'todos' : 'dtpm')}
              >
                <ClipboardCheck size={12} /> DTPM <strong>{analytics.dtpmCount}</strong>
              </button>
            )}
            {analytics.rechazoCount > 0 && (
              <span className="maint-cat-tag cat-danger-muted">
                <AlertTriangle size={12} /> Rechazo <strong>{analytics.rechazoCount}</strong>
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Tabs + Toolbar ──────────────────────────────────── */}
      <div className="maint-content-card">
        <div className="maint-toolbar">
          <div className="maint-tabs-row">
            {[
              { key: 'todos', label: 'Todos', count: schedule.length },
              { key: 'noche', label: 'Noche', count: analytics.countNight, icon: <Moon size={12} /> },
              { key: 'dia', label: 'Día', count: analytics.countDay, icon: <Sun size={12} /> },
            ].map((tab) => (
              <button
                key={tab.key}
                className={`maint-tab ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.icon}
                {tab.label}
                <span className="maint-tab-badge">{tab.count}</span>
              </button>
            ))}
          </div>
          <div className="maint-toolbar-actions">
            <div className="maint-search-box">
              <Search size={14} />
              <input
                type="text"
                placeholder="Buscar por COD, PPU, OT, detalle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button className="maint-search-clear" onClick={() => setSearchTerm('')}>
                  <X size={12} />
                </button>
              )}
            </div>
            {categoryOptions.length > 1 && (
              <div className="maint-filter-select">
                <Filter size={12} />
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                  {categoryOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt === 'Todos' ? 'Categoría: Todas' : opt.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button className="secondary-button" onClick={exportExcel} disabled={filteredSchedule.length === 0}>
              <Download size={13} /> Excel
            </button>
          </div>
        </div>

        {/* ── Table ──────────────────────────────────────────── */}
        <div className="maint-table-scroll">
          <table className="maint-table">
            <thead>
              <tr>
                <th className="maint-th-sort" onClick={() => toggleSort('turno')}>
                  Turno <SortIcon field="turno" />
                </th>
                <th className="maint-th-sort" onClick={() => toggleSort('cod')}>
                  COD <SortIcon field="cod" />
                </th>
                <th className="maint-th-sort" onClick={() => toggleSort('ppu')}>
                  PPU <SortIcon field="ppu" />
                </th>
                <th>Hora Llegada</th>
                <th>N° OT</th>
                <th>Terminal</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Categorías</th>
                <th>Detalle Mantenimiento</th>
              </tr>
            </thead>
            <tbody>
              {filteredSchedule.length > 0 ? (
                filteredSchedule.map((row, idx) => {
                  return (
                    <tr key={`${row.cod}-${idx}`} className={row.horaLlegada ? 'maint-row-arrived' : ''}>
                      <td>
                        <span className={`status-pill ${row.turno.includes('noche') ? 'status-pill-purple' : 'status-pill-blue'}`}>
                          {row.turno.includes('noche') ? <Moon size={10} /> : <Sun size={10} />}
                          {row.turno.includes('noche') ? 'Noche' : 'Día'}
                        </span>
                      </td>
                      <td><strong>{row.cod}</strong></td>
                      <td className="maint-td-mono">{row.ppu}</td>
                      <td>
                        <input
                          type="time"
                          lang="en-GB"
                          className="maint-inline-input"
                          value={row.horaLlegada || ''}
                          onChange={(e) => handleFieldChange(row, 'horaLlegada', e.target.value)}
                          title="Registrar hora de llegada"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="maint-inline-input maint-ot-input"
                          placeholder="—"
                          value={row.numeroOT || ''}
                          onChange={(e) => handleFieldChange(row, 'numeroOT', e.target.value)}
                          title="Número de OT"
                        />
                      </td>
                      <td>{row.terminal}</td>
                      <td>{formatDate(row.fechaProgramada)}</td>
                      <td>
                        <select
                          className={`maint-status-select maint-status-${(row.estado || 'Pendiente').toLowerCase().replace(/\s/g, '-')}`}
                          value={row.estado || 'Pendiente'}
                          onChange={(e) => handleFieldChange(row, 'estado', e.target.value)}
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <div className="maint-cat-cell">
                          {(row.categories || []).map((cat) => (
                            <span
                              key={cat.key}
                              className="maint-cat-micro"
                              style={{
                                background: CATEGORY_COLORS[cat.color]?.bg,
                                color: CATEGORY_COLORS[cat.color]?.color,
                                borderColor: CATEGORY_COLORS[cat.color]?.border,
                              }}
                            >
                              {cat.label}
                            </span>
                          ))}
                          {(!row.categories || row.categories.length === 0) && (
                            <span className="maint-td-muted">—</span>
                          )}
                        </div>
                      </td>
                      <td className="maint-detalle-cell">
                        <span className="maint-detalle-text" title={row.detalle}>
                          {row.detalle || '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="maint-td-empty">No se encontraron resultados</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Summary Footer ────────────────────────────────── */}
        <div className="maint-table-footer">
          <span>
            Mostrando <strong>{filteredSchedule.length}</strong> de {schedule.length} buses
          </span>
          <span>
            {analytics.arrived} llegaron · {analytics.pending} pendientes
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────── */

function MaintHeader({ lastUploadDate, total, onClear, onReUpload, parsing }) {
  return (
    <section className="panel maint-header-panel">
      <div className="maint-header-row">
        <div className="panel-title-row">
          <CalendarClock size={14} style={{ color: 'var(--navy-700)' }} aria-hidden="true" />
          <div>
            <h2>Mantenciones Programadas</h2>
            <p className="panel-subtitle">
              Programación de mantención · Control de llegada · Seguimiento de OT · Inspecciones
            </p>
          </div>
        </div>
        {total > 0 && (
          <div className="maint-header-right">
            <div className="maint-file-pill">
              <FileSpreadsheet size={12} />
              <span>{total} buses programados</span>
              <span className="maint-file-meta">
                {lastUploadDate ? new Date(lastUploadDate).toLocaleString('es-CL') : '—'}
              </span>
            </div>
            <div className="maint-header-btns">
              <button className="secondary-button icon-button" type="button" onClick={onReUpload} disabled={parsing}>
                <UploadCloud size={14} /><span>Recargar</span>
              </button>
              <button className="danger-button icon-button" type="button" onClick={onClear}>
                <Trash2 size={14} /><span>Limpiar</span>
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
    <div className={`maint-kpi maint-kpi-${tone}`}>
      <div className="maint-kpi-icon">{icon}</div>
      <div className="maint-kpi-body">
        <span className="maint-kpi-label">{label}</span>
        <strong className="maint-kpi-value">{value}</strong>
        <span className="maint-kpi-sub">{sub}</span>
      </div>
    </div>
  );
}
