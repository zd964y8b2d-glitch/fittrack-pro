import { supabase } from './supabaseClient.js'; import * as Auth from './auth.js'; import { getProfile } from './api.js'; import { getCoachTip } from './coachData.js'; import { ringHTML, pbar, showPage, showApp, showToast, handleApiError, greet, mealTotals, openMo, closeMo } from './ui.js'; import { initOfflineBanner } from './offline.js'; import { startOnboarding, obNext, obBack } from './onboarding.js'; import { initWorkoutModule, wTab, renderWorkout, renderProgression, saveExerciseFromModal } from './workout.js'; import { initNutritionModule, renderNutrition, saveMealFromModal, getMealsCache } from './nutrition.js'; import { initSettingsModule, renderSettings, saveGoalEdit } from './settings.js'; import { getWorkoutLogs } from './api.js'; import { coachPlanDays } from './coachData.js';

let currentUser = null;
let currentProfile = null;

async function boot() {
  initOfflineBanner();
  registerServiceWorker();
  wireStaticButtons();

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
}

async function loadUserAndContinue(user) {
  currentUser = user;
  try {
    currentProfile = await getProfile(user.id);
  } catch (err) {
    console.error('Profile error:', err);
    // Profil konnte nicht geladen werden – leeres Profil als Fallback
    currentProfile = {
      id: user.id, name: '', age: null, weight_kg: null, height_cm: null,
      sex: 'male', goals: [], training_types: [], level: null,
      training_days: 4, macro_kcal: null, macro_protein: null,
      macro_carbs: null, macro_fat: null, onboarding_done: false,
    };
  }

  if (!currentProfile) {
    currentProfile = {
      id: user.id, name: '', age: null, weight_kg: null, height_cm: null,
      sex: 'male', goals: [], training_types: [], level: null,
      training_days: 4, macro_kcal: null, macro_protein: null,
      macro_carbs: null, macro_fat: null, onboarding_done: false,
    };
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

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
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
  if (screen === 'nutrition') renderNutrition(); }

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
  document.getElementById('home-title').textContent = `Hey ${currentProfile.name || 'Athlet'} 👋`;

  let workoutCount = 0;
  try {
    const workoutLog = await getWorkoutLogs(currentUser.id, 100);
    workoutCount = workoutLog.length;
  } catch (e) { /* ignore */ }

  document.getElementById('home-stats').innerHTML = [
    { l: 'Kalorien', v: t.cal, u: 'kcal', c: 'var(--orange)' },
    { l: 'Workouts', v: workoutCount, u: 'gesamt', c: 'var(--accent)' },
    { l: 'Protein', v: t.protein, u: 'g', c: 'var(--green)' },
  ].map((s) => `<div class="st"><div class="sv" style="color:${s.c}">${s.v}</div><div class="su">${s.u}</div><div class="sl">${s.l}</div></div>`).join('');

  document.getElementById('home-tip').innerHTML = `<div class="coach-tip"><div class="ct-icon">🏆</div><div><div class="ct-lbl">COACH-TIPP</div><div class="ct-txt">${getCoachTip(currentProfile.goals)}</div></div></div>`;

  document.getElementById('home-macros').innerHTML = `
    <div class="row" style="margin-bottom:12px">
      <div><div style="font-size:14px;font-weight:800">Tagesziel</div>
      <div style="font-size:12px;color:var(--sub);margin-top:2px">${m.kcal - t.cal > 0 ? 'Noch ' + (m.kcal - t.cal) + ' kcal' : 'Ziel erreicht 🎉'}</div></div>
      ${ringHTML(62, 7, calPct, 'var(--orange)', Math.round(calPct) + '%')}
    </div>
    ${pbar('Protein ' + t.protein + 'g', t.protein, m.protein, 'var(--accent)')}
    ${pbar('Kohlenhydrate ' + t.carbs + 'g', t.carbs, m.carbs, 'var(--green)')}
    ${pbar('Fett ' + t.fat + 'g', t.fat, m.fat, 'var(--orange)')}`;

  try {
    const plan = coachPlanDays(currentProfile.goals, currentProfile.training_types, currentProfile.training_days);
    const today = plan[workoutCount % plan.length] || plan[0];
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
        </div>`).join('')}`;
  } catch (e) {
    document.getElementById('home-next-workout').innerHTML = `<div style="font-size:13px;color:var(--sub)">Starte das Onboarding um deinen Plan zu sehen.</div>`;
  }
}

