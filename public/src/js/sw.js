// ═══════════════════════════════════════════════════════════════════════════
// sw.js – Service Worker
//
// Strategie (geändert): NETWORK-FIRST für die App-Shell (HTML/CSS/JS).
//   - Der Browser versucht IMMER zuerst das Netzwerk. Nur wenn das fehlschlägt
//     (z.B. offline), wird auf den Cache zurückgegriffen.
//   - Das garantiert, dass Nutzer nach einem neuen Deploy sofort die aktuelle
//     Version sehen, statt möglicherweise veraltete gecachte Dateien zu
//     bekommen (das war der Grund für "Änderungen werden nicht angezeigt").
//   - Offline-Fähigkeit bleibt erhalten: schlägt das Netzwerk fehl, liefert
//     der Service Worker die zuletzt erfolgreich geladene Version aus dem
//     Cache (siehe Anforderung 4 – Offline-fähige Grundfunktionen).
//   - Supabase-API-Calls werden NIE gecacht – Trainings-/Ernährungsdaten
//     müssen immer live vom Server kommen.
//   - __CACHE_VERSION__ wird von build.sh bei jedem Deploy automatisch neu
//     gesetzt → alte Caches werden im "activate"-Schritt gelöscht.
// ═══════════════════════════════════════════════════════════════════════════

const CACHE_VERSION = '__CACHE_VERSION__'; const CACHE_NAME = `fittrack-shell-${CACHE_VERSION}`;

const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/css/styles.css',
  '/src/js/app.js',
  '/src/js/auth.js',
  '/src/js/api.js',
  '/src/js/onboarding.js',
  '/src/js/workout.js',
  '/src/js/nutrition.js',
  '/src/js/settings.js',
  '/src/js/ui.js',
  '/src/js/offline.js',
  '/src/js/coachData.js',
  '/src/js/supabaseClient.js',
  '/src/js/config.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ── INSTALL: App-Shell vorab cachen (als Offline-Fallback) ────────────────── self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch((err) => console.warn('SW install cache.addAll failed:', err))
  );
  self.skipWaiting(); // Sofort aktivieren, nicht auf Tab-Schließen warten });

// ── ACTIVATE: alte Caches aus früheren Versionen löschen ─────────────────── self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('fittrack-shell-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim(); // Sofort alle offenen Tabs übernehmen });

// ── FETCH: Network-First mit Cache-Fallback ──────────────────────────────── self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Supabase-API & Auth-Calls: NIE cachen, immer live ans Netz.
  if (url.hostname.endsWith('.supabase.co')) {
    return;
  }

  // Nur GET-Requests behandeln.
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .then((fresh) => {
        // Erfolgreiche Netzwerk-Antwort: sofort ausliefern UND im Cache
        // aktualisieren, damit sie beim nächsten Offline-Zugriff aktuell ist.
        if (fresh && fresh.ok) {
          const clone = fresh.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return fresh;
      })
      .catch(() => {
        // Netzwerk nicht erreichbar (offline) -> auf Cache zurückgreifen.
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // Für Navigations-Requests (Seitenaufruf) als letzten Ausweg die
          // gecachte index.html liefern, damit die App überhaupt startet.
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('', { status: 504, statusText: 'Offline' });
        });
      })
  );
});

// ── MESSAGE: erlaubt der App, einen sofortigen SW-Wechsel zu erzwingen ──── self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting(); });
