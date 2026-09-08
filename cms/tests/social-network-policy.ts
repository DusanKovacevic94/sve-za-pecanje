// Browser-test guard: block side effects before a synthetic draft can leave the CMS.
export function forbiddenSocialRequest(url: URL, method: string, cmsOrigin: string) {
  return url.origin !== cmsOrigin || /analytics|umami|\/(?:collect|track)(?:[/.]|$)/i.test(url.pathname) ||
    (url.pathname.startsWith('/api/media') && !['GET', 'HEAD'].includes(method))
}
