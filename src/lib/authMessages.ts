/**
 * Auth + password notifications, shown BILINGUALLY (BG / EN) so they read
 * correctly whatever interface language is selected. Supabase returns
 * English-only error text; we map the common cases to a bilingual line and fall
 * back to a generic bilingual message for anything unmapped.
 */
const B = (bg: string, en: string) => `${bg} / ${en}`;

export const M = {
  invalidPhone: B('Невалиден телефонен номер', 'Invalid phone number'),
  badCredentials: B('Грешен имейл или парола', 'Wrong email or password'),
  needEmail: B('Въведете валиден имейл', 'Enter a valid email'),
  forgotNeedEmail: B('Въведете имейл, за да изпратим линк', 'Enter your email to get a reset link'),
  resetSent: B('Ако имейлът съществува, изпратихме линк за нова парола', "If the email exists, we've sent a reset link"),
  resetDone: B('Паролата е сменена. Вече може да влезете', 'Password updated. You can sign in now'),
  passwordShort: B('Паролата трябва да е поне 8 знака', 'Password must be at least 8 characters'),
  passwordMismatch: B('Паролите не съвпадат', 'Passwords do not match'),
  emailSaved: B('Готово. Ако се изисква потвърждение, проверете имейла си', 'Done. If confirmation is required, check your email'),
  generic: B('Възникна грешка. Опитайте отново', 'Something went wrong. Please try again'),
};

/** Map a Supabase auth error to a bilingual message. */
export function authErrorMessage(error: unknown): string {
  const m = (error instanceof Error ? error.message : String(error ?? '')).toLowerCase();
  if (m.includes('different from the old')) {
    return B('Новата парола трябва да е различна от старата', 'New password must be different from the old one');
  }
  if (m.includes('invalid login credentials')) return M.badCredentials;
  if (m.includes('already been registered') || m.includes('already registered') || m.includes('email_exists')) {
    return B('Този имейл вече се използва', 'This email is already in use');
  }
  if (m.includes('email not confirmed')) {
    return B('Имейлът не е потвърден. Проверете пощата си', 'Email not confirmed. Check your inbox');
  }
  if (m.includes('for security purposes') || m.includes('rate limit') || m.includes('too many')) {
    return B('Твърде много опити. Опитайте по-късно', 'Too many attempts. Please try again later');
  }
  if (m.includes('unable to validate email') || m.includes('invalid format')) {
    return B('Невалиден имейл', 'Invalid email');
  }
  if (m.includes('weak password') || m.includes('at least')) return M.passwordShort;
  return M.generic;
}
