// (Deprecated) The CLIENT_PHONE_ONLY rollout flag was removed. Clients sign in
// with phone only by design; phone OTP activates automatically when Infobip SMS
// goes live (no flip). Email + password is a separate, opt-in path set from the
// client dashboard, and email can never create an account, so no duplicate can
// form. This module intentionally exports nothing.
export {};
