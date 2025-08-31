import { Loader2 } from "lucide-react";
import * as React from "react";

import { getServices } from "@/actions/services/index";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

interface Service {
  id: string;
  name: string;
  pricing_type?: string;
  frequency?: string;
  currency?: string;
  billed_to?: string;
  base_price?: number;
  percentage_rate?: number;
}

interface ServicesResponse {
  data: {
    results: Service[];
  };
}

interface AsyncServiceComboboxProps {
  value: string;
  onValueChange: (id: string) => void;
  onServiceChange?: (service: Service) => void;
  className?: string;
  filter?: "project" | "block" | "house" | null;
}

export const AsyncServiceCombobox: React.FC<AsyncServiceComboboxProps> = ({
  value,
  onValueChange,
  onServiceChange,
  className,
  filter,
}) => {
  const [query, setQuery] = React.useState("");
  const [inputValue, setInputValue] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);

  // Track if we've loaded all services (no pagination, or all results returned)
  const [allLoaded, setAllLoaded] = React.useState(false);
  const [allServices, setAllServices] = React.useState<Service[]>([]);

  const { data: servicesData, isLoading } = useQuery({
    queryKey: ["services", allLoaded ? "all" : query],
    queryFn: () =>
      getServices({
        page: 1,
        pageSize: 1000, // try to load all at once
        is_active: true,
        is_dropdown: true,
        ...(allLoaded ? {} : query && { search: query }),
      }),
  });

  // Move onSuccess logic to useEffect
  React.useEffect(() => {
    if (
      servicesData &&
      typeof servicesData === "object" &&
      !servicesData.isError &&
      servicesData.data &&
      Array.isArray((servicesData.data as ServicesResponse["data"]).results)
    ) {
      const results = (servicesData.data as ServicesResponse["data"]).results;
      if (results.length < 1000) {
        setAllLoaded(true);
        setAllServices(results);
      }
    }
  }, [servicesData]);

  // Filter services based on assignment target
  const filterServicesByAssignmentTarget = (services: Service[]) => {
    if (!filter || !Array.isArray(services)) return services;

    return services.filter((service) => {
      if (filter === "project") {
        return service.billed_to === "MANAGEMENT";
      } else {
        // For block and house, hide MANAGEMENT services
        return service.billed_to !== "MANAGEMENT";
      }
    });
  };

  // Use allServices if loaded, otherwise use paginated results
  const services = React.useMemo(() => {
    let serviceList: Service[] = [];

    if (allLoaded && allServices.length > 0) {
      serviceList = allServices;
    } else if (
      servicesData &&
      typeof servicesData === "object" &&
      "data" in servicesData &&
      !servicesData.isError &&
      (servicesData.data as ServicesResponse["data"])?.results
    ) {
      serviceList = (servicesData.data as ServicesResponse["data"]).results;
    }

    // Apply filtering based on assignment target
    return filterServicesByAssignmentTarget(serviceList);
  }, [allLoaded, allServices, servicesData, filter]);

  // Client-side filter if all loaded
  const filteredServices = React.useMemo(() => {
    if (allLoaded) {
      if (!inputValue) return services;
      const q = inputValue.toLowerCase();
      return services.filter(
        (svc: Service) =>
          svc.name.toLowerCase().includes(q) ||
          (svc.pricing_type && svc.pricing_type.toLowerCase().includes(q)) ||
          (svc.currency && svc.currency.toLowerCase().includes(q))
      );
    }
    return services;
  }, [allLoaded, services, inputValue]);

  // Find the selected service object
  const selectedService = services.find((s: Service) => s.id === value) || null;

  React.useEffect(() => {
    if (onServiceChange && selectedService) {
      onServiceChange(selectedService);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedService]);

  // Keyboard navigation
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  React.useEffect(() => {
    if (!open) setHighlightedIndex(-1);
  }, [open, filteredServices]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        Math.min(prev + 1, filteredServices.length - 1)
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      const svc = filteredServices[highlightedIndex];
      if (svc) {
        onValueChange(svc.id);
        setInputValue(svc.name);
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <input
        ref={inputRef}
        type="text"
        className="px-2 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary w-full"
        placeholder={isLoading ? "Loading..." : "Search or select a service..."}
        value={inputValue || (selectedService ? selectedService.name : "")}
        onChange={(e) => {
          setInputValue(e.target.value);
          if (!allLoaded) {
            setQuery(e.target.value);
          }
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 100)}
        onKeyDown={handleInputKeyDown}
        aria-autocomplete="list"
        aria-controls="service-combobox-listbox"
        autoComplete="off"
      />
      {open && (
        <div
          id="service-combobox-listbox"
          className="z-10 absolute bg-white dark:bg-popover shadow-lg mt-1 border border-border rounded w-full max-h-60 overflow-auto"
          role="listbox"
        >
          {isLoading ? (
            <div className="flex justify-center items-center py-4">
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="px-4 py-3 text-muted-foreground text-sm">
              No services found
            </div>
          ) : (
            filteredServices.map((svc: Service, idx: number) => (
              <div
                key={svc.id}
                role="option"
                aria-selected={value === svc.id}
                className={cn(
                  "flex flex-col px-4 py-2 cursor-pointer transition-colors",
                  value === svc.id &&
                    "bg-primary/10 text-primary font-semibold",
                  highlightedIndex === idx && "bg-muted"
                )}
                onMouseDown={() => {
                  onValueChange(svc.id);
                  setInputValue(svc.name);
                  setOpen(false);
                }}
                onMouseEnter={() => setHighlightedIndex(idx)}
              >
                <span className="text-base">{svc.name}</span>
                <span className="text-muted-foreground text-xs">
                  {svc.pricing_type} | {svc.frequency} | {svc.currency}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default AsyncServiceCombobox;
