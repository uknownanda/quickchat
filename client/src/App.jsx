import React, { useContext } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import ProfilePage from './pages/ProfilePage'
import { Toaster } from 'react-hot-toast'
import { AuthContext } from '../context/AuthContext'

const AuthLoading = () => (
  <main className="min-h-screen flex items-center justify-center bg-[#09090f] text-white">
    <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
      <span className="h-8 w-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
      <p className="text-sm text-white/65">Restoring your session…</p>
    </div>
  </main>
)

const AuthError = ({ onRetry }) => (
  <main className="min-h-screen flex items-center justify-center bg-[#09090f] px-5 text-white">
    <section className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.04] p-7 text-center">
      <h1 className="text-xl font-semibold">Couldn't verify your session</h1>
      <p className="mt-2 text-sm leading-6 text-white/60">QuickChat couldn't reach the authentication service. Your saved session hasn't been removed. Check your connection and try again.</p>
      <button type="button" onClick={onRetry} className="mt-6 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black hover:bg-white/90">Try again</button>
    </section>
  </main>
)

const App = () => {
  const { authUser, authStatus, checkAuth, theme, accent, preferences } = useContext(AuthContext)
  if (authStatus === 'loading') return <AuthLoading />
  if (authStatus === 'error') return <AuthError onRetry={checkAuth} />

  return (
    <div className="qc-app bg-[url('/bgImage.svg')] bg-contain" data-theme={theme} data-accent={accent} data-font-size={preferences.fontSize} data-density={preferences.chatDensity} data-bubble={preferences.bubbleStyle} data-corners={preferences.cornerStyle}>
      <Toaster />
      <Routes>
        <Route path='/' element={authUser ? <HomePage /> : <Navigate to="/login" replace />}/>
        <Route path='/login' element={!authUser ? <LoginPage /> : <Navigate to="/" replace />}/>
        <Route path='/profile' element={authUser ? <ProfilePage /> : <Navigate to="/login" replace />}/>
      </Routes>
    </div>
  )
}

export default App
