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
import { ringHTML, pbar, showPage, showApp, showToast, handleApiError, greet, mealTotals, openMo, closeMo } from './ui.js';
import { initOfflineBanner } from './offline.js';
import { startOnboarding, obNext, obBack } from './onboarding.js';
import { initWorkoutModule, wTab, renderWorkout, renderProgression, saveExerciseFromModal, resetProgress } from './workout.js';
import {
  initNutritionModule, renderNutrition, saveMealFromModal, getMealsCache,
  openMealModal, switchMealTab, onFoodSearchInput, stepGrams, onGramsInput,
  backToSearch, saveSelectedProduct, startScanner, stopScanner,
  switchNutritionTab, openSlotManager, addNewSlot, saveSlots, saveBurnedCalories,
} from './nutrition.js';
import { initSettingsModule, renderSettings, saveGoalEdit } from './settings.js';
import { getWorkoutLogs, getTodayBurnedCalories, setTodayBurnedCalories, resetAllProgress } from './api.js';
import { coachPlanDays } from './coachData.js';

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
  initSettingsModule(currentUser, currentProfile, (updated) => {
    currentProfile = updated;
    renderHome();
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SERVICE WORKER REGISTRIERUNG
// ═══════════════════════════════════════════════════════════════════════════
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // Sobald eine neue SW-Version bereitsteht, sofort aktivieren und
      // die Seite neu laden -> Nutzer bekommt automatisch die neueste
      // Version ohne manuelles Update (siehe Anforderung 10).
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            newWorker.postMessage('SKIP_WAITING');
          }
        });
      });
    });
    let refreshed = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshed) return;
      refreshed = true;
      window.location.reload();
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
  if (screen === 'progress') renderProgression();
  if (screen === 'settings') renderSettings();
  if (screen === 'workout') renderWorkout();
  if (screen === 'nutrition') renderNutrition();
}

