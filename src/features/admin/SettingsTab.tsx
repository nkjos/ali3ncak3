// Settings tab: shows the hardcoded admin email and manages the co-owner
// email (who gains full admin access). Writes go straight through
// saveSettings — no draft state needed for a single field.

import { useState, type FormEvent } from 'react'
import { saveSettings, useSettings } from '../../content/store'
import { ADMIN_EMAIL } from './auth'

const EMAIL_RE = /^\S+@\S+\.\S+$/

export default function SettingsTab() {
  const settings = useSettings()
  const [input, setInput] = useState(settings.coOwnerEmail ?? '')
  const [status, setStatus] = useState<{ text: string; error: boolean } | null>(
    null,
  )

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const email = input.trim().toLowerCase()
    if (!EMAIL_RE.test(email)) {
      setStatus({ text: 'Enter a valid email address.', error: true })
      return
    }
    if (email === ADMIN_EMAIL) {
      setStatus({
        text: 'That is already the admin email — pick a different account.',
        error: true,
      })
      return
    }
    saveSettings({ ...settings, coOwnerEmail: email })
    setInput(email)
    setStatus({ text: `Co-owner set to ${email}.`, error: false })
  }

  const clear = () => {
    saveSettings({ ...settings, coOwnerEmail: null })
    setInput('')
    setStatus({ text: 'Co-owner access removed.', error: false })
  }

  return (
    <section className="admin-tab-body admin-settings">
      <div className="admin-card admin-settings-card">
        <h2 className="admin-card-title">Owner</h2>
        <div className="admin-kv">
          <span className="admin-kv-key">Admin email</span>
          <span className="admin-kv-value">{ADMIN_EMAIL}</span>
        </div>
        <p className="admin-note">
          Hardcoded in the prototype auth stub. Always has admin access.
        </p>
      </div>

      <div className="admin-card admin-settings-card">
        <h2 className="admin-card-title">Co-owner</h2>
        <div className="admin-kv">
          <span className="admin-kv-key">Current</span>
          <span className="admin-kv-value">
            {settings.coOwnerEmail ?? 'None'}
          </span>
        </div>
        <form className="admin-settings-form" onSubmit={submit}>
          <label className="admin-label" htmlFor="admin-coowner-email">
            Co-owner email
          </label>
          <div className="admin-settings-controls">
            <input
              id="admin-coowner-email"
              className="admin-input"
              type="email"
              placeholder="partner@example.com"
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                setStatus(null)
              }}
            />
            <button type="submit" className="admin-btn admin-btn-primary">
              {settings.coOwnerEmail ? 'Replace' : 'Set'}
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-danger"
              onClick={clear}
              disabled={settings.coOwnerEmail === null}
            >
              Clear
            </button>
          </div>
        </form>
        {status && (
          <p
            className={status.error ? 'admin-error' : 'admin-success'}
            role="status"
          >
            {status.text}
          </p>
        )}
        <p className="admin-note">
          The co-owner can sign in to this admin portal with full access.
          Clearing the email revokes it immediately — including an active
          co-owner session.
        </p>
      </div>
    </section>
  )
}
