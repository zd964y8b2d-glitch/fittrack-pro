// ═══════════════════════════════════════════════════════════════════════════
// supabaseClient.js
// Initialisiert den Supabase-Client für Auth, Datenbank und Realtime.
//
// WICHTIG: Die Anon-Key ist ein PUBLIC Key (kein Secret!). Er ist dazu
// gedacht, im Frontend zu landen – die eigentliche Sicherheit kommt über
// Row Level Security (RLS) in der Datenbank, nicht über Geheimhaltung
// dieses Keys. Niemals den service_role-Key hier eintragen!
// ═══════════════════════════════════════════════════════════════════════════

// Wird beim Build/Deploy über Cloudflare Pages Umgebungsvariablen ersetzt.
// Für lokale Entwicklung: js/config.local.js anlegen (siehe config.example.js)
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

// Supabase JS SDK wird über CDN geladen (siehe index.html <script type="module">)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Sitzung im localStorage persistieren, damit der Login nach
    // App-Neustart (z.B. PWA von Homescreen) erhalten bleibt.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // wichtig für Passwort-Reset-Links
  },
});
