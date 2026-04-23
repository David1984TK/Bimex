import { createClient } from "@supabase/supabase-js";
import { enviarNotificacion } from "./notifications.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const POLL_MS = Number(process.env.POLL_INTERVAL_MS ?? 60_000);

// Map contract event types → notification types
const EVENT_MAP = {
  proyecto_aprobado:  "proyecto_aprobado",
  proyecto_rechazado: "proyecto_rechazado",
  meta_alcanzada:     "meta_alcanzada",
  yield_disponible:   "yield_disponible",
  retiro_principal:   "retiro_principal",
};

async function procesarEventosPendientes() {
  // Fetch unprocessed events joined with owner email preferences
  const { data: eventos, error } = await supabase
    .from("project_events")
    .select(`
      id,
      event_type,
      project_id,
      project_name,
      owner_wallet,
      payload,
      notified_at,
      user_notifications!inner (
        email,
        notifications_enabled
      )
    `)
    .is("notified_at", null)
    .in("event_type", Object.keys(EVENT_MAP))
    .eq("user_notifications.notifications_enabled", true);

  if (error) {
    console.error("[indexer] Error fetching events:", error.message);
    return;
  }

  if (!eventos?.length) return;

  console.log(`[indexer] Processing ${eventos.length} pending event(s)`);

  for (const ev of eventos) {
    const notifType = EVENT_MAP[ev.event_type];
    const email     = ev.user_notifications?.email;

    if (!email) continue;

    try {
      await enviarNotificacion(notifType, email, {
        nombreProyecto: ev.project_name,
        idProyecto:     ev.project_id,
        motivo:         ev.payload?.motivo ?? null,
        monto:          ev.payload?.monto  ?? null,
      });

      // Mark as notified
      await supabase
        .from("project_events")
        .update({ notified_at: new Date().toISOString() })
        .eq("id", ev.id);

      console.log(`[indexer] ✓ Notified ${email} — ${ev.event_type} (project ${ev.project_id})`);
    } catch (err) {
      console.error(`[indexer] ✗ Failed to notify for event ${ev.id}:`, err.message);
    }
  }
}

async function main() {
  console.log(`[indexer] Starting — polling every ${POLL_MS / 1000}s`);
  await procesarEventosPendientes();
  setInterval(procesarEventosPendientes, POLL_MS);
}

main().catch(err => {
  console.error("[indexer] Fatal:", err);
  process.exit(1);
});
