import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export async function upsertProyecto(proyecto) {
  // reclamar_yield sends a delta, not an absolute value — increment in DB
  if (proyecto.yield_entregado_delta != null) {
    const { id, yield_entregado_delta } = proyecto;
    const { error } = await supabase.rpc('incrementar_yield_entregado', {
      p_id: id,
      p_delta: yield_entregado_delta,
    });
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from('proyectos')
    .upsert(proyecto, { onConflict: 'id' });
  if (error) throw error;
}

export async function upsertAportacion(aportacion) {
  const { error } = await supabase
    .from('aportaciones')
    .upsert(aportacion, { onConflict: 'proyecto_id,contribuidor' });
  if (error) throw error;
}

export async function insertEvento(evento) {
  // Ignore duplicate tx_hash (idempotent re-indexing)
  const { error } = await supabase
    .from('eventos')
    .upsert(evento, { onConflict: 'tx_hash', ignoreDuplicates: true });
  if (error) throw error;
}

export async function getLastIndexedLedger() {
  const { data, error } = await supabase
    .from('eventos')
    .select('ledger')
    .order('ledger', { ascending: false })
    .limit(1);
  if (error || !data?.length) return null;
  return data[0].ledger;
}

export default supabase;
