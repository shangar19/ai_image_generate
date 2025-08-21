import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import AuthForm from './AuthForm';

interface AuthGateProps {
  children: React.ReactNode;
}

const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-primary rounded-full animate-pulse mx-auto mb-4"></div>
            <p className="text-gray-300">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <div className="p-4 bg-dark-300 rounded-full">
              <Lock className="w-12 h-12 text-primary-400" />
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Authentication Required
          </h2>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto mb-8">
            Please sign in to access the AI image generator and create stunning artwork
          </p>
        </div>

        <AuthForm 
          mode={authMode} 
          onToggleMode={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} 
        />
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthGate;
