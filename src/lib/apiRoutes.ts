/**
 * API route constants — single source of truth
 * Source: sync-server/api-routes.json
 * Both frontend (ESM) and backend (CJS) import from the same JSON.
 */
import routes from '../../sync-server/api-routes.json'

export const API = routes

/** Replace :id placeholder */
export function apiUrl(route: string, params: Record<string, string> = {}): string {
  return Object.entries(params).reduce((url, [k, v]) => url.replace(`:${k}`, encodeURIComponent(v)), route)
}
