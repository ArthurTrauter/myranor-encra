import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { signIn, signUp, resetPasswordForEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);

    try {
      if (isForgot) {
        const err = await resetPasswordForEmail(email);
        if (err) {
          setError(err.message);
        } else {
          setMessage('Eine E-Mail zum Zurücksetzen des Passworts wurde gesendet.');
        }
      } else if (isSignUp) {
        const err = await signUp(email, password);
        if (err) {
          setError(err.message);
        } else {
          setMessage('Registrierung erfolgreich! Bitte überprüfe deine E-Mails zur Bestätigung.');
        }
      } else {
        const err = await signIn(email, password);
        if (err) {
          setError(err.message);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Ein unerwarteter Fehler ist aufgetreten.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#090d16] px-4">
      {/* Decorative magical aura background effects */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-amber-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />

      {/* Main card */}
      <div className="relative w-full max-w-md bg-[#131b2e]/85 backdrop-blur-md border border-slate-800 rounded-2xl p-8 shadow-2xl transition-all duration-300">
        
        {/* Banner border highlight */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-700 rounded-t-2xl" />

        <div className="text-center mb-8">
          {/* Logo / Icon Placeholder */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 mb-4 shadow-inner">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          
          <h1 className="text-3xl font-extrabold font-display tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500">
            MYRANOR
          </h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold">
            Encounter & NPC Manager
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm flex items-start gap-2">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="mb-6 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-sm flex items-start gap-2">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              E-Mail Adresse
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700/60 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all text-sm"
              placeholder="name@beispiel.de"
            />
          </div>

          {!isForgot && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Passwort
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgot(true);
                    setError(null);
                    setMessage(null);
                  }}
                  className="text-xs text-amber-500 hover:text-amber-400 hover:underline transition-all"
                >
                  Vergessen?
                </button>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!isForgot}
                className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700/60 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all text-sm"
                placeholder="••••••••"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 mt-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-sm tracking-wide shadow-lg shadow-amber-900/20 active:translate-y-[1px] disabled:opacity-50 disabled:pointer-events-none transition-all"
          >
            {submitting ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Verarbeite...</span>
              </div>
            ) : isForgot ? (
              'Passwort zurücksetzen'
            ) : isSignUp ? (
              'Konto erstellen'
            ) : (
              'Einloggen'
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
          {isForgot ? (
            <button
              onClick={() => {
                setIsForgot(false);
                setError(null);
                setMessage(null);
              }}
              className="text-sm text-slate-400 hover:text-slate-200 transition-all"
            >
              Zurück zum <span className="text-amber-500 font-semibold">Login</span>
            </button>
          ) : (
            <p className="text-sm text-slate-400">
              {isSignUp ? 'Schon ein Konto?' : 'Neu im Imperium?'} {' '}
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                  setMessage(null);
                }}
                className="text-amber-500 hover:text-amber-400 font-semibold hover:underline transition-all"
              >
                {isSignUp ? 'Hier einloggen' : 'Konto erstellen'}
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  );
};
