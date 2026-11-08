import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom';
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Vista de recuperación elegante y con identidad visual del Dojo (247 STUDIO)
 */
export const ErrorFallbackView: React.FC<{
  error?: Error | null;
  resetError?: () => void;
}> = ({ error, resetError }) => {
  const handleReload = () => {
    if (resetError) {
      resetError();
    } else {
      window.location.reload();
    }
  };

  const handleHardRefresh = () => {
    try {
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      }
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // Ignorar fallos en sandbox
    }
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-white flex items-center justify-center p-6 select-none">
      <div className="max-w-md w-full bg-[#11192e] border border-red-900/40 rounded-2xl p-8 shadow-2xl text-center backdrop-blur-md">
        <div className="w-16 h-16 bg-red-950/60 border border-red-600/50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-500 shadow-lg shadow-red-950/50">
          <ShieldAlert className="w-9 h-9" />
        </div>

        <h1 className="font-heading text-3xl font-bold tracking-tight uppercase mb-2 text-white">
          Incidencia en el Tatami
        </h1>

        <p className="text-gray-400 text-sm leading-relaxed mb-6">
          Ha ocurrido una interrupción inesperada o pérdida momentánea de conexión con los servidores.
        </p>

        {error?.message && (
          <div className="bg-black/40 border border-white/5 rounded-lg p-3 text-left mb-6 overflow-hidden">
            <div className="flex items-center gap-2 text-xs font-mono text-red-400 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Detalle técnico:</span>
            </div>
            <p className="font-mono text-xs text-gray-300 break-words line-clamp-3">
              {error.message}
            </p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleReload}
            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 active:scale-95 transition-all py-3 px-4 rounded-xl font-bold text-sm tracking-wide uppercase shadow-lg shadow-red-600/30"
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar Conexión
          </button>

          <button
            onClick={handleHardRefresh}
            className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-gray-300 active:scale-95 transition-all py-2.5 px-4 rounded-xl font-medium text-xs border border-white/10"
          >
            Limpiar Caché y Reiniciar
          </button>

          <Link
            to="/app/home"
            className="inline-flex items-center justify-center gap-2 text-xs text-gray-400 hover:text-white transition-colors pt-2"
          >
            <Home className="w-3.5 h-3.5" />
            Volver al Panel Principal
          </Link>
        </div>
      </div>
    </div>
  );
};

/**
 * Componente ErrorBoundary estándar para envolver árboles de React
 */
export class RootErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled runtime error in 247 STUDIO:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <ErrorFallbackView
          error={this.state.error}
          resetError={() => this.setState({ hasError: false, error: null })}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Elemento de error para React Router (errorElement en createBrowserRouter)
 */
export const RouteErrorElement: React.FC = () => {
  const routeError = useRouteError();
  let errorObj: Error | null = null;

  if (isRouteErrorResponse(routeError)) {
    errorObj = new Error(`${routeError.status}: ${routeError.statusText || routeError.data}`);
  } else if (routeError instanceof Error) {
    errorObj = routeError;
  } else if (typeof routeError === 'string') {
    errorObj = new Error(routeError);
  }

  return <ErrorFallbackView error={errorObj} />;
};