function authErr(msg) {
  const el = document.getElementById('auth-err');
  el.textContent = msg;
  el.style.display = 'block';
}

function wireStaticButtons() {
  document.querySelectorAll('.auth-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const isLogin = tab.textContent === 'Anmelden';
      document.querySelectorAll('.auth-tab').forEach((t) => t.classList.toggle('active', t === tab));
      document.getElementById('auth-login').style.display = isLogin ? '' : 'none';
      document.getElementById('auth-reg').style.display = isLogin ? 'none' : '';
      document.getElementById('auth-err').style.display = 'none';
    });
  });

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

  document.getElementById('btn-register').addEventListener('click', async () => {
    const name = document.getElementById('r-name').value.trim();
    const email = document.getElementById('r-email').value.trim().toLowerCase();
    const pass = document.getElementById('r-pass').value;
    if (!name || !email || !pass) { authErr('Bitte alle Felder ausfüllen.'); return; }
    if (pass.length < 6) { authErr('Passwort min. 6 Zeichen.'); return; }
    try {
      const data = await Auth.register(name, email, pass);
      const user = data?.user || data?.session?.user;
      if (!user) {
        showToast('📧 Bitte bestätige deine E-Mail-Adresse.');
        return;
      }
      await loadUserAndContinue(user);
    } catch (err) {
      authErr(translateAuthError(err));
    }
  });

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
      showToast('📧 Reset-Link wurde gesendet.');
      document.getElementById('forgot-pw-box').style.display = 'none';
      document.getElementById('auth-login').style.display = '';
    } catch (err) {
      authErr(translateAuthError(err));
    }
  });

  document.getElementById('btn-set-new-pw').addEventListener('click', async () => {
    const pw1 = document.getElementById('np-pass1').value;
    const pw2 = document.getElementById('np-pass2').value;
    if (pw1.length < 6) { authErr('Passwort min. 6 Zeichen.'); return; }
    if (pw1 !== pw2) { authErr('Passwörter stimmen nicht überein.'); return; }
    try {
      await Auth.setNewPassword(pw1);
      showToast('✅ Passwort geändert.');
      window.location.hash = '';
      document.getElementById('reset-password-box').style.display = 'none';
      document.querySelector('.auth-tabs').style.display = '';
      document.getElementById('auth-login').style.display = '';
    } catch (err) {
      authErr(translateAuthError(err));
    }
  });

  document.getElementById('ob-next').addEventListener('click', obNext);
  document.getElementById('ob-back').addEventListener('click', obBack);

  ['home', 'workout', 'progress', 'nutrition', 'settings'].forEach((s) => {
    document.getElementById('nav-' + s).addEventListener('click', () => showAppScreen(s));
  });

  ['active', 'coach', 'mine', 'history'].forEach((t) => {
    document.getElementById('wtab-' + t).addEventListener('click', () => wTab(t));
  });

  document.getElementById('btn-open-meal-modal').addEventListener('click', () => openMo('mo-meal'));
  document.getElementById('btn-close-meal-modal').addEventListener('click', () => closeMo('mo-meal'));
  document.getElementById('btn-save-meal').addEventListener('click', async () => {
    await saveMealFromModal();
    await renderHome();
  });

  document.getElementById('btn-close-ex-modal').addEventListener('click', () => closeMo('mo-ex'));
  document.getElementById('btn-save-ex').addEventListener('click', saveExerciseFromModal);

  document.getElementById('btn-close-goal-modal').addEventListener('click', () => closeMo('mo-goal'));
  document.getElementById('btn-save-goal').addEventListener('click', saveGoalEdit);

  document.getElementById('btn-logout').addEventListener('click', async () => {
    await Auth.logout();
    currentUser = null;
    currentProfile = null;
    showPage('auth');
  });

  document.getElementById('btn-start-workout-home').addEventListener('click', () => {
    showAppScreen('workout');
    window.startWorkout();
  });
}

function translateAuthError(err) {
  const msg = err?.message || '';
  if (msg.includes('Invalid login credentials')) return 'E-Mail oder Passwort falsch.';
  if (msg.includes('User already registered')) return 'Diese E-Mail ist bereits registriert.';
  if (msg.includes('Password should be at least')) return 'Passwort zu kurz (min. 6 Zeichen).';
  if (msg.includes('Email not confirmed')) return 'Bitte bestätige zuerst deine E-Mail-Adresse.';
  if (msg.includes('email rate limit')) return 'Zu viele Versuche. Bitte kurz warten.';
  return msg || 'Ein Fehler ist aufgetreten.'; }

boot();
