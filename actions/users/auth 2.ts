"use server";
const API_BASE_URL = process.env.API_BASE_URL;

export async function loginAction(email: string, password: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    return data;
  } catch (error) {
    return { error: true, message: `An error occurred while login ${error}` };
  }
}

export async function verifyOtpAction(email: string, otpCode: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/verify-otp/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp_code: otpCode }),
    });

    const data = await res.json();
    return data;
  } catch (error) {
    return { error: true, message: error };
  }
}

export async function resendOTPAction(
  email: string,
  otp_type: "verify_otp" | "verify_email"
) {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/resend-otp/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp_type }),
    });

    const data = await res.json();
    return data;
  } catch (error) {
    return { error: true, message: error };
  }
}

export async function refreshTokenAction(refreshToken: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    const data = await res.json();
    return data;
  } catch (error) {
    return {
      error: true,
      message: error,
    };
  }
}

export async function verifyEmail(email: string, otpCode: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/verify-email/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp_code: otpCode }),
    });

    const data = await res.json();
    return data;
  } catch (error) {
    return { error: true, message: error };
  }
}

export async function requestPasswordResetOtp(email: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/password-reset-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      return {
        error: true,
        message: data.message || 'Failed to send password reset OTP',
        data: null,
      };
    }
    return {
      error: false,
      message: data.message || 'Password reset OTP sent successfully',
      data,
    };
  } catch (error) {
    return {
      error: true,
      message: `An error occurred while sending password reset OTP: ${error}`,
      data: null,
    };
  }
}
