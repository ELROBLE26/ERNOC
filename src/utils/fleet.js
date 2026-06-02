export const TERMINAL_OPTIONS = ['Todos', 'El Roble', 'La Reina'];
export const OPER_OPTIONS = ['Todos', 'OK', 'NO', 'PENDIENTE'];
export const VIDRIO_OPTIONS = ['OK', 'DAÑADO', 'PENDIENTE', 'NO APLICA'];
export const MANT_OPTIONS = ['OK', 'MANTENCIÓN', 'PENDIENTE'];
export const CALIDAD_OPTIONS = ['OK', 'OBSERVADO', 'PENDIENTE'];
export const ADQ_OPTIONS = ['OK', 'PENDIENTE', 'NO APLICA'];
export const AFT_OPTIONS = ['OK', 'PENDIENTE', 'NO APLICA'];
export const SINIES_OPTIONS = ['NO', 'SI', 'PENDIENTE'];
export const ESTADO_OPTIONS = ['OPERATIVO', 'NO OPERATIVO', 'EN PANNE', 'EN MANTENCIÓN', 'OBSERVADO', 'PENDIENTE'];

export const FILTER_DEFAULTS = {
  terminal: 'Todos',
  zona: 'Todos',
  servicio: 'Todos',
  estado: 'Todos',
  operatividad: 'Todos',
  search: '',
};

export const CREATE_DEFAULTS = {
  terminal: 'El Roble',
  zona: '',
  servicio: '',
  modelo: '',
  asignacion: '',
  tipo: 'RIGIDO',
  estado: 'PENDIENTE',
  ubicacion: '',
  oper: 'PENDIENTE',
  vidrio: 'PENDIENTE',
  mant: 'PENDIENTE',
  calidad: 'PENDIENTE',
  adq: 'PENDIENTE',
  aft: 'PENDIENTE',
  sinies: 'NO',
  detalle_panne: '',
  observaciones: '',
};

const SEARCH_FIELDS = [
  'cod',
  'ppu',
  'terminal',
  'zona',
  'servicio',
  'modelo',
  'asignacion',
  'tipo',
  'oper',
  'vidrio',
  'mant',
  'calidad',
  'adq',
  'aft',
  'sinies',
  'detalle_panne',
  'observaciones',
  'ubicacion',
  'estado',
];

export function normalizeText(value) {
  return String(value ?? '').trim();
}

export function normalizeCompare(value) {
  return normalizeText(value).toLowerCase();
}

export function getFieldOptions(rows, key) {
  const values = [...new Set(rows.map((row) => normalizeText(row[key])).filter(Boolean))];
  return ['Todos', ...values.sort((left, right) => left.localeCompare(right, 'es'))];
}

export function applyFleetFilters(rows, filters) {
  const searchValue = normalizeCompare(filters.search);

  return rows.filter((row) => {
    if (filters.terminal !== 'Todos' && row.terminal !== filters.terminal) {
      return false;
    }

    if (filters.zona !== 'Todos' && normalizeText(row.zona) !== filters.zona) {
      return false;
    }

    if (filters.servicio !== 'Todos' && normalizeText(row.servicio) !== filters.servicio) {
      return false;
    }

    if (filters.estado !== 'Todos' && normalizeText(row.estado) !== filters.estado) {
      return false;
    }

    if (filters.operatividad !== 'Todos' && normalizeText(row.oper) !== filters.operatividad) {
      return false;
    }

    if (!searchValue) {
      return true;
    }

    return SEARCH_FIELDS.some((field) => normalizeCompare(row[field]).includes(searchValue));
  });
}

export function computeCounters(rows) {
  const total = rows.length;
  const operativos = rows.filter((row) => isOperative(row)).length;
  const noOperativos = rows.filter((row) => isNonOperative(row)).length;
  const enMantencion = rows.filter((row) => matchesAny(row.estado, ['EN MANTENCIÓN']) || matchesAny(row.mant, ['MANTENCIÓN'])).length;
  const observados = rows.filter((row) => matchesAny(row.estado, ['OBSERVADO']) || matchesAny(row.calidad, ['OBSERVADO'])).length;
  const conPanne = rows.filter((row) => matchesAny(row.estado, ['EN PANNE']) || normalizeText(row.detalle_panne)).length;
  const problemaVidrio = rows.filter((row) => matchesAny(row.vidrio, ['DAÑADO'])).length;
  const problemaCalidad = rows.filter((row) => matchesAny(row.calidad, ['OBSERVADO'])).length;
  const conAdq = rows.filter((row) => matchesAny(row.adq, ['PENDIENTE'])).length;
  const conAft = rows.filter((row) => matchesAny(row.aft, ['PENDIENTE'])).length;
  const conSiniestro = rows.filter((row) => matchesAny(row.sinies, ['SI'])).length;
  const totalElRoble = rows.filter((row) => row.terminal === 'El Roble').length;
  const totalLaReina = rows.filter((row) => row.terminal === 'La Reina').length;
  const porcentajeOperatividad = total ? Math.round((operativos / total) * 100) : 0;

  return {
    total,
    operativos,
    noOperativos,
    enMantencion,
    observados,
    conPanne,
    problemaVidrio,
    problemaCalidad,
    conAdq,
    conAft,
    conSiniestro,
    totalElRoble,
    totalLaReina,
    porcentajeOperatividad,
  };
}

