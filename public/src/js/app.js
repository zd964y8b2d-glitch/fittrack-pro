// ═══════════════════════════════════════════════════════════════════════════
// app.js
// Einstiegspunkt der App. Orchestriert Auth-Flow, Navigation zwischen den
// Screens und verdrahtet die Fach-Module (workout, nutrition, settings,
// onboarding) mit dem jeweils aktuellen Nutzer/Profil.
// ═══════════════════════════════════════════════════════════════════════════
import { supabase } from './supabaseClient.js';
import * as Auth from './auth.js';
import { getProfile } from './api.js';
import { getCoachTip } from './coachData.js';
import {
  initCalendarModule, openCalendar, calendarPrevMonth, calendarNextMonth, getSelectedCalendarDay,
  openDatePicker, datePickerPrevMonth, datePickerNextMonth, datePickerReset, datePickerConfirm, MONTH_NAMES,
} from './calendar.js';
import { ringHTML, pbar, showPage, showApp, showToast, showUpdateBanner, handleApiError, greet, mealTotals, openMo, closeMo } from './ui.js';
import { initOfflineBanner } from './offline.js';
import { startOnboarding, obNext, obBack } from './onboarding.js';
import {
  initWorkoutModule, wTab, renderWorkout, renderProgression, saveExerciseFromModal, resetProgress,
  switchHistoryTab, historyCalPrevMonth, historyCalNextMonth, jumpToWorkoutLog,
  openManualWorkoutModal, toggleManualWorkoutFields, onManualWorkoutDistanceInput, saveManualWorkout,
  updateProfileRef as updateWorkoutProfileRef,
} from './workout.js';
import {
  initNutritionModule, renderNutrition, saveMealFromModal, toggleSaveGenericGrams,
  openMealModal, switchMealTab, onFoodSearchInput, stepGrams, onGramsInput,
  backToSearch, saveSelectedProduct, startScanner, stopScanner,
  switchNutritionTab, openSlotManager, addNewSlot, saveSlots, saveBurnedCalories,
  stepWater, saveWater,
  nutritionCalPrevMonth, nutritionCalNextMonth,
  showNutritionForDate,
  updateProfileRef as updateNutritionProfileRef,
} from './nutrition.js';
import { initSettingsModule, renderSettings, saveGoalEdit } from './settings.js';
import { getWorkoutLogs, getBurnedCaloriesForToday, setBurnedCaloriesForToday, resetAllProgress, getMealsForToday } from './api.js';

let currentUser = null;
let currentProfile = null;

// ═══════════════════════════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════════════════════════
async function boot() {
  // KRITISCH: wireStaticButtons() muss IMMER laufen, egal was in den anderen
  // Boot-Schritten passiert. Ein Fehler in initOfflineBanner/registerServiceWorker/
  // Auth-Checks darf niemals verhindern, dass Buttons (z.B. Login) klickbar werden.
  try { wireStaticButtons(); } catch (e) { console.error('wireStaticButtons failed:', e); }
  try { initOfflineBanner(); } catch (e) { console.error('initOfflineBanner failed:', e); }
  try { registerServiceWorker(); } catch (e) { console.error('registerServiceWorker failed:', e); }

  try {
    // Passwort-Reset-Link erkannt? -> direkt das Reset-Formular zeigen,
    // unabhängig vom sonstigen Login-Status.
    if (Auth.isPasswordRecoveryUrl()) {
      showPage('auth');
      document.getElementById('reset-password-box').style.display = '';
      document.getElementById('auth-login').style.display = 'none';
      document.getElementById('auth-reg').style.display = 'none';
      document.querySelector('.auth-tabs').style.display = 'none';
      return;
    }

    const session = await Auth.getSession();
    if (session?.user) {
      await loadUserAndContinue(session.user);
    } else {
      showPage('auth');
    }

    Auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') showPage('auth');
    });
  } catch (e) {
    console.error('Auth/session boot step failed:', e);
    showPage('auth'); // Fallback: zumindest die Login-Seite zeigen
  }
}

