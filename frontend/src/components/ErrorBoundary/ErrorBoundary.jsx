import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '60vh', padding: '2rem', textAlign: 'center',
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'var(--bg-elevated)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 'var(--space-lg)', color: 'var(--danger)',
          }}>
            <AlertTriangle size={36} />
          </div>
          <h2 style={{ marginBottom: 'var(--space-sm)' }}>Terjadi Kesalahan</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-lg)', maxWidth: 400 }}>
            Maaf, terjadi kesalahan tak terduga. Silakan coba muat ulang halaman.
          </p>
          <details style={{ marginBottom: 'var(--space-lg)', color: 'var(--text-muted)', fontSize: '0.75rem', maxWidth: 500 }}>
            <summary style={{ cursor: 'pointer', marginBottom: 'var(--space-sm)' }}>Detail Error</summary>
            <pre style={{ textAlign: 'left', overflow: 'auto', padding: 'var(--space-sm)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
              {this.state.error?.toString()}
            </pre>
          </details>
          <button className="btn btn-primary" onClick={this.handleReset}>
            <RefreshCw size={16} /> Coba Lagi
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
