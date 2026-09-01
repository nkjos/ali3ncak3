// Sign-in screen shown at /admin while signed out.
//
// Prototype flow: the "Sign in with Google" button reveals a styled email
// form (never window.prompt); submitting runs the allowlist check in
// auth.signIn. With real Google OAuth, the button will launch the popup
// flow directly and the form disappears (see the seam comment in auth.ts).

import { useState, type FormEvent } from 'react'
import { signIn } from './auth'

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  )
}

export default function SignIn() {
  const [formOpen, setFormOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!signIn(email)) {
      setError('That Google account is not on the admin allowlist.')
    }
    // On success the store updates, useAuth re-renders AdminPage, and the
    // dashboard replaces this screen.
  }

  return (
    <div className="admin-signin">
      <div className="admin-signin-card">
        <h1 className="admin-signin-title">Ali3nCak3 Admin</h1>
        <p className="admin-signin-sub">Owners only. Sign in to continue.</p>

        {!formOpen ? (
          <button
            type="button"
            className="admin-google-btn"
            onClick={() => setFormOpen(true)}
          >
            <GoogleMark />
            <span>Sign in with Google</span>
          </button>
        ) : (
          <form className="admin-signin-form" onSubmit={submit}>
            <label className="admin-label" htmlFor="admin-signin-email">
              Google account email
            </label>
            <input
              id="admin-signin-email"
              className="admin-input"
              type="email"
              required
              autoFocus
              placeholder="you@gmail.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError(null)
              }}
            />
            {error && (
              <p className="admin-error" role="alert">
                {error}
              </p>
            )}
            <div className="admin-signin-actions">
              <button
                type="button"
                className="admin-btn"
                onClick={() => {
                  setFormOpen(false)
                  setError(null)
                }}
              >
                Back
              </button>
              <button type="submit" className="admin-btn admin-btn-primary">
                Continue
              </button>
            </div>
          </form>
        )}

        <p className="admin-signin-note">
          Prototype sign-in: type the email of an allowlisted account. Real
          Google OAuth will replace this step (see auth.ts).
        </p>
      </div>
    </div>
  )
}
