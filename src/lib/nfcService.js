import { ensureSupabase } from './supabase';
import { PROBLEM_FIELDS } from '../utils/fleet';

const NFC_CARDS_TABLE = 'bus_nfc_cards';
const NFC_LOG_TABLE = 'reporte_oper_nfc_log';
const FLEET_TABLE = 'reporte_oper_flota';

export async function findNfcCard(nfcUid) {
  const client = ensureSupabase();
  const { data, error } = await client
    .from(NFC_CARDS_TABLE)
    .select('*')
    .eq('nfc_uid', nfcUid)
    .eq('activo', true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function findFleetBusByCodOrPpu(searchValue) {
  const client = ensureSupabase();
  const cleanedValue = String(searchValue ?? '').trim();

  if (!cleanedValue) {
    return null;
  }

  const { data, error } = await client
    .from(FLEET_TABLE)
    .select('*')
    .or(`cod.ilike.${escapeFilter(cleanedValue)},ppu.ilike.${escapeFilter(cleanedValue)}`)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function findFleetBusFromCard(card) {
  const client = ensureSupabase();
  const cod = String(card?.cod ?? '').trim();
  const ppu = String(card?.ppu ?? '').trim();

  if (!cod && !ppu) {
    return null;
  }

  const filters = [];
  if (cod) {
    filters.push(`cod.eq.${escapeFilter(cod)}`);
  }

  if (ppu) {
    filters.push(`ppu.eq.${escapeFilter(ppu)}`);
  }

  const { data, error } = await client
    .from(FLEET_TABLE)
    .select('*')
    .or(filters.join(','))
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function createNfcAssociation(payload) {
  const client = ensureSupabase();
  const { data, error } = await client
    .from(NFC_CARDS_TABLE)
    .insert({
      nfc_uid: payload.nfc_uid,
      cod: payload.cod,
      ppu: payload.ppu,
      terminal_default: payload.terminal_default,
      observacion: payload.observacion ?? '',
      activo: true,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateFleetFromNfc(bus, operation) {
  const client = ensureSupabase();
  const cod = String(bus?.cod ?? operation?.cod ?? '').trim();
  const ppu = String(bus?.ppu ?? operation?.ppu ?? '').trim();

  if (!cod && !ppu) {
    throw new Error('No hay COD ni PPU para actualizar la flota.');
  }

  const payload = buildFleetUpdatePayload(operation);
  const filters = [];

  if (cod) {
    filters.push(`cod.eq.${escapeFilter(cod)}`);
  }

  if (ppu) {
    filters.push(`ppu.eq.${escapeFilter(ppu)}`);
  }

  const { data, error } = await client
    .from(FLEET_TABLE)
    .update(payload)
    .or(filters.join(','))
    .select()
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('No se encontro el bus en reporte_oper_flota.');
  }

  return data;
}

export async function insertNfcLog(payload) {
  const client = ensureSupabase();
  const { error } = await client.from(NFC_LOG_TABLE).insert(payload);

  if (error) {
    throw error;
  }
}

export function buildOperativePayload(terminal) {
  return {
    estado: 'OPERATIVO',
    oper: '',
    vidrio: '',
    mant: '',
    calidad: '',
    adq: '',
    aft: '',
    sinies: '',
    detalle_panne: '',
    observaciones: '',
    ubicacion: terminal,
    terminal,
    servicio: 'Operativo Libre',
  };
}

export function buildFleetUpdatePayload(operation) {
  const hasProblem = PROBLEM_FIELDS.some((field) => String(operation[field] ?? '').toUpperCase() === 'X');

  if (!hasProblem) {
    return buildOperativePayload(operation.terminal);
  }

  return {
    estado: 'NO OPERATIVO',
    oper: operation.oper,
    vidrio: operation.vidrio,
    mant: operation.mant,
    calidad: operation.calidad,
    adq: operation.adq,
    aft: operation.aft,
    sinies: operation.sinies,
    detalle_panne: operation.detalle_panne ?? '',
    observaciones: operation.observaciones ?? '',
    ubicacion: operation.ubicacion || operation.terminal,
    terminal: operation.terminal,
  };
}

export function buildNfcLogPayload({ nfcUid, bus, operation, resultado, mensajeError = '' }) {
  return {
    nfc_uid: nfcUid,
    cod: bus?.cod ?? operation?.cod ?? null,
    ppu: bus?.ppu ?? operation?.ppu ?? null,
    terminal: operation?.terminal ?? null,
    estado_guardado: operation?.estado ?? null,
    oper: operation?.oper ?? null,
    vidrio: operation?.vidrio ?? null,
    mant: operation?.mant ?? null,
    calidad: operation?.calidad ?? null,
    adq: operation?.adq ?? null,
    aft: operation?.aft ?? null,
    sinies: operation?.sinies ?? null,
    detalle_panne: operation?.detalle_panne ?? '',
    observaciones: operation?.observaciones ?? '',
    ubicacion: operation?.ubicacion ?? operation?.terminal ?? '',
    resultado,
    mensaje_error: mensajeError,
  };
}

function escapeFilter(value) {
  return String(value).replaceAll(',', '\\,').replaceAll(')', '\\)');
}
