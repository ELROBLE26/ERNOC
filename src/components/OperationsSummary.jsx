import { Activity, AlertTriangle, BadgeCheck, Building2, Radio, Wrench } from 'lucide-react';

const SUMMARY_ITEMS = [
  { key: 'total', label: 'Buses filtrados', icon: Building2 },
  { key: 'porcentajeOperatividad', label: 'Operatividad', suffix: '%', icon: Activity },
  { key: 'operativos', label: 'Operativos', icon: BadgeCheck },
  { key: 'noOperativos', label: 'No operativos', icon: AlertTriangle },
  { key: 'conPanne', label: 'En panne', icon: AlertTriangle },
  { key: 'enMantencion', label: 'Mantencion', icon: Wrench },
];

export function OperationsSummary({ counters, activeFiltersCount, nfcActive, sourceReady }) {
  return (
    <section className="ops-summary">
      {SUMMARY_ITEMS.map((item) => {
        const Icon = item.icon;

        return (
          <article className="ops-card" key={item.key}>
            <div className="ops-card-icon">
              <Icon size={16} aria-hidden="true" />
            </div>
            <div>
              <span>{item.label}</span>
              <strong>
                {counters[item.key]}
                {item.suffix ?? ''}
              </strong>
            </div>
          </article>
        );
      })}
      <article className="ops-card ops-card-wide">
        <div className={`ops-card-icon ${nfcActive ? 'ops-icon-live' : ''}`}>
          <Radio size={16} aria-hidden="true" />
        </div>
        <div>
          <span>NFC / filtros / datos</span>
          <strong>
            {nfcActive ? 'NFC activo' : 'NFC inactivo'} · {activeFiltersCount} filtros · {sourceReady ? 'Supabase' : 'Pendiente'}
          </strong>
        </div>
      </article>
    </section>
  );
}