async function loadUserAndContinue(user) {
  currentUser = user;
  try {
    currentProfile = await getProfile(user.id);
  } catch (err) {
    handleApiError(err, 'Profil konnte nicht geladen werden');
    return;
  }

  if (currentProfile.onboarding_done) {
    initModules();
    showPage('app');
    await renderApp();
  } else {
    showPage('onboarding');
    startOnboarding(user.id, currentProfile, async () => {
      currentProfile = await getProfile(user.id);
      initModules();
      showPage('app');
      await renderApp();
    });
  }
}

function initModules() {
  initWorkoutModule(currentUser, currentProfile);
  initNutritionModule(currentUser, currentProfile);
  initCalendarModule(currentUser);
  initSettingsModule(currentUser, currentProfile, (updated) => {
    currentProfile = updated;
    // Ohne diese beiden Aufrufe blieben workout.js und nutrition.js auf dem
    // Profilstand vom App-Start "eingefroren" - Änderungen an Zielen/Makros
    // in den Einstellungen zeigten sich dann zwar in Home und Profil, aber
    // NICHT in Ernährung (falsches Kalorienziel) oder im Coach-Plan.
    updateWorkoutProfileRef(updated);
    updateNutritionProfileRef(updated);
    renderHome();
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SERVICE WORKER REGISTRIERUNG
// ═══════════════════════════════════════════════════════════════════════════
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    // updateViaCache:'none' zwingt den Browser, die sw.js Datei selbst NIE
    // aus dem HTTP-Cache zu bedienen. Ohne das könnte ein Update - je nach
    // Cache-Control-Header von Cloudflare Pages - erst nach bis zu 24h oder
    // im schlechtesten Fall gar nicht erkannt werden, obwohl der Server
    // längst eine neue Version ausliefert.
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then((reg) => {
      // Sobald eine neue SW-Version bereitsteht, im Hintergrund aktivieren.
      // Der Nutzer bekommt das NICHT sofort als Reload zu spüren - das
      // übernimmt jetzt der Update-Banner (siehe controllerchange unten),
      // damit eine laufende Eingabe nicht ungefragt verworfen wird.
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            newWorker.postMessage('SKIP_WAITING');
          }
        });
      });

      // Aktiv nach einem Update suchen, sobald die App wieder sichtbar wird
      // (z.B. vom iPhone-Homescreen aus erneut geöffnet, ohne dass eine
      // echte Neu-Navigation stattfindet). Das ist genau der Moment "vor
      // Benutzung", in dem Beta-Tester bisher manuell den Cache leeren
      // mussten, damit sie den neuesten Stand bekommen.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
      });

      // WICHTIGER ZUSATZ für vom Homescreen gestartete Standalone-Apps:
      // iOS beendet solche Apps beim Verlassen meist nicht wirklich,
      // sondern friert die komplette Seite ein (Bfcache) und "weckt" sie
      // beim Wiederöffnen nur auf - JavaScript läuft einfach pausiert
      // weiter, es findet keine echte Neu-Navigation statt.
      // 'visibilitychange' feuert dabei nicht zuverlässig; das dafür
      // vorgesehene Signal ist 'pageshow' mit persisted:true. Das war der
      // eigentliche Grund, warum bisher das Homescreen-Icon manuell
      // gelöscht und neu angelegt werden musste, um ein Update zu bekommen.
      window.addEventListener('pageshow', (event) => {
        if (event.persisted) reg.update().catch(() => {});
      });
    });

    // Versionsanzeige (Profil-Tab): liest die CACHE_VERSION direkt aus dem
    // Text von sw.js aus - ein ganz normaler Datei-Abruf, KEINE Service-
    // Worker-Kommunikation mehr. Die Diagnose hat gezeigt, dass Registrierung/
    // Ready/Aktivierung zuverlässig laufen, aber die Nachrichten-Antwort
    // (sowohl über event.source als auch über MessageChannel) nie ankam -
    // vermutlich eine Eigenheit von iOS-Standalone-Web-Apps. Diese Methode
    // umgeht das Problem komplett: sw.js hat bereits "Cache-Control: no-cache"
    // (siehe _headers), der Abruf liefert also garantiert den aktuellen Stand.
    const updateVersionDisplay = () => {
      fetch('/sw.js', { cache: 'no-store' })
        .then((res) => res.text())
        .then((text) => {
          const match = text.match(/CACHE_VERSION\s*=\s*['"]([^'"]+)['"]/);
          const el = document.getElementById('app-version-display');
          if (el) el.textContent = match ? `Version ${match[1]}` : '';
        })
        .catch(() => {});
    };
    updateVersionDisplay();

    // Statt eines stillen window.location.reload() zeigt eine neue Version
    // jetzt einen Banner, den der Nutzer selbst antippt - schützt laufende
    // Eingaben (z.B. Sätze eintragen) vor ungefragtem Verwerfen.
    let refreshed = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      updateVersionDisplay();
      if (refreshed) return;
      refreshed = true;
      showUpdateBanner(() => window.location.reload());
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// NAVIGATION / APP RENDER
// ═══════════════════════════════════════════════════════════════════════════
async function renderApp() {
  await renderHome();
  renderWorkout();
  await renderProgression();
  await renderNutrition();
  renderSettings();
}

