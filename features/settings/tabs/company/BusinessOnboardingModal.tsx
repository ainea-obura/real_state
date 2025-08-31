"use client";

import { Building2, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
    getBusinessOnboarding, getBusinessTypes, getCountries, getIndustries, getProductsTypes,
    getSubIndustries, getSubRegions, submitBusinessOnboarding,
} from '@/actions/settings/bussinesOnBoading';
import { Button } from '@/components/ui/button';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { PAYMENT_METHOD_CHOICES } from '@/features/finance/paymen-methods';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface BusinessOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyData?: {
    name: string;
    email: string;
    phone: string;
    address?: string;
    country?: {
      id: string;
      name: string;
    };
    city?: {
      id: string;
      name: string;
    };
    user?: {
      first_name: string;
      last_name: string;
      phone: string;
      email: string;
    };
  };
}

interface Director {
  directorName: string;
  directorIdnumber: string;
  directorMobileNumber: string;
  directorKraPin: string;
  directorDocumentType: string;
  directorCountryCode: string;
}

interface Country {
  id: number;
  name: string;
  calling_code: string;
  country_code: string;
}

interface SubRegion {
  id: number;
  name: string;
}

interface CountriesResponse {
  status: boolean;
  responseCode: string;
  message: string;
  data: Country[];
}

interface SubRegionsResponse {
  status: boolean;
  responseCode: string;
  message: string;
  data: SubRegion[];
}

interface Industry {
  id: number;
  code_value: string;
}

interface SubIndustry {
  id: number;
  sub_industry: string;
}

interface IndustriesResponse {
  status: boolean;
  responseCode: string;
  message: string;
  data: Industry[];
}

interface SubIndustriesResponse {
  status: boolean;
  responseCode: string;
  message: string;
  data: SubIndustry[];
}

interface BusinessFormData {
  merchantCode: string;
  businessName: string;
  billNumber: string;
  description: string;
  productType: string;
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
  estimatedMonthlyTransactionAmount: string;
  estimatedMonthlyTransactionCount: string;
  directors: Director[];
}