export function getStatusTone(status) {
  switch (normalizeText(status)) {
    case 'OPERATIVO':
    case 'OK':
      return 'success';
    case 'NO OPERATIVO':
    case 'NO':
      return 'danger';
    case 'EN PANNE':
    case 'DAÑADO':
      return 'warning';
    case 'EN MANTENCIÓN':
    case 'MANTENCIÓN':
      return 'info';
    case 'OBSERVADO':
      return 'alert';
    default:
      return 'muted';
  }
}

export function buildCsv(rows) {
  const headers = [
    'Nº',
    'COD',
    'PPU',
    'TERMINAL',
    'ZONA',
    'SERVICIO',
    'MODELO',
    'ASIGNACION',
    'TIPO',
    'OPER',
    'VIDRIO',
    'MANT',
    'CALIDAD',
    'ADQ',
    'AFT',
    'SINIES',
    'Detalle Panne',
    'Observaciones',
    'UBICACIÓN',
    'Estado',
  ];

  const lines = rows.map((row, index) => [
    row.numero ?? index + 1,
    row.cod,
    row.ppu,
    row.terminal,
    row.zona,
    row.servicio,
    row.modelo,
    row.asignacion,
    row.tipo,
    row.oper,
    row.vidrio,
    row.mant,
    row.calidad,
    row.adq,
    row.aft,
    row.sinies,
    row.detalle_panne,
    row.observaciones,
    row.ubicacion,
    row.estado,
  ]);

  return [headers, ...lines]
    .map((line) =>
      line
        .map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`)
        .join(','),
    )
    .join('\n');
}

export function downloadCsv(rows, fileName = 'reporte-oper.csv') {
  const csv = buildCsv(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function nextNumero(rows) {
  const highest = rows.reduce((max, row) => Math.max(max, Number(row.numero) || 0), 0);
  return highest + 1;
}

export function createDuplicateValue(value, rows, key) {
  const original = normalizeText(value);
  const base = original || (key === 'cod' ? 'COD' : 'PPU');
  let attempt = `${base}-COPIA`;
  let counter = 2;

  while (rows.some((row) => normalizeCompare(row[key]) === normalizeCompare(attempt))) {
    attempt = `${base}-COPIA-${counter}`;
    counter += 1;
  }

  return attempt;
}

export function validateRequiredFleetFields(row) {
  if (!normalizeText(row.cod)) {
    return 'COD es obligatorio.';
  }

  if (!normalizeText(row.ppu)) {
    return 'PPU es obligatoria.';
  }

  return '';
}

export function validateDuplicates(rows, currentId, patch) {
  const cod = normalizeCompare(patch.cod);
  const ppu = normalizeCompare(patch.ppu);

  if (
    cod &&
    rows.some((row) => row.id !== currentId && normalizeCompare(row.cod) === cod)
  ) {
    return 'Ya existe un bus con ese COD.';
  }

  if (
    ppu &&
    rows.some((row) => row.id !== currentId && normalizeCompare(row.ppu) === ppu)
  ) {
    return 'Ya existe un bus con esa PPU.';
  }

  return '';
}

export function formatSaveStatus(status) {
  switch (status) {
    case 'saving':
      return 'Guardando…';
    case 'saved':
      return 'Guardado';
    case 'error':
      return 'Error';
    default:
      return 'Sin cambios';
  }
}

function isOperative(row) {
  return matchesAny(row.estado, ['OPERATIVO']) || matchesAny(row.oper, ['OK']);
}

function isNonOperative(row) {
  return matchesAny(row.estado, ['NO OPERATIVO']) || matchesAny(row.oper, ['NO']);
}

function matchesAny(value, expectedValues) {
  const normalized = normalizeText(value);
  return expectedValues.includes(normalized);
}
