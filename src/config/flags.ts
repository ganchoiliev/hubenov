/**
 * Feature flags.
 *
 * CLIENT_PHONE_ONLY makes phone the single canonical client identity, so a
 * client can never end up with one account from a phone login and a separate
 * account from an email login (no shared key exists to merge them later).
 *
 * Keep this FALSE until Infobip SMS is reliably delivering to our markets
 * (UK account provisioned + BG "Hubenov" sender approved). While SMS is down,
 * email OTP is the ONLY working login; turning this on before then would lock
 * every client (and the owner) out.
 *
 * When TRUE:
 *   - clients see phone OTP only,
 *   - staff reach email + password via a discreet "Staff sign-in" link,
 *   - email OTP can no longer CREATE a new account (shouldCreateUser=false),
 *     so a stray email can't spawn a duplicate; it only authenticates an
 *     account that already carries that email identity.
 */
export const CLIENT_PHONE_ONLY = false;
