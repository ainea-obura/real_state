"use client";

import 'react-phone-input-2/lib/style.css';

import { AlertTriangle, CheckCircle } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Controller, useForm } from 'react-hook-form';
import PhoneInput from 'react-phone-input-2';
import { toast } from 'sonner';
import { z } from 'zod';

import { createCompany } from '@/actions/company';
import { getCities, getCountries } from '@/actions/misc';
import { Button } from '@/components/ui/button';
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { validateVerificationParamsAction } from '@/lib/verification';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';

interface Country {
  id: string;
  name: string;
}

interface City {
  id: string;
  name: string;
  country_id: string;
}

// CompanyResponse interface removed as it's not used

// File validation
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png"];

// Base schema for API submission
const createCompanySchema = z.object({
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
    .min(1, "Website URL is required")
    .transform((val) => {
      if (!val) return val;
      // Add https:// if no protocol is specified
      if (!val.match(/^https?:\/\//)) {
        return `https://${val}`;
      }
      return val;
    })
    .pipe(z.string().url("Please enter a valid website URL")),

  address: z
    .string()
    .min(1, "Address is required")
    .max(1000, "Address is too long"),

  city: z.string().min(1, "City is required").uuid("Invalid city selection"),

  postalCode: z
    .string()
    .max(100, "Postal code is too long")
    .optional()
    .or(z.literal("")),

  logo: z
    .custom<File>((val) => val instanceof File, {
      message: "Company logo is required",
    })
    .refine((file) => file.size <= MAX_FILE_SIZE, "Logo must be less than 5MB")
    .refine(
      (file) => ACCEPTED_IMAGE_TYPES.includes(file.type),
      "Logo must be a JPEG or PNG file"
    ),
});

// Form schema including UI-only fields
const formSchema = createCompanySchema.extend({
  // Add country field for UI filtering only
  countryId: z.string().min(1, "Please select a country"),
});

type FormValues = z.infer<typeof formSchema>;

export default function CreateCompany() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      website: "",
      address: "",
      countryId: "",
      city: "",
      postalCode: "",
      logo: undefined,
    },
  });

  // Company creation mutation
  const { mutate: createCompanyMutation } = useMutation<
    { isError: boolean; message?: string; data?: unknown },
    Error,
    FormValues
  >({
    mutationFn: async (data) => {
      if (!session?.user?.email) {
        throw new Error("User not authenticated");
      }

      const validatedData = createCompanySchema.parse(prepareFormData(data));

      // Add user_id to the form data
      const formData = new FormData();
      formData.append("user_email", session.user.email);

      // Add other fields
      Object.entries(validatedData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (key === "logo" && value instanceof File) {
            formData.append(key, value);
          } else {
            formData.append(key, String(value));
          }
        }
      });

      return createCompany(formData);
    },
    onSuccess: async (response) => {
      if (response.isError) {
        throw new Error(response.message || "Failed to create company");
      }

      if (
        !response.data ||
        typeof response.data !== "object" ||
        !("id" in response.data)
      ) {
        throw new Error("Invalid company data received");
      }

      toast.success(
        "Company created successfully! Please sign in again to access it.",
        {
          className: "bg-green-600 text-white rounded-lg shadow-lg",
          icon: <CheckCircle size={20} className="text-white" />,
        }
      );

      await new Promise((resolve) => setTimeout(resolve, 2000));
      await signOut({ redirect: false });
      router.push("/sign-in");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create company");
      setIsSubmitting(false);
    },
  });

  // Redirect if user already has a company
  useEffect(() => {
    if (status === "authenticated" && session?.user.company) {
      router.replace("/");
    }
  }, [status, session, router]);

  // Validate token for company creation access
  useEffect(() => {
    const validateAccess = async () => {
      // Only validate token if user is authenticated but doesn't have a company
      if (status === "authenticated" && !session?.user.company) {
        const token = new URLSearchParams(window.location.search).get("token");

        if (token) {
          try {
            const validation = await validateVerificationParamsAction(
              token,
              "company-creation"
            );
            if (!validation.valid) {
              toast.error("Invalid company creation link", {
                className: "bg-red-600 text-white rounded-lg shadow-lg",
                icon: <AlertTriangle size={20} className="text-white" />,
              });
              router.replace("/sign-in");
            }
          } catch {
            toast.error("Invalid company creation link", {
              className: "bg-red-600 text-white rounded-lg shadow-lg",
              icon: <AlertTriangle size={20} className="text-white" />,
            });
            router.replace("/sign-in");
          }
        }
        // If no token but authenticated without company, allow access (normal flow)
      }
    };

    validateAccess();
  }, [status, session, router]);

  // Fetch countries
  const { data: countries, isLoading: loadingCountries } = useQuery({
    queryKey: ["countries"],
    queryFn: async (): Promise<Country[]> =>
      getCountries().then((r) => {
        if (r.isError) throw new Error("Failed to load countries");
        return r.data;
      }),
    staleTime: 5 * 60 * 1000,
  });

  // Watch selected country ID for city filtering
  const selectedCountryId = form.watch("countryId");

  // Fetch cities for selected country
  const { data: cities, isLoading: loadingCities } = useQuery({
    queryKey: ["cities", selectedCountryId],
    queryFn: async (): Promise<City[]> =>
      getCities(selectedCountryId!).then((r) => {
        if (r.isError) throw new Error("Failed to load cities");
        return r.data;
      }),
    enabled: !!selectedCountryId,
    staleTime: 5 * 60 * 1000,
  });

  // Dropzone: enforce image + size
  const onDrop = useCallback(
    (files: File[]) => {
      const file = files[0];

      // Validate file
      if (!file) {
        toast.error("Please select a logo file");
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast.error("Logo must be less than 5MB");
        return;
      }

      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        toast.error("Logo must be a JPEG or PNG file");
        return;
      }

      form.setValue("logo", file, { shouldDirty: true });
      setLogoPreview(URL.createObjectURL(file));
    },
    [form]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { "image/png": [], "image/jpeg": [], "image/jpg": [] },
    maxFiles: 1,
  });

  // Clean up preview URL
  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  const countryOptions = useMemo(() => countries ?? [], [countries]);
  const cityOptions = useMemo(() => cities ?? [], [cities]);

  if (status === "loading") return <p>Loading…</p>;

  // Prepare form data for submission by removing UI-only fields
  const prepareFormData = (data: FormValues) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { countryId, ...submitData } = data;
    return submitData;
  };

  const onSubmit = (data: FormValues) => {
    setIsSubmitting(true);
    createCompanyMutation(data);
  };

  // Fix the logo removal
  const handleLogoRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    form.setValue("logo", undefined as unknown as File, { shouldDirty: true });
    setLogoPreview(null);
  };

  return (
    <div className="mx-auto p-4 w-full max-w-4xl">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          {/* Logo Upload */}
          <FormField
            name="logo"
            control={form.control}
            render={() => (
              <FormItem>
                <FormLabel className="font-medium text-gray-700 text-sm">
                  Company Logo
                </FormLabel>
                <FormControl>
                  <div
                    {...getRootProps()}
                    className={`
                      relative group overflow-hidden
                      p-8 border-2 border-dashed rounded-xl transition-all duration-300 ease-in-out
                      ${
                        logoPreview
                          ? "border-blue-200 bg-blue-50/10 hover:bg-blue-50/20"
                          : "border-gray-200 bg-gray-50/50 hover:bg-gray-50"
                      }
                      cursor-pointer flex flex-col items-center justify-center gap-4
                    `}
                    role="button"
                    tabIndex={0}
                  >
                    <input {...getInputProps()} />
                    {logoPreview ? (
                      <>
                        <div className="relative shadow-sm group-hover:shadow rounded-lg w-32 h-32 overflow-hidden transition-shadow duration-300">
                          <Image
                            src={logoPreview}
                            alt="Logo preview"
                            fill
                            className="object-cover"
                          />
                          <div className="absolute inset-0 flex justify-center items-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <p className="font-medium text-white text-sm">
                              Change Logo
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleLogoRemove}
                          className="text-red-500 hover:text-red-600 text-sm transition-colors duration-200"
                        >
                          Remove Logo
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-center items-center bg-blue-50 rounded-full w-16 h-16 group-hover:scale-110 transition-transform duration-300">
                          <svg
                            className="w-8 h-8 text-blue-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                        <div className="space-y-1 text-center">
                          <p className="font-medium text-gray-700 text-sm">
                            Drop your logo here, or{" "}
                            <span className="text-blue-500">browse</span>
                          </p>
                          <p className="text-gray-500 text-xs">
                            PNG or JPG (max 5MB)
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Basic Info */}
          <div className="gap-4 grid grid-cols-1 md:grid-cols-2 mt-8">
            {(["name", "email", "website"] as const).map((field) => (
              <FormField
                key={field}
                name={field}
                control={form.control}
                render={({ field: f }) => (
                  <FormItem className="w-full">
                    <FormLabel className="capitalize">{field}</FormLabel>
                    <FormControl>
                      <Input
                        {...f}
                        type={field === "email" ? "email" : "text"}
                        placeholder={`Enter ${field}`}
                        disabled={isSubmitting}
                        className="w-full h-11"
                      />
                    </FormControl>
                    <div className="h-[18px]">
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            ))}

            {/* Phone Field with PhoneInput */}
            <FormField
              name="phone"
              control={form.control}
              render={() => (
                <FormItem className="w-full">
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Controller
                      name="phone"
                      control={form.control}
                      render={({ field }) => (
                        <PhoneInput
                          country={"ke"}
                          value={field.value}
                          onChange={field.onChange}
                          inputClass="w-full h-11"
                          inputStyle={{ width: "100%", height: "44px" }}
                          specialLabel=""
                          disabled={isSubmitting}
                          enableSearch={true}
                          searchPlaceholder="Search country"
                        />
                      )}
                    />
                  </FormControl>
                  <div className="h-[18px]">
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
          </div>

          {/* Address */}
          <FormField
            name="address"
            control={form.control}
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Street Address</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Enter street address"
                    className="w-full !h-11"
                  />
                </FormControl>
                <div className="h-[18px]">
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          {/* Country / City / Postal */}
          <div className="gap-2 grid grid-cols-1 md:grid-cols-2">
            <FormField
              name="countryId"
              control={form.control}
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Country</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        form.setValue("city", "");
                      }}
                      disabled={loadingCountries}
                    >
                      <SelectTrigger className="w-full !h-11">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent className="w-full">
                        {countryOptions.map((country: Country) => (
                          <SelectItem key={country.id} value={country.id}>
                            {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <div className="h-[18px]">
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            <FormField
              name="city"
              control={form.control}
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!selectedCountryId || loadingCities}
                    >
                      <SelectTrigger className="w-full !h-11">
                        <SelectValue placeholder="Select city" />
                      </SelectTrigger>
                      <SelectContent className="w-full">
                        {cityOptions.map((city: City) => (
                          <SelectItem key={city.id} value={city.id}>
                            {city.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <div className="h-[18px]">
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            <FormField
              name="postalCode"
              control={form.control}
              render={({ field }) => (
                <FormItem className="col-span-2 w-full">
                  <FormLabel>Postal Code</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter postal code"
                      className="w-full !h-11"
                    />
                  </FormControl>
                  <div className="h-[18px]">
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
          </div>

          {/* Submit */}
          <div className="text-right">
            <Button type="submit" disabled={isSubmitting} className="h-11">
              {isSubmitting ? "Creating…" : "Create Company"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
