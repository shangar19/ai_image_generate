import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-dark text-white flex items-center justify-center p-4">
          <div className="text-center max-w-lg bg-dark-200 p-8 rounded-2xl border border-dark-300">
            <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-6" />
            <h1 className="text-3xl font-bold mb-2">Something went wrong</h1>
            <p className="text-gray-300 mb-6">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-gradient-primary hover:opacity-90 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
            >
              Refresh Page
            </button>
            <details className="mt-6 text-left">
              <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300">
                Error Details
              </summary>
              <pre className="mt-2 p-3 bg-dark-300 rounded-lg text-red-300 text-xs whitespace-pre-wrap overflow-auto">
                {this.state.error?.message || 'No error message available'}
              </pre>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