export default function BusinessOnboardingModal({
  isOpen,
  onClose,
  companyData,
}: BusinessOnboardingModalProps) {
  // Debug modal state
  console.log("BusinessOnboardingModal - isOpen:", isOpen);
  const [businessFormData, setBusinessFormData] = useState<BusinessFormData>({
    merchantCode: "",
    businessName: companyData?.name || "",
    billNumber: "",
    description: companyData?.name || "",
    productType: "",
    countryId: "", // Changed from calling code to empty string
    subregionId: companyData?.city?.id || "",
    industryId: "",
    subIndustryId: "",
    bankId: "",
    bankAccountNumber: "",
    mobileNumber: companyData?.phone || "",
    businessTypeId: "",
    email: companyData?.email || "",
    registrationNumber: "",
    kraPin: "",
    referralCode: "",
    dealerNumber: "",
    purpose: "",
    natureOfBusiness: "",
    physicalAddress: companyData?.address || "",
    estimatedMonthlyTransactionAmount: "",
    estimatedMonthlyTransactionCount: "",
    directors: [
      {
        directorName: companyData?.user
          ? `${companyData.user.first_name} ${companyData.user.last_name}`
          : "",
        directorIdnumber: "",
        directorMobileNumber: companyData?.user?.phone || "",
        directorKraPin: "",
        directorDocumentType: "",
        directorCountryCode: "254", // Default to Kenya calling code
      },
    ],
  });

  // Fetch countries using useQuery
  const {
    data: countriesData,
    isLoading: loadingCountries,
    error: countriesError,
  } = useQuery<CountriesResponse>({
    queryKey: ["business-onboarding-countries"],
    queryFn: async () => {
      console.log("Fetching countries - modal is open:", isOpen);
      const response = await getCountries();
      console.log("Countries API Response:", response);
      return response;
    },
    enabled: isOpen, // Only fetch when modal is open
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false, // Prevent refetch on window focus
    refetchOnMount: false, // Prevent refetch on mount
  });

  // Fetch sub-regions when country is selected
  const {
    data: subRegionsData,
    isLoading: loadingSubRegions,
    error: subRegionsError,
  } = useQuery<SubRegionsResponse | null>({
    queryKey: ["business-onboarding-subregions", businessFormData.countryId],
    queryFn: async () => {
      if (!businessFormData.countryId) return null;
      console.log("Fetching sub-regions - modal is open:", isOpen);
      const response = await getSubRegions({
        countryId: businessFormData.countryId,
      });
      console.log("Sub-Regions API Response:", response);
      return response;
    },
    enabled: isOpen && !!businessFormData.countryId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Fetch business types
  const {
    data: businessTypesData,
    isLoading: loadingBusinessTypes,
    error: businessTypesError,
  } = useQuery<{
    status: boolean;
    responseCode: string;
    message: string;
    data: { id: string; name: string }[];
  }>({
    queryKey: ["business-onboarding-business-types"],
    queryFn: async () => {
      console.log("Fetching business types - modal is open:", isOpen);
      const response = await getBusinessTypes();
      console.log("Business Types API Response:", response);
      return response;
    },
    enabled: isOpen,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Fetch industries
  const {
    data: industriesData,
    isLoading: loadingIndustries,
    error: industriesError,
  } = useQuery<IndustriesResponse>({
    queryKey: ["business-onboarding-industries"],
    queryFn: async () => {
      console.log("Fetching industries - modal is open:", isOpen);
      const response = await getIndustries();
      console.log("Industries API Response:", response);
      return response;
    },
    enabled: isOpen,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Fetch sub-industries
  const {
    data: subIndustriesData,
    isLoading: loadingSubIndustries,
    error: subIndustriesError,
  } = useQuery<SubIndustriesResponse | null>({
    queryKey: [
      "business-onboarding-sub-industries",
      businessFormData.industryId,
    ],
    queryFn: async () => {
      if (!businessFormData.industryId) return null;
      console.log("Fetching sub-industries - modal is open:", isOpen);
      const response = await getSubIndustries({
        subIndustryId: businessFormData.industryId,
      });
      console.log("Sub-Industries API Response:", response);
      return response;
    },
    enabled: isOpen && !!businessFormData.industryId,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Fetch product types
  const {
    data: productTypesData,
    isLoading: loadingProductTypes,
    error: productTypesError,
  } = useQuery<{
    status: boolean;
    responseCode: string;
    message: string;
    data: { id: string; name: string }[];
  }>({
    queryKey: ["business-onboarding-product-types"],
    queryFn: async () => {
      console.log("Fetching product types - modal is open:", isOpen);
      const response = await getProductsTypes();
      console.log("Product Types API Response:", response);
      return response;
    },
    enabled: isOpen,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Console log the data structures
  console.log("Countries Data:", countriesData);
  console.log("Sub-Regions Data:", subRegionsData);
  console.log("Loading Countries:", loadingCountries);
  console.log("Loading Sub-Regions:", loadingSubRegions);
  console.log("Countries Error:", countriesError);
  console.log("Sub-Regions Error:", subRegionsError);
  console.log("Business Types Data:", businessTypesData);
  console.log("Industries Data:", industriesData);
  console.log("Sub-Industries Data:", subIndustriesData);
  console.log("Product Types Data:", productTypesData);
  console.log("Loading Business Types:", loadingBusinessTypes);
  console.log("Loading Industries:", loadingIndustries);
  console.log("Loading Sub-Industries:", loadingSubIndustries);
  console.log("Loading Product Types:", loadingProductTypes);
  console.log("Business Types Error:", businessTypesError);
  console.log("Industries Error:", industriesError);
  console.log("Sub-Industries Error:", subIndustriesError);
  console.log("Product Types Error:", productTypesError);

  // Debug bank data
  const bankOptions = PAYMENT_METHOD_CHOICES.filter(
    (method) => method.type === "Bank"
  );
  console.log("=== BANK DEBUG ===");
  console.log("Available banks:", bankOptions);
  console.log("Bank count:", bankOptions.length);

  // Debug industry and sub-industry data specifically
  console.log("=== INDUSTRY DEBUG ===");
  console.log("Industry ID selected:", businessFormData.industryId);
  console.log("Industries API Response:", industriesData);
  console.log("Industries loading:", loadingIndustries);
  console.log("Industries error:", industriesError);
  console.log("Industries data array:", industriesData?.data);

  console.log("=== SUB-INDUSTRY DEBUG ===");
  console.log("Sub-Industry ID selected:", businessFormData.subIndustryId);
  console.log("Sub-Industries API Response:", subIndustriesData);
  console.log("Sub-Industries loading:", loadingSubIndustries);
  console.log("Sub-Industries error:", subIndustriesError);
  console.log("Sub-Industries data array:", subIndustriesData?.data);

  // Initialize query client for mutations
  const queryClient = useQueryClient();

  // Submit business onboarding mutation
  const submitMutation = useMutation({
    mutationFn: submitBusinessOnboarding,
    onSuccess: (data) => {
      if (data.error) {
        toast.error(data.message || "Failed to submit business onboarding");
      } else {
        toast.success("Business onboarding submitted successfully!");
        queryClient.invalidateQueries({ queryKey: ["business-onboarding"] });
        onClose();
      }
    },
    onError: (error) => {
      console.error("Submit error:", error);
      toast.error("Failed to submit business onboarding");
    },
  });

  // Get existing business onboarding data
  const { data: existingData, isLoading: loadingExisting } = useQuery({
    queryKey: ["business-onboarding"],
    queryFn: getBusinessOnboarding,
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const handleSubmit = () => {
    // Validate required fields
    if (!businessFormData.merchantCode || !businessFormData.businessName) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Prepare payload for submission
    const payload = {
      ...businessFormData,
      productType: parseInt(businessFormData.productType) || 0,
      estimatedMonthlyTransactionAmount:
        parseFloat(businessFormData.estimatedMonthlyTransactionAmount) || 0,
      estimatedMonthlyTransactionCount:
        parseInt(businessFormData.estimatedMonthlyTransactionCount) || 0,
    };

    console.log("Submitting business onboarding data:", payload);
    submitMutation.mutate(payload);
  };

  const addDirector = () => {
    setBusinessFormData({
      ...businessFormData,
      directors: [
        ...businessFormData.directors,
        {
          directorName: "",
          directorIdnumber: "",
          directorMobileNumber: "",
          directorKraPin: "",
          directorDocumentType: "",
          directorCountryCode: "254", // Default to Kenya calling code
        },
      ],
    });
  };

  const removeDirector = (index: number) => {
    const newDirectors = businessFormData.directors.filter(
      (_, i) => i !== index
    );
    setBusinessFormData({
      ...businessFormData,
      directors: newDirectors,
    });
  };

  const updateDirector = (
    index: number,
    field: keyof Director,
    value: string
  ) => {
    const newDirectors = [...businessFormData.directors];
    newDirectors[index] = { ...newDirectors[index], [field]: value };
    setBusinessFormData({
      ...businessFormData,
      directors: newDirectors,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="mt-10 min-w-3xl max-h-[calc(100vh-150px)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Business On Boarding
          </DialogTitle>
          <DialogDescription>
            Complete your business onboarding information for SasaPay
            integration
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 text-lg">
              Basic Information
            </h3>
            <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="merchantCode">Merchant Code</Label>
                <Input
                  id="merchantCode"
                  value={businessFormData.merchantCode}
                  onChange={(e) =>
                    setBusinessFormData({
                      ...businessFormData,
                      merchantCode: e.target.value,
                    })
                  }
                  placeholder="2****2"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  value={businessFormData.businessName}
                  onChange={(e) =>
                    setBusinessFormData({
                      ...businessFormData,
                      businessName: e.target.value,
                    })
                  }
                  placeholder="Test Shop"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billNumber">Bill Number (Optional)</Label>
                <Input
                  id="billNumber"
                  value={businessFormData.billNumber}
                  onChange={(e) =>
                    setBusinessFormData({
                      ...businessFormData,
                      billNumber: e.target.value,
                    })
                  }
                  placeholder="123456"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={businessFormData.description}
                  onChange={(e) =>
                    setBusinessFormData({
                      ...businessFormData,
                      description: e.target.value,
                    })
                  }
                  placeholder="Test Shop"
                />
              </div>
            </div>
          </div>

          {/* Business Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 text-lg">
              Business Details
            </h3>
            <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="businessTypeId">Business Type</Label>
                <Select
                  value={businessFormData.businessTypeId}
                  onValueChange={(value) =>
                    setBusinessFormData({
                      ...businessFormData,
                      businessTypeId: value,
                    })
                  }
                >
                  <SelectTrigger className="w-full !h-11">
                    <SelectValue placeholder="Select business type" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingBusinessTypes ? (
                      <div className="px-2 py-1.5 text-gray-500 text-sm">
                        Loading business types...
                      </div>
                    ) : businessTypesError ? (
                      <div className="px-2 py-1.5 text-red-500 text-sm">
                        Error loading business types
                      </div>
                    ) : businessTypesData?.data ? (
                      businessTypesData.data.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-gray-500 text-sm">
                        No business types available
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="productType">Product Type</Label>
                <Select
                  value={businessFormData.productType}
                  onValueChange={(value) =>
                    setBusinessFormData({
                      ...businessFormData,
                      productType: value,
                    })
                  }
                >
                  <SelectTrigger className="w-full !h-11">
                    <SelectValue placeholder="Select product type" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingProductTypes ? (
                      <div className="px-2 py-1.5 text-gray-500 text-sm">
                        Loading product types...
                      </div>
                    ) : productTypesError ? (
                      <div className="px-2 py-1.5 text-red-500 text-sm">
                        Error loading product types
                      </div>
                    ) : productTypesData?.data ? (
                      productTypesData.data.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-gray-500 text-sm">
                        No product types available
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="countryId">Country</Label>
                <Select
                  value={businessFormData.countryId}
                  onValueChange={(value) =>
                    setBusinessFormData({
                      ...businessFormData,
                      countryId: value,
                      subregionId: "", // Reset subregion when country changes
                    })
                  }
                >
                  <SelectTrigger className="w-full !h-11">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingCountries ? (
                      <div className="px-2 py-1.5 text-gray-500 text-sm">
                        Loading countries...
                      </div>
                    ) : countriesError ? (
                      <div className="px-2 py-1.5 text-red-500 text-sm">
                        Error loading countries
                      </div>
                    ) : countriesData?.data ? (
                      countriesData.data.map((country: Country) => (
                        <SelectItem
                          key={country.id}
                          value={country.id.toString()}
                        >
                          {country.name} (+{country.calling_code})
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-gray-500 text-sm">
                        No countries available
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subregionId">Subregion</Label>
                <Select
                  value={businessFormData.subregionId}
                  onValueChange={(value) =>
                    setBusinessFormData({
                      ...businessFormData,
                      subregionId: value,
                    })
                  }
                  disabled={!businessFormData.countryId}
                >
                  <SelectTrigger className="w-full !h-11">
                    <SelectValue
                      placeholder={
                        !businessFormData.countryId
                          ? "Select a country first"
                          : loadingSubRegions
                          ? "Loading sub-regions..."
                          : "Select subregion"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {!businessFormData.countryId ? (
                      <div className="px-2 py-1.5 text-gray-500 text-sm">
                        Please select a country first
                      </div>
                    ) : loadingSubRegions ? (
                      <div className="px-2 py-1.5 text-gray-500 text-sm">
                        Loading sub-regions...
                      </div>
                    ) : subRegionsError ? (
                      <div className="px-2 py-1.5 text-red-500 text-sm">
                        Error loading sub-regions
                      </div>
                    ) : subRegionsData?.data ? (
                      subRegionsData.data.map((subregion: SubRegion) => (
                        <SelectItem
                          key={subregion.id}
                          value={subregion.id.toString()}
                        >
                          {subregion.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-gray-500 text-sm">
                        No sub-regions available
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="industryId">Industry</Label>
                <Select
                  value={businessFormData.industryId}
                  onValueChange={(value) =>
                    setBusinessFormData({
                      ...businessFormData,
                      industryId: value,
                      subIndustryId: "", // Reset sub-industry when industry changes
                    })
                  }
                >
                  <SelectTrigger className="w-full !h-11">
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingIndustries ? (
                      <div className="px-2 py-1.5 text-gray-500 text-sm">
                        Loading industries...
                      </div>
                    ) : industriesError ? (
                      <div className="px-2 py-1.5 text-red-500 text-sm">
                        Error loading industries
                      </div>
                    ) : industriesData?.data ? (
                      (() => {
                        console.log(
                          "Rendering industries:",
                          industriesData.data
                        );
                        return industriesData.data.map((industry) => (
                          <SelectItem
                            key={industry.id}
                            value={industry.id.toString()}
                          >
                            {industry.code_value}
                          </SelectItem>
                        ));
                      })()
                    ) : (
                      <div className="px-2 py-1.5 text-gray-500 text-sm">
                        No industries available
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subIndustryId">Sub Industry</Label>
                <Select
                  value={businessFormData.subIndustryId}
                  onValueChange={(value) =>
                    setBusinessFormData({
                      ...businessFormData,
                      subIndustryId: value,
                    })
                  }
                  disabled={
                    !businessFormData.industryId ||
                    businessFormData.industryId === ""
                  }
                >
                  <SelectTrigger className="w-full !h-11">
                    <SelectValue
                      placeholder={
                        !businessFormData.industryId
                          ? "Select an industry first"
                          : loadingSubIndustries
                          ? "Loading sub-industries..."
                          : "Select sub industry"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {!businessFormData.industryId ? (
                      <div className="px-2 py-1.5 text-gray-500 text-sm">
                        Please select an industry first
                      </div>
                    ) : loadingSubIndustries ? (
                      <div className="px-2 py-1.5 text-gray-500 text-sm">
                        Loading sub-industries...
                      </div>
                    ) : subIndustriesError ? (
                      <div className="px-2 py-1.5 text-red-500 text-sm">
                        Error loading sub-industries
                      </div>
                    ) : subIndustriesData?.data ? (
                      (() => {
                        console.log(
                          "Rendering sub-industries:",
                          subIndustriesData.data
                        );
                        return subIndustriesData.data.map((subIndustry) => (
                          <SelectItem
                            key={subIndustry.id}
                            value={subIndustry.id.toString()}
                          >
                            {subIndustry.sub_industry}
                          </SelectItem>
                        ));
                      })()
                    ) : (
                      <div className="px-2 py-1.5 text-gray-500 text-sm">
                        No sub-industries available
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Banking Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 text-lg">
              Banking Information
            </h3>
            <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bankId">Bank</Label>
                <Select
                  value={businessFormData.bankId}
                  onValueChange={(value) =>
                    setBusinessFormData({
                      ...businessFormData,
                      bankId: value,
                    })
                  }
                >
                  <SelectTrigger className="w-full !h-11">
                    <SelectValue placeholder="Select bank" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHOD_CHOICES.filter(
                      (method) => method.type === "Bank"
                    ).map((bank) => (
                      <SelectItem key={bank.code} value={bank.code}>
                        {bank.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankAccountNumber">Bank Account Number</Label>
                <Input
                  id="bankAccountNumber"
                  value={businessFormData.bankAccountNumber}
                  onChange={(e) =>
                    setBusinessFormData({
                      ...businessFormData,
                      bankAccountNumber: e.target.value,
                    })
                  }
                  placeholder="119*****22478"
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 text-lg">
              Contact Information
            </h3>
            <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="mobileNumber">Mobile Number</Label>
                <Input
                  id="mobileNumber"
                  value={businessFormData.mobileNumber}
                  onChange={(e) =>
                    setBusinessFormData({
                      ...businessFormData,
                      mobileNumber: e.target.value,
                    })
                  }
                  placeholder="070****91"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={businessFormData.email}
                  onChange={(e) =>
                    setBusinessFormData({
                      ...businessFormData,
                      email: e.target.value,
                    })
                  }
                  placeholder="testshop@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="physicalAddress">Physical Address</Label>
                <Input
                  id="physicalAddress"
                  value={businessFormData.physicalAddress}
                  onChange={(e) =>
                    setBusinessFormData({
                      ...businessFormData,
                      physicalAddress: e.target.value,
                    })
                  }
                  placeholder="Nairobi"
                />
              </div>
            </div>
          </div>

          {/* Registration Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 text-lg">
              Registration Information
            </h3>
            <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="registrationNumber">Registration Number</Label>
                <Input
                  id="registrationNumber"
                  value={businessFormData.registrationNumber}
                  onChange={(e) =>
                    setBusinessFormData({
                      ...businessFormData,
                      registrationNumber: e.target.value,
                    })
                  }
                  placeholder="K1****12PO"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kraPin">KRA PIN</Label>
                <Input
                  id="kraPin"
                  value={businessFormData.kraPin}
                  onChange={(e) =>
                    setBusinessFormData({
                      ...businessFormData,
                      kraPin: e.target.value,
                    })
                  }
                  placeholder="J1****2003Y"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="referralCode">Referral Code</Label>
                <Input
                  id="referralCode"
                  value={businessFormData.referralCode}
                  onChange={(e) =>
                    setBusinessFormData({
                      ...businessFormData,
                      referralCode: e.target.value,
                    })
                  }
                  placeholder="1234"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dealerNumber">Dealer Number</Label>
                <Input
                  id="dealerNumber"
                  value={businessFormData.dealerNumber}
                  onChange={(e) =>
                    setBusinessFormData({
                      ...businessFormData,
                      dealerNumber: e.target.value,
                    })
                  }
                  placeholder="123456"
                />
              </div>
            </div>
          </div>

          {/* Business Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 text-lg">
              Business Details
            </h3>
            <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose</Label>
                <Input
                  id="purpose"
                  value={businessFormData.purpose}
                  onChange={(e) =>
                    setBusinessFormData({
                      ...businessFormData,
                      purpose: e.target.value,
                    })
                  }
                  placeholder="Collection"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="natureOfBusiness">Nature of Business</Label>
                <Input
                  id="natureOfBusiness"
                  value={businessFormData.natureOfBusiness}
                  onChange={(e) =>
                    setBusinessFormData({
                      ...businessFormData,
                      natureOfBusiness: e.target.value,
                    })
                  }
                  placeholder="Retail shop"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimatedMonthlyTransactionAmount">
                  Estimated Monthly Transaction Amount
                </Label>
                <Input
                  id="estimatedMonthlyTransactionAmount"
                  type="number"
                  value={businessFormData.estimatedMonthlyTransactionAmount}
                  onChange={(e) =>
                    setBusinessFormData({
                      ...businessFormData,
                      estimatedMonthlyTransactionAmount: e.target.value,
                    })
                  }
                  placeholder="500000.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimatedMonthlyTransactionCount">
                  Estimated Monthly Transaction Count
                </Label>
                <Input
                  id="estimatedMonthlyTransactionCount"
                  type="number"
                  value={businessFormData.estimatedMonthlyTransactionCount}
                  onChange={(e) =>
                    setBusinessFormData({
                      ...businessFormData,
                      estimatedMonthlyTransactionCount: e.target.value,
                    })
                  }
                  placeholder="10"
                />
              </div>
            </div>
          </div>

          {/* Directors */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-900 text-lg">Directors</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addDirector}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Director
              </Button>
            </div>

            {businessFormData.directors.map((director, index) => (
              <div
                key={index}
                className="space-y-4 p-4 border border-gray-200 rounded-lg"
              >
                <div className="flex justify-between items-center">
                  <h4 className="font-medium text-gray-900">
                    Director {index + 1}
                  </h4>
                  {businessFormData.directors.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeDirector(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                      Remove
                    </Button>
                  )}
                </div>

                <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`directorName-${index}`}>
                      Director Name
                    </Label>
                    <Input
                      id={`directorName-${index}`}
                      value={director.directorName}
                      onChange={(e) =>
                        updateDirector(index, "directorName", e.target.value)
                      }
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`directorIdnumber-${index}`}>
                      ID Number
                    </Label>
                    <Input
                      id={`directorIdnumber-${index}`}
                      value={director.directorIdnumber}
                      onChange={(e) =>
                        updateDirector(
                          index,
                          "directorIdnumber",
                          e.target.value
                        )
                      }
                      placeholder="2332****12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`directorMobileNumber-${index}`}>
                      Mobile Number
                    </Label>
                    <Input
                      id={`directorMobileNumber-${index}`}
                      value={director.directorMobileNumber}
                      onChange={(e) =>
                        updateDirector(
                          index,
                          "directorMobileNumber",
                          e.target.value
                        )
                      }
                      placeholder="2547****59"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`directorKraPin-${index}`}>KRA PIN</Label>
                    <Input
                      id={`directorKraPin-${index}`}
                      value={director.directorKraPin}
                      onChange={(e) =>
                        updateDirector(index, "directorKraPin", e.target.value)
                      }
                      placeholder="2547****59"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`directorDocumentType-${index}`}>
                      Document Type
                    </Label>
                    <Select
                      value={director.directorDocumentType}
                      onValueChange={(value) =>
                        updateDirector(index, "directorDocumentType", value)
                      }
                    >
                      <SelectTrigger className="w-full !h-11">
                        <SelectValue placeholder="Select document type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ID_NUMBER">ID Number</SelectItem>
                        <SelectItem value="PASSPORT">Passport</SelectItem>
                        <SelectItem value="ALIEN_ID">Alien ID</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`directorCountryCode-${index}`}>
                      Country Code
                    </Label>
                    <Select
                      value={director.directorCountryCode}
                      onValueChange={(value) =>
                        updateDirector(index, "directorCountryCode", value)
                      }
                    >
                      <SelectTrigger className="w-full !h-11">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {countriesData?.data ? (
                          countriesData.data.map((country: Country) => (
                            <SelectItem
                              key={country.id}
                              value={country.calling_code}
                            >
                              {country.name} (+{country.calling_code})
                            </SelectItem>
                          ))
                        ) : (
                          <div className="px-2 py-1.5 text-gray-500 text-sm">
                            Loading countries...
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitMutation.isPending}>
            {submitMutation.isPending
              ? "Submitting..."
              : "Submit Business On Boarding"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
