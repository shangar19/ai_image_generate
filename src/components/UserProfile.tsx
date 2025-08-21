import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const UserProfile: React.FC = () => {
  const { userProfile, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false); // Close dropdown on sign out
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!userProfile) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 bg-dark-300 hover:bg-dark-400 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <div className="flex items-center justify-center w-8 h-8 bg-gradient-primary rounded-full">
          <User className="w-4 h-4 text-white" />
        </div>
        <div className="hidden sm:block">
          <p className="text-sm font-medium text-white truncate max-w-32">
            {userProfile.name}
          </p>
        </div>
        <ChevronDown 
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} 
        />
      </button>
      
      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-64 bg-dark-200 border border-dark-300 rounded-xl shadow-2xl z-50 origin-top-right animate-fade-in"
          style={{ animationDuration: '150ms' }}
        >
          <div className="p-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-primary rounded-full">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-base font-semibold text-white truncate">
                  {userProfile.name}
                </p>
                <p className="text-sm text-gray-400 truncate">
                  {userProfile.email}
                </p>
              </div>
            </div>
            <hr className="border-dark-300" />
            <div className="mt-3">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center space-x-3 px-4 py-2 text-left text-sm text-gray-300 hover:bg-dark-300 hover:text-white rounded-lg transition-colors duration-200"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
