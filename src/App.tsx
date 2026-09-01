import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import DevGate from './features/gate/DevGate'
import { ThemeProvider } from './theme/ThemeProvider'
import { HomePage, PageWrapper, StorePage } from './features/site'
import AdminPage from './features/admin/AdminPage'

export default function App() {
  return (
    <DevGate>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<PageWrapper />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/store" element={<StorePage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </DevGate>
  )
}