function showAppScreen(screen) {
  showApp(screen);
  if (screen === 'home') renderHome();
  if (screen === 'progress') renderProgression();
  if (screen === 'settings') renderSettings();
  if (screen === 'workout') renderWorkout();
  if (screen === 'nutrition') renderNutrition();
}

// Reagiert auf Klicks auf die Home-Kacheln (Kalorien/Workouts/Kalender)
function handleHomeTileClick(action) {
  if (action === 'kcal') {
    showAppScreen('nutrition');
  } else if (action === 'workouts') {
    showAppScreen('workout');
    wTab('mine');
  } else if (action === 'calendar') {
    openCalendar();
  }
}

async function renderHome() {
  if (!currentProfile) return;
  const meals = await getMealsForToday(currentUser.id).catch(() => []);
  const t = mealTotals(meals);
  const m = {
    kcal: currentProfile.macro_kcal || 2000,
    protein: currentProfile.macro_protein || 150,
    carbs: currentProfile.macro_carbs || 200,
    fat: currentProfile.macro_fat || 60,
  };
  const calPct = Math.min((t.cal / m.kcal) * 100, 100);

  document.getElementById('home-sub').textContent = greet();
  document.getElementById('home-title').textContent = `Hey ${currentProfile.name} 👋`;

  const workoutLog = await getWorkoutLogs(currentUser.id, 100);
  document.getElementById('home-stats').innerHTML = [
    { l: 'Kalorien', v: t.cal, u: 'kcal', c: 'var(--orange)', action: 'kcal' },
    { l: 'Workouts', v: workoutLog.length, u: 'gesamt', c: 'var(--accent)', action: 'workouts' },
    { l: 'Kalender', v: '📅', u: 'öffnen', c: 'var(--green)', action: 'calendar' },
  ].map((s) => `<div class="st" data-home-tile="${s.action}" style="cursor:pointer"><div class="sv" style="color:${s.c}">${s.v}</div><div class="su">${s.u}</div><div class="sl">${s.l}</div></div>`).join('');

  document.querySelectorAll('#home-stats [data-home-tile]').forEach((el) => {
    el.addEventListener('click', () => handleHomeTileClick(el.dataset.homeTile));
  });

  document.getElementById('home-tip').innerHTML = `<div class="coach-tip"><div class="ct-icon">🏆</div><div><div class="ct-lbl">COACH-TIPP</div><div class="ct-txt">${getCoachTip(currentProfile.goals)}</div></div></div>`;

  // Nutzt jetzt dieselbe Datenquelle wie die "Verbrannte Kalorien"-Karte im
  // Ernährungs-Tab (body_measurements/kind='burned'), statt einer zweiten,
  // separaten Tabelle. Vorher zeigten Home und Ernährung potenziell
  // unterschiedliche Werte und Home nutzte eine Tabelle, die es in der
  // Datenbank so nicht gab - daher schlug das Speichern dort fehl.
  const burnedEntry = await getBurnedCaloriesForToday(currentUser.id).catch(() => null);
  const burnedKcal = burnedEntry?.burned_kcal || 0;
  const netCal = Math.max(0, t.cal - burnedKcal);
  const netPct = Math.min((netCal / m.kcal) * 100, 100);

  document.getElementById('home-macros').innerHTML = `
    <div class="row" style="margin-bottom:12px">
      <div><div style="font-size:14px;font-weight:800">Tagesziel</div>
      <div style="font-size:12px;color:var(--sub);margin-top:2px">${m.kcal - netCal > 0 ? 'Noch ' + (m.kcal - netCal) + ' kcal' : 'Ziel erreicht 🎉'}</div>
      ${burnedKcal > 0 ? `<div style="font-size:11px;color:var(--green);margin-top:2px">− ${burnedKcal} kcal verbrannt = ${netCal} kcal netto</div>` : ''}</div>
      ${ringHTML(62, 7, netPct, 'var(--orange)', Math.round(netPct) + '%')}
    </div>
    ${pbar('Protein ' + t.protein + 'g', t.protein, m.protein, 'var(--accent)')}
    ${pbar('Kohlenhydrate ' + t.carbs + 'g', t.carbs, m.carbs, 'var(--green)')}
    ${pbar('Fett ' + t.fat + 'g', t.fat, m.fat, 'var(--orange)')}`;

  // Eindeutige IDs (home-*) statt der bisherigen "burned-kcal-input"/
  // "btn-save-burned" - diese kollidierten mit den gleichnamigen, statischen
  // Feldern im Ernährungs-Tab (index.html), wodurch getElementById() je nach
  // Render-Reihenfolge das falsche Feld treffen konnte.
  document.getElementById('home-burned').innerHTML = `
    <div class="row" style="margin-bottom:8px">
      <div style="font-size:14px;font-weight:800">🔥 Verbrannte Kalorien heute</div>
    </div>
    <div class="row" style="gap:8px">
      <input id="home-burned-kcal-input" class="oi" type="number" inputmode="numeric" placeholder="0" value="${burnedKcal || ''}" style="flex:1;text-align:center;font-weight:800">
      <button id="home-btn-save-burned" style="background:var(--accentBg);border:1px solid var(--accentBd);border-radius:11px;width:44px;height:44px;color:var(--accent2);font-size:18px;font-weight:700;cursor:pointer;flex-shrink:0">✓</button>
    </div>
    <div style="font-size:11px;color:var(--muted);margin-top:6px">Trage Kalorien aus Apple Health, Google Fit oder deiner Fitness-Uhr manuell ein.</div>`;

  document.getElementById('home-btn-save-burned').addEventListener('click', async () => {
    const val = Math.max(0, parseInt(document.getElementById('home-burned-kcal-input').value) || 0);
    try {
      await setBurnedCaloriesForToday(currentUser.id, val, burnedEntry?.burned_source || 'Manuell', burnedEntry?.id);
      showToast('✅ Verbrannte Kalorien gespeichert');
      await renderHome();
    } catch (e) {
      console.error('home saveBurnedCalories error:', e);
      showToast('⚠️ Speichern fehlgeschlagen');
    }
  });

}

