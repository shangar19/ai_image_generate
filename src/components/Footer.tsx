import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-dark-200/30 backdrop-blur-sm border-t border-dark-300 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="text-xs text-gray-500">
            © 2025 AI Image Generator. Powered by ABILink Automation Solution.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
