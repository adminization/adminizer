import type { SerializeOptions } from "cookie";

/** Shared attributes ensure that login and logout address the same cookie. */
export function authCookieOptions(req: Pick<ReqType, "secure">): SerializeOptions {
    let publicHttps = false;
    try {
        publicHttps = new URL(process.env.PUBLIC_SITE_ORIGIN || "").protocol === "https:";
    } catch {
        // Hosts without a canonical origin rely on the request's trusted protocol.
    }
    return {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: req.secure || publicHttps || process.env.NODE_ENV === "production",
    };
}
