// Admin portal, mounted at /admin inside the site wrapper. Reachable only by
// typing the URL (no nav link anywhere on the site).
//
// Guard: signed out -> sign-in screen; signed in but not allowlisted ->
// redirect home.

import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import PaletteDesigner from '../palette/PaletteDesigner'
import { signOut, useAuth } from './auth'
import SignIn from './SignIn'
import LayoutTab from './LayoutTab'
import ProductsTab from './ProductsTab'
import SettingsTab from './SettingsTab'
import './admin.css'

type TabId = 'layout' | 'palette' | 'products' | 'settings'

const TABS: { id: TabId; label: string }[] = [
  { id: 'layout', label: 'Layout' },
  { id: 'palette', label: 'Palette' },
  { id: 'products', label: 'Products' },
  { id: 'settings', label: 'Settings' },
]

export default function AdminPage() {
  const { email, isAdmin } = useAuth()
  const [tab, setTab] = useState<TabId>('layout')

  // A signed-in email that is no longer allowlisted (e.g. a removed co-owner)
  // is signed out rather than redirected forever — otherwise that browser
  // could never reach the sign-in screen again to switch accounts.
  const staleSession = email !== null && !isAdmin
  useEffect(() => {
    if (staleSession) signOut()
  }, [staleSession])

  if (email === null) return <SignIn />
  if (!isAdmin) return <Navigate to="/" replace />

  return (
    <div className="admin">
      <header className="admin-header">
        <div>
          <h1 className="admin-title">Admin</h1>
          <p className="admin-subtitle">Ali3nCak3 control panel</p>
        </div>
        <div className="admin-user">
          <span className="admin-user-email">{email}</span>
          <button type="button" className="admin-btn" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      <nav className="admin-tabs" aria-label="Admin sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`admin-tab${tab === t.id ? ' is-active' : ''}`}
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="admin-panel">
        {tab === 'layout' && <LayoutTab />}
        {tab === 'palette' && <PaletteDesigner />}
        {tab === 'products' && <ProductsTab />}
        {tab === 'settings' && <SettingsTab />}
      </div>
    </div>
  )
}
