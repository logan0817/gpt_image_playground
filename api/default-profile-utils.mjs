import { createHash, timingSafeEqual } from 'node:crypto'

function getEnvString(env, key) {
  const value = env?.[key]
  return typeof value === 'string' ? value.trim() : ''
}

function getEnvBoolean(env, key) {
  const value = getEnvString(env, key).toLowerCase()
  if (!value) return undefined
  if (['1', 'true', 'yes', 'on'].includes(value)) return true
  if (['0', 'false', 'no', 'off'].includes(value)) return false
  return undefined
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
    provider: 'openai',
    apiKey,
  }
  const name = getEnvString(env, 'DEFAULT_PROFILE_NAME')
  const baseUrl = getEnvString(env, 'DEFAULT_PROFILE_BASE_URL')
  const model = getEnvString(env, 'DEFAULT_PROFILE_MODEL')
  const apiMode = getEnvString(env, 'DEFAULT_PROFILE_API_MODE')
  const apiProxy = getEnvBoolean(env, 'DEFAULT_PROFILE_API_PROXY')
  const streamImages = getEnvBoolean(env, 'DEFAULT_PROFILE_STREAM_IMAGES')
  const streamPartialImages = getEnvNumber(env, 'DEFAULT_PROFILE_STREAM_PARTIAL_IMAGES')
  if (name) profile.name = name
  if (baseUrl) profile.baseUrl = baseUrl
  if (model) profile.model = model
  if (apiMode === 'responses' || apiMode === 'images') profile.apiMode = apiMode
  if (apiProxy !== undefined) profile.apiProxy = apiProxy
  if (streamImages !== undefined) profile.streamImages = streamImages
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
