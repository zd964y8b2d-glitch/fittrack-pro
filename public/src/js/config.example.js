// ═══════════════════════════════════════════════════════════════════════════
// config.example.js
//
// Vorlage für die Supabase-Konfiguration.
//
// LOKALE ENTWICKLUNG:
//   1. Diese Datei kopieren zu "config.js" (im selben Ordner)
//   2. Die echten Werte aus deinem Supabase-Dashboard eintragen
//      (Project Settings → API → Project URL / anon public key)
//   3. config.js ist in .gitignore – wird NICHT eingecheckt
//
// CLOUDFLARE PAGES (Produktion):
//   Die Datei config.js wird NICHT deployed. Stattdessen generiert das
//   Build-Skript (siehe build.sh) config.js automatisch aus den
//   Umgebungsvariablen, die in den Cloudflare Pages Projekteinstellungen
//   hinterlegt sind. Siehe DEPLOYMENT.md für die genaue Anleitung.
// ═══════════════════════════════════════════════════════════════════════════

export const SUPABASE_URL = 'https://DEIN-PROJEKT.supabase.co';
export const SUPABASE_ANON_KEY = 'DEIN-ANON-PUBLIC-KEY';
