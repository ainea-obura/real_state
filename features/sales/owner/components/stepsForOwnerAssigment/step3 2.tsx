import { Loader2, Search, User, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface Agent {
  id: string;
  name: string;
  email: string;
  phone: string;
  commission: string;
}

interface SelectAgentStepProps {
  agentSearch: string;
  selectedAgent: string;
  commission: number;
  commissionType: "%" | "fixed";
  mockAgents: Agent[];
  isLoadingAgents: boolean;
  setValue: (field: string, value: unknown) => void;
  setAgentSearch: (value: string) => void;
  handleAgentSelect: (agent: Agent) => void;
}

const SelectAgentStep = ({
  agentSearch,
  selectedAgent,
  commission,
  commissionType,
  mockAgents,
  isLoadingAgents,
  setValue,
  setAgentSearch,
  handleAgentSelect,
}: SelectAgentStepProps) => {
  // Separate input value from search term for better UX
  const [inputValue, setInputValue] = useState(agentSearch);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();

  // Custom debounced search to prevent API spam
  const debouncedSearch = useCallback(
    (searchTerm: string) => {
      // Clear previous timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // Set new timeout
      debounceTimeoutRef.current = setTimeout(() => {
        setAgentSearch(searchTerm);
      }, 300); // Wait 300ms after user stops typing
    },
    [setAgentSearch]
  );

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value); // Update input immediately

    // Clear selected agent when user starts typing new search
    if (value && selectedAgent) {
      setValue("agent", "");
    }

    // Clear input when starting new search to show "Found Agents" again
    if (value && !selectedAgent) {
      setInputValue(value);
    }

    debouncedSearch(value); // Debounce API call
  };

  // Keep focus on input and sync with parent state
  useEffect(() => {
    setInputValue(agentSearch);
  }, [agentSearch]);

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

  const filteredAgents = mockAgents.filter(
    (agent) =>
      agent.name.toLowerCase().includes(inputValue.toLowerCase()) ||
      agent.email.toLowerCase().includes(inputValue.toLowerCase()) ||
      agent.phone.includes(inputValue)
  );

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Label>Search Agents</Label>
        <div className="relative">
          <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
          <Input
            ref={inputRef}
            placeholder="Search by name, email, or phone..."
            value={inputValue}
            onChange={handleInputChange}
            className="pl-10"
            disabled={isLoadingAgents}
          />
          {isLoadingAgents && (
            <Loader2 className="top-1/2 right-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 animate-spin" />
          )}
        </div>
      </div>

      {/* Show Found Agents only when searching and no agent is selected */}
      {inputValue && !selectedAgent && (
        <div className="space-y-2">
          <Label>Found Agents</Label>
          {isLoadingAgents ? (
            <div className="flex flex-col justify-center items-center py-8 text-center">
              <Loader2 className="mb-3 w-8 h-8 text-gray-400 animate-spin" />
              <h3 className="mb-2 font-medium text-gray-900 text-lg">
                Searching Agents...
              </h3>
              <p className="max-w-sm text-gray-500">
                Looking for agents matching &quot;{inputValue}&quot;
              </p>
            </div>
          ) : filteredAgents.length === 0 ? (
            <div className="flex flex-col justify-center items-center py-8 text-center">
              <div className="flex justify-center items-center bg-gray-100 mb-4 rounded-full w-16 h-16">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="mb-2 font-medium text-gray-900 text-lg">
                No Agents Found
              </h3>
              <p className="max-w-sm text-gray-500">
                No agents found matching &quot;{inputValue}&quot;. Try different
                keywords or check back later.
              </p>
            </div>
          ) : (
            <div className="gap-3 grid grid-cols-2 max-h-40 overflow-y-auto">
              {filteredAgents.map((agent) => (
                <div
                  key={agent.id}
                  onClick={() => handleAgentSelect(agent)}
                  className="hover:shadow-md p-3 border border-gray-200 hover:border-gray-300 rounded-lg transition-all cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex justify-center items-center bg-gray-200 rounded-full w-10 h-10">
                      <User className="w-5 h-5 text-gray-500" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 text-sm">
                        {agent.name}
                      </h4>
                      <p className="text-gray-600 text-xs">{agent.email}</p>
                      <p className="text-gray-500 text-xs">{agent.phone}</p>
                      <p className="font-medium text-blue-600 text-xs">
                        Commission: {agent.commission}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Show selected agent when one is selected */}
      {selectedAgent && (
        <div className="pt-3 border-t">
          <div className="flex justify-between items-center mb-2">
            <Label className="text-sm">Selected Agent</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setValue("agent", "");
                setInputValue("");
              }}
              className="hover:bg-gray-100 p-1 w-6 h-6 text-xs"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>

          <div className="bg-green-50 p-2 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="flex justify-center items-center bg-green-100 rounded-full w-6 h-6">
                <User className="w-3 h-3 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-xs truncate">
                  {mockAgents.find((a) => a.id === selectedAgent)?.name ||
                    "Unknown Agent"}
                </h4>
                <p className="text-gray-600 text-xs truncate">
                  {mockAgents.find((a) => a.id === selectedAgent)?.email || ""}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Commission Settings - Only show when agent is selected */}
      {selectedAgent && (
        <div className="space-y-3 pt-4 border-t">
          <Label>Commission Settings</Label>
          <div className="gap-4 grid grid-cols-3">
            <div className="space-y-2">
              <Label className="text-sm">Commission Type</Label>
              <Select
                value={commissionType}
                onValueChange={(value: "%" | "fixed") =>
                  setValue("commissionType", value)
                }
              >
                <SelectTrigger className="w-full !h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="%">Percentage (%)</SelectItem>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 col-span-2">
              <Label className="text-sm">
                Commission {commissionType === "%" ? "(%)" : "(KES)"}
              </Label>
              <Input
                type="number"
                placeholder={commissionType === "%" ? "5" : "10000"}
                value={commission || ""}
                onChange={(e) =>
                  setValue(
                    "commission",
                    e.target.value ? Number(e.target.value) : ""
                  )
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SelectAgentStep;
