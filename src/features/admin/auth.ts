// ---------------------------------------------------------------------------
// PROTOTYPE AUTH STUB — this is NOT real authentication.
//
// The "signed in" identity is just an email string persisted through the
// content store (localStorage key `ac3:authEmail`). Anyone can type an
// allowlisted email. That is acceptable for this prototype because the site
// has no backend and no private data; it exists so the UI flow (sign-in
// screen, guard, sign-out) is already correct when real auth lands.
//
// ── REAL GOOGLE AUTH SEAM ──────────────────────────────────────────────────
// When Firebase (or similar) is wired up, only `signIn` changes:
//
//   export async function signIn(): Promise<boolean> {
//     const cred = await signInWithPopup(auth, new GoogleAuthProvider())
//     const email = cred.user.email          // verified by Google
//     if (!isAllowlisted(email)) { await firebaseSignOut(auth); return false }
//     saveAuthEmail(normalize(email))        // or mirror onAuthStateChanged
//     return true
//   }
//
// The allowlist check, `signOut`, and `useAuth` stay exactly as they are.
// ---------------------------------------------------------------------------

import {
  getSettings,
  saveAuthEmail,
  useAuthEmail,
  useSettings,
} from '../../content/store'

/** The site owner. Hardcoded — the co-owner is managed via Settings. */
export const ADMIN_EMAIL = 'nathankjoscode@gmail.com'

function normalize(email: string): string {
  return email.trim().toLowerCase()
}

/** Admin + (optional) co-owner from settings. Always lowercase. */
export function getAllowlist(): string[] {
  const co = getSettings().coOwnerEmail
  return co ? [ADMIN_EMAIL, normalize(co)] : [ADMIN_EMAIL]
}

export function isAllowlisted(email: string | null): boolean {
  if (!email) return false
  return getAllowlist().includes(normalize(email))
}

/**
 * Prototype sign-in: accepts a typed email and "signs in" only if it is on
 * the allowlist. Returns false (no state change) otherwise.
 */
export function signIn(email: string): boolean {
  const candidate = normalize(email)
  if (!getAllowlist().includes(candidate)) return false
  saveAuthEmail(candidate)
  return true
}

export function signOut(): void {
  saveAuthEmail(null)
}

export interface AuthState {
  /** Currently signed-in email, or null when signed out. */
  email: string | null
  /** True when `email` is on the live allowlist (admin or co-owner). */
  isAdmin: boolean
}

/**
 * Live auth state. Subscribes to both the auth email and settings so that
 * clearing the co-owner email immediately revokes their access.
 */
export function useAuth(): AuthState {
  const email = useAuthEmail()
  const settings = useSettings()
  const allowlist = settings.coOwnerEmail
    ? [ADMIN_EMAIL, normalize(settings.coOwnerEmail)]
    : [ADMIN_EMAIL]
  const isAdmin = email !== null && allowlist.includes(normalize(email))
  return { email, isAdmin }
}
