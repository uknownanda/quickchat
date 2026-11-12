import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AuthContext } from '../../context/AuthContext'

const Icon = ({ children }) => <span aria-hidden="true" className="qc-auth-icon">{children}</span>

const LoginPage = () => {
  const [mode, setMode] = useState('login')
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [bio, setBio] = useState('')
  const [usernameStatus, setUsernameStatus] = useState('idle')
  const [usernameMessage, setUsernameMessage] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const requestVersion = useRef(0)
  const { login, axios } = useContext(AuthContext)

  const normalizedUsername = username.trim().toLowerCase()
  const usernameValid = /^[a-z0-9_]{3,20}$/.test(normalizedUsername)
  const passwordStrength = useMemo(() => {
    if (!password) return 0
    return [password.length >= 8, /[A-Z]/.test(password), /[0-9]/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length
  }, [password])

  useEffect(() => {
    const requestId = ++requestVersion.current
    if (mode !== 'signup' || !normalizedUsername) {
      setUsernameStatus('idle'); setUsernameMessage(''); return
    }
    if (!usernameValid) {
      setUsernameStatus('invalid'); setUsernameMessage('Use 3–20 lowercase letters, numbers or underscores.'); return
    }
    setUsernameStatus('checking'); setUsernameMessage('Checking username availability…')
    const timer = setTimeout(async () => {
      try {
        const { data } = await axios.get(`/api/auth/check-username?username=${encodeURIComponent(normalizedUsername)}`)
        if (requestId !== requestVersion.current) return
        setUsernameStatus(data.available ? 'available' : 'taken')
        setUsernameMessage(data.available ? 'This username is available' : 'This username is already taken')
      } catch (error) {
        if (requestId !== requestVersion.current) return
        setUsernameStatus('error'); setUsernameMessage(error.response?.data?.message || 'Could not check username right now')
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [normalizedUsername, usernameValid, mode, axios])

  const switchMode = (nextMode) => {
    setMode(nextMode); setPassword(''); setShowPassword(false)
    setUsernameStatus('idle'); setUsernameMessage('')
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    if (submitting) return
    if (mode === 'signup' && (!usernameValid || usernameStatus !== 'available' || password.length < 8 || !acceptedTerms)) return
    setSubmitting(true)
    try {
      if (mode === 'signup') await login('signup', { fullName, username: normalizedUsername, email, password, bio })
      else await login('login', { identifier, password })
    } finally { setSubmitting(false) }
  }

  return (
    <main className="qc-auth-v2">
      <div className="qc-auth-noise" />
      <div className="qc-auth-layout">
        <aside className="qc-auth-story">
          <a className="qc-brand" href="/" aria-label="QuickChat home"><span className="qc-brand-mark">q</span><span>quickchat<span className="qc-brand-dot">.</span></span></a>
          <div className="qc-story-copy">
            <span className="qc-eyebrow"><i /> PRIVATE MESSAGING, REIMAGINED</span>
            <h1>Make room for<br/><em>real connection.</em></h1>
            <p>Your conversations deserve a space that feels personal. Catch up, share a moment, and stay close to your circle.</p>
            <div className="qc-story-points">
              <div><span>01</span><p><b>Your circle, your choice</b><small>Connect through invitations, not open directories.</small></p></div>
              <div><span>02</span><p><b>Conversations that flow</b><small>Simple, thoughtful, real-time messaging.</small></p></div>
            </div>
          </div>
          <div className="qc-story-footer"><span>✳</span> A quieter corner of the internet <i>© 2026 QUICKCHAT</i></div>
        </aside>

        <section className="qc-auth-panel">
          <div className="qc-mobile-brand"><span className="qc-brand-mark">q</span><b>quickchat<span className="qc-brand-dot">.</span></b></div>
          <div className="qc-auth-form-shell">
            <div className="qc-auth-heading">
              <span className="qc-auth-kicker">{mode === 'signup' ? 'YOUR SPACE STARTS HERE' : 'WELCOME BACK'}</span>
              <h2>{mode === 'signup' ? <>Find your <em>people.</em></> : <>Good to have<br/><em>you back.</em></>}</h2>
              <p>{mode === 'signup' ? 'Create an account and bring your favourite people a little closer.' : 'Sign in and pick up right where your conversations left off.'}</p>
            </div>

            <div className="qc-auth-switch" role="tablist" aria-label="Account access">
              <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>Sign in</button>
              <button type="button" role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'active' : ''} onClick={() => switchMode('signup')}>Create account</button>
            </div>

            <form onSubmit={onSubmit} className="qc-auth-fields">
              {mode === 'signup' ? <>
                <div className="qc-field-grid">
                  <label className="qc-field"><span>FULL NAME</span><div className="qc-field-control"><Icon>✧</Icon><input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Alex Morgan" autoComplete="name" maxLength={60} required /></div></label>
                  <label className="qc-field"><span>USERNAME</span><div className="qc-field-control"><Icon>@</Icon><input value={username} onChange={e => setUsername(e.target.value.replace(/\s/g, '').toLowerCase())} placeholder="yourhandle" autoComplete="username" minLength={3} maxLength={20} required /></div>{usernameMessage && <small className={`qc-field-status ${usernameStatus}`}>{usernameStatus === 'available' ? '✓ ' : usernameStatus === 'taken' || usernameStatus === 'invalid' ? '× ' : ''}{usernameMessage}</small>}</label>
                  <label className="qc-field"><span>EMAIL ADDRESS</span><div className="qc-field-control"><Icon>✉</Icon><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required /></div></label>
                  <label className="qc-field"><span>PASSWORD</span><div className="qc-field-control"><Icon>⌑</Icon><input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="8+ characters" autoComplete="new-password" minLength={8} required /><button className="qc-reveal" type="button" onClick={() => setShowPassword(v => !v)}>{showPassword ? 'HIDE' : 'SHOW'}</button></div><div className="qc-password-meter"><div>{[0,1,2,3].map(i => <i key={i} className={passwordStrength > i ? 'filled' : ''}/>)}</div><small>{password ? ['Getting started','Fair','Good','Strong','Excellent'][passwordStrength] : 'Use 8+ characters for a stronger password'}</small></div></label>
                  <label className="qc-field qc-field-wide"><span>ABOUT YOU <small>OPTIONAL</small></span><div className="qc-field-control qc-bio-control"><textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="A few words about yourself…" maxLength={160}/></div></label>
                </div>
                <label className="qc-terms"><input type="checkbox" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)}/><span>I agree to the terms of use and privacy policy.</span></label>
              </> : <>
                <label className="qc-field"><span>USERNAME OR EMAIL</span><div className="qc-field-control"><Icon>✉</Icon><input value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="@yourhandle or you@example.com" autoComplete="username" required /></div></label>
                <label className="qc-field"><span>PASSWORD</span><div className="qc-field-control"><Icon>⌑</Icon><input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password" required/><button className="qc-reveal" type="button" onClick={() => setShowPassword(v => !v)}>{showPassword ? 'HIDE' : 'SHOW'}</button></div></label>
              </>}
              <button className="qc-auth-cta" type="submit" disabled={submitting || (mode === 'signup' && (usernameStatus !== 'available' || password.length < 8 || !acceptedTerms))}><span>{submitting ? 'PLEASE WAIT…' : mode === 'signup' ? 'CREATE YOUR ACCOUNT' : 'SIGN IN TO QUICKCHAT'}</span><b>↗</b></button>
            </form>
            <p className="qc-auth-bottom">{mode === 'signup' ? 'Already part of the circle?' : 'New around here?'} <button type="button" onClick={() => switchMode(mode === 'signup' ? 'login' : 'signup')}>{mode === 'signup' ? 'Sign in instead' : 'Create an account'}</button></p>
            <div className="qc-auth-secure"><span>◈</span> PRIVATE BY DESIGN <i/> YOUR PEOPLE, YOUR SPACE
            </div>
          </div>
          <div className="qc-auth-panel-foot">Made for meaningful conversations <span>✳</span></div>
        </section>
      </div>
    </main>
  )
}

export default LoginPage
