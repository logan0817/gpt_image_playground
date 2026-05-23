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
  baseUrl?: string
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
  const apiKey = typeof input?.apiKey === 'string' ? input.apiKey.trim() : ''
  if (!apiKey) throw new Error('默认账号配置无效')

  const payload: DefaultProfilePayload = {
    apiKey,
  }
  const baseUrl = typeof input?.baseUrl === 'string' ? input.baseUrl.trim() : ''
  const model = typeof input?.model === 'string' ? input.model.trim() : ''
  const name = typeof input?.name === 'string' ? input.name.trim() : ''
  if (name) payload.name = name
  if (baseUrl) payload.baseUrl = baseUrl
  if (model) payload.model = model
  if (input?.apiMode === 'responses' || input?.apiMode === 'images') payload.apiMode = input.apiMode
  if (typeof input?.apiProxy === 'boolean') payload.apiProxy = input.apiProxy
  if (typeof input?.streamImages === 'boolean') payload.streamImages = input.streamImages
  if (input?.streamPartialImages !== undefined) payload.streamPartialImages = normalizeStreamPartialImages(input.streamPartialImages)
  return payload
}

export function createDefaultImportedOpenAIProfile(
  input: DefaultProfilePayload,
  id = DEFAULT_IMPORTED_PROFILE_ID,
  baseProfile?: ApiProfile,
): ApiProfile {
  const payload = normalizeDefaultProfilePayload(input)
  return createDefaultOpenAIProfile({
    ...baseProfile,
    id,
    apiKey: payload.apiKey,
    ...(payload.name ? { name: payload.name } : {}),
    ...(payload.baseUrl ? { baseUrl: payload.baseUrl } : {}),
    ...(payload.model ? { model: payload.model } : {}),
    ...(payload.apiMode ? { apiMode: payload.apiMode } : {}),
    ...(payload.apiProxy !== undefined ? { apiProxy: payload.apiProxy } : {}),
    ...(payload.streamImages !== undefined ? { streamImages: payload.streamImages } : {}),
    ...(payload.streamPartialImages !== undefined ? { streamPartialImages: payload.streamPartialImages } : {}),
  })
}

export function applyDefaultProfileToActiveSettings(
  currentSettings: Partial<AppSettings> | unknown,
  input: DefaultProfilePayload,
  patch: Partial<ApiProfile> = {},
): AppSettings {
  const current = normalizeSettings(currentSettings)
  const activeProfile = current.profiles.find((profile) => profile.id === current.activeProfileId) ?? current.profiles[0]
  const nextActiveProfile = createDefaultImportedOpenAIProfile(input, activeProfile.id, {
    ...activeProfile,
    ...patch,
  })

  return normalizeSettings({
    ...current,
    profiles: current.profiles.map((profile) => profile.id === activeProfile.id ? nextActiveProfile : profile),
    activeProfileId: nextActiveProfile.id,
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
  const profile = createDefaultImportedOpenAIProfile(normalizedPayload, existingProfile?.id ?? DEFAULT_IMPORTED_PROFILE_ID, existingProfile)
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
