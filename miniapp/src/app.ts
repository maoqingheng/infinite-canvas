import { createElement, PropsWithChildren } from 'react'
import { useLaunch } from '@tarojs/taro'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { AppInit } from './components/app-init'

import './app.scss'

// Polyfill AbortController for WeChat mini program (used internally by TanStack Query v5)
if (typeof (globalThis as Record<string, unknown>).AbortController === 'undefined') {
  const createSignal = () => ({
    aborted: false,
    reason: undefined as unknown,
    onabort: null as ((this: unknown, ev: unknown) => unknown) | null,
    throwIfAborted() {
      if (this.aborted) throw this.reason ?? new Error('Aborted')
    },
  })
  class AbortControllerPolyfill {
    signal = createSignal()
    abort(reason?: unknown) {
      if (this.signal.aborted) return
      this.signal.aborted = true
      this.signal.reason = reason
    }
  }
  ;(globalThis as Record<string, unknown>).AbortController = AbortControllerPolyfill
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
})

function App({ children }: PropsWithChildren) {
  useLaunch(() => {
    console.log('App launched.')
  })

  return createElement(
    QueryClientProvider,
    { client: queryClient },
    createElement(AppInit, null, children)
  )
}

export default App
