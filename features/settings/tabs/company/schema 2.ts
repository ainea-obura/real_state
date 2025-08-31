import { z } from 'zod';

export const companyFormSchema = z.object({
  name: z
    .string()
    .min(1, "Company name is required")
    .max(250, "Company name cannot exceed 250 characters"),

  phone: z
    .string()
    .min(1, "Phone number is required")
    .max(250, "Phone number cannot exceed 250 characters"),

  email: z.string().min(1, "Email is required").email("Invalid email address"),

  website: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return val;
      // Add https:// if no protocol is specified
      if (!val.match(/^https?:\/\//)) {
        return `https://${val}`;
      }
      return val;
    })
    .pipe(z.string().url("Please enter a valid website URL").optional()),

  address: z.string().max(1000, "Address is too long").optional(),

  countryId: z.string().min(1, "Please select a country"),

  city: z
    .string()
    .optional()
    .transform((val) => {
      if (!val || val === "") return undefined;
      return val;
    })
    .pipe(z.string().uuid("Invalid city selection").optional()),

  postal_code: z.string().max(100, "Postal code is too long").optional(),

  logo: z
    .custom<File>((val) => val instanceof File, {
      message: "Invalid file type",
    })
    .refine(
      (file) => !file || file.size <= 5 * 1024 * 1024,
      "Logo must be less than 5MB"
    )
    .refine(
      (file) =>
        !file || ["image/jpeg", "image/jpg", "image/png"].includes(file.type),
      "Logo must be a JPEG or PNG file"
    )
    .optional(),

  // User fields
  user_first_name: z
    .string()
    .min(1, "First name is required")
    .max(150, "First name cannot exceed 150 characters"),

  user_last_name: z
    .string()
    .min(1, "Last name is required")
    .max(150, "Last name cannot exceed 150 characters"),

  user_phone: z
    .string()
    .min(1, "User phone number is required")
    .max(50, "User phone number cannot exceed 50 characters"),

  user_email: z
    .string()
    .min(1, "User email is required")
    .email("Invalid user email address"),
});

export type CompanyFormValues = z.infer<typeof companyFormSchema>;

// Backend data types (matching the API response)
export interface Country {
  id: string;
  name: string;
}

export interface City {
  id: string;
  name: string;
  country_id: string;
}

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
}

export interface CompanyData {
  id: string;
  name: string;
  phone: string;
  email: string;
  website?: string;
  address?: string;
  city?: {
    id: string;
    name: string;
  };
  country?: {
    id: string;
    name: string;
  };
  city_name?: string;
  postal_code?: string;
  logo?: string;
  status: "active" | "inactive" | "pending";
  created_at: string;
  updated_at: string;
  user?: User;
}

// KYC File Upload Schema
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
];

export const kycFileSchema = z.object({
  cr12: z
    .custom<File>((val) => val instanceof File, {
      message: "C-R 12 file is required",
    })
    .refine((file) => file.size <= MAX_FILE_SIZE, "File must be less than 1MB")
    .refine(
      (file) => ACCEPTED_FILE_TYPES.includes(file.type),
      "File must be a PDF, JPEG, or PNG file"
    )
    .optional(),

  proofOfAddress: z
    .custom<File>((val) => val instanceof File, {
      message: "Proof of Address file is required",
    })
    .refine((file) => file.size <= MAX_FILE_SIZE, "File must be less than 1MB")
    .refine(
      (file) => ACCEPTED_FILE_TYPES.includes(file.type),
      "File must be a PDF, JPEG, or PNG file"
    )
    .optional(),

  boardResolution: z
    .custom<File>((val) => val instanceof File, {
      message: "Board Resolution file is required",
    })
    .refine((file) => file.size <= MAX_FILE_SIZE, "File must be less than 1MB")
    .refine(
      (file) => ACCEPTED_FILE_TYPES.includes(file.type),
      "File must be a PDF, JPEG, or PNG file"
    )
    .optional(),

  kraPin: z
    .custom<File>((val) => val instanceof File, {
      message: "KRA PIN file is required",
    })
    .refine((file) => file.size <= MAX_FILE_SIZE, "File must be less than 1MB")
    .refine(
      (file) => ACCEPTED_FILE_TYPES.includes(file.type),
      "File must be a PDF, JPEG, or PNG file"
    )
    .optional(),

  certificateOfIncorporation: z
    .custom<File>((val) => val instanceof File, {
      message: "Certificate of Incorporation file is required",
    })
    .refine((file) => file.size <= MAX_FILE_SIZE, "File must be less than 1MB")
    .refine(
      (file) => ACCEPTED_FILE_TYPES.includes(file.type),
      "File must be a PDF, JPEG, or PNG file"
    )
    .optional(),

  bankConfirmationLetter: z
    .custom<File>((val) => val instanceof File, {
      message: "Bank Confirmation Letter file is required",
    })
    .refine((file) => file.size <= MAX_FILE_SIZE, "File must be less than 1MB")
    .refine(
      (file) => ACCEPTED_FILE_TYPES.includes(file.type),
      "File must be a PDF, JPEG, or PNG file"
    )
    .optional(),

  taxComplianceCertificate: z
    .custom<File>((val) => val instanceof File, {
      message: "Tax Compliance Certificate file is required",
    })
    .refine((file) => file.size <= MAX_FILE_SIZE, "File must be less than 1MB")
    .refine(
      (file) => ACCEPTED_FILE_TYPES.includes(file.type),
      "File must be a PDF, JPEG, or PNG file"
    )
    .optional(),

  // Directors KYC Schema
  directorsKyc: z.array(z.object({
    directorKraPinNumber: z.string().min(1, "Director KRA PIN Number is required"),
    directorIdCardFront: z
      .custom<File>((val) => val instanceof File, {
        message: "Director ID Card Front is required",
      })
      .refine((file) => file.size <= MAX_FILE_SIZE, "File must be less than 1MB")
      .refine(
        (file) => ACCEPTED_FILE_TYPES.includes(file.type),
        "File must be a PDF, JPEG, or PNG file"
      ),
    directorIdCardBack: z
      .custom<File>((val) => val instanceof File, {
        message: "Director ID Card Back is required",
      })
      .refine((file) => file.size <= MAX_FILE_SIZE, "File must be less than 1MB")
      .refine(
        (file) => ACCEPTED_FILE_TYPES.includes(file.type),
        "File must be a PDF, JPEG, or PNG file"
      ),
    directorKraPin: z
      .custom<File>((val) => val instanceof File, {
        message: "Director KRA PIN is required",
      })
      .refine((file) => file.size <= MAX_FILE_SIZE, "File must be less than 1MB")
      .refine(
        (file) => ACCEPTED_FILE_TYPES.includes(file.type),
        "File must be a PDF, JPEG, or PNG file"
      ),
  })).optional(),
});

export type KYCFormValues = z.infer<typeof kycFileSchema>;

export interface KYCFileData {
  id: string;
  cr12?: string;
  proofOfAddress?: string;
  boardResolution?: string;
  kraPin?: string;
  certificateOfIncorporation?: string;
  bankConfirmationLetter?: string;
  taxComplianceCertificate?: string;
  directorsKyc?: Array<{
    directorKraPinNumber: string;
    directorIdCardFront: string;
    directorIdCardBack: string;
    directorKraPin: string;
  }>;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
}
