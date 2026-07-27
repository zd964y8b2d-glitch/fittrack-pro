// ═══════════════════════════════════════════════════════════════════════════
// calendar.js
// Monatskalender-Ansicht: zeigt pro Tag Icons für absolvierte Workouts
// (nach Ziel-Typ) und ob Ernährung getrackt wurde. Antippen eines Tages
// zeigt eine kurze Detailzusammenfassung.
// ═══════════════════════════════════════════════════════════════════════════
import { getCalendarData } from './api.js';
import { openMo } from './ui.js';

let currentUser = null;
let viewYear = new Date().getFullYear();
let viewMonth = new Date().getMonth(); // 0-11
let calendarDataCache = {};

const GOAL_ICONS = { muscle: '💪', cut: '🔥', recomp: '⚖️', endurance: '🏃', health: '❤️' };
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
  const lastDay = new Date(viewYear, viewMonth + 1, 0);
  const daysInMonth = lastDay.getDate();

  // Montag = 0 statt Sonntag = 0 (deutsche Wochenkonvention)
  let startWeekday = firstDay.getDay() - 1;
  if (startWeekday < 0) startWeekday = 6;

  const todayStr = new Date().toISOString().slice(0, 10);

  let html = `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:6px">
    ${WEEKDAY_LABELS.map(d => `<div style="text-align:center;font-size:10px;color:var(--muted);font-weight:700">${d}</div>`).join('')}
  </div>
  <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">`;

  for (let i = 0; i < startWeekday; i++) {
    html += `<div></div>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(viewYear, viewMonth, day);
    const dateStr = dateObj.toISOString().slice(0, 10);
    const dayData = calendarDataCache[dateStr];
    const isToday = dateStr === todayStr;
    const hasWorkout = dayData?.workoutGoals?.length > 0;
    const hasMeals = dayData?.hasMeals;

    const icons = [];
    if (hasWorkout) {
      const uniqueGoals = [...new Set(dayData.workoutGoals)];
      uniqueGoals.slice(0, 2).forEach(g => icons.push(GOAL_ICONS[g] || '🏋️'));
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

function showDayDetail(dateStr) {
  const dayData = calendarDataCache[dateStr];
  const dateLabel = new Date(dateStr).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' });

  if (!dayData || (!dayData.workoutGoals?.length && !dayData.hasMeals)) {
    alert(`${dateLabel}\n\nKeine Einträge an diesem Tag.`);
    return;
  }

  const parts = [dateLabel, ''];
  if (dayData.workoutGoals?.length) {
    const goalLabels = { muscle: 'Muskelaufbau', cut: 'Fettabbau', recomp: 'Rekomposition', endurance: 'Ausdauer', health: 'Gesundheit' };
    parts.push(`Training: ${dayData.workoutGoals.map(g => `${GOAL_ICONS[g] || ''} ${goalLabels[g] || g}`).join(', ')}`);
  }
  if (dayData.hasMeals) {
    parts.push('🥗 Ernährung wurde getrackt');
  }
  alert(parts.join('\n'));
}
