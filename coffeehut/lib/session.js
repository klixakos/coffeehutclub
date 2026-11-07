import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const KINDS = {
  customer: { cookie: 'ch_session', seconds: 60 * 60 * 24 * 180 },
  staff: { cookie: 'ch_staff', seconds: 60 * 60 * 12 },
}
const key = () => new TextEncoder().encode(process.env.SESSION_SECRET)

export async function createSession(kind, id) {
  const k = KINDS[kind]
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(id)
    .setAudience(kind)
    .setExpirationTime(`${k.seconds}s`)
    .sign(key())
  ;(await cookies()).set(k.cookie, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: k.seconds,
  })
}

export async function getSessionId(kind) {
  const token = (await cookies()).get(KINDS[kind].cookie)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, key(), { audience: kind })
    return payload.sub || null
  } catch {
    return null
  }
}

export async function destroySession(kind) {
  ;(await cookies()).delete(KINDS[kind].cookie)
}
