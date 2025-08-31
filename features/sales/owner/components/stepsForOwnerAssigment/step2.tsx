import { Loader2, Search, User, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Buyer {
  id: string;
  name: string;
  email: string;
  phone: string;
  photo?: string;
}

interface SelectBuyerStepProps {
  ownerSearch: string;
  selectedBuyers: Buyer[];
  mockBuyers: Buyer[];
  isLoadingOwners?: boolean;
  setValue: (field: string, value: unknown) => void;
  setOwnerSearch: (value: string) => void;
  handleBuyerSelect: (buyer: Buyer) => void;
}

const SelectBuyerStep = ({
  ownerSearch,
  selectedBuyers,
  mockBuyers,
  isLoadingOwners = false,
  setValue,
  setOwnerSearch,
  handleBuyerSelect,
}: SelectBuyerStepProps) => {
  // Separate input value from search term for better UX
  const [inputValue, setInputValue] = useState(ownerSearch);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>(null);

  // Custom debounced search to prevent API spam
  const debouncedSearch = useCallback(
    (searchTerm: string) => {
      // Clear previous timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // Set new timeout
      debounceTimeoutRef.current = setTimeout(() => {
        setOwnerSearch(searchTerm);
      }, 300); // Wait 300ms after user stops typing
    },
    [setOwnerSearch]
  );

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value); // Update input immediately
    debouncedSearch(value); // Debounce API call
  };

  // Keep focus on input and sync with parent state
  useEffect(() => {
    setInputValue(ownerSearch);
  }, [ownerSearch]);

  // Focus input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const filteredBuyers = (mockBuyers || []).filter(
    (buyer) =>
      buyer.name.toLowerCase().includes(inputValue.toLowerCase()) ||
      buyer.email.toLowerCase().includes(inputValue.toLowerCase()) ||
      buyer.phone.includes(inputValue)
  );

  // Only show "Found Owners" section when there's a search query
  const shouldShowFoundOwners = inputValue;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Label>Search Owners</Label>
        <div className="relative">
          <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
          <Input
            ref={inputRef}
            placeholder="Search by name, email, or phone..."
            value={inputValue}
            onChange={handleInputChange}
            className="pl-10"
            disabled={isLoadingOwners}
          />
          {isLoadingOwners && (
            <Loader2 className="top-1/2 right-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2" />
          )}
        </div>
      </div>

      {/* Show Found Owners whenever there's a search query */}
      {shouldShowFoundOwners && (
        <div className="space-y-2">
          {/* Only show "Found Owners" label when no owners are selected */}
          {selectedBuyers.length === 0 && <Label>Found Owners</Label>}
          {isLoadingOwners ? (
            <div className="flex flex-col justify-center items-center py-8 text-center">
              <Loader2 className="mb-3 w-8 h-8 text-gray-400 animate-spin" />
              <h3 className="mb-2 font-medium text-gray-900 text-lg">
                Searching Owners...
              </h3>
              <p className="max-w-sm text-gray-500">
                Looking for owners matching &quot;{inputValue}&quot;
              </p>
            </div>
          ) : filteredBuyers.length === 0 ? (
            <div className="flex flex-col justify-center items-center py-8 text-center">
              <div className="flex justify-center items-center bg-gray-100 mb-4 rounded-full w-16 h-16">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="mb-2 font-medium text-gray-900 text-lg">
                No Owners Found
              </h3>
              <p className="max-w-sm text-gray-500">
                No owners found matching &quot;{inputValue}&quot;. Try different
                keywords or check back later.
              </p>
            </div>
          ) : (
            <div className="gap-3 grid grid-cols-2 max-h-40 overflow-y-auto">
              {filteredBuyers
                .filter(
                  (buyer) => !selectedBuyers.find((b) => b.id === buyer.id)
                ) // Filter out already selected owners
                .map((buyer) => (
                  <div
                    key={buyer.id}
                    onClick={() => handleBuyerSelect(buyer)}
                    className="hover:shadow-md p-3 border border-gray-200 hover:border-gray-300 rounded-lg transition-all cursor-pointer"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex justify-center items-center bg-gray-200 rounded-full w-10 h-10">
                        {buyer.photo ? (
                          <img
                            src={buyer.photo}
                            alt={buyer.name}
                            className="rounded-full w-10 h-10 object-cover"
                          />
                        ) : (
                          <User className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 text-sm">
                          {buyer.name}
                        </h4>
                        <p className="text-gray-600 text-xs">{buyer.email}</p>
                        <p className="text-gray-500 text-xs">{buyer.phone}</p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {selectedBuyers.length > 0 && (
        <div className="pt-3 border-t">
          <div className="flex justify-between items-center mb-2">
            <Label className="text-sm">
              Selected Owners ({selectedBuyers.length})
            </Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setValue("buyers", [])}
              className="px-2 h-7 text-xs"
            >
              Clear All
            </Button>
          </div>

          <div className="gap-2 grid grid-cols-2">
            {selectedBuyers.map((buyer) => (
              <Card
                key={buyer.id}
                className="bg-green-50 p-2 border border-green-200"
              >
                <div className="flex items-center space-x-2">
                  <div className="flex justify-center items-center bg-green-100 rounded-full w-6 h-6">
                    {buyer.photo ? (
                      <img
                        src={buyer.photo}
                        alt={buyer.name}
                        className="rounded-full w-6 h-6 object-cover"
                      />
                    ) : (
                      <User className="w-3 h-3 text-green-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-xs truncate">
                      {buyer.name}
                    </h4>
                    <p className="text-gray-600 text-xs truncate">
                      {buyer.email}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setValue(
                        "buyers",
                        selectedBuyers.filter((b) => b.id !== buyer.id)
                      )
                    }
                    className="p-1 w-5 h-5 text-xs"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SelectBuyerStep;
