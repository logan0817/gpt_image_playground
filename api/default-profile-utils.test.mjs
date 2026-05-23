import { describe, expect, it } from 'vitest'
import { getDefaultProfileImportResult, isValidDefaultProfilePassword } from './default-profile-utils.mjs'

describe('default profile import utilities', () => {
  it('rejects missing or invalid default profile passwords', () => {
    expect(isValidDefaultProfilePassword('', 'secret')).toBe(false)
    expect(isValidDefaultProfilePassword('wrong', 'secret')).toBe(false)
    expect(isValidDefaultProfilePassword('secret', 'secret')).toBe(true)
  })

  it('does not return the default profile when required server env is incomplete', () => {
    const result = getDefaultProfileImportResult({ password: 'secret' }, {
      DEFAULT_PROFILE_PASSWORD: 'secret',
      DEFAULT_PROFILE_BASE_URL: 'https://api.example.com/v1',
    })

    expect(result.status).toBe(503)
    expect(result.body).toMatchObject({
      error: {
        message: '默认账号未配置',
      },
    })
  })

  it('does not infer optional profile fields from unrelated deployment env', () => {
    const result = getDefaultProfileImportResult({ password: 'secret' }, {
      DEFAULT_PROFILE_PASSWORD: 'secret',
      DEFAULT_PROFILE_API_KEY: 'sk-default',
      API_PROXY_URL: 'https://proxy.example.com/v1',
      VITE_DEFAULT_API_URL: 'https://vite-default.example.com/v1',
    })

    expect(result.status).toBe(200)
    expect(result.body.profile).toEqual({
      provider: 'openai',
      apiKey: 'sk-default',
    })
  })

  it('returns the configured profile only for the correct password', () => {
    const env = {
      DEFAULT_PROFILE_PASSWORD: 'secret',
      DEFAULT_PROFILE_API_KEY: 'sk-default',
      DEFAULT_PROFILE_BASE_URL: 'https://api.example.com/v1',
      DEFAULT_PROFILE_MODEL: 'gpt-image-2',
      DEFAULT_PROFILE_API_MODE: 'images',
      DEFAULT_PROFILE_API_PROXY: 'true',
      DEFAULT_PROFILE_STREAM_IMAGES: 'true',
      DEFAULT_PROFILE_NAME: '我的默认账号',
    }

    expect(getDefaultProfileImportResult({ password: 'wrong' }, env)).toMatchObject({
      status: 401,
      body: {
        error: {
          message: '验证口令错误',
        },
      },
    })

    const result = getDefaultProfileImportResult({ password: 'secret' }, env)

    expect(result.status).toBe(200)
    expect(result.body).toEqual({
      profile: {
        name: '我的默认账号',
        provider: 'openai',
        baseUrl: 'https://api.example.com/v1',
        apiKey: 'sk-default',
        model: 'gpt-image-2',
        apiMode: 'images',
        apiProxy: true,
        streamImages: true,
      },
    })
    expect(JSON.stringify(result.body)).not.toContain('DEFAULT_PROFILE_PASSWORD')
    expect(JSON.stringify(result.body)).not.toContain('secret')
  })
})
