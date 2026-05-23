import { createHash, timingSafeEqual } from 'node:crypto'

const DEFAULT_BASE_URL = 'https://api.openai.com/v1'
const DEFAULT_MODEL = 'gpt-image-2'
const DEFAULT_PROFILE_NAME = '默认账号'

function getEnvString(env, key) {
  const value = env?.[key]
  return typeof value === 'string' ? value.trim() : ''
}

function getEnvBoolean(env, key, fallback) {
  const value = getEnvString(env, key).toLowerCase()
  if (!value) return fallback
  if (['1', 'true', 'yes', 'on'].includes(value)) return true
  if (['0', 'false', 'no', 'off'].includes(value)) return false
  return fallback
}

function getEnvNumber(env, key) {
  const rawValue = getEnvString(env, key)
  if (!rawValue) return undefined
  const value = Number(rawValue)
  return Number.isFinite(value) ? value : undefined
}

function hashValue(value) {
  return createHash('sha256').update(String(value)).digest()
}

export function isValidDefaultProfilePassword(inputPassword, expectedPassword) {
  if (typeof inputPassword !== 'string' || typeof expectedPassword !== 'string') return false
  if (!inputPassword || !expectedPassword) return false
  return timingSafeEqual(hashValue(inputPassword), hashValue(expectedPassword))
}

function createDefaultProfileFromEnv(env) {
  const apiKey = getEnvString(env, 'DEFAULT_PROFILE_API_KEY')
  const password = getEnvString(env, 'DEFAULT_PROFILE_PASSWORD')
  if (!apiKey || !password) return null

  const profile = {
    name: getEnvString(env, 'DEFAULT_PROFILE_NAME') || DEFAULT_PROFILE_NAME,
    provider: 'openai',
    baseUrl: getEnvString(env, 'DEFAULT_PROFILE_BASE_URL') || getEnvString(env, 'API_PROXY_URL') || getEnvString(env, 'VITE_DEFAULT_API_URL') || DEFAULT_BASE_URL,
    apiKey,
    model: getEnvString(env, 'DEFAULT_PROFILE_MODEL') || DEFAULT_MODEL,
    apiMode: getEnvString(env, 'DEFAULT_PROFILE_API_MODE') === 'responses' ? 'responses' : 'images',
    apiProxy: getEnvBoolean(env, 'DEFAULT_PROFILE_API_PROXY', true),
    streamImages: getEnvBoolean(env, 'DEFAULT_PROFILE_STREAM_IMAGES', true),
  }
  const streamPartialImages = getEnvNumber(env, 'DEFAULT_PROFILE_STREAM_PARTIAL_IMAGES')
  if (streamPartialImages !== undefined) profile.streamPartialImages = streamPartialImages
  return profile
}

export function getDefaultProfileImportResult(input, env = process.env) {
  const expectedPassword = getEnvString(env, 'DEFAULT_PROFILE_PASSWORD')
  const profile = createDefaultProfileFromEnv(env)
  if (!expectedPassword || !profile) {
    return {
      status: 503,
      body: {
        error: {
          message: '默认账号未配置',
        },
      },
    }
  }

  if (!isValidDefaultProfilePassword(input?.password, expectedPassword)) {
    return {
      status: 401,
      body: {
        error: {
          message: '验证口令错误',
        },
      },
    }
  }

  return {
    status: 200,
    body: {
      profile,
    },
  }
}
