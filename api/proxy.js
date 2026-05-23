import { buildTargetUrl, getConfiguredProxyTarget, isAllowedProxyPath, normalizeProxyPath } from './proxy-utils.mjs'

export const config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 300,
}

const FORWARDED_REQUEST_HEADERS = new Set([
  'accept',
  'authorization',
  'content-type',
  'openai-organization',
  'openai-project',
])
const FORWARDED_RESPONSE_HEADERS = new Set([
  'content-type',
  'cache-control',
])

function setCorsHeaders(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type, accept')
  res.setHeader('Vary', 'Origin')
}

function getProxyPath(req) {
  const queryPath = req.query?.path
  if (Array.isArray(queryPath)) return queryPath.map(normalizeProxyPath).join('/')
  if (typeof queryPath === 'string') return queryPath

  const url = new URL(req.url || '/', 'https://proxy.local')
  return url.searchParams.get('path') || ''
}

function getForwardHeaders(headers) {
  const result = {}
  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase()
    if (!FORWARDED_REQUEST_HEADERS.has(lowerKey) || value == null) continue
    result[lowerKey] = Array.isArray(value) ? value.join(', ') : String(value)
  }
  return result
}

function forwardResponseHeaders(upstream, res) {
  upstream.headers.forEach((value, key) => {
    if (FORWARDED_RESPONSE_HEADERS.has(key.toLowerCase())) {
      res.setHeader(key, value)
    }
  })
}

export default async function handler(req, res) {
  setCorsHeaders(req, res)

  const proxyPath = getProxyPath(req)
  if (!isAllowedProxyPath(proxyPath)) {
    res.statusCode = 403
    res.end('Forbidden: API proxy path restricted')
    return
  }

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS')
    res.statusCode = 405
    res.end('Method Not Allowed')
    return
  }

  const proxyTarget = getConfiguredProxyTarget(process.env)
  if (!proxyTarget) {
    res.statusCode = 503
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({
      error: {
        message: 'API 代理未配置，请设置 API_PROXY_URL',
      },
    }))
    return
  }

  const requestUrl = new URL(req.url || '/', 'https://proxy.local')
  const targetUrl = buildTargetUrl(
    proxyTarget,
    proxyPath,
    requestUrl.searchParams,
  )

  try {
    const upstream = await fetch(targetUrl, {
      method: 'POST',
      headers: getForwardHeaders(req.headers),
      body: req,
      duplex: 'half',
    })

    res.statusCode = upstream.status
    forwardResponseHeaders(upstream, res)
    setCorsHeaders(req, res)
    res.end(Buffer.from(await upstream.arrayBuffer()))
  } catch (error) {
    res.statusCode = 502
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({
      error: {
        message: error instanceof Error ? error.message : 'API proxy request failed',
      },
    }))
  }
}
