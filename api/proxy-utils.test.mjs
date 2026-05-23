import { describe, expect, it } from 'vitest'
import { buildTargetUrl, getConfiguredProxyTarget, isAllowedProxyPath } from './proxy-utils.mjs'

describe('vercel api proxy utilities', () => {
  it('forwards image generation requests to the configured v1 target', () => {
    expect(buildTargetUrl('https://proxy.example.com/v1', 'images/generations')).toBe(
      'https://proxy.example.com/v1/images/generations',
    )
  })

  it('does not duplicate the v1 segment when the proxied path already includes it', () => {
    expect(buildTargetUrl('https://proxy.example.com/v1', 'v1/images/edits')).toBe(
      'https://proxy.example.com/v1/images/edits',
    )
  })

  it('only allows the supported OpenAI-compatible endpoints', () => {
    expect(isAllowedProxyPath('images/generations')).toBe(true)
    expect(isAllowedProxyPath('images/edits')).toBe(true)
    expect(isAllowedProxyPath('responses')).toBe(true)
    expect(isAllowedProxyPath('models')).toBe(false)
  })

  it('requires an explicit proxy target instead of inferring from frontend defaults', () => {
    expect(getConfiguredProxyTarget({
      VITE_DEFAULT_API_URL: 'https://frontend-default.example.com/v1',
    })).toBe('')
    expect(getConfiguredProxyTarget({
      API_PROXY_URL: ' https://proxy.example.com/v1 ',
      VITE_DEFAULT_API_URL: 'https://frontend-default.example.com/v1',
    })).toBe('https://proxy.example.com/v1')
  })
})
