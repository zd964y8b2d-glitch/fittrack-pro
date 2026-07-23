// ═══════════════════════════════════════════════════════════════════════════
// sw.js – Service Worker
//
// Strategie:
//   - App-Shell (HTML/CSS/JS/Icons) wird "cache-first" ausgeliefert, damit
//     die Grundfunktionen (Login-Maske, UI, zuletzt geladene Daten) auch
//     OHNE Internetverbindung angezeigt werden ("Offline-fähige
//     Grundfunktionen" gemäß Anforderung 4).
//   - Supabase-API-Calls (Netzwerk) werden NICHT gecacht – Trainings- und
//     Ernährungsdaten müssen immer aktuell/online sein, sonst entstehen
//     Konflikte beim Schreiben. Bei fehlendem Netz schlägt der Request
//     einfach fehl und die App zeigt eine Offline-Meldung (siehe app.js).
//   - v20260620134146 wird von build.sh bei jedem Deploy automatisch neu
//     gesetzt → der Browser erkennt eine neue Service-Worker-Datei → alte
//     Caches werden im "activate"-Schritt gelöscht → Nutzer bekommen die
//     neue Version automatisch beim nächsten App-Start (Anforderung 10).
// ═══════════════════════════════════════════════════════════════════════════

const CACHE_VERSION = '__CACHE_VERSION__';
const CACHE_NAME = `fittrack-shell-${CACHE_VERSION}`;

// App-Shell: alles, was für den Grundbetrieb ohne Netz nötig ist.
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

// ── INSTALL: App-Shell vorab cachen ─────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// ── ACTIVATE: alte Caches aus früheren Versionen löschen ───────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('fittrack-shell-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── FETCH: Strategie je Request-Typ ────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Supabase-API & Auth-Calls: NIE cachen, immer live ans Netz.
  if (url.hostname.endsWith('.supabase.co')) {
    return; // Browser-Default-Verhalten (Netzwerk), kein Eingriff
  }

  // Nur GET-Requests cachen; alles andere (POST etc.) durchreichen.
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // Cache-first: sofort ausliefern, im Hintergrund aktualisieren.
        fetch(event.request)
          .then((fresh) => {
            if (fresh && fresh.ok) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, fresh.clone()));
            }
          })
          .catch(() => {/* offline – ignorieren, Cache reicht */});
        return cached;
      }
      // Nicht im Cache: aus dem Netz holen und für nächstes Mal cachen.
      return fetch(event.request)
        .then((fresh) => {
          if (fresh && fresh.ok) {
            const clone = fresh.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return fresh;
        })
        .catch(() => caches.match('/index.html')); // Offline-Fallback für Navigation
    })
  );
});

// ── MESSAGE: erlaubt der App, einen sofortigen SW-Wechsel zu erzwingen ────
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
