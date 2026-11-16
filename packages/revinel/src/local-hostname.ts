/**
 * Loopback, unspecified, private and link-local addresses. A private address
 * covers a publisher testing from a phone on the same network as their dev
 * machine.
 */
const LOCAL_IPV4 =
  /^(0\.0\.0\.0|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+|169\.254\.\d+\.\d+)$/

/**
 * IPv6 loopback, unique local (`fc00::/7`) and link-local (`fe80::/10`).
 */
const LOCAL_IPV6 = /^(::1|f[cd][0-9a-f]{0,2}:.*|fe[89ab][0-9a-f]?:.*)$/i

/**
 * Reports whether a hostname points at a local or private host, such as
 * `localhost`, `app.localhost`, `127.0.0.1`, `192.168.1.20` or `[::1]`. The
 * Revinel API ignores ad tracking events sent from pages on these hosts.
 * Accepts IPv6 hosts with or without the brackets `URL` keeps around them.
 */
export function isLocalHostname(hostname: string): boolean {
  const host = hostname
    .trim()
    .toLowerCase()
    .replace(/^\[(.*)\]$/, "$1")
    .replace(/\.$/, "")

  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    LOCAL_IPV4.test(host) ||
    LOCAL_IPV6.test(host)
  )
}
