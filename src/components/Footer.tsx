import React from 'react';
import { Heart, Code } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-dark-200/30 backdrop-blur-sm border-t border-dark-300 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2 text-gray-400">
            <Code className="w-4 h-4" />
            <span className="text-sm">Built with</span>
            <Heart className="w-4 h-4 text-red-400 animate-pulse" />
            <span className="text-sm">using React & TypeScript</span>
          </div>
          <div className="text-xs text-gray-500">
            © 2025 AI Image Generator. Powered by ABILink Automation Solution.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