// ═══════════════════════════════════════════════════════════════════════════
// AUTH UI WIRING
// ═══════════════════════════════════════════════════════════════════════════
function authErr(msg) {
  const el = document.getElementById('auth-err');
  el.textContent = msg;
  el.style.display = 'block';
}

// Robuster Helfer: registriert einen Event-Listener nur, wenn das Element
// tatsächlich existiert. Verhindert, dass ein einzelnes fehlendes Element
// (z.B. durch eine neue Modal-Struktur) die GESAMTE wireStaticButtons()
// Funktion abbrechen lässt und dadurch ALLE nachfolgenden Buttons
// (inkl. Login/Registrieren) tot bleiben - das war die Ursache für
// "Button reagiert nicht" bei mehreren vorherigen Bugs.
function on(id, event, handler) {
  const el = document.getElementById(id);
  if (!el) {
    console.warn(`[wireStaticButtons] Element #${id} nicht gefunden - Listener übersprungen`);
    return;
  }
  el.addEventListener(event, handler);
}

// Formatiert einen YYYY-MM-DD String als lesbares deutsches Datum,
// z.B. "27. Juli 2026" - für die Anzeige im Datepicker-Button.
function formatDateDisplay(dateStr) {
  if (!dateStr) return 'Datum wählen';
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${d}. ${MONTH_NAMES[m - 1]} ${y}`;
}

// Gleicht die sichtbare Datumsanzeige bei "Training nachtragen" mit dem
// tatsächlichen (versteckten) Datumswert ab. Wird sowohl beim Öffnen des
// Modals als auch nach einer Auswahl im Datepicker aufgerufen.
function syncManualWorkoutDateDisplay() {
  const val = document.getElementById('mw-date')?.value;
  const label = document.getElementById('mw-date-display-text');
  if (label) label.textContent = formatDateDisplay(val);
}

// Zeigt einen drehenden Ladeindikator im Button während einer async-Aktion
// (z.B. Anmelden) und stellt den Originaltext danach garantiert wieder her
// (auch bei Fehlern) - gibt dem Nutzer sichtbares Feedback, dass der Klick
// angekommen ist und etwas passiert.
async function withButtonLoading(buttonId, action) {
  const btn = document.getElementById(buttonId);
  if (!btn) { await action(); return; }
  const originalText = btn.innerHTML;
  const originalDisabled = btn.disabled;
  btn.disabled = true;
  btn.innerHTML = `<span style="display:inline-flex;align-items:center;gap:8px;justify-content:center"><span style="width:16px;height:16px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;display:inline-block;animation:btnspin .7s linear infinite"></span>${originalText}</span>`;
  try {
    await action();
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = originalDisabled;
  }
}

function wireStaticButtons() {
  // Auth Tabs
  document.querySelectorAll('.auth-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const isLogin = tab.textContent === 'Anmelden';
      document.querySelectorAll('.auth-tab').forEach((t) => t.classList.toggle('active', t === tab));
      document.getElementById('auth-login').style.display = isLogin ? '' : 'none';
      document.getElementById('auth-reg').style.display = isLogin ? 'none' : '';
      document.getElementById('auth-err').style.display = 'none';
    });
  });

  // Login
  on('btn-login', 'click', async () => {
    const email = document.getElementById('l-email').value.trim().toLowerCase();
    const pass = document.getElementById('l-pass').value;
    if (!email || !pass) { authErr('Bitte E-Mail und Passwort eingeben.'); return; }
    await withButtonLoading('btn-login', async () => {
      try {
        const { user } = await Auth.login(email, pass);
        await loadUserAndContinue(user);
      } catch (err) {
        authErr(translateAuthError(err));
      }
    });
  });

  // Registrierung
  on('btn-register', 'click', async () => {
    const name = document.getElementById('r-name').value.trim();
    const email = document.getElementById('r-email').value.trim().toLowerCase();
    const pass = document.getElementById('r-pass').value;
    if (!name || !email || !pass) { authErr('Bitte alle Felder ausfüllen.'); return; }
    if (pass.length < 6) { authErr('Passwort min. 6 Zeichen.'); return; }
    await withButtonLoading('btn-register', async () => {
      try {
        const { user, session } = await Auth.register(name, email, pass);
        if (!session) {
          // E-Mail-Bestätigung ist im Supabase-Projekt aktiviert
          showToast('📧 Bitte bestätige deine E-Mail-Adresse, um fortzufahren.');
          return;
        }
        await loadUserAndContinue(user);
      } catch (err) {
        authErr(translateAuthError(err));
      }
    });
  });

  // Passwort vergessen – Link unter dem Login-Formular
  on('forgot-pw-link', 'click', (e) => {
    e.preventDefault();
    document.getElementById('auth-login').style.display = 'none';
    document.getElementById('forgot-pw-box').style.display = '';
  });
  on('forgot-pw-cancel', 'click', () => {
    document.getElementById('forgot-pw-box').style.display = 'none';
    document.getElementById('auth-login').style.display = '';
  });
  on('btn-forgot-pw-send', 'click', async () => {
    const email = document.getElementById('fp-email').value.trim().toLowerCase();
    if (!email) { authErr('Bitte E-Mail eingeben.'); return; }
    try {
      await Auth.requestPasswordReset(email);
      showToast('📧 Falls die E-Mail existiert, wurde ein Reset-Link gesendet.');
      document.getElementById('forgot-pw-box').style.display = 'none';
      document.getElementById('auth-login').style.display = '';
    } catch (err) {
      authErr(translateAuthError(err));
    }
  });

  // Neues Passwort setzen (nach Klick auf Reset-Link aus E-Mail)
  on('btn-set-new-pw', 'click', async () => {
    const pw1 = document.getElementById('np-pass1').value;
    const pw2 = document.getElementById('np-pass2').value;
    if (pw1.length < 6) { authErr('Passwort min. 6 Zeichen.'); return; }
    if (pw1 !== pw2) { authErr('Passwörter stimmen nicht überein.'); return; }
    try {
      await Auth.setNewPassword(pw1);
      showToast('✅ Passwort geändert. Du kannst dich jetzt anmelden.');
      window.location.hash = '';
      document.getElementById('reset-password-box').style.display = 'none';
      document.querySelector('.auth-tabs').style.display = '';
      document.getElementById('auth-login').style.display = '';
    } catch (err) {
      authErr(translateAuthError(err));
    }
  });

  // Onboarding
  on('ob-next', 'click', obNext);
  on('ob-back', 'click', obBack);

  // Navbar
  ['home', 'workout', 'progress', 'nutrition', 'settings'].forEach((s) => {
    on('nav-' + s, 'click', () => showAppScreen(s));
  });

  // Workout Tabs
  ['active', 'coach', 'mine', 'history'].forEach((t) => {
    on('wtab-' + t, 'click', () => wTab(t));
  });

  // Fortschritt zurücksetzen
  on('btn-reset-progress', 'click', () => resetProgress());

  // Verbrannte Kalorien speichern
  on('btn-save-burned', 'click', () => saveBurnedCalories());

  // Wasser: ±250ml Stepper (speichert sofort) + manuelle Eingabe (Bestätigung per ✓)
  on('btn-water-minus', 'click', () => stepWater(-250));
  on('btn-water-plus', 'click', () => stepWater(250));
  on('btn-save-water', 'click', () => saveWater());

  // Meal Modal
  on('btn-open-meal-modal', 'click', () => openMealModal());
  on('btn-close-meal-modal', 'click', async () => {
    await stopScanner();
    closeMo('mo-meal');
  });
  on('btn-save-meal', 'click', async () => {
    await saveMealFromModal();
    await renderHome();
  });
  on('mn-save-generic', 'change', () => toggleSaveGenericGrams());

  // Meal Modal - Tabs (Suche / Scannen / Manuell)
  ['search', 'scan', 'manual'].forEach((t) => {
    on('mtab-' + t, 'click', () => switchMealTab(t));
  });

  // Meal Modal - Textsuche (Produktname + optionaler Hersteller)
  on('food-search-input', 'input', () => onFoodSearchInput());
  on('food-search-brand-input', 'input', () => onFoodSearchInput());

  // Meal Modal - Barcode-Scanner
  on('btn-start-scan', 'click', () => startScanner());
  on('btn-stop-scan', 'click', () => stopScanner());

  // Meal Modal - Produkt-Detail (Grammzahl anpassen)
  on('grams-minus', 'click', () => stepGrams(-10));
  on('grams-plus', 'click', () => stepGrams(10));
  on('food-grams', 'input', () => onGramsInput());
  on('btn-back-to-search', 'click', () => backToSearch());
  on('btn-save-food-product', 'click', async () => {
    await saveSelectedProduct();
    await renderHome();
  });

  // Ernährung - Tabs (Heute / Coach-Plan)
  on('ntab-today', 'click', () => switchNutritionTab('today'));
  on('ntab-coach', 'click', () => switchNutritionTab('coach'));
  on('ntab-calendar', 'click', () => switchNutritionTab('calendar'));

  // Mahlzeiten-Slot Verwaltung
  on('btn-manage-slots', 'click', () => openSlotManager());
  on('btn-close-slots-modal', 'click', () => closeMo('mo-slots'));
  on('btn-add-slot', 'click', () => addNewSlot());
  on('btn-save-slots', 'click', () => saveSlots());

  // Workout-Ende: RPE-Abfrage und Coach-Auswertung
  document.querySelectorAll('.rpe-btn').forEach((btn) => {
    btn.addEventListener('click', () => window.selectRpeAndFinish(parseInt(btn.dataset.rpe)));
  });
  on('btn-close-eval-modal', 'click', () => window.closeWorkoutEvaluation());
  on('btn-close-eval', 'click', () => window.closeWorkoutEvaluation());

  // Kalender-Modal
  on('btn-close-calendar-modal', 'click', () => closeMo('mo-calendar'));
  on('cal-prev-month', 'click', () => calendarPrevMonth());
  on('cal-next-month', 'click', () => calendarNextMonth());

  // Verlauf: Liste/Kalender Toggle + Session-Detail
  on('htab-list', 'click', () => switchHistoryTab('list'));
  on('htab-calendar', 'click', () => switchHistoryTab('calendar'));
  on('hcal-prev-month', 'click', () => historyCalPrevMonth());
  on('hcal-next-month', 'click', () => historyCalNextMonth());
  on('btn-close-session-detail', 'click', () => closeMo('mo-session-detail'));

  // Kalender-Tag-Detail: Sprung-Buttons zu Workout/Ernährung (dynamisch
  // erzeugter Inhalt, daher Event-Delegation auf dem Container)
  on('cal-day-detail-content', 'click', (e) => {
    const jumpWorkoutBtn = e.target.closest('[data-jump-workout]');
    if (jumpWorkoutBtn) { jumpToWorkoutLog(jumpWorkoutBtn.dataset.jumpWorkout); return; }
    const jumpNutritionBtn = e.target.closest('[data-jump-nutrition]');
    if (jumpNutritionBtn) {
      closeMo('mo-cal-day-detail');
      closeMo('mo-calendar');
      showNutritionForDate(jumpNutritionBtn.dataset.jumpNutrition);
    }
  });
  on('btn-close-cal-day-detail', 'click', () => closeMo('mo-cal-day-detail'));
  on('btn-close-nutrition-review', 'click', () => closeMo('mo-nutrition-review'));

  // Ernährung: Kalender-Tab (Monatsnavigation)
  on('ncal-prev-month', 'click', () => nutritionCalPrevMonth());
  on('ncal-next-month', 'click', () => nutritionCalNextMonth());

  // Manuelles Training nachtragen
  on('btn-add-manual-workout', 'click', () => { openManualWorkoutModal(); syncManualWorkoutDateDisplay(); });
  on('btn-close-manual-workout', 'click', () => closeMo('mo-manual-workout'));
  on('mw-type', 'change', () => toggleManualWorkoutFields());
  on('mw-distance', 'input', () => onManualWorkoutDistanceInput());
  on('mw-duration', 'input', () => toggleManualWorkoutFields());
  on('btn-save-manual-workout', 'click', () => saveManualWorkout());

  // Einheitlicher Datepicker (ersetzt native iOS type=date Auswahl). Öffnet
  // sich mit dem aktuellen mw-date Wert vorausgewählt; bei Bestätigung wird
  // sowohl das versteckte Feld als auch die sichtbare Anzeige aktualisiert.
  on('mw-date-display', 'click', () => {
    const current = document.getElementById('mw-date').value;
    openDatePicker(current, (selectedStr) => {
      document.getElementById('mw-date').value = selectedStr;
      syncManualWorkoutDateDisplay();
    });
  });
  on('btn-close-date-picker', 'click', () => closeMo('mo-date-picker'));
  on('dp-prev-month', 'click', () => datePickerPrevMonth());
  on('dp-next-month', 'click', () => datePickerNextMonth());
  on('dp-reset', 'click', () => datePickerReset());
  on('dp-confirm', 'click', () => datePickerConfirm());

  // Exercise Modal
  on('btn-close-ex-modal', 'click', () => closeMo('mo-ex'));
  on('btn-save-ex', 'click', saveExerciseFromModal);

  // Goal/Settings Modal
  on('btn-close-goal-modal', 'click', () => closeMo('mo-goal'));
  on('btn-save-goal', 'click', saveGoalEdit);

  // Logout
  on('btn-logout', 'click', async () => {
    await Auth.logout();
    currentUser = null;
    currentProfile = null;
    showPage('auth');
  });

}

function translateAuthError(err) {
  const msg = err?.message || '';
  if (msg.includes('Invalid login credentials')) return 'E-Mail oder Passwort falsch.';
  if (msg.includes('User already registered')) return 'Diese E-Mail ist bereits registriert.';
  if (msg.includes('Password should be at least')) return 'Passwort zu kurz (min. 6 Zeichen).';
  if (msg.includes('Email not confirmed')) return 'Bitte bestätige zuerst deine E-Mail-Adresse.';
  return msg || 'Ein Fehler ist aufgetreten.';
}

boot();
