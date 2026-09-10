import { describe, expect, it } from 'vitest';
import {
  ESTIMATE_LEAD_FIELDS,
  hasEstimateLeadErrors,
  PHONE_PATTERN,
  validateEstimateLead,
  validateEstimateLeadField,
  type EstimateLeadMessages,
  type EstimateLeadValues,
} from '../../src/lib/estimateLead';

/** Each message is its own field name, so a wrong mapping fails loudly. */
const messages: EstimateLeadMessages = {
  name: 'name',
  email: 'email',
  phone: 'phone',
  description: 'description',
};

const valid: EstimateLeadValues = {
  name: 'Jane Smith',
  email: 'jane@example.com',
  phone: '+1 (305) 555-0100',
  description: 'A four-bedroom spec build on a lot I already own in Pinecrest.',
};

describe('validateEstimateLead', () => {
  it('accepts a filled-in form', () => {
    expect(validateEstimateLead(valid, messages)).toEqual({});
    expect(hasEstimateLeadErrors(validateEstimateLead(valid, messages))).toBe(false);
  });

  it('reports every invalid field at once, not just the first', () => {
    const errors = validateEstimateLead(
      { name: '', email: 'nope', phone: '12', description: '' },
      messages,
    );
    expect(errors).toEqual({
      name: 'name',
      email: 'email',
      phone: 'phone',
      description: 'description',
    });
    expect(hasEstimateLeadErrors(errors)).toBe(true);
  });

  it('leaves valid fields out of the errors', () => {
    const errors = validateEstimateLead({ ...valid, email: 'jane@' }, messages);
    expect(errors).toEqual({ email: 'email' });
  });

  it('carries one message per field even when a field breaks several rules', () => {
    const errors = validateEstimateLead({ ...valid, email: '' }, messages);
    expect(errors.email).toBe('email');
  });

  it('treats whitespace-only input as empty', () => {
    const errors = validateEstimateLead(
      { ...valid, name: '   ', description: '  \n ' },
      messages,
    );
    expect(errors.name).toBe('name');
    expect(errors.description).toBe('description');
  });

  it('accepts values that are only valid once trimmed', () => {
    expect(
      validateEstimateLead(
        { name: '  Jane Smith ', email: ' jane@example.com ', phone: ' 3055550100 ', description: ' A lot in Coconut Grove. ' },
        messages,
      ),
    ).toEqual({});
  });
});

describe('name', () => {
  it.each(['', 'J', '  a  '])('rejects %j', (name) => {
    expect(validateEstimateLeadField('name', name, messages)).toBe('name');
  });

  it('rejects a name longer than 80 characters', () => {
    expect(validateEstimateLeadField('name', 'a'.repeat(81), messages)).toBe('name');
    expect(validateEstimateLeadField('name', 'a'.repeat(80), messages)).toBeUndefined();
  });
});

describe('email', () => {
  it.each(['jane@example.com', 'jane.smith+tag@example.co.uk'])('accepts %s', (email) => {
    expect(validateEstimateLeadField('email', email, messages)).toBeUndefined();
  });

  it.each(['', 'jane', 'jane@', '@example.com', 'jane@example', 'jane @example.com'])(
    'rejects %j',
    (email) => {
      expect(validateEstimateLeadField('email', email, messages)).toBe('email');
    },
  );
});

describe('phone', () => {
  it.each(['3055550100', '+1 (305) 555-0100', '305-555-0100'])('accepts %s', (phone) => {
    expect(validateEstimateLeadField('phone', phone, messages)).toBeUndefined();
  });

  it.each(['', '12345', '305555010012345678901', 'call me', '305.555.0100'])(
    'rejects %j',
    (phone) => {
      expect(validateEstimateLeadField('phone', phone, messages)).toBe('phone');
    },
  );

  it('is the rule the investor dialog already uses', () => {
    expect(PHONE_PATTERN.source).toBe('^[0-9+()\\-\\s]{7,20}$');
  });
});

describe('description', () => {
  it('rejects an empty description', () => {
    expect(validateEstimateLeadField('description', '', messages)).toBe('description');
    expect(validateEstimateLeadField('description', '   ', messages)).toBe('description');
  });

  it('accepts any non-empty description', () => {
    expect(validateEstimateLeadField('description', 'A lot.', messages)).toBeUndefined();
  });
});

describe('ESTIMATE_LEAD_FIELDS', () => {
  it('lists the fields in the order they are read', () => {
    expect(ESTIMATE_LEAD_FIELDS).toEqual(['name', 'email', 'phone', 'description']);
  });

  it('covers every field the schema validates', () => {
    const errors = validateEstimateLead(
      { name: '', email: '', phone: '', description: '' },
      messages,
    );
    expect(Object.keys(errors).sort()).toEqual([...ESTIMATE_LEAD_FIELDS].sort());
  });
});
