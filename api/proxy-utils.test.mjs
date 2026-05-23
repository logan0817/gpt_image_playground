import { describe, expect, it } from 'vitest'
import { buildTargetUrl, isAllowedProxyPath } from './proxy-utils.mjs'

describe('vercel api proxy utilities', () => {
  it('forwards image generation requests to the configured v1 target', () => {
    expect(buildTargetUrl('https://api.asxs.top/v1', 'images/generations')).toBe(
      'https://api.asxs.top/v1/images/generations',
    )
  })

  it('does not duplicate the v1 segment when the proxied path already includes it', () => {
    expect(buildTargetUrl('https://api.asxs.top/v1', 'v1/images/edits')).toBe(
      'https://api.asxs.top/v1/images/edits',
    )
  })

  it('only allows the supported OpenAI-compatible endpoints', () => {
    expect(isAllowedProxyPath('images/generations')).toBe(true)
    expect(isAllowedProxyPath('images/edits')).toBe(true)
    expect(isAllowedProxyPath('responses')).toBe(true)
    expect(isAllowedProxyPath('models')).toBe(false)
  })
})