async function renderHome() {
  if (!currentProfile) return;
  const meals = getMealsCache();
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
    { l: 'Kalorien', v: t.cal, u: 'kcal', c: 'var(--orange)' },
    { l: 'Workouts', v: workoutLog.length, u: 'gesamt', c: 'var(--accent)' },
    { l: 'Protein', v: t.protein, u: 'g', c: 'var(--green)' },
  ].map((s) => `<div class="st"><div class="sv" style="color:${s.c}">${s.v}</div><div class="su">${s.u}</div><div class="sl">${s.l}</div></div>`).join('');

  document.getElementById('home-tip').innerHTML = `<div class="coach-tip"><div class="ct-icon">🏆</div><div><div class="ct-lbl">COACH-TIPP</div><div class="ct-txt">${getCoachTip(currentProfile.goals)}</div></div></div>`;

  const burnedEntry = await getTodayBurnedCalories(currentUser.id).catch(() => null);
  const burnedKcal = burnedEntry?.kcal || 0;
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

  document.getElementById('home-burned').innerHTML = `
    <div class="row" style="margin-bottom:8px">
      <div style="font-size:14px;font-weight:800">🔥 Verbrannte Kalorien heute</div>
    </div>
    <div class="row" style="gap:8px">
      <input id="burned-kcal-input" class="oi" type="number" inputmode="numeric" placeholder="0" value="${burnedKcal || ''}" style="flex:1">
      <button id="btn-save-burned" style="background:var(--accentBg);border:1px solid var(--accentBd);border-radius:11px;padding:11px 16px;color:var(--accent2);font-size:13px;font-weight:700;cursor:pointer;flex-shrink:0">Speichern</button>
    </div>
    <div style="font-size:11px;color:var(--muted);margin-top:6px">Trage Kalorien aus Apple Health, Google Fit oder deiner Fitness-Uhr manuell ein.</div>`;

  document.getElementById('btn-save-burned').addEventListener('click', async () => {
    const val = parseInt(document.getElementById('burned-kcal-input').value) || 0;
    try {
      await setTodayBurnedCalories(currentUser.id, val);
      showToast('✅ Verbrannte Kalorien gespeichert');
      await renderHome();
    } catch (e) {
      showToast('⚠️ Speichern fehlgeschlagen');
    }
  });

  const plan = coachPlanDays(currentProfile.goals, currentProfile.training_types, currentProfile.training_days);
  const today = plan[workoutLog.length % plan.length] || plan[0];
  document.getElementById('home-next-workout').innerHTML = `
    <div class="row" style="margin-bottom:10px">
      <div style="font-size:14px;font-weight:800">Nächste Einheit</div>
      <span class="tag ta">Tag ${today?.key || 'A'}</span>
    </div>
    <div style="font-size:13px;color:var(--sub);margin-bottom:8px">${today?.focus || ''}</div>
    ${(today?.exercises || []).slice(0, 3).map((e) => `
      <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border)">
        <span style="font-size:13px">${e.name}</span>
        <span style="font-size:11px;color:var(--sub)">${e.sets}×${e.reps} ${e.bodyweight ? 'KG' : e.weight + 'kg'}</span>
      </div>`).join('')}
    ${(today?.exercises?.length || 0) > 3 ? `<div style="font-size:11px;color:var(--muted);margin-top:6px;text-align:right">+${today.exercises.length - 3} weitere</div>` : ''}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTH UI WIRING
// ═══════════════════════════════════════════════════════════════════════════
function authErr(msg) {
  const el = document.getElementById('auth-err');
  el.textContent = msg;
  el.style.display = 'block';
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
  document.getElementById('btn-login').addEventListener('click', async () => {
    const email = document.getElementById('l-email').value.trim().toLowerCase();
    const pass = document.getElementById('l-pass').value;
    if (!email || !pass) { authErr('Bitte E-Mail und Passwort eingeben.'); return; }
    try {
      const { user } = await Auth.login(email, pass);
      await loadUserAndContinue(user);
    } catch (err) {
      authErr(translateAuthError(err));
    }
  });

  // Registrierung
  document.getElementById('btn-register').addEventListener('click', async () => {
    const name = document.getElementById('r-name').value.trim();
    const email = document.getElementById('r-email').value.trim().toLowerCase();
    const pass = document.getElementById('r-pass').value;
    if (!name || !email || !pass) { authErr('Bitte alle Felder ausfüllen.'); return; }
    if (pass.length < 6) { authErr('Passwort min. 6 Zeichen.'); return; }
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

  // Passwort vergessen – Link unter dem Login-Formular
  document.getElementById('forgot-pw-link').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('auth-login').style.display = 'none';
    document.getElementById('forgot-pw-box').style.display = '';
  });
  document.getElementById('forgot-pw-cancel').addEventListener('click', () => {
    document.getElementById('forgot-pw-box').style.display = 'none';
    document.getElementById('auth-login').style.display = '';
  });
  document.getElementById('btn-forgot-pw-send').addEventListener('click', async () => {
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
  document.getElementById('btn-set-new-pw').addEventListener('click', async () => {
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
  document.getElementById('ob-next').addEventListener('click', obNext);
  document.getElementById('ob-back').addEventListener('click', obBack);

  // Navbar
  ['home', 'workout', 'progress', 'nutrition', 'settings'].forEach((s) => {
    document.getElementById('nav-' + s).addEventListener('click', () => showAppScreen(s));
  });

  // Workout Tabs
  ['active', 'coach', 'mine', 'history'].forEach((t) => {
    document.getElementById('wtab-' + t).addEventListener('click', () => wTab(t));
  });

  // Fortschritt zurücksetzen
  document.getElementById('btn-reset-progress').addEventListener('click', () => resetProgress());

  // Verbrannte Kalorien speichern
  document.getElementById('btn-save-burned').addEventListener('click', () => saveBurnedCalories());

  // Meal Modal
  document.getElementById('btn-open-meal-modal').addEventListener('click', () => openMealModal());
  document.getElementById('btn-close-meal-modal').addEventListener('click', async () => {
    await stopScanner();
    closeMo('mo-meal');
  });
  document.getElementById('btn-save-meal').addEventListener('click', async () => {
    await saveMealFromModal();
    await renderHome();
  });

  // Meal Modal - Tabs (Suche / Scannen / Manuell)
  ['search', 'scan', 'manual'].forEach((t) => {
    document.getElementById('mtab-' + t).addEventListener('click', () => switchMealTab(t));
  });

  // Meal Modal - Textsuche
  document.getElementById('food-search-input').addEventListener('input', (e) => {
    onFoodSearchInput(e.target.value);
  });

  // Meal Modal - Barcode-Scanner
  document.getElementById('btn-start-scan').addEventListener('click', () => startScanner());
  document.getElementById('btn-stop-scan').addEventListener('click', () => stopScanner());

  // Meal Modal - Produkt-Detail (Grammzahl anpassen)
  document.getElementById('grams-minus').addEventListener('click', () => stepGrams(-10));
  document.getElementById('grams-plus').addEventListener('click', () => stepGrams(10));
  document.getElementById('food-grams').addEventListener('input', () => onGramsInput());
  document.getElementById('btn-back-to-search').addEventListener('click', () => backToSearch());
  document.getElementById('btn-save-food-product').addEventListener('click', async () => {
    await saveSelectedProduct();
    await renderHome();
  });

  // Ernährung - Tabs (Heute / Coach-Plan)
  document.getElementById('ntab-today').addEventListener('click', () => switchNutritionTab('today'));
  document.getElementById('ntab-coach').addEventListener('click', () => switchNutritionTab('coach'));

  // Mahlzeiten-Slot Verwaltung
  document.getElementById('btn-manage-slots').addEventListener('click', () => openSlotManager());
  document.getElementById('btn-close-slots-modal').addEventListener('click', () => closeMo('mo-slots'));
  document.getElementById('btn-add-slot').addEventListener('click', () => addNewSlot());
  document.getElementById('btn-save-slots').addEventListener('click', () => saveSlots());

  // Exercise Modal
  document.getElementById('btn-close-ex-modal').addEventListener('click', () => closeMo('mo-ex'));
  document.getElementById('btn-save-ex').addEventListener('click', saveExerciseFromModal);

  // Goal/Settings Modal
  document.getElementById('btn-close-goal-modal').addEventListener('click', () => closeMo('mo-goal'));
  document.getElementById('btn-save-goal').addEventListener('click', saveGoalEdit);

  // Logout
  document.getElementById('btn-logout').addEventListener('click', async () => {
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
