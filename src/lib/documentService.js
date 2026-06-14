import { ensureSupabase } from './supabase';

const TABLE_NAME = 'revision_documentos';

export async function fetchDocumentRevisions() {
  const client = ensureSupabase();
  const { data, error } = await client
    .from(TABLE_NAME)
    .select('*')
    .order('cod', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getDocumentRevisionByPpu(ppu) {
  const client = ensureSupabase();
  const { data, error } = await client
    .from(TABLE_NAME)
    .select('*')
    .eq('ppu', ppu)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is the "no rows returned" error
    throw error;
  }

  return data;
}

export async function upsertDocumentRevision(payload) {
  const client = ensureSupabase();
  
  // We use upsert on the unique 'ppu' column
  const { data, error } = await client
    .from(TABLE_NAME)
    .upsert(payload, { onConflict: 'ppu' })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export function subscribeToDocumentRevisions(callback) {
  const client = ensureSupabase();
  
  const channel = client
    .channel('document-revisions-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: TABLE_NAME,
      },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}
