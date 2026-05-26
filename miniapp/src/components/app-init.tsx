import { PropsWithChildren, useEffect } from 'react'

import { useUserStore } from '../stores/use-user-store'
import { useConfigStore } from '../stores/use-config-store'

export function AppInit({ children }: PropsWithChildren) {
  const hydrateUser = useUserStore((state) => state.hydrateUser)
  const loadPublicSettings = useConfigStore(
    (state) => state.loadPublicSettings
  )
  const token = useUserStore((state) => state.token)

  useEffect(() => {
    void hydrateUser()
    void loadPublicSettings()
  }, [])

  useEffect(() => {
    if (token) {
      void hydrateUser()
    }
  }, [token])

  return <>{children}</>
}
