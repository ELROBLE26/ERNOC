import { useState, useEffect, useMemo } from 'react';
import {
  Search, Download, CheckCircle2, XCircle, FileCheck, ShieldAlert,
  Filter, RefreshCw, ChevronDown, ChevronUp, FileText, AlertTriangle,
  Eye, TrendingUp
} from 'lucide-react';
import { fetchDocumentRevisions, subscribeToDocumentRevisions } from '../lib/documentService';
import * as XLSX from 'xlsx';

const DOC_COLUMNS = [
  { key: 'permiso_circulacion', label: 'Permiso Circulación', short: 'P.CIRC' },
  { key: 'soap', label: 'SOAP', short: 'SOAP' },
  { key: 'revision_tecnica', label: 'Rev. Técnica', short: 'R.TÉC' },
  { key: 'revision_gases', label: 'Rev. Gases', short: 'R.GAS' },
  { key: 'certificado_recorrido', label: 'Cert. Recorrido', short: 'C.REC' },
  { key: 'certificado_inscripcion', label: 'Cert. Inscripción', short: 'C.INS' },
];

function StatusBadge({ value }) {
  if (value === null || value === undefined) {
    return (
      <span className="doc-badge" style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }}>
        <AlertTriangle size={13} />
        <span>PEND.</span>
      </span>
    );
  }
  if (value) {
    return (
      <span className="doc-badge doc-badge-ok">
        <CheckCircle2 size={13} />
        <span>OK</span>
      </span>
    );
  }
  return (
    <span className="doc-badge doc-badge-missing">
      <XCircle size={13} />
      <span>FALTA</span>
    </span>
  );
}

function ComplianceRing({ percentage }) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const color = percentage >= 90 ? '#16a34a' : percentage >= 70 ? '#d97706' : '#dc2626';
  const bgColor = percentage >= 90 ? '#f0fdf4' : percentage >= 70 ? '#fffbeb' : '#fef2f2';

  return (
    <div className="compliance-ring-wrapper">
      <svg width="92" height="92" viewBox="0 0 92 92">
        <circle cx="46" cy="46" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="6" />
        <circle
          cx="46" cy="46" r={radius} fill="none"
          stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.5s ease', transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
        />
      </svg>
      <div className="compliance-ring-label" style={{ color }}>
        <strong>{percentage}%</strong>
        <span>Cumplim.</span>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, bgColor, borderColor }) {
  return (
    <div className="doc-stat-card" style={{ background: bgColor, borderColor }}>
      <div className="doc-stat-icon" style={{ background: color + '20', color }}>
        <Icon size={18} />
      </div>
      <div className="doc-stat-body">
        <span className="doc-stat-value" style={{ color }}>{value}</span>
        <span className="doc-stat-label">{label}</span>
      </div>
    </div>
  );
}

