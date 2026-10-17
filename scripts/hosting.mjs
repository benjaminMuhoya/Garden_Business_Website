// GitHub project sites live below a repository path; local builds default to /.
export function normalizeBasePath(value = '/') {
  if (value === '' || value === '/') return '/';
  if (!/^\/?[a-zA-Z0-9_-]+\/?$/.test(value)) throw new Error('BASE_PATH must be / or a single repository path.');
  return `/${value.replace(/^\/|\/$/g, '')}/`;
}

export function applyBasePath(html, basePath) {
  return html.replace(/(\b(?:href|src)=")\/(?!\/)/g, (_, attribute) => attribute + basePath);
}
