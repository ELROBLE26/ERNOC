import * as XLSX from 'xlsx';

export const ESTADO_OPTIONS = ['OPERATIVO', 'NO OPERATIVO', 'EN PANNE', 'EN MANTENCIÓN', 'OBSERVADO', 'PENDIENTE'];
export const PROBLEM_FIELDS = ['oper', 'vidrio', 'mant', 'calidad', 'adq', 'aft', 'sinies'];

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
  estado: 'OPERATIVO',
  ubicacion: '',
  oper: '',
  vidrio: '',
  mant: '',
  calidad: '',
  adq: '',
  aft: '',
  sinies: '',
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

    if (filters.operatividad === 'Con problema' && !hasProblemX(row)) {
      return false;
    }

    if (filters.operatividad === 'Sin problema' && hasProblemX(row)) {
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
  const noOperativos = rows.filter((row) => isNonOperative(row) || hasProblemX(row)).length;
  const enMantencion = rows.filter((row) => matchesAny(row.estado, ['EN MANTENCIÓN']) || matchesAny(row.mant, ['MANTENCIÓN', 'X'])).length;
  const observados = rows.filter((row) => matchesAny(row.estado, ['OBSERVADO']) || matchesAny(row.calidad, ['OBSERVADO', 'X'])).length;
  const conPanne = rows.filter((row) => matchesAny(row.estado, ['EN PANNE']) || normalizeText(row.detalle_panne) || hasProblemX(row)).length;
  const problemaVidrio = rows.filter((row) => matchesAny(row.vidrio, ['DAÑADO', 'X'])).length;
  const problemaCalidad = rows.filter((row) => matchesAny(row.calidad, ['OBSERVADO', 'X'])).length;
  const conAdq = rows.filter((row) => matchesAny(row.adq, ['PENDIENTE', 'X'])).length;
  const conAft = rows.filter((row) => matchesAny(row.aft, ['PENDIENTE', 'X'])).length;
  const conSiniestro = rows.filter((row) => matchesAny(row.sinies, ['SI', 'X'])).length;
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

export function hasProblemX(row) {
  return PROBLEM_FIELDS.some((field) => normalizeText(row[field]).toUpperCase() === 'X');
}

export function buildExclusiveProblemPatch(problemField) {
  const patch = PROBLEM_FIELDS.reduce((current, field) => {
    current[field] = field === problemField ? 'X' : '';
    return current;
  }, {});

  return {
    ...patch,
    estado: problemField ? 'NO OPERATIVO' : 'OPERATIVO',
  };
}

export function downloadXlsx(rows, fileName = 'reporte-oper.xlsx') {
  const headers = [
    'N°',
    'COD',
    'PPU',
    'Terminal',
    'Zona',
    'Servicio',
    'Modelo',
    'Asignación',
    'Tipo',
    'OPER',
    'VIDRIO',
    'MANT',
    'CALIDAD',
    'ADQ',
    'AFT',
    'SINIES',
    'Detalle Panne',
    'Observaciones',
    'Ubicación',
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

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...lines]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte Flota");
  XLSX.writeFile(workbook, fileName);
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
  return matchesAny(row.estado, ['OPERATIVO']) && !hasProblemX(row);
}

function isNonOperative(row) {
  return matchesAny(row.estado, ['NO OPERATIVO']) || hasProblemX(row);
}

function matchesAny(value, expectedValues) {
  const normalized = normalizeText(value);
  return expectedValues.includes(normalized);
}
