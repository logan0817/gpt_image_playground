const ALLOWED_PROXY_PATH_RE = /^(?:v1\/)?(?:images\/generations|images\/edits|responses)$/i

export function normalizeProxyPath(path) {
  return String(path ?? '').trim().replace(/^\/+/, '').replace(/\/+$/, '')
}

export function isAllowedProxyPath(path) {
  return ALLOWED_PROXY_PATH_RE.test(normalizeProxyPath(path))
}

export function getConfiguredProxyTarget(env = process.env) {
  const proxyUrl = typeof env?.API_PROXY_URL === 'string' ? env.API_PROXY_URL.trim() : ''
  if (proxyUrl) return proxyUrl
  return typeof env?.DEFAULT_PROFILE_BASE_URL === 'string' ? env.DEFAULT_PROFILE_BASE_URL.trim() : ''
}

export function buildTargetUrl(baseUrl, path, searchParams) {
  const target = new URL(baseUrl)
  const normalizedPath = normalizeProxyPath(path)
  const targetPath = target.pathname.replace(/\/+$/, '')
  const pathWithoutDuplicatedV1 = targetPath.endsWith('/v1') && normalizedPath.toLowerCase().startsWith('v1/')
    ? normalizedPath.slice(3)
    : normalizedPath

  target.pathname = `${targetPath}/${pathWithoutDuplicatedV1}`.replace(/\/{2,}/g, '/')
  target.search = ''

  if (searchParams) {
    for (const [key, value] of searchParams.entries()) {
      if (key !== 'path') target.searchParams.append(key, value)
    }
  }

  return target.toString()
}
