import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetCache = () => {
    try {
      localStorage.removeItem('junghwa_eco_observations');
      localStorage.removeItem('junghwa_deleted_observation_ids');
    } catch {
      // ignore
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-stone-100 font-sans text-stone-900">
          <div className="bg-white rounded-3xl shadow-xl border border-stone-200 max-w-lg w-full p-6 sm:p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 mx-auto flex items-center justify-center mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h1 className="text-xl font-black text-stone-900 mb-2">
              생태지도 화면을 복구하고 있습니다
            </h1>

            <p className="text-sm text-stone-600 mb-6 leading-relaxed">
              데이터 처리 또는 화면 표시 중 일시적인 문제가 발생했습니다. 아래 버튼을 눌러 새로고침하거나 캐시를 초기화하여 안전하게 복구할 수 있습니다.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
              <button
                onClick={this.handleReload}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>화면 새로고침</span>
              </button>
              <button
                onClick={this.handleResetCache}
                className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-stone-500" />
                <span>임시 캐시 복구 후 재시작</span>
              </button>
            </div>

            {this.state.error && (
              <details className="text-left bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs text-stone-500">
                <summary className="cursor-pointer font-bold text-stone-700 select-none mb-1">
                  오류 세부 내용 확인
                </summary>
                <pre className="overflow-x-auto whitespace-pre-wrap font-mono mt-2 p-2 bg-stone-100 rounded text-[11px] text-rose-800">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
