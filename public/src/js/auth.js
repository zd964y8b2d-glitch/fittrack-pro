// ═══════════════════════════════════════════════════════════════════════════
// auth.js
// Authentifizierung über Supabase Auth: Registrierung, Login, Logout,
// Passwort zurücksetzen. Session-Handling läuft komplett über Supabase
// (JWT im localStorage, automatisches Token-Refresh).
// ═══════════════════════════════════════════════════════════════════════════
import { supabase } from './supabaseClient.js';

// ── REGISTRIERUNG ───────────────────────────────────────────────────────
// Erzeugt den auth.users-Eintrag. Das Profil in public.profiles wird
// automatisch per DB-Trigger (handle_new_user, siehe schema.sql) angelegt.
export async function register(name, email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name }, // landet in raw_user_meta_data -> Trigger nutzt es als Profilname
      emailRedirectTo: window.location.origin, // nach E-Mail-Bestätigung zurück zur App
    },
  });
  if (error) throw error;
  return data;
}

// ── LOGIN ────────────────────────────────────────────────────────────────
export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// ── LOGOUT ───────────────────────────────────────────────────────────────
export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ── PASSWORT ZURÜCKSETZEN (neu) ─────────────────────────────────────────
// Schritt 1: Reset-Mail anfordern. Supabase schickt einen Link, der den
// Nutzer mit einem speziellen Recovery-Token zurück auf redirectTo schickt.
export async function requestPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/index.html#reset-password`,
  });
  if (error) throw error;
}

// Schritt 2: Neues Passwort setzen, NACHDEM der Nutzer über den Mail-Link
// zurückgekehrt ist (Supabase hat dann automatisch eine Recovery-Session
// aus dem URL-Fragment erstellt, siehe detectSessionInUrl in supabaseClient.js).
export async function setNewPassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

// ── SESSION / AKTUELLER NUTZER ──────────────────────────────────────────
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data?.user || null;
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data?.session || null;
}

// Reagiert live auf Login/Logout/Token-Refresh (z.B. um die UI zu aktualisieren).
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => callback(event, session));
}

// Erkennt, ob die aktuelle URL ein Passwort-Recovery-Link ist
// (Supabase hängt #access_token=...&type=recovery an die Redirect-URL).
export function isPasswordRecoveryUrl() {
  return window.location.hash.includes('type=recovery') || window.location.hash.includes('reset-password');
}
