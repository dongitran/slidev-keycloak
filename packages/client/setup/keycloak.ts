/**
 * Keycloak Authentication Setup for Slidev
 * 
 * Built-in authentication support using Keycloak OpenID Connect.
 * Enable by adding keycloak config to your slides.md frontmatter:
 * 
 * ---
 * keycloak:
 *   url: https://keycloak.example.com
 *   realm: my-realm
 *   clientId: my-client
 * ---
 */

import type { KeycloakConfig } from '@dongtran/slidev-types'
import { ref, readonly } from 'vue'
import type { App } from 'vue'

// Re-export for convenience
export type { KeycloakConfig }

export interface KeycloakUser {
  username?: string
  email?: string
  firstName?: string
  lastName?: string
  fullName?: string
}

// Keycloak instance type (avoid importing keycloak-js at module level)
interface KeycloakInstance {
  token?: string
  tokenParsed?: Record<string, unknown>
  init: (options: Record<string, unknown>) => Promise<boolean>
  login: (options?: Record<string, unknown>) => Promise<void>
  logout: (options?: Record<string, unknown>) => Promise<void>
  loadUserProfile: () => Promise<{ username?: string; email?: string; firstName?: string; lastName?: string }>
  updateToken: (minValidity: number) => Promise<boolean>
  onAuthSuccess?: () => void
  onAuthError?: () => void
  onAuthLogout?: () => void
  onTokenExpired?: () => void
}

// Injection key
export const KEYCLOAK_INJECTION_KEY = Symbol('slidev-keycloak')

// Reactive state
const keycloakInstance = ref<KeycloakInstance | null>(null)
const isAuthenticated = ref(false)
const isInitialized = ref(false)
const user = ref<KeycloakUser | null>(null)
const token = ref<string | null>(null)
const error = ref<string | null>(null)

export interface KeycloakContext {
  keycloak: typeof keycloakInstance
  isAuthenticated: typeof isAuthenticated
  isInitialized: typeof isInitialized
  user: typeof user
  token: typeof token
  error: typeof error
  login: () => Promise<void> | undefined
  logout: () => Promise<void> | undefined
  getToken: () => string | undefined
  updateToken: (minValidity?: number) => Promise<boolean> | undefined
}

/**
 * Initialize Keycloak authentication
 */
export async function setupKeycloak(app: App, config: Partial<KeycloakConfig>) {
  const url = config.url || import.meta.env.VITE_KEYCLOAK_URL
  const realm = config.realm || import.meta.env.VITE_KEYCLOAK_REALM
  const clientId = config.clientId || import.meta.env.VITE_KEYCLOAK_CLIENT_ID

  // Skip if no config
  if (!url || !realm || !clientId) {
    console.log('[Slidev] Keycloak not configured, skipping authentication')
    isInitialized.value = true
    provideKeycloakContext(app)
    return
  }

  console.log('[Slidev Keycloak] Initializing...', { url, realm, clientId })

  try {
    // Dynamic import keycloak-js
    const KeycloakJS = (await import('keycloak-js')).default
    
    const keycloak = new KeycloakJS({ url, realm, clientId }) as KeycloakInstance
    keycloakInstance.value = keycloak

    const authenticated = await keycloak.init({
      onLoad: config.onLoad || 'login-required',
      pkceMethod: config.pkceMethod || 'S256',
      checkLoginIframe: config.checkLoginIframe ?? false,
      enableLogging: import.meta.env.DEV,
    })

    isAuthenticated.value = authenticated
    isInitialized.value = true

    if (authenticated) {
      console.log('[Slidev Keycloak] ✓ Authenticated')
      await loadUserProfile(keycloak)
      token.value = keycloak.token || null
      setupTokenRefresh(keycloak)
      setupAuthEventHandlers(keycloak)
    } else {
      console.log('[Slidev Keycloak] Redirecting to login...')
      await keycloak.login()
    }

  } catch (e) {
    console.error('[Slidev Keycloak] Init failed:', e)
    error.value = e instanceof Error ? e.message : 'Failed to initialize Keycloak'
    isInitialized.value = true
    // Don't throw - allow slides to show error state
  }

  provideKeycloakContext(app)
}

async function loadUserProfile(keycloak: KeycloakInstance) {
  try {
    const profile = await keycloak.loadUserProfile()
    user.value = {
      username: profile.username,
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      fullName: [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.username,
    }
  } catch {
    // Fallback to token info
    if (keycloak.tokenParsed) {
      const parsed = keycloak.tokenParsed as Record<string, unknown>
      user.value = {
        username: parsed.preferred_username as string | undefined,
        email: parsed.email as string | undefined,
        fullName: parsed.name as string | undefined,
      }
    }
  }
}

function setupAuthEventHandlers(keycloak: KeycloakInstance) {
  keycloak.onAuthSuccess = () => {
    isAuthenticated.value = true
    token.value = keycloak.token || null
  }

  keycloak.onAuthError = () => {
    error.value = 'Authentication failed'
    isAuthenticated.value = false
  }

  keycloak.onAuthLogout = () => {
    isAuthenticated.value = false
    user.value = null
    token.value = null
  }

  keycloak.onTokenExpired = () => {
    keycloak.updateToken(30).catch(() => keycloak.login())
  }
}

function setupTokenRefresh(keycloak: KeycloakInstance) {
  setInterval(() => {
    keycloak.updateToken(70).then((refreshed) => {
      if (refreshed) token.value = keycloak.token || null
    }).catch(() => {})
  }, 60000)
}

function provideKeycloakContext(app: App) {
  const context: KeycloakContext = {
    keycloak: readonly(keycloakInstance) as any,
    isAuthenticated: readonly(isAuthenticated) as any,
    isInitialized: readonly(isInitialized) as any,
    user: readonly(user) as any,
    token: readonly(token) as any,
    error: readonly(error) as any,
    login: () => keycloakInstance.value?.login(),
    logout: () => keycloakInstance.value?.logout(),
    getToken: () => keycloakInstance.value?.token,
    updateToken: (minValidity?: number) => keycloakInstance.value?.updateToken(minValidity || 30),
  }
  app.provide(KEYCLOAK_INJECTION_KEY, context)
}
