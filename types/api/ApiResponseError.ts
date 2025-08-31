export class ApiResponseError {
  error: boolean;
  message: string;

  constructor(error: boolean, message: string) {
    this.error = error;
    this.message = message;
  }
}

export class APIAuth2FAError extends ApiResponseError {
  otp_required: boolean;
  email: string | undefined;

  constructor(otp_required: boolean, email: string, message: string) {
    super(true, message);
    this.otp_required = otp_required;
    this.email = email;
  }
}

export class APIAuthEmailVerifiedError extends ApiResponseError {
  email_verified: boolean;
  email: string;

  constructor(email_verified: boolean, message: string, email: string) {
    super(true, message);
    this.email_verified = email_verified;
    this.email = email;
  }
}

export class APIWaitPeriod extends ApiResponseError {
  page: string;
  retry_after: number;
  remaining: number;
  email: string;

  constructor(
    message: string,
    page: string,
    retry_after: number,
    remaining: number,
    email: string
  ) {
    super(true, message);
    this.page = page;
    this.retry_after = retry_after;
    this.remaining = remaining;
    this.email = email;
  }
}

export class APIResendResponse extends ApiResponseError {
  otp_required: string;
  email: string;
  next_request_in: number;

  constructor(
    otp_required: string,
    email: string,
    next_request_in: number,
    message: string
  ) {
    super(true, message);
    this.otp_required = otp_required;
    this.email = email;
    this.next_request_in = next_request_in;
  }
}
