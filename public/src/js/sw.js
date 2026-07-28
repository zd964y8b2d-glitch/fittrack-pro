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
//   - CACHE_VERSION ist jetzt ein FEST EINGETRAGENER String, keine
//     build.sh-Platzhalter-Ersetzung mehr (die hat nie funktioniert - der
//     Platzhalter kam unverändert im Live-Code an). Bei jeder Dateilieferung
//     bitte diesen Wert von Hand erhöhen, damit alte Caches im
//     "activate"-Schritt zuverlässig gelöscht werden und die Versionsanzeige
//     im Profil-Tab einen echten, aussagekräftigen Wert zeigt.
// ═══════════════════════════════════════════════════════════════════════════

const CACHE_VERSION = '2026-07-28.1';
const CACHE_NAME = `fittrack-shell-${CACHE_VERSION}`;

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

// ── INSTALL: App-Shell vorab cachen (als Offline-Fallback) ──────────────────
// cache.addAll() würde die HTTP-Cache-Header des Hosters (Cloudflare Pages)
// respektieren - liegt dort ein langes max-age auf den Assets, könnten darüber
// VERALTETE Dateien in den neuen Versions-Cache wandern, obwohl der Service
// Worker selbst schon korrekt eine neue Version installiert. Jede Datei wird
// daher einzeln mit { cache: 'reload' } geholt, was den HTTP-Cache des
// Browsers für diesen Request explizit umgeht und garantiert frische Bytes
// in jede neue Cache-Version einträgt.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        APP_SHELL.map((url) =>
          fetch(url, { cache: 'reload' })
            .then((res) => { if (res.ok) return cache.put(url, res); })
            .catch((err) => console.warn(`SW install: ${url} konnte nicht geladen werden:`, err))
        )
      )
    )
  );
  self.skipWaiting(); // Sofort aktivieren, nicht auf Tab-Schließen warten
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
  self.clients.claim(); // Sofort alle offenen Tabs übernehmen
});

// ── FETCH: Network-First mit Cache-Fallback ────────────────────────────────
self.addEventListener('fetch', (event) => {
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

// ── MESSAGE: erlaubt der App, einen sofortigen SW-Wechsel zu erzwingen ────
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
