import crypto from 'crypto'

type AdminSession = {
  token: string
  username: string
  expiresAt: number
}

export class AdminAuthService {
  private readonly sessions = new Map<string, AdminSession>()
  private readonly ttlMs: number

  constructor(ttlHours = 12) {
    this.ttlMs = ttlHours * 60 * 60 * 1000
  }

  issueToken(username: string) {
    const token = crypto.randomBytes(24).toString('hex')
    const session: AdminSession = {
      token,
      username,
      expiresAt: Date.now() + this.ttlMs,
    }
    this.sessions.set(token, session)
    return session
  }

  verifyToken(token: string | undefined) {
    if (!token) return null

    const session = this.sessions.get(token)
    if (!session) return null

    if (session.expiresAt <= Date.now()) {
      this.sessions.delete(token)
      return null
    }

    return session
  }

  revokeToken(token: string | undefined) {
    if (!token) return false
    return this.sessions.delete(token)
  }
}
