/**
 * ErrorBoundary — catches rendering errors gracefully
 */

'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-[300px] flex items-center justify-center rounded-xl border border-red-500/30 bg-red-950/10 p-8">
          <div className="text-center">
            <p className="text-xl text-red-400">😵 渲染出错了</p>
            <p className="mt-2 text-sm text-gray-500 max-w-md">
              {this.state.error?.message ?? '未知错误'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-500 transition"
            >
              重试
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
