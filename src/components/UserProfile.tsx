import React from 'react';
import { User, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const UserProfile: React.FC = () => {
  const { userProfile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  if (!userProfile) return null;

  return (
    <div className="flex items-center space-x-3">
      <div className="flex items-center space-x-2 px-3 py-2 bg-dark-300 rounded-lg">
        <div className="flex items-center justify-center w-8 h-8 bg-gradient-primary rounded-full">
          <User className="w-4 h-4 text-white" />
        </div>
        <div className="hidden sm:block">
          <p className="text-sm font-medium text-white truncate max-w-32">
            {userProfile.name}
          </p>
          <p className="text-xs text-gray-400 truncate max-w-32">
            {userProfile.email}
          </p>
        </div>
      </div>
      
      <button
        onClick={handleSignOut}
        className="p-2 text-gray-400 hover:text-white hover:bg-dark-300 rounded-lg transition-all duration-200"
        title="Sign Out"
      >
        <LogOut className="w-5 h-5" />
      </button>
    </div>
  );
};

export default UserProfile;