export function DocumentReviewPanel({ rows }) {
  const [revisions, setRevisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'missing' | 'complete' | 'pending'
  const [terminalFilter, setTerminalFilter] = useState('Todos');
  const [sortField, setSortField] = useState(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchDocumentRevisions();
        setRevisions(data);
      } catch (err) {
        console.error('Error fetching document revisions:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
    const unsubscribe = subscribeToDocumentRevisions(() => {
      loadData();
    });

    return () => unsubscribe();
  }, []);

  const mergedData = useMemo(() => {
    return rows.map((bus) => {
      const rev = revisions.find(r => r.ppu === bus.ppu);
      if (rev) {
        const docCount = DOC_COLUMNS.filter(col => rev[col.key]).length;
        const missingCount = DOC_COLUMNS.length - docCount;
        return {
          ...bus,
          ...rev,
          hasRevision: true,
          docCount,
          missingCount,
          compliance: Math.round((docCount / DOC_COLUMNS.length) * 100),
        };
      } else {
        const emptyRev = {};
        DOC_COLUMNS.forEach(c => emptyRev[c.key] = null);
        return {
          ...bus,
          ...emptyRev,
          hasRevision: false,
          docCount: 0,
          missingCount: 0,
          compliance: null,
        };
      }
    });
  }, [rows, revisions]);

  const filteredData = useMemo(() => {
    let data = [...mergedData];

    if (terminalFilter !== 'Todos') {
      data = data.filter(item => item.terminal === terminalFilter);
    }

    if (filterMode === 'missing') {
      data = data.filter(item => item.hasRevision && item.missingCount > 0);
    } else if (filterMode === 'complete') {
      data = data.filter(item => item.hasRevision && item.missingCount === 0);
    } else if (filterMode === 'pending') {
      data = data.filter(item => !item.hasRevision);
    }

    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      data = data.filter(item =>
        (item.cod || '').toLowerCase().includes(s) ||
        (item.ppu || '').toLowerCase().includes(s)
      );
    }

    if (sortField) {
      data.sort((a, b) => {
        let aVal = a[sortField];
        let bVal = b[sortField];
        if (typeof aVal === 'boolean') { aVal = aVal ? 1 : 0; bVal = bVal ? 1 : 0; }
        if (typeof aVal === 'string') return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        return sortAsc ? aVal - bVal : bVal - aVal;
      });
    }

    return data;
  }, [mergedData, searchTerm, filterMode, terminalFilter, sortField, sortAsc]);

  const stats = useMemo(() => {
    const total = mergedData.length;
    const reviewedBuses = mergedData.filter(b => b.hasRevision);
    const totalReviewed = reviewedBuses.length;
    const pendingCount = total - totalReviewed;
    const fullCompliance = reviewedBuses.filter(b => b.missingCount === 0).length;
    const withMissing = totalReviewed - fullCompliance;
    
    const totalDocs = totalReviewed * DOC_COLUMNS.length;
    const docsOk = reviewedBuses.reduce((sum, b) => sum + b.docCount, 0);
    const globalCompliance = totalDocs > 0 ? Math.round((docsOk / totalDocs) * 100) : 0;

    const perDoc = DOC_COLUMNS.map(col => ({
      ...col,
      ok: reviewedBuses.filter(b => b[col.key] === true).length,
      missing: reviewedBuses.filter(b => b[col.key] === false).length,
    }));

    return { total, totalReviewed, pendingCount, fullCompliance, withMissing, globalCompliance, perDoc };
  }, [mergedData]);

  const terminals = useMemo(() => {
    const set = new Set(rows.map(r => r.terminal).filter(Boolean));
    return ['Todos', ...Array.from(set).sort()];
  }, [rows]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleDownload = () => {
    const dataToExport = filteredData.map((r) => ({
      'Terminal': r.terminal,
      'COD': r.cod,
      'PPU': r.ppu,
      'Tipo': r.tipo,
      'Permiso Circulación': r.permiso_circulacion ? 'SÍ' : 'NO',
      'SOAP': r.soap ? 'SÍ' : 'NO',
      'Rev. Técnica': r.revision_tecnica ? 'SÍ' : 'NO',
      'Rev. Gases': r.revision_gases ? 'SÍ' : 'NO',
      'Cert. Recorrido': r.certificado_recorrido ? 'SÍ' : 'NO',
      'Cert. Inscripción': r.certificado_inscripcion ? 'SÍ' : 'NO',
      'Cumplimiento': r.compliance + '%',
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Revisión Documentos');
    XLSX.writeFile(wb, `Revision_Documentos_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const SortHeader = ({ field, children, center }) => (
    <th
      style={{ textAlign: center ? 'center' : 'left', cursor: 'pointer', userSelect: 'none' }}
      onClick={() => handleSort(field)}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        {children}
        {sortField === field && (
          sortAsc ? <ChevronUp size={11} /> : <ChevronDown size={11} />
        )}
      </span>
    </th>
  );

  if (loading) {
    return (
      <div className="doc-review-loading">
        <div className="doc-loading-spinner" />
        <p>Cargando datos de documentación…</p>
      </div>
    );
  }

  return (
    <div className="doc-review-panel">
      {/* ── HEADER ─────────────────────────────────────────── */}
      <div className="doc-review-header">
        <div className="doc-review-header-left">
          <div className="doc-review-icon">
            <FileCheck size={18} />
          </div>
          <div>
            <h2>Centro de Documentación</h2>
            <p>Control de cumplimiento regulatorio de la flota</p>
          </div>
        </div>
        <div className="doc-review-header-actions">
          <button className="primary-button" onClick={handleDownload} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Download size={13} /> Exportar Excel
          </button>
        </div>
      </div>

      {/* ── KPI DASHBOARD ──────────────────────────────────── */}
      <div className="doc-kpi-strip">
        <div className="doc-kpi-ring-card">
          <ComplianceRing percentage={stats.globalCompliance} />
          <div className="doc-kpi-ring-text">
            <strong>Cumplimiento Global</strong>
            <span>{stats.totalReviewed} buses analizados</span>
          </div>
        </div>

        <div className="doc-kpi-cards">
          <StatCard
            icon={FileCheck}
            label="Al día"
            value={stats.fullCompliance}
            color="#16a34a"
            bgColor="#f0fdf4"
            borderColor="#bbf7d0"
          />
          <StatCard
            icon={ShieldAlert}
            label="Con faltantes"
            value={stats.withMissing}
            color="#dc2626"
            bgColor="#fef2f2"
            borderColor="#fecaca"
          />
        </div>

        <div className="doc-kpi-breakdown">
          <div className="doc-kpi-breakdown-title">
            <TrendingUp size={13} />
            <span>Desglose por Documento</span>
          </div>
          <div className="doc-kpi-bars">
            {stats.perDoc.map(doc => {
              const pct = stats.totalReviewed > 0 ? Math.round((doc.ok / stats.totalReviewed) * 100) : 0;
              const barColor = pct >= 90 ? '#16a34a' : pct >= 70 ? '#d97706' : '#dc2626';
              return (
                <div className="doc-kpi-bar-row" key={doc.key}>
                  <span className="doc-kpi-bar-label">{doc.short}</span>
                  <div className="doc-kpi-bar-track">
                    <div
                      className="doc-kpi-bar-fill"
                      style={{ width: `${pct}%`, backgroundColor: barColor }}
                    />
                  </div>
                  <span className="doc-kpi-bar-pct" style={{ color: barColor }}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── FILTERS ────────────────────────────────────────── */}
      <div className="doc-filters-bar">
        <div className="doc-search-box">
          <Search size={14} />
          <input
            type="text"
            placeholder="Buscar por COD o PPU…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="doc-filter-chips">
          <button
            className={`doc-chip ${filterMode === 'all' ? 'doc-chip-active' : ''}`}
            onClick={() => setFilterMode('all')}
          >
            Todos <span className="doc-chip-count">{mergedData.length}</span>
          </button>
          <button
            className={`doc-chip doc-chip-danger ${filterMode === 'missing' ? 'doc-chip-active' : ''}`}
            onClick={() => setFilterMode('missing')}
          >
            <AlertTriangle size={12} /> Faltantes <span className="doc-chip-count">{stats.withMissing}</span>
          </button>
          <button
            className={`doc-chip doc-chip-success ${filterMode === 'complete' ? 'doc-chip-active' : ''}`}
            onClick={() => setFilterMode('complete')}
          >
            <CheckCircle2 size={12} /> Completos <span className="doc-chip-count">{stats.fullCompliance}</span>
          </button>
          <button
            className={`doc-chip ${filterMode === 'pending' ? 'doc-chip-active' : ''}`}
            onClick={() => setFilterMode('pending')}
            style={{ backgroundColor: filterMode === 'pending' ? '#e5e7eb' : 'transparent', color: filterMode === 'pending' ? '#374151' : '#6b7280', borderColor: '#d1d5db' }}
          >
            <AlertTriangle size={12} /> Pendientes <span className="doc-chip-count">{stats.pendingCount}</span>
          </button>
        </div>

        <select
          className="doc-terminal-select"
          value={terminalFilter}
          onChange={(e) => setTerminalFilter(e.target.value)}
        >
          {terminals.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <div className="doc-results-count">
          {filteredData.length} resultado{filteredData.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* ── TABLE ──────────────────────────────────────────── */}
      <div className="doc-table-wrapper">
        <table className="doc-table">
          <thead>
            <tr>
              <th className="doc-th-sticky" style={{ width: '36px' }}>#</th>
              <SortHeader field="terminal">Terminal</SortHeader>
              <SortHeader field="cod">COD</SortHeader>
              <SortHeader field="ppu">PPU</SortHeader>
              {DOC_COLUMNS.map(col => (
                <SortHeader key={col.key} field={col.key} center>{col.short}</SortHeader>
              ))}
              <SortHeader field="compliance" center>Cumpl.</SortHeader>
              <th style={{ textAlign: 'center', width: '48px' }}>Det.</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row, idx) => {
              const isExpanded = expandedRow === row.id;
              const rowClass = !row.hasRevision ? 'doc-row-pending' : (row.missingCount > 0 ? 'doc-row-alert' : 'doc-row-ok');
              return (
                <>
                  <tr key={row.id} className={`doc-table-row ${rowClass}`}>
                    <td className="doc-td-num">{idx + 1}</td>
                    <td>{row.terminal}</td>
                    <td><strong>{row.cod}</strong></td>
                    <td className="doc-td-ppu">{row.ppu}</td>
                    {DOC_COLUMNS.map(col => (
                      <td key={col.key} style={{ textAlign: 'center' }}>
                        <StatusBadge value={row[col.key]} />
                      </td>
                    ))}
                    <td style={{ textAlign: 'center' }}>
                      <span
                        className="doc-compliance-pill"
                        style={
                          row.hasRevision ? {
                            backgroundColor: row.compliance >= 100 ? '#dcfce7' : row.compliance >= 70 ? '#fef3c7' : '#fee2e2',
                            color: row.compliance >= 100 ? '#166534' : row.compliance >= 70 ? '#92400e' : '#991b1b',
                          } : {
                            backgroundColor: '#f3f4f6',
                            color: '#6b7280'
                          }
                        }
                      >
                        {row.hasRevision ? `${row.compliance}%` : 'PEND.'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="doc-expand-btn"
                        onClick={() => setExpandedRow(isExpanded ? null : row.id)}
                        title="Ver detalle"
                      >
                        <Eye size={13} />
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${row.id}-detail`} className="doc-detail-row">
                      <td colSpan={DOC_COLUMNS.length + 5}>
                        <div className="doc-detail-content">
                          <div className="doc-detail-grid">
                            {DOC_COLUMNS.map(col => (
                              <div key={col.key} className={`doc-detail-item ${row[col.key] === null ? 'doc-detail-pending' : (row[col.key] ? 'doc-detail-ok' : 'doc-detail-missing')}`}>
                                <FileText size={16} />
                                <div>
                                  <strong>{col.label}</strong>
                                  <span>{row[col.key] === null ? 'PENDIENTE' : (row[col.key] ? 'Vigente' : 'FALTANTE')}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="doc-detail-meta">
                            <span><strong>Bus:</strong> {row.cod} · {row.ppu}</span>
                            <span><strong>Terminal:</strong> {row.terminal}</span>
                            <span><strong>Tipo:</strong> {row.tipo || '—'}</span>
                            <span><strong>Cumplimiento:</strong> {row.hasRevision ? `${row.compliance}%` : 'Pendiente'}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan={DOC_COLUMNS.length + 5} className="doc-empty-state">
                  <div className="doc-empty-content">
                    <Search size={32} />
                    <p>No se encontraron registros con los filtros aplicados.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
