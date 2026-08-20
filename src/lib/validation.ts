/**
 * Form rules, ported 1:1 from the Zod schemas the React app used.
 * Kept free of DOM access so they can be unit-tested directly.
 */

export type ContactMessages = {
  username_min: string;
  email_invalid: string;
  email_min: string;
  phone_min: string;
  findUs_min: string;
  investingWithUs_min: string;
  message_min: string;
  terms_required: string;
};

export type ContactValues = {
  username: string;
  email: string;
  phone: string;
  findUs: string;
  investingWithUs: string;
  message: string;
  terms: boolean;
};

export type Errors<T> = Partial<Record<keyof T, string>>;

/** Same shape the `z.string().email()` check accepts. */
export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function validateContact(
  values: ContactValues,
  messages: ContactMessages,
): Errors<ContactValues> {
  const errors: Errors<ContactValues> = {};

  if (values.username.trim().length < 2) errors.username = messages.username_min;

  if (!isEmail(values.email)) errors.email = messages.email_invalid;
  else if (values.email.trim().length < 2) errors.email = messages.email_min;

  if (values.phone.trim().length < 6) errors.phone = messages.phone_min;
  if (values.findUs.trim().length < 3) errors.findUs = messages.findUs_min;
  if (values.investingWithUs.trim().length < 1)
    errors.investingWithUs = messages.investingWithUs_min;
  if (values.message.trim().length < 10) errors.message = messages.message_min;
  if (!values.terms) errors.terms = messages.terms_required;

  return errors;
}

export type InvestmentMessages = {
  name: string;
  email_invalid: string;
  email_required: string;
  phone: string;
  select: string;
};

export type InvestmentValues = {
  name: string;
  email: string;
  phone: string;
  country: string;
  budget: string;
  funds: string;
  company: string;
};

/** `/^[0-9+()\-\s]{7,20}$/` — the original dialog's phone rule. */
export const PHONE_PATTERN = /^[0-9+()\-\s]{7,20}$/;

export function validateInvestment(
  values: InvestmentValues,
  messages: InvestmentMessages,
): Errors<InvestmentValues> {
  const errors: Errors<InvestmentValues> = {};

  const name = values.name.trim();
  if (name.length < 2 || name.length > 80) errors.name = messages.name;

  if (values.email.trim().length < 3) errors.email = messages.email_required;
  else if (!isEmail(values.email)) errors.email = messages.email_invalid;

  if (!PHONE_PATTERN.test(values.phone.trim())) errors.phone = messages.phone;

  if (!values.country) errors.country = messages.select;
  if (!values.budget) errors.budget = messages.select;
  if (!values.funds) errors.funds = messages.select;
  if (!values.company) errors.company = messages.select;

  return errors;
}

export function hasErrors<T>(errors: Errors<T>): boolean {
  return Object.keys(errors).length > 0;
}
