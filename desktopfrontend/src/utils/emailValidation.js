export const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/i;

// Known domains for pre-provisioned FDA/CIDG/LEA personnel & admin accounts.
// Keep this in sync with ALLOWED_EMAIL_DOMAINS in the backend Pydantic models.
export const ALLOWED_EMAIL_DOMAINS = [
  'gmail.com',
  'fda.gov.ph',
  'pnp.gov.ph',
];

export function isAllowedEmailDomain(email) {
  const domain = email.split('@')[1]?.toLowerCase();
  return ALLOWED_EMAIL_DOMAINS.includes(domain);
}

export function validateEmail(email) {
  if (!EMAIL_REGEX.test(email)) {
    return 'Please enter a valid email address.';
  }
  if (!isAllowedEmailDomain(email)) {
    return 'Please use a gmail or official government (.gov.ph) email address.';
  }
  return null; // valid
}