// ═══════════════════════════════════════════════════════════════════════════
// calendar.js
// Monatskalender-Ansicht: zeigt pro Tag Icons für absolvierte Workouts
// (nach Ziel-Typ) und ob Ernährung getrackt wurde. Antippen eines Tages
// öffnet ein Detail-Modal mit den tatsächlichen Einträgen und Buttons,
// um direkt zur jeweiligen Trainingseinheit (Verlauf) oder zum Ernährungs-
// tag zu springen.
// ═══════════════════════════════════════════════════════════════════════════
import { getCalendarData } from './api.js';
import { openMo, closeMo } from './ui.js';

// Formatiert ein Datum als YYYY-MM-DD in der LOKALEN Zeitzone des Geräts.
// toISOString() würde immer UTC verwenden, was bei deutscher Sommerzeit
// (UTC+2) am Abend bereits den nächsten Kalendertag anzeigt - das war die
// Ursache für die Datums-Verschiebung im Kalender.
function toLocalDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

let currentUser = null;
let viewYear = new Date().getFullYear();
let viewMonth = new Date().getMonth(); // 0-11
let calendarDataCache = {};
let selectedDayStr = null;

const GOAL_ICONS = { muscle: '💪', cut: '🔥', recomp: '⚖️', endurance: '🏃', health: '❤️' };
const GOAL_LABELS = { muscle: 'Muskelaufbau', cut: 'Fettabbau', recomp: 'Rekomposition', endurance: 'Ausdauer', health: 'Gesundheit', _generic: 'Training' };
const MONTH_NAMES = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const WEEKDAY_LABELS = ['Mo','Di','Mi','Do','Fr','Sa','So'];

export function initCalendarModule(user) {
  currentUser = user;
}

export async function openCalendar() {
  const now = new Date();
  viewYear = now.getFullYear();
  viewMonth = now.getMonth();
  await loadAndRenderMonth();
  openMo('mo-calendar');
}

export async function calendarPrevMonth() {
  viewMonth--;
  if (viewMonth < 0) { viewMonth = 11; viewYear--; }
  await loadAndRenderMonth();
}

export async function calendarNextMonth() {
  viewMonth++;
  if (viewMonth > 11) { viewMonth = 0; viewYear++; }
  await loadAndRenderMonth();
}

async function loadAndRenderMonth() {
  const fromDate = new Date(viewYear, viewMonth, 1).toISOString();
  const toDate = new Date(viewYear, viewMonth + 1, 0, 23, 59, 59).toISOString();

  document.getElementById('cal-month-label').textContent = `${MONTH_NAMES[viewMonth]} ${viewYear}`;
  document.getElementById('cal-grid').innerHTML = `<div style="text-align:center;padding:24px;color:var(--muted);font-size:12px">Lädt...</div>`;

  try {
    calendarDataCache = await getCalendarData(currentUser.id, fromDate, toDate);
  } catch (e) {
    calendarDataCache = {};
  }
  renderMonthGrid();
}

function renderMonthGrid() {
  const firstDay = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  // Montag = 0 statt Sonntag = 0 (deutsche Wochenkonvention)
  let startWeekday = firstDay.getDay() - 1;
  if (startWeekday < 0) startWeekday = 6;

  const todayStr = toLocalDateStr(new Date());

  let html = `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:6px">
    ${WEEKDAY_LABELS.map(d => `<div style="text-align:center;font-size:10px;color:var(--muted);font-weight:700">${d}</div>`).join('')}
  </div>
  <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">`;

  for (let i = 0; i < startWeekday; i++) html += `<div></div>`;

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = toLocalDateStr(new Date(viewYear, viewMonth, day));
    const dayData = calendarDataCache[dateStr];
    const isToday = dateStr === todayStr;
    const hasWorkout = dayData?.workouts?.length > 0;
    const hasMeals = dayData?.hasMeals;

    const icons = [];
    if (hasWorkout) {
      const uniqueGoals = [...new Set(dayData.workouts.map((w) => w.goal))];
      uniqueGoals.slice(0, 2).forEach((g) => icons.push(GOAL_ICONS[g] || '🏋️'));
    }
    if (hasMeals) icons.push('🥗');

    html += `<div data-cal-day="${dateStr}" style="aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:10px;cursor:pointer;background:${isToday ? 'var(--accentBg)' : 'var(--surface)'};border:1px solid ${isToday ? 'var(--accentBd)' : 'var(--border)'};padding:2px">
      <div style="font-size:11px;font-weight:${isToday ? '800' : '600'};color:${isToday ? 'var(--accent2)' : 'var(--text)'}">${day}</div>
      <div style="font-size:10px;line-height:1;margin-top:1px">${icons.join('')}</div>
    </div>`;
  }

  html += `</div>`;
  document.getElementById('cal-grid').innerHTML = html;

  document.querySelectorAll('#cal-grid [data-cal-day]').forEach((el) => {
    el.addEventListener('click', () => showDayDetail(el.dataset.calDay));
  });
}

// Zeigt ein echtes Detail-Modal (statt alert) mit den tatsächlichen
// Workout-Namen und Buttons, um direkt zum jeweiligen Eintrag zu springen.
function showDayDetail(dateStr) {
  selectedDayStr = dateStr;
  const dayData = calendarDataCache[dateStr];
  const dateLabel = new Date(dateStr).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' });

  let html = `<div style="font-size:13px;color:var(--sub);margin-bottom:14px">${dateLabel}</div>`;

  if (!dayData || (!dayData.workouts?.length && !dayData.hasMeals)) {
    html += `<div style="text-align:center;color:var(--muted);padding:16px;font-size:13px">Keine Einträge an diesem Tag.</div>`;
  } else {
    if (dayData.workouts?.length) {
      html += dayData.workouts.map((w) => `
        <div class="card" style="margin-bottom:10px">
          <div class="row">
            <div>
              <div style="font-size:14px;font-weight:800">${GOAL_ICONS[w.goal] || '🏋️'} ${w.name || GOAL_LABELS[w.goal] || 'Training'}</div>
            </div>
            <button data-jump-workout="${w.id}" style="background:var(--accentBg);border:1px solid var(--accentBd);border-radius:9px;padding:7px 12px;color:var(--accent2);font-size:12px;font-weight:700;cursor:pointer">Öffnen</button>
          </div>
        </div>`).join('');
    }
    if (dayData.hasMeals) {
      html += `<div class="card" style="margin-bottom:10px">
        <div class="row">
          <div style="font-size:14px;font-weight:800">🥗 Ernährung</div>
          <button data-jump-nutrition="${dateStr}" style="background:var(--accentBg);border:1px solid var(--accentBd);border-radius:9px;padding:7px 12px;color:var(--accent2);font-size:12px;font-weight:700;cursor:pointer">Öffnen</button>
        </div>
      </div>`;
    }
  }

  document.getElementById('cal-day-detail-content').innerHTML = html;
  openMo('mo-cal-day-detail');
}

export function getSelectedCalendarDay() {
  return selectedDayStr;
}
