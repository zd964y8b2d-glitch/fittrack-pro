// ═══════════════════════════════════════════════════════════════════════════
// offline.js
// Erkennt Online/Offline-Status und zeigt einen dezenten Hinweis-Banner.
// Schreibende Aktionen (Workout speichern, Mahlzeit eintragen) werden bei
// fehlendem Netz blockiert mit klarer Nutzer-Rückmeldung, statt einen
// kryptischen Supabase-Fehler zu zeigen.
// ═══════════════════════════════════════════════════════════════════════════

let bannerEl = null;

export function initOfflineBanner() {
  bannerEl = document.createElement('div');
  bannerEl.id = 'offline-banner';
  bannerEl.style.cssText = `
    position:fixed;top:0;left:50%;transform:translateX(-50%);
    width:100%;max-width:430px;background:#E74C3C;color:#fff;
    text-align:center;font-size:12px;font-weight:700;padding:8px 0;
    z-index:9999;display:none;
  `;
  bannerEl.textContent = '⚠️ Offline – Änderungen werden erst nach Verbindung gespeichert';
  document.body.prepend(bannerEl);

  window.addEventListener('online', updateBanner);
  window.addEventListener('offline', updateBanner);
  updateBanner();
}

function updateBanner() {
  if (!bannerEl) return;
  bannerEl.style.display = navigator.onLine ? 'none' : 'block';
}

export function isOnline() {
  return navigator.onLine;
}

// Wirft einen sprechenden Fehler, wenn offline – von schreibenden
// Funktionen vor dem eigentlichen API-Call aufzurufen.
export function assertOnline() {
  if (!navigator.onLine) {
    throw new Error('Keine Internetverbindung. Bitte später erneut versuchen.');
  }
}
