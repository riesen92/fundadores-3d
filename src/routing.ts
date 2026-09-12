export type AppRoute = 'simulador' | 'editor'

function normalizedBase(base: string) {
  const clean = base.replace(/^\/+|\/+$/g, '')
  return clean ? `/${clean}` : ''
}

function relativePath(pathname: string, base: string) {
  const prefix = normalizedBase(base)
  const path = pathname.replace(/\/+$/, '') || '/'
  if (!prefix) return path
  if (path === prefix) return '/'
  return path.startsWith(`${prefix}/`) ? path.slice(prefix.length) : path
}

export function routePath(route: AppRoute, base: string) {
  return `${normalizedBase(base)}/${route}`
}

export function routeFromPath(pathname: string, base: string): AppRoute {
  return relativePath(pathname, base) === '/editor' ? 'editor' : 'simulador'
}

export function canonicalPath(pathname: string, base: string) {
  const relative = relativePath(pathname, base)
  if (relative === '/simulador' || relative === '/editor') return null
  return routePath('simulador', base)
}
