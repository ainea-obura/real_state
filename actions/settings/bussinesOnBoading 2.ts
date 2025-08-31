"use server";

import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';

const API_BASE_URL = process.env.API_BASE_URL;

const API_COUNTRIES = "https://sandbox.sasapay.app/api/v2/waas/countries/";
const API_SUB_REGIONS =
  "https://sandbox.sasapay.app/api/v2/waas/countries/sub-regions/";

const API_INDUSTRIES = "https://sandbox.sasapay.app/api/v2/waas/industries/";

const API_SUB_INDUSTRIES =
  " https://sandbox.sasapay.app/api/v2/waas/sub-industries/";

const API_BUSSINES_TYPES =
  "https://sandbox.sasapay.app/api/v2/waas/business-types/";

const API_PRODUCTS_TYPES = "https://sandbox.sasapay.app/api/v2/waas/products/";

const API_GET_TOKEN =
  "https://sandbox.sasapay.app/api/v1/auth/token/?grant_type=client_credentials";

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

export const getToken = async () => {
  const credentials = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);

  const requestOptions = {
    method: "GET",
    headers: {
      Authorization: `Basic ${credentials}`,
    },
  };

  const response = await fetch(API_GET_TOKEN, requestOptions);
  const data = await response.json();
  return data.access_token;
};

