// DevGate — client-side password lock for the dev deployment.
//
// When the build was made with VITE_DEV_GATE=1 (see .github/workflows/
// deploy-dev.yml) the whole app is hidden behind a full-screen password
// prompt. The entered password is hashed with WebCrypto SHA-256 and compared
// to a hardcoded hash; the plaintext password is never embedded in the
// bundle. A successful unlock is persisted in localStorage so the visitor
// is not re-prompted.
//
// SECURITY NOTE: this is a *client-side* gate — the full site bundle is
// still publicly downloadable and the hash is visible in the JS. It deters
// casual visitors only. Never ship secrets to the dev site. See
// docs/DEPLOY.md.
//
// Styling is fully self-contained (gate.css, hardcoded dark neutrals):
// this screen renders before ThemeProvider/theme variables matter.

import {
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import './gate.css'

/** SHA-256 hex digest of the dev password (the password itself is NOT here). */
const PASSWORD_SHA256 =
  '00121c0612c23af4ce207e49d0520bec7e63e5824ae42fa87c83be7c0db7acc0'

/** localStorage key persisting a successful unlock. */
const STORAGE_KEY = 'ac3:devgate'

function isGateEnabled(): boolean {
  return import.meta.env.VITE_DEV_GATE === '1'
}

function readPersistedUnlock(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === PASSWORD_SHA256
  } catch {
    return false
  }
}

function persistUnlock(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, PASSWORD_SHA256)
  } catch {
    // Storage blocked — unlock still holds for this session via state.
  }
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input)
  const digest = await window.crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

interface LockScreenProps {
  onUnlock: () => void
}

function LockScreen({ onUnlock }: LockScreenProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  // Incremented on every failed attempt; used as a key so the CSS shake
  // animation restarts even when two wrong guesses happen in a row.
  const [shake, setShake] = useState(0)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (checking) return
    if (!window.crypto?.subtle) {
      setError('This browser context cannot verify the password (needs HTTPS).')
      setShake((n) => n + 1)
      return
    }
    setChecking(true)
    try {
      const hash = await sha256Hex(password)
      if (hash === PASSWORD_SHA256) {
        persistUnlock()
        onUnlock()
        return
      }
      setError('Wrong password. Try again.')
      setPassword('')
      setShake((n) => n + 1)
    } catch {
      setError('Could not verify the password. Try again.')
      setShake((n) => n + 1)
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="devgate">
      <div
        key={shake}
        className={`devgate__card${shake > 0 ? ' devgate__card--shake' : ''}`}
      >
        <div className="devgate__badge" aria-hidden="true">
          &#128274;
        </div>
        <h1 className="devgate__title">Ali3nCak3</h1>
        <p className="devgate__subtitle">
          Dev preview — enter the password to continue.
        </p>
        <form className="devgate__form" onSubmit={handleSubmit}>
          <label className="devgate__label" htmlFor="devgate-password">
            Password
          </label>
          <input
            id="devgate-password"
            className="devgate__input"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setError(null)
            }}
            autoFocus
            autoComplete="current-password"
            aria-invalid={error !== null}
            aria-describedby="devgate-error"
          />
          <button
            className="devgate__button"
            type="submit"
            disabled={checking || password.length === 0}
          >
            {checking ? 'Checking…' : 'Unlock'}
          </button>
          <p id="devgate-error" className="devgate__error" role="alert">
            {error ?? ' '}
          </p>
        </form>
      </div>
    </div>
  )
}

interface DevGateProps {
  children: ReactNode
}

/**
 * Wraps the app. Pass-through unless the build was made with
 * VITE_DEV_GATE=1, in which case a full-screen lock renders until the dev
 * password is entered (unlock persisted in localStorage `ac3:devgate`).
 */
export default function DevGate({ children }: DevGateProps) {
  const gated = isGateEnabled()
  const [unlocked, setUnlocked] = useState<boolean>(() =>
    gated ? readPersistedUnlock() : true,
  )

  if (!gated || unlocked) return <>{children}</>
  return <LockScreen onUnlock={() => setUnlocked(true)} />
}
