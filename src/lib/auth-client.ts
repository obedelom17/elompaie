import { createAuthClient } from '@neondatabase/auth'
import { BetterAuthVanillaAdapter } from '@neondatabase/auth/vanilla'

const NEON_AUTH_URL = import.meta.env.VITE_NEON_AUTH_URL

if (!NEON_AUTH_URL) {
  console.error('[auth] VITE_NEON_AUTH_URL manquant')
}

// createAuthClient avec BetterAuthVanillaAdapter retourne directement le client Better Auth
export const authClient = createAuthClient(NEON_AUTH_URL, {
  adapter: BetterAuthVanillaAdapter(),
})
