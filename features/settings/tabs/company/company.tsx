"use client";

import 'react-phone-input-2/lib/style.css';

import { AlertCircle, Building2, CreditCard, Edit3, Save, Shield, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Controller, useForm } from 'react-hook-form';
import PhoneInput from 'react-phone-input-2';
import { toast } from 'sonner';

import { getCurrentUserCompany, updateCompany } from '@/actions/company';
import { getKYCCompanyDocuments } from '@/actions/company/kyc';
import { getCities, getCountries } from '@/actions/misc';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import CompanyAccounts, { CompanyAccountsRef } from './CompanyAccounts';
import KYCDocuments from './KYCDocuments';
import KYCUploadModal from './KYCUploadModal';
import { City, CompanyData, companyFormSchema, CompanyFormValues, Country } from './schema';

const Company = () => {
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isKYCModalOpen, setIsKYCModalOpen] = useState(false);
  const [existingKYCData, setExistingKYCData] = useState<any>(null);
  const companyAccountsRef = useRef<CompanyAccountsRef>(null);

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      website: "",
      address: "",
      countryId: "",
      city: "",
      postal_code: "",
      logo: undefined,
      user_first_name: "",
      user_last_name: "",
      user_phone: "",
      user_email: "",
    },
  });

  // Check if user is company type
  const isCompanyUser = session?.user?.type === "company";

  // Fetch current user's company data
  const {
    data: companyData,
    isLoading: loadingCompany,
    error: companyError,
  } = useQuery({
    queryKey: ["company", "current"],
    queryFn: async (): Promise<CompanyData> => {
      const result = await getCurrentUserCompany();
      if (result.isError)
        throw new Error(result.message || "Failed to load company");
      if (!result.data) throw new Error("No company data received");

      // Transform backend data to match frontend interface
      const transformedData: CompanyData = {
        id: result.data.id,
        name: result.data.name,
        phone: result.data.phone,
        email: result.data.email,
        website: result.data.website,
        address: result.data.address,
        city: result.data.city,
        country: result.data.country,
        postal_code: result.data.postal_code,
        logo: result.data.logo,
        status: result.data.status as "active" | "inactive" | "pending",
        created_at: result.data.created_at,
        updated_at: result.data.updated_at,
        user: result.data.user,
      };

      return transformedData;
    },
    enabled: !!isCompanyUser,
    staleTime: 5 * 60 * 1000,
    retry: false, // Don't retry on error
  });

  // Fetch countries
  const { data: countries, isLoading: loadingCountries } = useQuery({
    queryKey: ["countries"],
    queryFn: async (): Promise<Country[]> =>
      getCountries().then((r) => {
        if (r.isError) throw new Error("Failed to load countries");
        return r.data;
      }),
    enabled: true, // Always fetch countries
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

  // Use React Query to fetch KYC data (after company data is available)
  const {
    data: kycData,
    isLoading: loadingKYC,
    error: kycError,
    refetch: refetchKYC,
  } = useQuery({
    queryKey: ["kyc", "company", companyData?.id],
    queryFn: async () => {
      if (!companyData?.id) return null;
      const response = await getKYCCompanyDocuments(companyData.id);
      if (response.isError) {
        throw new Error(response.message || "Failed to fetch KYC data");
      }
      return response.data;
    },
    enabled: !!companyData?.id && !loadingCompany,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Function to open KYC modal using React Query data
  const handleOpenKYCModal = (existingDocuments?: unknown) => {
    console.log("handleOpenKYCModal called with:", {
      existingDocuments,
      kycData,
      loadingKYC,
      kycError,
    });

    // Always open the modal, no matter what
    setExistingKYCData(existingDocuments || kycData);
    setIsKYCModalOpen(true);
    console.log("Modal state set:", {
      isKYCModalOpen: true,
      existingKYCData: existingDocuments || kycData,
    });
  };

  // Set initial country and city when entering edit mode
  useEffect(() => {
    if (isEditing && countries && companyData?.country && companyData?.city) {
      // Set the country ID from the company's country data
      form.setValue("countryId", companyData.country.id);

      // Set the city ID from the company's city data
      form.setValue("city", companyData.city.id);

      // Force form to update
      form.trigger("countryId");
      form.trigger("city");
    }
  }, [isEditing, countries, companyData, form]);

  // Handle country selection when countries load after edit mode is activated
  useEffect(() => {
    if (
      isEditing &&
      countries &&
      companyData?.country &&
      !form.getValues("countryId")
    ) {
      form.setValue("countryId", companyData.country.id);
      form.setValue("city", companyData.city?.id || "");
      form.trigger("countryId");
      form.trigger("city");
    }
  }, [isEditing, countries, companyData, form]);

  // Update form when company data changes
  useEffect(() => {
    if (companyData) {
      form.reset({
        name: companyData.name,
        phone: companyData.phone,
        email: companyData.email,
        website: companyData.website || "",
        address: companyData.address || "",
        countryId: form.getValues("countryId") || "",
        city: companyData.city?.id || "",
        postal_code: companyData.postal_code || "",
        logo: undefined,
        user_first_name: companyData.user?.first_name || "",
        user_last_name: companyData.user?.last_name || "",
        user_phone: companyData.user?.phone || "",
        user_email: companyData.user?.email || "",
      });
    }
  }, [companyData, form]);

  // Show toast error when company data fails to load
  useEffect(() => {
    if (companyError) {
      toast.error(companyError.message || "Failed to load company information");
    }
  }, [companyError]);

  // Real update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: CompanyFormValues) => {
      if (!companyData?.id) {
        throw new Error("Company ID not found");
      }

      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("phone", data.phone);
      formData.append("email", data.email);
      formData.append("website", data.website || "");
      formData.append("address", data.address || "");
      formData.append("city", data.city || "");
      formData.append("postal_code", data.postal_code || "");

      // Add user fields
      formData.append("user_first_name", data.user_first_name);
      formData.append("user_last_name", data.user_last_name);
      formData.append("user_phone", data.user_phone);
      formData.append("user_email", data.user_email);

      if (data.logo) {
        formData.append("logo", data.logo);
      }

      const result = await updateCompany(companyData.id, formData);

      if (result.isError) {
        throw new Error(result.message || "Failed to update company");
      }
      return result.data;
    },
    onSuccess: () => {
      setIsEditing(false);
      setLogoPreview(null);
      toast.success("Company information updated successfully!");
      // Refetch company data
      queryClient.invalidateQueries({ queryKey: ["company", "current"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update company information");
    },
  });

  // Dropzone for logo upload
  const onDrop = (files: File[]) => {
    const file = files[0];
    if (file) {
      form.setValue("logo", file, { shouldDirty: true });
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { "image/png": [], "image/jpeg": [], "image/jpg": [] },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  // Clean up preview URL
  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  const handleEdit = () => {
    setIsEditing(true);
    // Ensure countries are fetched when entering edit mode
    queryClient.prefetchQuery({
      queryKey: ["countries"],
      queryFn: async (): Promise<Country[]> =>
        getCountries().then((r) => {
          if (r.isError) throw new Error("Failed to load countries");
          return r.data;
        }),
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setLogoPreview(null);
    if (companyData) {
      form.reset({
        name: companyData.name,
        phone: companyData.phone,
        email: companyData.email,
        website: companyData.website || "",
        address: companyData.address || "",
        countryId: companyData.country?.id || "",
        city: companyData.city?.id || "",
        postal_code: companyData.postal_code || "",
        logo: undefined,
        user_first_name: companyData.user?.first_name || "",
        user_last_name: companyData.user?.last_name || "",
        user_phone: companyData.user?.phone || "",
        user_email: companyData.user?.email || "",
      });
    }
  };

  const onSubmit = (data: CompanyFormValues) => {
    updateMutation.mutate(data);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "inactive":
        return "bg-red-100 text-red-800 border-red-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Memoized options for better performance
  const countryOptions = useMemo(() => countries ?? [], [countries]);
  const cityOptions = useMemo(() => cities ?? [], [cities]);

  // Show loading state while session is loading
  if (status === "loading") {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="mx-auto border-primary border-b-2 rounded-full w-8 h-8 animate-spin"></div>
          <p className="mt-2 text-gray-600">Loading session...</p>
        </div>
      </div>
    );
  }

  // Check if user is not a company user
  if (!isCompanyUser) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 w-12 h-12 text-gray-400" />
          <p className="text-gray-600">
            Company settings are only available for company users.
          </p>
        </div>
      </div>
    );
  }

  // Show error state if company data failed to load
  if (companyError) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 w-12 h-12 text-red-400" />
          <p className="mb-2 font-medium text-red-600">
            Failed to load company information
          </p>
          <p className="text-gray-600 text-sm">{companyError.message}</p>
        </div>
      </div>
    );
  }

  // Show loading state while company data is loading
  if (loadingCompany || !companyData) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="mx-auto border-primary border-b-2 rounded-full w-8 h-8 animate-spin"></div>
          <p className="mt-2 text-gray-600">Loading company information...</p>
        </div>
      </div>
    );
  }

  // At this point, companyData is guaranteed to be defined
  const company = companyData!;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-bold text-gray-900 text-2xl">Company Settings</h2>
          <p className="mt-1 text-gray-600">
            Manage your company information and profile
          </p>
        </div>
        {!isEditing && (
          <div className="flex items-center gap-3">
            <Button
              onClick={handleOpenKYCModal}
              variant="outline"
              className="flex items-center gap-2"
              disabled={loadingKYC}
            >
              {loadingKYC ? (
                <div className="border-2 border-white border-t-transparent rounded-full w-4 h-4 animate-spin" />
              ) : (
                <Shield className="w-4 h-4" />
              )}
              Upload KYC
            </Button>
            <Button
              onClick={() => {
                companyAccountsRef.current?.openAddModal();
              }}
              variant="outline"
              className="flex items-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              Add Account
            </Button>
            <Button onClick={handleEdit} className="flex items-center gap-2">
              <Edit3 className="w-4 h-4" />
              Edit Company
            </Button>
          </div>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Company Overview Card */}
          <Card className="overflow-hidden">
            <CardHeader className="border-b">
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-6">
                  {/* Logo Section */}
                  <div className="space-y-3">
                    <div className="relative">
                      {isEditing ? (
                        <div
                          {...getRootProps()}
                          className={`flex justify-center items-center w-32 h-32 bg-white rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer ${
                            logoPreview
                              ? "border-blue-400 shadow-lg bg-blue-50/20"
                              : "border-gray-300 hover:border-blue-400 hover:bg-blue-50/10"
                          }`}
                        >
                          <input {...getInputProps()} />
                          {logoPreview ? (
                            <div className="relative w-full h-full">
                              <Image
                                src={logoPreview}
                                alt="Logo preview"
                                fill
                                className="rounded-xl object-cover"
                              />
                              <div className="absolute inset-0 flex justify-center items-center bg-black/40 opacity-0 hover:opacity-100 rounded-xl transition-opacity duration-300">
                                <div className="text-white text-center">
                                  <div className="font-medium text-sm">
                                    Change Logo
                                  </div>
                                  <div className="opacity-90 text-xs">
                                    Click to upload new
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : company?.logo ? (
                            <div className="relative w-full h-full">
                              <Image
                                src={company.logo}
                                alt="Company logo"
                                fill
                                className="rounded-xl object-cover"
                              />
                              <div className="absolute inset-0 flex justify-center items-center bg-black/40 opacity-0 hover:opacity-100 rounded-xl transition-opacity duration-300">
                                <div className="text-white text-center">
                                  <div className="font-medium text-sm">
                                    Change Logo
                                  </div>
                                  <div className="opacity-90 text-xs">
                                    Click to upload new
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center">
                              <Building2 className="mx-auto mb-2 w-12 h-12 text-gray-400" />
                              <div className="text-gray-500 text-sm">
                                Click to upload logo
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="relative bg-white shadow-sm border-2 border-gray-200 rounded-xl w-32 h-32 overflow-hidden">
                          {company?.logo ? (
                            <Image
                              src={company.logo}
                              alt="Company logo"
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex justify-center items-center w-full h-full">
                              <Building2 className="w-12 h-12 text-gray-400" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {isEditing && (
                      <div className="text-center">
                        <div className="mb-1 text-gray-500 text-xs">
                          PNG, JPG up to 5MB
                        </div>
                        {logoPreview && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              form.setValue(
                                "logo",
                                undefined as unknown as File,
                                { shouldDirty: true }
                              );
                              setLogoPreview(null);
                            }}
                            className="hover:bg-red-50 text-red-600 hover:text-red-700"
                          >
                            Remove Logo
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Company Info */}
                  <div className="space-y-3">
                    <div>
                      <CardTitle className="font-bold text-gray-900 text-2xl">
                        {isEditing ? (
                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="Company name"
                                    className={`p-0 text-2xl font-bold bg-transparent border-0 focus-visible:ring-0 ${
                                      isEditing
                                        ? "px-2 py-1 rounded border-b-2 border-blue-300 bg-blue-50/20"
                                        : ""
                                    }`}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ) : (
                          company.name
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={getStatusColor(company.status)}>
                          {company.status.charAt(0).toUpperCase() +
                            company.status.slice(1)}
                        </Badge>
                        <span className="text-gray-500 text-sm">
                          Member since {formatDate(company.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                {isEditing && (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                      disabled={updateMutation.isPending}
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      {updateMutation.isPending ? (
                        <>
                          <div className="border-2 border-white border-t-transparent rounded-full w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="gap-6 grid grid-cols-1 lg:grid-cols-3">
                {/* Column 1 */}
                <div className="space-y-6">
                  <div className="flex flex-col">
                    <span className="mb-2 font-semibold text-gray-700 text-sm">
                      Email
                    </span>
                    {isEditing ? (
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                {...field}
                                type="email"
                                placeholder="Enter email address"
                                className={`transition-all duration-200 ${
                                  isEditing
                                    ? "border-blue-300 bg-blue-50/20 focus:border-blue-500"
                                    : ""
                                }`}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : (
                      <span className="text-gray-900">{companyData.email}</span>
                    )}
                  </div>

                  <div className="flex flex-col">
                    <span className="mb-2 font-semibold text-gray-700 text-sm">
                      Phone
                    </span>
                    {isEditing ? (
                      <FormField
                        control={form.control}
                        name="phone"
                        render={() => (
                          <FormItem>
                            <FormControl>
                              <Controller
                                name="phone"
                                control={form.control}
                                render={({ field }) => (
                                  <PhoneInput
                                    country={"ke"}
                                    value={field.value}
                                    onChange={field.onChange}
                                    inputClass={`transition-all duration-200 ${
                                      isEditing
                                        ? "border-blue-300 bg-blue-50/20 focus:border-blue-500"
                                        : ""
                                    }`}
                                    inputStyle={{
                                      border: isEditing
                                        ? "1px solid #93c5fd"
                                        : "1px solid #d1d5db",
                                      background: isEditing
                                        ? "rgba(219, 234, 254, 0.2)"
                                        : "transparent",
                                    }}
                                    specialLabel=""
                                    disabled={updateMutation.isPending}
                                    enableSearch={true}
                                    searchPlaceholder="Search country"
                                  />
                                )}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : (
                      <span className="text-gray-900">{companyData.phone}</span>
                    )}
                  </div>

                  <div className="flex flex-col">
                    <span className="mb-2 font-semibold text-gray-700 text-sm">
                      Website
                    </span>
                    {isEditing ? (
                      <FormField
                        control={form.control}
                        name="website"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Enter website URL"
                                className={`transition-all duration-200 ${
                                  isEditing
                                    ? "border-blue-300 bg-blue-50/20 focus:border-blue-500"
                                    : ""
                                }`}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : (
                      <span className="text-gray-900">
                        {companyData.website ? (
                          <a
                            href={companyData.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline"
                          >
                            {companyData.website}
                          </a>
                        ) : (
                          "Not specified"
                        )}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col">
                    <span className="mb-2 font-semibold text-gray-700 text-sm">
                      Address
                    </span>
                    {isEditing ? (
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Enter street address"
                                className={`transition-all duration-200 ${
                                  isEditing
                                    ? "border-blue-300 bg-blue-50/20 focus:border-blue-500"
                                    : ""
                                }`}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : (
                      <span className="text-gray-900">
                        {companyData.address || "Not specified"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Column 2 */}
                <div className="space-y-6">
                  <div className="flex flex-col">
                    <span className="mb-2 font-semibold text-gray-700 text-sm">
                      Country
                    </span>
                    {isEditing ? (
                      <FormField
                        control={form.control}
                        name="countryId"
                        render={({ field }) => (
                          <FormItem>
                            <Select
                              onValueChange={(value) => {
                                field.onChange(value);
                                form.setValue("city", "");
                              }}
                              value={field.value}
                              disabled={loadingCountries}
                            >
                              <FormControl>
                                <SelectTrigger
                                  className={`transition-all duration-200 w-full ${
                                    isEditing
                                      ? "border-blue-300 bg-blue-50/20 focus:border-blue-500"
                                      : ""
                                  }`}
                                >
                                  <SelectValue
                                    placeholder={
                                      loadingCountries
                                        ? "Loading countries..."
                                        : "Select country"
                                    }
                                  />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="w-full">
                                {countryOptions.map((country: Country) => (
                                  <SelectItem
                                    key={country.id}
                                    value={country.id}
                                  >
                                    {country.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : (
                      <span className="text-gray-900">
                        {companyData.country?.name || "Not specified"}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col">
                    <span className="mb-2 font-semibold text-gray-700 text-sm">
                      City
                    </span>
                    {isEditing ? (
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              disabled={!selectedCountryId || loadingCities}
                            >
                              <FormControl>
                                <SelectTrigger
                                  className={`transition-all duration-200 w-full ${
                                    isEditing
                                      ? "border-blue-300 bg-blue-50/20 focus:border-blue-500"
                                      : ""
                                  }`}
                                >
                                  <SelectValue
                                    placeholder={
                                      !selectedCountryId
                                        ? "Select country first"
                                        : loadingCities
                                        ? "Loading cities..."
                                        : "Select city"
                                    }
                                  />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {cityOptions.map((city) => (
                                  <SelectItem key={city.id} value={city.id}>
                                    {city.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : (
                      <span className="text-gray-900">
                        {companyData.city?.name || "Not specified"}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col">
                    <span className="mb-2 font-semibold text-gray-700 text-sm">
                      Postal Code
                    </span>
                    {isEditing ? (
                      <FormField
                        control={form.control}
                        name="postal_code"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Enter postal code"
                                className={`transition-all duration-200 ${
                                  isEditing
                                    ? "border-blue-300 bg-blue-50/20 focus:border-blue-500"
                                    : ""
                                }`}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : (
                      <span className="text-gray-900">
                        {companyData.postal_code || "Not specified"}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col">
                    <span className="mb-2 font-semibold text-gray-700 text-sm">
                      Created
                    </span>
                    <span className="text-gray-900">
                      {formatDate(companyData.created_at)}
                    </span>
                  </div>
                </div>

                {/* Column 3 */}
                <div className="space-y-6">
                  <div className="flex flex-col">
                    <span className="mb-2 font-semibold text-gray-700 text-sm">
                      Updated
                    </span>
                    <span className="text-gray-900">
                      {formatDate(companyData.updated_at)}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="mb-2 font-semibold text-gray-700 text-sm">
                      Status
                    </span>
                    <Badge className={getStatusColor(companyData.status)}>
                      {companyData.status.charAt(0).toUpperCase() +
                        companyData.status.slice(1)}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* User Information Section */}
              {companyData.user && (
                <div className="mt-8 pt-6 border-gray-200 border-t">
                  <div className="mb-4">
                    <h3 className="mb-2 font-semibold text-gray-900 text-lg">
                      User Information
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Personal details of the company owner
                    </p>
                  </div>

                  <div className="gap-6 grid grid-cols-1 lg:grid-cols-3">
                    {/* User Column 1 */}
                    <div className="space-y-6">
                      <div className="flex flex-col">
                        <span className="mb-2 font-semibold text-gray-700 text-sm">
                          First Name
                        </span>
                        {isEditing ? (
                          <FormField
                            control={form.control}
                            name="user_first_name"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="Enter first name"
                                    className={`transition-all duration-200 ${
                                      isEditing
                                        ? "border-blue-300 bg-blue-50/20 focus:border-blue-500"
                                        : ""
                                    }`}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ) : (
                          <span className="text-gray-900">
                            {companyData.user.first_name || "Not specified"}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col">
                        <span className="mb-2 font-semibold text-gray-700 text-sm">
                          Last Name
                        </span>
                        {isEditing ? (
                          <FormField
                            control={form.control}
                            name="user_last_name"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="Enter last name"
                                    className={`transition-all duration-200 ${
                                      isEditing
                                        ? "border-blue-300 bg-blue-50/20 focus:border-blue-500"
                                        : ""
                                    }`}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ) : (
                          <span className="text-gray-900">
                            {companyData.user.last_name || "Not specified"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* User Column 2 */}
                    <div className="space-y-6">
                      <div className="flex flex-col">
                        <span className="mb-2 font-semibold text-gray-700 text-sm">
                          User Phone
                        </span>
                        {isEditing ? (
                          <FormField
                            control={form.control}
                            name="user_phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="Enter phone number"
                                    className={`transition-all duration-200 ${
                                      isEditing
                                        ? "border-blue-300 bg-blue-50/20 focus:border-blue-500"
                                        : ""
                                    }`}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ) : (
                          <span className="text-gray-900">
                            {companyData.user.phone || "Not specified"}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col">
                        <span className="mb-2 font-semibold text-gray-700 text-sm">
                          User Email
                        </span>
                        {isEditing ? (
                          <FormField
                            control={form.control}
                            name="user_email"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="email"
                                    placeholder="Enter email address"
                                    className={`transition-all duration-200 ${
                                      isEditing
                                        ? "border-blue-300 bg-blue-50/20 focus:border-blue-500"
                                        : ""
                                    }`}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ) : (
                          <span className="text-gray-900">
                            {companyData.user.email}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* User Column 3 - Empty for spacing */}
                    <div className="space-y-6">
                      {/* Future user fields can go here */}
                    </div>
                  </div>
                </div>
              )}

              {/* Last Updated */}
              <div className="mt-6 pt-4 border-gray-100 border-t">
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <div className="w-4 h-4" />
                  Last updated: {formatDate(companyData.updated_at)}
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>

      {/* Company Accounts Component */}
      <CompanyAccounts
        ref={companyAccountsRef}
        companyId={company.id}
        userId={companyData?.user?.id || ""}
      />

      {/* KYC Documents Component */}
      <KYCDocuments
        companyId={company.id}
        onOpenUploadModal={handleOpenKYCModal}
        companyData={companyData}
      />

      {/* KYC Upload Modal */}
      <KYCUploadModal
        isOpen={isKYCModalOpen}
        onClose={() => {
          setIsKYCModalOpen(false);
          setExistingKYCData(null);
          // Refetch KYC data when modal is closed
          refetchKYC();
        }}
        companyId={company.id}
        existingDocuments={existingKYCData}
        onUploadSuccess={() => {
          // Refetch KYC data after successful upload
          refetchKYC();
        }}
      />

      {/* Account Modal */}
      {/* Removed Account Modal */}

      {/* Delete Confirmation Modal */}
      {/* Removed Delete Confirmation Modal */}
    </div>
  );
};

export default Company;
