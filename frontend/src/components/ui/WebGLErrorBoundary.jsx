import React from 'react';

export function WebGLFallback({ className = '', style }) {
  return (
    <div className={`animated-gradient-fallback ${className}`} style={style}>
      <div className="animated-gradient-fallback-color" />
    </div>
  );
}

export class WebGLErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.warn('Animated gradient failed to render:', error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || null;
    }

    return this.props.children;
  }
}
