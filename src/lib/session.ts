import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE_NAME = "mkt_hub_session";

export interface SessionPayload {
  userId: string;
  role: "LEADER" | "MEMBER";
  name: string;
  email: string;
}

function getJwtSecret(): Uint8Array {
  const raw =
    process.env.AUTH_SECRET || "meta-ecom-dev-fallback-secret-key-min-32-chars";
  return new TextEncoder().encode(raw);
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(getJwtSecret());
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (!payload.userId || typeof payload.userId !== "string") {
      return null;
    }
    return {
      userId: payload.userId,
      role: payload.role === "LEADER" ? "LEADER" : "MEMBER",
      name: String(payload.name ?? ""),
      email: String(payload.email ?? ""),
    };
  } catch {
    return null;
  }
}
