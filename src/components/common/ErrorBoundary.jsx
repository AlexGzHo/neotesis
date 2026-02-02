import React from 'react';

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center bg-red-50 rounded-2xl border border-red-100">
                    <i className="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
                    <h2 className="text-xl font-bold text-red-700 mb-2">Algo salió mal</h2>
                    <p className="text-red-600 mb-4">Ha ocurrido un error inesperado en este componente.</p>

                    {/* Dev Diagnostic */}
                    {(import.meta.env.DEV && this.state.error) && (
                        <div className="w-full max-w-lg mb-4 text-left bg-white p-4 rounded border border-red-200 overflow-auto max-h-60 text-xs font-mono text-red-800">
                            <strong>{this.state.error.toString()}</strong>
                            <pre className="mt-2 text-gray-500">
                                {this.state.errorInfo?.componentStack}
                            </pre>
                        </div>
                    )}

                    <button
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                    >
                        Intentar de nuevo
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
