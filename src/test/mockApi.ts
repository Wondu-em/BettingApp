import { vi } from 'vitest'

export interface MockRequest {
  params: Record<string, string>
  url: URL
  init: RequestInit & { headers: Record<string, string> }
  body: any // eslint-disable-line @typescript-eslint/no-explicit-any
}

export type Handler = (request: MockRequest) => Response | Promise<Response>

export interface RecordedCall extends MockRequest {
  key: string
}

/** Routes are keyed "METHOD /api/path" (query string ignored). Mutate `routes` between steps to change behaviour. */
export function mockApi(routes: Record<string, Handler>) {
  const calls: RecordedCall[] = []

  const fn = vi.fn(async (input: string, init: RequestInit = {}) => {
    const url = new URL(input, 'http://localhost')
    const key = `${init.method ?? 'GET'} ${url.pathname}`
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : undefined

    // exact match first, then templates such as "POST /api/admin/events/:id/close"
    let handler = routes[key]
    let params: Record<string, string> = {}
    if (!handler) {
      for (const [template, candidate] of Object.entries(routes)) {
        if (!template.includes(':')) continue
        const names: string[] = []
        const pattern = template.replace(/:([A-Za-z]+)/g, (_, name: string) => {
          names.push(name)
          return '([^/]+)'
        })
        const match = new RegExp(`^${pattern}$`).exec(key)
        if (match) {
          handler = candidate
          params = Object.fromEntries(names.map((n, i) => [n, match[i + 1]]))
          break
        }
      }
    }

    const request = { params, url, init: init as MockRequest['init'], body }
    calls.push({ ...request, key })
    if (!handler) throw new Error(`Unmocked request: ${key}`)
    return handler(request)
  })

  vi.stubGlobal('fetch', fn)
  return { calls, fn }
}

export const posts = (calls: RecordedCall[], key: string) => calls.filter((c) => c.key === key)
