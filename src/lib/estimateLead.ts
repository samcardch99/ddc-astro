/**
 * Rules for the estimator's lead-capture form, as a Zod schema.
 *
 * Kept free of DOM access so it can be unit-tested directly. Unlike
 * `validation.ts` — whose rules were hand-rolled precisely to keep Zod out of
 * the shared bundle — this module is imported dynamically by
 * `modules/estimate`, so Zod only reaches visitors who open the estimator.
 */
import { z } from 'zod';

export type EstimateLeadValues = {
  name: string;
  email: string;
  phone: string;
  description: string;
};

export type EstimateLeadField = keyof EstimateLeadValues;

/** One message per field: the toast body shown when that field is rejected. */
export type EstimateLeadMessages = Record<EstimateLeadField, string>;

export type EstimateLeadErrors = Partial<Record<EstimateLeadField, string>>;

/** Submit order, so toasts stack the way the fields are read. */
export const ESTIMATE_LEAD_FIELDS: readonly EstimateLeadField[] = [
  'name',
  'email',
  'phone',
  'description',
] as const;

/** The investor dialog's rule, reused so both lead paths accept the same numbers. */
export const PHONE_PATTERN = /^[0-9+()\-\s]{7,20}$/;

/**
 * Values arrive straight from the inputs, so every field trims first: a name of
 * three spaces is empty, and " a@b.co " is a valid address typed carelessly.
 */
export function estimateLeadSchema(messages: EstimateLeadMessages) {
  const trimmed = z.string().trim();

  return z.object({
    name: trimmed.min(2, messages.name).max(80, messages.name),
    email: trimmed.pipe(z.email(messages.email)),
    phone: trimmed.regex(PHONE_PATTERN, messages.phone),
    description: trimmed.min(1, messages.description),
  });
}

/** Every invalid field at once — the submit path, which reports all of them. */
export function validateEstimateLead(
  values: EstimateLeadValues,
  messages: EstimateLeadMessages,
): EstimateLeadErrors {
  const result = estimateLeadSchema(messages).safeParse(values);
  if (result.success) return {};

  const errors: EstimateLeadErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as EstimateLeadField | undefined;
    // First issue wins: `email` can fail `trim` and `email` in one pass, and
    // the field only has room for one message.
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}

/** One field on its own — what blur and keystrokes recheck, without touching the rest. */
export function validateEstimateLeadField(
  field: EstimateLeadField,
  value: string,
  messages: EstimateLeadMessages,
): string | undefined {
  const result = estimateLeadSchema(messages).shape[field].safeParse(value);
  return result.success ? undefined : result.error.issues[0]?.message;
}

export function hasEstimateLeadErrors(errors: EstimateLeadErrors): boolean {
  return Object.keys(errors).length > 0;
}
