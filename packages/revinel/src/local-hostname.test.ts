import { describe, expect, it } from "bun:test"
import { isLocalHostname } from "./local-hostname"

describe("isLocalHostname", () => {
  it.each([
    "localhost",
    "LOCALHOST",
    "localhost.",
    "app.localhost",
    "0.0.0.0",
    "127.0.0.1",
    "127.10.20.30",
    "10.0.0.5",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.20",
    "169.254.10.1",
    "::1",
    "[::1]",
    "fd12:3456::1",
    "[fc00::1]",
    "fe80::1",
    "febf::1",
  ])("treats %s as local", hostname => {
    expect(isLocalHostname(hostname)).toBe(true)
  })

  it.each([
    "euroalternative.co",
    "localhost.example.com",
    "mylocalhost",
    "172.15.0.1",
    "172.32.0.1",
    "192.169.0.1",
    "8.8.8.8",
    "2001:db8::1",
    "fec0::1",
    "",
  ])("treats %s as remote", hostname => {
    expect(isLocalHostname(hostname)).toBe(false)
  })
})
