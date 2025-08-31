"use server";
const API_BASE_URL = process.env.API_BASE_URL;

export const sigUpAction = async (data: {
  email: string;
  password: string;
}) => {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/signup/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const response = await res.json();
    return response;
  } catch (error) {
    return {
      error: true,
      message: `An error occurred while signing up ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
};
