import { createElement, PropsWithChildren } from 'react'
import { useLaunch } from '@tarojs/taro'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { AppInit } from './components/app-init'

import './app.scss'

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
