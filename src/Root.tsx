import React from 'react';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { UpdatePasswordPage } from './pages/UpdatePasswordPage';
import App from './App';

export const Root: React.FC = () => {
  const { session, loading, isRecoveringPassword } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-slate-400 bg-[#090d16]">
        <div className="w-12 h-12 border-3 border-slate-700 border-t-amber-500 rounded-full animate-spin" />
        <span className="text-sm font-medium tracking-wide">Myranor-Kräfte werden beschworen...</span>
      </div>
    );
  }

  if (isRecoveringPassword) {
    return <UpdatePasswordPage />;
  }

  return session ? <App /> : <LoginPage />;
};
