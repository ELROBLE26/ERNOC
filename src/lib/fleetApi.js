import { ensureSupabase } from './supabase';

const TABLE_NAME = 'reporte_oper_flota';

export async function fetchFleet() {
  const client = ensureSupabase();
  const { data, error } = await client
    .from(TABLE_NAME)
    .select('*')
    .order('numero', { ascending: true, nullsFirst: false })
    .order('cod', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function createFleetRow(payload) {
  const client = ensureSupabase();
  const { data, error } = await client.from(TABLE_NAME).insert(payload).select().single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateFleetRow(rowId, payload) {
  const client = ensureSupabase();
  const { data, error } = await client.from(TABLE_NAME).update(payload).eq('id', rowId).select().single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteFleetRow(rowId) {
  const client = ensureSupabase();
  const { error } = await client.from(TABLE_NAME).delete().eq('id', rowId);

  if (error) {
    throw error;
  }
}

export function subscribeToFleetChanges(onEvent) {
  const client = ensureSupabase();
  const channel = client
    .channel('reporte-oper-flota')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: TABLE_NAME,
      },
      onEvent,
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}

