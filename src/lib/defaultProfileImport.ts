import type { ApiMode, ApiProfile, AppSettings } from '../types'
import {
  DEFAULT_IMAGES_MODEL,
  createDefaultOpenAIProfile,
  normalizeSettings,
  normalizeStreamPartialImages,
} from './apiProfiles'

export const DEFAULT_IMPORTED_PROFILE_ID = 'default-imported-openai'

export interface DefaultProfilePayload {
  name?: string
  baseUrl: string
  apiKey: string
  model?: string
  apiMode?: ApiMode
  apiProxy?: boolean
  streamImages?: boolean
  streamPartialImages?: number
}

interface DefaultProfileResponse {
  profile?: Partial<DefaultProfilePayload>
  error?: {
    message?: string
  }
}

function normalizeDefaultProfilePayload(input: Partial<DefaultProfilePayload> | undefined): DefaultProfilePayload {
  const baseUrl = typeof input?.baseUrl === 'string' ? input.baseUrl.trim() : ''
  const apiKey = typeof input?.apiKey === 'string' ? input.apiKey.trim() : ''
  if (!baseUrl || !apiKey) throw new Error('默认账号配置无效')

  return {
    name: typeof input?.name === 'string' && input.name.trim() ? input.name.trim() : '默认账号',
    baseUrl,
    apiKey,
    model: typeof input?.model === 'string' && input.model.trim() ? input.model.trim() : DEFAULT_IMAGES_MODEL,
    apiMode: input?.apiMode === 'responses' ? 'responses' : 'images',
    apiProxy: typeof input?.apiProxy === 'boolean' ? input.apiProxy : true,
    streamImages: typeof input?.streamImages === 'boolean' ? input.streamImages : true,
    streamPartialImages: normalizeStreamPartialImages(input?.streamPartialImages),
  }
}

export function createDefaultImportedOpenAIProfile(
  input: DefaultProfilePayload,
  id = DEFAULT_IMPORTED_PROFILE_ID,
): ApiProfile {
  const payload = normalizeDefaultProfilePayload(input)
  return createDefaultOpenAIProfile({
    id,
    name: payload.name,
    baseUrl: payload.baseUrl,
    apiKey: payload.apiKey,
    model: payload.model,
    apiMode: payload.apiMode,
    apiProxy: payload.apiProxy,
    streamImages: payload.streamImages,
    streamPartialImages: payload.streamPartialImages,
  })
}

export function mergeDefaultProfileSettings(
  currentSettings: Partial<AppSettings> | unknown,
  input: DefaultProfilePayload,
): AppSettings {
  const current = normalizeSettings(currentSettings)
  const normalizedPayload = normalizeDefaultProfilePayload(input)
  const existingProfile = current.profiles.find((profile) =>
    profile.id === DEFAULT_IMPORTED_PROFILE_ID ||
    (profile.provider === 'openai' && profile.name === normalizedPayload.name),
  )
  const profile = createDefaultImportedOpenAIProfile(normalizedPayload, existingProfile?.id ?? DEFAULT_IMPORTED_PROFILE_ID)
  const profiles = existingProfile
    ? current.profiles.map((item) => item.id === existingProfile.id ? profile : item)
    : [...current.profiles, profile]

  return normalizeSettings({
    ...current,
    profiles,
    activeProfileId: profile.id,
  })
}

export async function fetchDefaultProfile(
  password: string,
  fetchImpl: typeof fetch = fetch,
): Promise<DefaultProfilePayload> {
  const response = await fetchImpl('/api/default-profile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ password }),
    cache: 'no-store',
  })
  const payload = await response.json().catch(() => null) as DefaultProfileResponse | null
  if (!response.ok) {
    throw new Error(payload?.error?.message || '默认账号导入失败')
  }
  return normalizeDefaultProfilePayload(payload?.profile)
}
