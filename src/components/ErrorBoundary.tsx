import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message || 'An unexpected error occurred.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Application ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#090909] text-white flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#171714] border border-[#292923] rounded-xl p-8 text-center">
            <div className="w-12 h-12 rounded-lg bg-[#292923] flex items-center justify-center mx-auto mb-5 text-[#F59E0B]">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
            <p className="text-sm text-[#A3A3A3] mb-6 leading-relaxed">
              We encountered an unexpected issue while loading this view. Reloading the page usually resolves temporary connection issues.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#F59E0B] text-[#090909] text-sm font-semibold hover:bg-[#F59E0B]/90 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
