"use server";

const API_BASE_URL = process.env.API_BASE_URL;

export const resetPasswordAction = async (email: string, newPassword: string) => {
  try {
    const res = await fetch(`${API_BASE_URL}/reset-password-after-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, new_password: newPassword }),
    });

    const data = await res.json();
    
    if (!res.ok) {
      return { 
        error: true, 
        message: data.message || "Failed to reset password",
        data: null
      };
    }
    
    return { 
      error: data.error, 
      message: data.message || "Password reset successfully",
      data: data
    };
  } catch (error) {
    return { 
      error: true, 
      message: `An error occurred while resetting password: ${error}`,
      data: null
    };
  }
};

export async function verifyPasswordResetOtp(email: string, otpCode: string) {
  try {
    const res = await fetch(`${process.env.API_BASE_URL}/verify-password-reset-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp_code: otpCode }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      return {
        error: true,
        message: data.message || 'Failed to verify OTP',
        data: null,
      };
    }
    return {
      error: false,
      message: data.message || 'OTP verified successfully',
      data,
    };
  } catch (error) {
    return {
      error: true,
      message: `An error occurred while verifying OTP: ${error}`,
      data: null,
    };
  }
} 