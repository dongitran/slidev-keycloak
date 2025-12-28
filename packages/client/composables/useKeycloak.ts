/**
 * Keycloak composable for Slidev
 * 
 * Use this composable to access Keycloak authentication state in your slides.
 * 
 * @example
 * ```vue
 * <script setup>
 * import { useKeycloak } from '@slidev/client/composables/useKeycloak'
 * 
 * const { isAuthenticated, user, logout } = useKeycloak()
 * </script>
 * 
 * <template>
 *   <div v-if="isAuthenticated">
 *     Welcome, {{ user?.fullName }}!
 *     <button @click="logout">Logout</button>
 *   </div>
 * </template>
 * ```
 */

import { inject } from 'vue'
import { KEYCLOAK_INJECTION_KEY, type KeycloakContext } from '../setup/keycloak'

export function useKeycloak(): KeycloakContext {
  const context = inject<KeycloakContext>(KEYCLOAK_INJECTION_KEY)
  
  if (!context) {
    // Return a default context when Keycloak is not configured
    return {
      keycloak: { value: null } as any,
      isAuthenticated: { value: false } as any,
      isInitialized: { value: true } as any,
      user: { value: null } as any,
      token: { value: null } as any,
      error: { value: null } as any,
      login: () => undefined,
      logout: () => undefined,
      getToken: () => undefined,
      updateToken: () => undefined,
    }
  }
  
  return context
}
