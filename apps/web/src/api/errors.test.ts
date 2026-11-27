import { describe, expect, it } from 'vitest';
import { ApiError, FORM_MESSAGES, parseNestError } from './errors';

describe('parseNestError', () => {
  it('maps 400 messages onto fields and keeps the rest on the form', () => {
    const error = parseNestError(400, {
      statusCode: 400,
      message: [
        'email must be an email',
        'password must be longer than or equal to 8 characters',
        'property extra should not exist',
      ],
    });

    expect(error).toBeInstanceOf(ApiError);
    expect(error.fieldErrors.email).toBe('email must be an email');
    expect(error.fieldErrors.password).toBe(
      'password must be longer than or equal to 8 characters',
    );
    expect(error.formMessage).toBe('property extra should not exist');
  });

  it('uses a form alert for 401, 409, and 429', () => {
    expect(parseNestError(401, { message: 'Invalid email or password' })).toMatchObject(
      {
        fieldErrors: {},
        formMessage: FORM_MESSAGES.invalidLogin,
      },
    );
    expect(
      parseNestError(409, { message: 'Email or username is already registered' }),
    ).toMatchObject({
      fieldErrors: {},
      formMessage: FORM_MESSAGES.conflict,
    });
    expect(parseNestError(429, { message: 'Too Many Requests' })).toMatchObject({
      fieldErrors: {},
      formMessage: FORM_MESSAGES.throttled,
    });
  });
});
