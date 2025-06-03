export function encodeCmd(cmd: string, args: string[]) {
  const combined = [cmd, ...args].join(' ');
  const b64 = Buffer.from(combined, 'utf8').toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function decodeCmd(slug: string) {
  let b64 = slug.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) b64 += '=';
  return Buffer.from(b64, 'base64').toString('utf8');
}
