import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Home, RotateCw, TriangleAlert, WifiOff } from 'lucide-react';
import { Leaf } from '@/components/brand/Brand';

/**
 * Catches render errors and failed page-chunk loads (e.g. going offline before a page was
 * downloaded) and shows the "Couldn't load" state from the mockup instead of a blank screen.
 * `resetKey` (usually the pathname) clears the error when the user navigates elsewhere.
 */
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string; compact?: boolean }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Production: report to monitoring (no personal or health data in the payload).
    console.warn('Page error caught by boundary:', error.message, info.componentStack?.split('\n')[1]?.trim());
  }

  componentDidUpdate(prev: { resetKey?: string }) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    const offline = typeof navigator !== 'undefined' && !navigator.onLine;
    const chunk = /dynamically imported module|Loading chunk|Importing a module script failed/i.test(this.state.error.message);
    return (
      <div role="alert" className={this.props.compact ? 'py-12' : 'bg-wash relative isolate flex min-h-screen items-center justify-center overflow-hidden px-4'}>
        {!this.props.compact && <Leaf className="pointer-events-none absolute -bottom-16 -right-12 -z-10 h-72 w-72 rotate-12 text-green-200/60" color="currentColor" vein={false} />}
        <div className="relative mx-auto max-w-md overflow-hidden rounded-[30px] bg-white text-center shadow-card ring-1 ring-ink-100">
          <div className="bg-forest relative flex h-28 items-center justify-center">
            <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white text-green-700 shadow-lift">
              <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-white/30 [animation-duration:2.4s]" />
              {offline ? <WifiOff className="relative h-7 w-7" /> : <TriangleAlert className="relative h-7 w-7" />}
            </span>
          </div>
          <div className="p-8">
            <p className="font-display text-[22px] font-semibold text-ink-900">Couldn’t load this page</p>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-500">
              {offline || chunk ? 'Check your connection and try again.' : 'Something went wrong on our side. Your data is safe — please try again.'}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => (chunk ? window.location.reload() : this.setState({ error: null }))}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-green-700 px-5 text-sm font-bold text-white transition hover:bg-green-800"
              >
                <RotateCw className="h-4 w-4" /> Try again
              </button>
              {!this.props.compact && (
                <a href="/" className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-bold text-green-800 ring-1 ring-inset ring-ink-200 transition hover:bg-green-50">
                  <Home className="h-4 w-4" /> Home
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
}
