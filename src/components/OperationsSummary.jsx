import { Activity, AlertTriangle, BadgeCheck, Building2, Radio, Wrench, TrendingUp } from 'lucide-react';

const SUMMARY_ITEMS = [
  { key: 'total',                label: 'Total flota',    icon: Building2,    iconClass: '',              progress: false },
  { key: 'porcentajeOperatividad', label: 'Operatividad',  icon: TrendingUp,   iconClass: '',              progress: true, barClass: 'bar-success', suffix: '%' },
  { key: 'operativos',           label: 'Operativos',     icon: BadgeCheck,   iconClass: 'ops-icon-live',    progress: false },
  { key: 'noOperativos',         label: 'No operativos',  icon: AlertTriangle, iconClass: 'ops-icon-danger',  progress: false },
  { key: 'conPanne',             label: 'En panne',       icon: AlertTriangle, iconClass: 'ops-icon-warning', progress: false },
  { key: 'enMantencion',         label: 'Mantención',     icon: Wrench,       iconClass: 'ops-icon-info',    progress: false },
];

export function OperationsSummary({ counters, activeFiltersCount, nfcActive, sourceReady }) {
  return (
    <section className="ops-summary">
      {SUMMARY_ITEMS.map((item) => {
        const Icon = item.icon;
        const value = counters[item.key] ?? 0;

        return (
          <article className="ops-card" key={item.key}>
            <div className={`ops-card-icon ${item.iconClass}`}>
              <Icon size={15} aria-hidden="true" />
            </div>
            <div className="ops-card-body">
              <span>{item.label}</span>
              <strong>
                {value}{item.suffix ?? ''}
              </strong>
              {item.progress && (
                <div className="ops-progress">
                  <div
                    className={`ops-progress-bar ${item.barClass ?? ''}`}
                    style={{ width: `${Math.min(value, 100)}%` }}
                  />
                </div>
              )}
            </div>
          </article>
        );
      })}
      <article className="ops-card ops-card-wide">
        <div className={`ops-card-icon ${nfcActive ? 'ops-icon-live' : ''}`}>
          <Radio size={15} aria-hidden="true" />
        </div>
        <div className="ops-card-body">
          <span>NFC / filtros / fuente</span>
          <strong style={{ fontSize: '0.72rem', fontWeight: 700 }}>
            {nfcActive ? '🟢 NFC on' : '⚪ NFC off'} · {activeFiltersCount} filtros · {sourceReady ? 'Supabase ✓' : 'Sin datos'}
          </strong>
        </div>
      </article>
    </section>
  );
}
