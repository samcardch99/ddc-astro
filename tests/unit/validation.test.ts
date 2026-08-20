import { describe, expect, it } from 'vitest';
import {
  hasErrors,
  isEmail,
  PHONE_PATTERN,
  validateContact,
  validateInvestment,
  type ContactMessages,
  type ContactValues,
  type InvestmentMessages,
  type InvestmentValues,
} from '../../src/lib/validation';

const contactMessages: ContactMessages = {
  username_min: 'username_min',
  email_invalid: 'email_invalid',
  email_min: 'email_min',
  phone_min: 'phone_min',
  findUs_min: 'findUs_min',
  investingWithUs_min: 'investingWithUs_min',
  message_min: 'message_min',
  terms_required: 'terms_required',
};

const validContact: ContactValues = {
  username: 'Jane Smith',
  email: 'jane@example.com',
  phone: '305-555-1234',
  findUs: 'Instagram',
  investingWithUs: 'General inquiries',
  message: 'I would like more information about your modular homes.',
  terms: true,
};

describe('isEmail', () => {
  it.each(['a@b.co', 'jane.smith+tag@example.com', ' spaced@example.com '])('accepts %s', (value) => {
    expect(isEmail(value)).toBe(true);
  });

  it.each(['', 'jane', 'jane@', '@example.com', 'jane@example', 'jane @example.com'])(
    'rejects %s',
    (value) => {
      expect(isEmail(value)).toBe(false);
    },
  );
});

describe('validateContact', () => {
  it('accepts a fully valid submission', () => {
    const errors = validateContact(validContact, contactMessages);
    expect(errors).toEqual({});
    expect(hasErrors(errors)).toBe(false);
  });

  it('requires a username of at least 2 characters', () => {
    expect(validateContact({ ...validContact, username: 'J' }, contactMessages).username).toBe(
      'username_min',
    );
    expect(validateContact({ ...validContact, username: '  ' }, contactMessages).username).toBe(
      'username_min',
    );
  });

  it('reports an invalid email', () => {
    expect(validateContact({ ...validContact, email: 'nope' }, contactMessages).email).toBe(
      'email_invalid',
    );
  });

  it('requires at least 6 phone characters', () => {
    expect(validateContact({ ...validContact, phone: '12345' }, contactMessages).phone).toBe(
      'phone_min',
    );
    expect(validateContact({ ...validContact, phone: '123456' }, contactMessages).phone).toBeUndefined();
  });

  it('requires the how-did-you-find-us field', () => {
    expect(validateContact({ ...validContact, findUs: 'IG' }, contactMessages).findUs).toBe(
      'findUs_min',
    );
  });

  it('requires a reason to be selected', () => {
    expect(
      validateContact({ ...validContact, investingWithUs: '' }, contactMessages).investingWithUs,
    ).toBe('investingWithUs_min');
  });

  it('requires a message of at least 10 characters', () => {
    expect(validateContact({ ...validContact, message: 'too short' }, contactMessages).message).toBe(
      'message_min',
    );
  });

  it('requires the privacy policy checkbox', () => {
    expect(validateContact({ ...validContact, terms: false }, contactMessages).terms).toBe(
      'terms_required',
    );
  });

  it('reports every failing field at once', () => {
    const errors = validateContact(
      { username: '', email: '', phone: '', findUs: '', investingWithUs: '', message: '', terms: false },
      contactMessages,
    );
    expect(Object.keys(errors).sort()).toEqual(
      ['email', 'findUs', 'investingWithUs', 'message', 'phone', 'terms', 'username'].sort(),
    );
  });
});

const investmentMessages: InvestmentMessages = {
  name: 'name',
  email_invalid: 'email_invalid',
  email_required: 'email_required',
  phone: 'phone',
  select: 'select',
};

const validInvestment: InvestmentValues = {
  name: 'Jane Smith',
  email: 'jane@example.com',
  phone: '+1 (786) 566-1632',
  country: 'Spain',
  budget: '$200,000 – $300,000',
  funds: 'Yes, I have the capital available',
  company: 'Yes',
};

describe('PHONE_PATTERN', () => {
  it.each(['3059150002', '+1 (786) 566-1632', '305-915-0002'])('accepts %s', (value) => {
    expect(PHONE_PATTERN.test(value)).toBe(true);
  });

  it.each(['12345', 'call me', '+1(786)566-1632-extension-9999'])('rejects %s', (value) => {
    expect(PHONE_PATTERN.test(value)).toBe(false);
  });
});

describe('validateInvestment', () => {
  it('accepts a fully valid submission', () => {
    expect(validateInvestment(validInvestment, investmentMessages)).toEqual({});
  });

  it('bounds the name between 2 and 80 characters', () => {
    expect(validateInvestment({ ...validInvestment, name: 'J' }, investmentMessages).name).toBe('name');
    expect(
      validateInvestment({ ...validInvestment, name: 'x'.repeat(81) }, investmentMessages).name,
    ).toBe('name');
    expect(
      validateInvestment({ ...validInvestment, name: 'x'.repeat(80) }, investmentMessages).name,
    ).toBeUndefined();
  });

  it('distinguishes a missing email from a malformed one', () => {
    expect(validateInvestment({ ...validInvestment, email: '' }, investmentMessages).email).toBe(
      'email_required',
    );
    expect(validateInvestment({ ...validInvestment, email: 'nope' }, investmentMessages).email).toBe(
      'email_invalid',
    );
  });

  it('requires every select to be answered', () => {
    for (const field of ['country', 'budget', 'funds', 'company'] as const) {
      const errors = validateInvestment({ ...validInvestment, [field]: '' }, investmentMessages);
      expect(errors[field]).toBe('select');
    }
  });
});

describe('hasErrors', () => {
  it('is false for an empty object and true otherwise', () => {
    expect(hasErrors({})).toBe(false);
    expect(hasErrors({ email: 'nope' })).toBe(true);
  });
});
