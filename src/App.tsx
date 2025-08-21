import React, { useState } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import Header from './components/Header';
import ImageGenerator from './components/ImageGenerator';
import ImageHistory from './components/ImageHistory';
import Footer from './components/Footer';
import AuthGate from './components/AuthGate';
import { History, Wand2 } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState<'generator' | 'history'>('generator');

  return (
    <AuthProvider>
      <div className="min-h-screen bg-gradient-dark">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-3/4 left-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-2000" />
        </div>

        {/* Main content */}
        <div className="relative z-10">
          <Header />
          <main className="flex-1 py-8 sm:py-12 lg:py-16">
            <AuthGate>
              {/* Tab Navigation */}
              <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 mb-8">
                <div className="flex justify-center">
                  <div className="bg-dark-200 rounded-xl p-1 border border-dark-300">
                    <div className="flex space-x-1">
                      <button
                        onClick={() => setActiveTab('generator')}
                        className={`flex items-center space-x-2 px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                          activeTab === 'generator'
                            ? 'bg-gradient-primary text-white shadow-lg'
                            : 'text-gray-400 hover:text-white hover:bg-dark-300'
                        }`}
                      >
                        <Wand2 className="w-4 h-4" />
                        <span>Generate</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('history')}
                        className={`flex items-center space-x-2 px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                          activeTab === 'history'
                            ? 'bg-gradient-primary text-white shadow-lg'
                            : 'text-gray-400 hover:text-white hover:bg-dark-300'
                        }`}
                      >
                        <History className="w-4 h-4" />
                        <span>History</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tab Content */}
              {activeTab === 'generator' ? <ImageGenerator /> : <ImageHistory />}
            </AuthGate>
          </main>
          <Footer />
        </div>
      </div>
    </AuthProvider>
  );
}

export default App;
