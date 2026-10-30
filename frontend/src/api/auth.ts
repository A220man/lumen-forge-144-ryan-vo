import { apiClient } from './client'

export interface UserInfo {
  sub: string
  preferred_username: string
  email?: string
  name?: string
  given_name?: string
  family_name?: string
  roles: string[]
  realm_access?: Record<string, unknown>
}

export interface AuthConfig {
  issuer: string
  client_id: string
  redirect_uri: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  id_token?: string
}

export const authApi = {
  async getConfig(): Promise<AuthConfig> {
    return apiClient.get<AuthConfig>('/auth/config')
  },

  async login(redirectUri?: string): Promise<void> {
    const params = redirectUri ? `?redirect_uri=${encodeURIComponent(redirectUri)}` : ''
    window.location.href = `/api/auth/login${params}`
  },

  async logout(idTokenHint?: string, postLogoutRedirectUri?: string): Promise<{ logout_url: string }> {
    return apiClient.post('/auth/logout', {
      id_token_hint: idTokenHint,
      post_logout_redirect_uri: postLogoutRedirectUri,
    })
  },

  async getMe(): Promise<UserInfo> {
    return apiClient.get<UserInfo>('/auth/me')
  },

  async refresh(): Promise<TokenResponse> {
    return apiClient.post<TokenResponse>('/auth/refresh', {})
  },
}

export async function initAuth(): Promise<AuthConfig> {
  return authApi.getConfig()
}