export const getCountries = async () => {
  const token = await getToken();
  if (!token) {
    throw new Error("No token");
  }

  const response = await fetch(API_COUNTRIES, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const responseData = await response.json();
  return responseData;
};

export const getSubRegions = async ({ countryId }: { countryId: string }) => {
  const token = await getToken();
  if (!token) {
    throw new Error("No token");
  }

  // Map country ID to calling code
  const countryCallingCodeMap: { [key: string]: string } = {
    "2": "254", // Kenya
    "8": "256", // Uganda
    // Add more countries as needed
  };

  const callingCode = countryCallingCodeMap[countryId];
  if (!callingCode) {
    throw new Error(`No calling code found for country ID: ${countryId}`);
  }

  const response = await fetch(
    `${API_SUB_REGIONS}?callingCode=${callingCode}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  const responseData = await response.json();
  return responseData;
};

export const getBusinessTypes = async () => {
  const token = await getToken();
  if (!token) {
    throw new Error("No token");
  }

  const response = await fetch(API_BUSSINES_TYPES, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const responseData = await response.json();
  return responseData;
};

export const getIndustries = async () => {
  const token = await getToken();
  if (!token) {
    throw new Error("No token");
  }

  const response = await fetch(API_INDUSTRIES, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const responseData = await response.json();
  return responseData;
};

export const getSubIndustries = async ({
  subIndustryId,
}: {
  subIndustryId: string;
}) => {
  const token = await getToken();
  if (!token) {
    throw new Error("No token");
  }

  const response = await fetch(
    `${API_SUB_INDUSTRIES}?industryId=${subIndustryId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  const responseData = await response.json();
  return responseData;
};

export const getProductsTypes = async () => {
  const token = await getToken();
  if (!token) {
    throw new Error("No token");
  }

  const response = await fetch(API_PRODUCTS_TYPES, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const responseData = await response.json();
  return responseData;
};

// Business Onboarding Actions

// --- Action: submitBusinessOnboarding ---
export interface BusinessOnboardingPayload {
  merchantCode: string;
  businessName: string;
  billNumber?: string;
  description: string;
  productType: number;
  countryId: string;
  subregionId: string;
  industryId: string;
  subIndustryId: string;
  bankId: string;
  bankAccountNumber: string;
  mobileNumber: string;
  businessTypeId: string;
  email: string;
  registrationNumber: string;
  kraPin: string;
  referralCode: string;
  dealerNumber: string;
  purpose: string;
  natureOfBusiness: string;
  physicalAddress: string;
  estimatedMonthlyTransactionAmount: number;
  estimatedMonthlyTransactionCount: number;
  callbackUrl?: string;
  directors: Array<{
    directorName: string;
    directorIdnumber: string;
    directorMobileNumber: string;
    directorKraPin: string;
    directorDocumentType: string;
    directorCountryCode: string;
  }>;
}

export const submitBusinessOnboarding = async (
  payload: BusinessOnboardingPayload
): Promise<{
  error: boolean;
  message?: string;
  data?: { company_id: number; user_id: number; submission_status: string };
}> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;

  if (!token) {
    return { error: true, message: "Authentication required" };
  }

  const response = await fetch(
    `${API_BASE_URL}/companies/business-onboarding/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }
  );

  let data;
  try {
    data = await response.json();
  } catch {
    data = { error: true, message: "Failed to parse response" };
  }

  if (!response.ok) {
    return {
      error: true,
      message: data?.message || "Failed to submit business onboarding data",
    };
  }

  if (!data || typeof data !== "object") {
    return {
      error: true,
      message: "Invalid response from business onboarding API",
    };
  }

  return data;
};

// --- Action: getBusinessOnboarding ---
export const getBusinessOnboarding = async (): Promise<{
  error: boolean;
  message?: string;
  data?: {
    // Basic fields
    id: string;
    company_id: number;
    user_id: number;
    submitted_at: string;
    status: boolean;
    responseCode: string;
    message: string;
    // Business Account Information
    requestId: string;
    merchantCode: string;
    accountNumber: string;
    displayName: string;
    accountStatus: string;
    accountBalance: number;
    otp: string;
    // Business Information
    businessName: string;
    billNumber?: string;
    description: string;
    productType: number;
    countryId: string;
    subregionId: string;
    industryId: string;
    subIndustryId: string;
    bankId: string;
    bankAccountNumber: string;
    mobileNumber: string;
    businessTypeId: string;
    email: string;
    registrationNumber: string;
    kraPin: string;
    referralCode: string;
    dealerNumber: string;
    purpose: string;
    natureOfBusiness: string;
    physicalAddress: string;
    estimatedMonthlyTransactionAmount: number;
    estimatedMonthlyTransactionCount: number;
    callbackUrl?: string;
    directors: Array<{
      directorName: string;
      directorIdnumber: string;
      directorMobileNumber: string;
      directorKraPin: string;
      directorDocumentType: string;
      directorCountryCode: string;
    }>;
  };
}> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;

  if (!token) {
    return { error: true, message: "Authentication required" };
  }

  const response = await fetch(
    `${API_BASE_URL}/companies/business-onboarding/get/`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  let data;
  try {
    data = await response.json();
  } catch {
    data = { error: true, message: "Failed to parse response" };
  }

  if (!response.ok) {
    return {
      error: true,
      message: data?.message || "Failed to fetch business onboarding data",
    };
  }

  if (!data || typeof data !== "object") {
    return {
      error: true,
      message: "Invalid response from business onboarding API",
    };
  }

  return data;
};

// --- Action: confirmBusinessOnboardingOTP ---
export const confirmBusinessOnboardingOTP = async (
  otp: string
): Promise<{
  error: boolean;
  message?: string;
  data?: {
    requestId: string;
    status: boolean;
    message: string;
    accountStatus: string;
    merchantCode: string;
    accountNumber: string;
    displayName: string;
    accountBalance: number;
  };
}> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;

  if (!token) {
    return { error: true, message: "Authentication required" };
  }

  const response = await fetch(
    `${API_BASE_URL}/companies/business-onboarding/confirm-otp/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ otp }),
    }
  );

  let data;
  try {
    data = await response.json();
  } catch {
    data = { error: true, message: "Failed to parse response" };
  }

  if (!response.ok) {
    return {
      error: true,
      message: data?.message || "Failed to confirm OTP",
    };
  }

  if (!data || typeof data !== "object") {
    return {
      error: true,
      message: "Invalid response from OTP confirmation API",
    };
  }

  return data;
};

// --- Action: submitKYCToSasaPay ---
export const submitKYCToSasaPay = async (
  companyId: string
): Promise<{
  error: boolean;
  message?: string;
  data?: {
    message: string;
    company_documents_count: number;
    director_documents_count: number;
    total_documents: number;
  };
}> => {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;

  if (!token) {
    return { error: true, message: "Authentication required" };
  }

  console.log("Submitting KYC to SasaPay for company:", companyId);

  const response = await fetch(
    `${API_BASE_URL}/documents/kyc/companies/${companyId}/submit-to-sasapay/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  let data;
  try {
    data = await response.json();
  } catch {
    data = { error: true, message: "Failed to parse response" };
  }

  if (!response.ok) {
    return {
      error: true,
      message: data?.message || "Failed to submit KYC to SasaPay",
    };
  }

  if (!data || typeof data !== "object") {
    return {
      error: true,
      message: "Invalid response from KYC submission API",
    };
  }

  console.log("KYC submission response:", data);
  return data;
};
