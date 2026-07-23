// ═══════════════════════════════════════════════════════════════════════════
// ui.js
// Wiederverwendbare UI-Bausteine: Ring-Chart, Progressbar, Toast, Modal-
// Steuerung, Formatierungshelfer. Keine Business-Logik, kein API-Zugriff.
// ═══════════════════════════════════════════════════════════════════════════

export function ringHTML(size, stroke, pct, color, label) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, o = c - (pct / 100) * c;
  return `<div class="ring-wrap" style="width:${size}px;height:${size}px">
    <svg width="${size}" height="${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--border)" stroke-width="${stroke}"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}"
        stroke-dasharray="${c}" stroke-dashoffset="${o}" stroke-linecap="round"
        style="transform:rotate(-90deg);transform-origin:center"/>
    </svg>
    <div class="ring-lbl"><span style="font-size:${size > 70 ? 15 : 12}px;font-weight:800;color:${color}">${label}</span></div>
  </div>`;
}

export function pbar(label, val, max, color) {
  const pct = Math.min((val / (max || 1)) * 100, 100);
  return `<div class="pb-row"><div class="pb-meta"><span>${label}</span><span>${Math.round(pct)}%</span></div>
    <div class="pb-track"><div class="pb-fill" style="width:${pct}%;background:${color}"></div></div></div>`;
}

let toastTimer = null;
export function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

export function openMo(id) { document.getElementById(id)?.classList.add('open'); }
export function closeMo(id) { document.getElementById(id)?.classList.remove('open'); }

export function showPage(id) {
  document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
  document.getElementById('page-' + id)?.classList.add('active');
}

export function showApp(screen) {
  document.querySelectorAll('.app-screen').forEach((s) => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach((b) => b.classList.remove('active'));
  document.getElementById('app-' + screen)?.classList.add('active');
  document.getElementById('nav-' + screen)?.classList.add('active');
}

export function fmtTime(s) {
  const m = Math.floor(s / 60), sec = s % 60;
  return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
}

export function greet() {
  const h = new Date().getHours();
  return h < 12 ? 'Guten Morgen ☀️' : h < 18 ? 'Guten Nachmittag 💪' : 'Guten Abend 🌙';
}

export function todayLbl() {
  const d = new Date();
  return d.getDate().toString().padStart(2, '0') + '.' + (d.getMonth() + 1).toString().padStart(2, '0');
}

export function typeLbl(types) {
  const arr = Array.isArray(types) ? types : [types || 'gym'];
  const map = { gym: 'Gym', freeletics: 'Freeletics', home: 'Home', outdoor: 'Outdoor' };
  return arr.map((v) => map[v] || v).join(' + ');
}

export function mealTotals(meals) {
  return (meals || []).reduce(
    (a, m) => ({
      cal: a.cal + (m.kcal || 0),
      protein: a.protein + (m.protein_g || 0),
      carbs: a.carbs + (m.carbs_g || 0),
      fat: a.fat + (m.fat_g || 0),
    }),
    { cal: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

// Globaler Fehler-Handler für API-Aufrufe: zeigt Toast statt Konsolen-Stille.
export function handleApiError(err, fallbackMsg = 'Etwas ist schiefgelaufen') {
  console.error(err);
  const msg = err?.message?.includes('Internetverbindung')
    ? err.message
    : `⚠️ ${fallbackMsg}`;
  showToast(msg);
}
