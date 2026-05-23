import { getDefaultProfileImportResult } from './default-profile-utils.mjs'

async function readRequestJson(req) {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string') return req.body.trim() ? JSON.parse(req.body) : {}

  let body = ''
  for await (const chunk of req) body += chunk
  return body.trim() ? JSON.parse(body) : {}
}

function sendJson(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS')
    res.statusCode = 204
    res.end()
    return
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS')
    sendJson(res, 405, { error: { message: 'Method Not Allowed' } })
    return
  }

  let input
  try {
    input = await readRequestJson(req)
  } catch {
    sendJson(res, 400, { error: { message: '请求格式无效' } })
    return
  }

  const result = getDefaultProfileImportResult(input, process.env)
  sendJson(res, result.status, result.body)
}
