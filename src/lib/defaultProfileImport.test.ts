import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, createDefaultOpenAIProfile, normalizeSettings } from './apiProfiles'
import { createDefaultImportedOpenAIProfile, mergeDefaultProfileSettings } from './defaultProfileImport'

describe('default profile import', () => {
  it('creates a keyed OpenAI profile from a verified default profile payload', () => {
    const profile = createDefaultImportedOpenAIProfile({
      name: '我的默认账号',
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'sk-default',
      model: 'gpt-image-2',
      apiMode: 'images',
      apiProxy: true,
      streamImages: true,
    })

    expect(profile).toMatchObject({
      id: 'default-imported-openai',
      name: '我的默认账号',
      provider: 'openai',
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'sk-default',
      model: 'gpt-image-2',
      apiMode: 'images',
      apiProxy: true,
      streamImages: true,
    })
  })

  it('upserts the default profile and switches to it without removing existing profiles', () => {
    const existing = createDefaultOpenAIProfile({
      id: 'work-profile',
      name: '工作配置',
      baseUrl: 'https://work.example.com/v1',
      apiKey: 'work-key',
      model: 'work-model',
    })
    const current = normalizeSettings({
      ...DEFAULT_SETTINGS,
      profiles: [existing],
      activeProfileId: existing.id,
    })

    const first = mergeDefaultProfileSettings(current, {
      name: '我的默认账号',
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'sk-default',
      model: 'gpt-image-2',
      apiMode: 'images',
    })

    expect(first.profiles).toHaveLength(2)
    expect(first.activeProfileId).toBe('default-imported-openai')
    expect(first.profiles.find((profile) => profile.id === 'work-profile')).toMatchObject({
      apiKey: 'work-key',
    })

    const second = mergeDefaultProfileSettings(first, {
      name: '我的默认账号',
      baseUrl: 'https://api2.example.com/v1',
      apiKey: 'sk-updated',
      model: 'gpt-image-2',
      apiMode: 'images',
    })

    expect(second.profiles).toHaveLength(2)
    expect(second.activeProfileId).toBe('default-imported-openai')
    expect(second.profiles.find((profile) => profile.id === 'default-imported-openai')).toMatchObject({
      baseUrl: 'https://api2.example.com/v1',
      apiKey: 'sk-updated',
    })
  })
})
