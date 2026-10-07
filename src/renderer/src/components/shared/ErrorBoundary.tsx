import React from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  /** Shown in the fallback, e.g. the page name. */
  label?: string
  children: React.ReactNode
}

interface State {
  error: Error | null
}

/**
 * Contains a render crash to the subtree it wraps (one page) instead of
 * blanking the whole app, and lets the user retry without restarting.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error(
      `[ErrorBoundary${this.props.label ? `:${this.props.label}` : ''}]`,
      error,
      info.componentStack
    )
  }

  private reset = (): void => this.setState({ error: null })

  render(): React.ReactNode {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div role="alert" className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-md text-center space-y-3 bg-white border border-rose-200 rounded-2xl p-6 shadow-sm">
          <AlertTriangle className="mx-auto text-rose-500" size={32} aria-hidden="true" />
          <h2 className="text-lg font-semibold text-gray-900">
            {this.props.label ? `${this.props.label} ran into a problem` : 'Something went wrong'}
          </h2>
          <p className="text-sm text-gray-600 break-words">{error.message}</p>
          <p className="text-xs text-gray-500">
            Other tools are unaffected. No files were changed.
          </p>
          <button
            onClick={this.reset}
            className="mt-2 px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }
}
