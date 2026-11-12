import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import ProfilePage from './pages/ProfilePage'
import {Toaster} from 'react-hot-toast'
import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'

const App = () => {
  const { authUser, theme, accent, preferences } = useContext(AuthContext)
  return (
    <div className="qc-app bg-[url('/bgImage.svg')] bg-contain" data-theme={theme} data-accent={accent} data-font-size={preferences.fontSize} data-density={preferences.chatDensity} data-bubble={preferences.bubbleStyle} data-corners={preferences.cornerStyle}>
      <Toaster />
      <Routes>
        <Route path='/' element={authUser ? <HomePage /> : <Navigate to="/login" />}/>
        <Route path='/login' element={!authUser ? <LoginPage /> : <Navigate to="/" />}/>
        <Route path='/profile' element={authUser ? <ProfilePage /> : <Navigate to="/login" />}/>
      </Routes>
    </div>
  )
}

export default App
