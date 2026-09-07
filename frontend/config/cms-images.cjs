function cmsImagePattern(value) {
  if (!value) return null;
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || /[%*]/.test(url.pathname) || url.hostname.includes('*')) {
    throw new Error('CMS_S3_PUBLIC_URL must be an HTTP(S) bucket URL without credentials, queries, or wildcards.');
  }
  return { protocol: url.protocol.slice(0, -1), hostname: url.hostname, port: url.port,
    pathname: `${url.pathname.replace(/\/$/, '')}/media/**`, search: '' };
}
module.exports = { cmsImagePattern };
