import React from 'react';
import { Palette, Github } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import UserProfile from './UserProfile';

const Header: React.FC = () => {
  const { user } = useAuth();

  return (
    <header className="w-full bg-dark-200/50 backdrop-blur-sm border-b border-dark-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-primary rounded-lg">
              <Palette className="w-6 h-6 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-white">AI Generator</h1>
              <p className="text-xs text-gray-400">Powered by ABILink Automation Solution</p>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center space-x-4">
            {user && <UserProfile />}
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-400 hover:text-white transition-colors duration-200"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
