"use client";
import { CheckIcon, ChevronsUpDownIcon, Loader2 } from 'lucide-react';
import * as React from 'react';
import { useEffect } from 'react';
import { searchTenants } from '@/actions/projects/tenantAssignment';
import { Button } from '@/components/ui/button';
import {
    Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

import { TenantUser } from './types';

interface TenantUserComboboxProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: "tenant" | "agent";
}

export const TenantUserCombobox: React.FC<TenantUserComboboxProps> = ({
  value,
  onChange,
  error,
  type = "tenant",
}) => {
  const [open, setOpen] = React.useState(false);
  const [input, setInput] = React.useState("");
  const [options, setOptions] = React.useState<TenantUser[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [touched, setTouched] = React.useState(false);
  const [selectedTenant, setSelectedTenant] = React.useState<TenantUser | null>(
    null
  );

  // Debounce search
  React.useEffect(() => {
    if (input.length < 2) {
      setOptions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timeout = setTimeout(() => {
      searchTenants(input, type)
        .then(setOptions)
        .catch(() => setOptions([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [input]);

  // Always show selected tenant details in the button
  useEffect(() => {
    if (!value) {
      setSelectedTenant(null);
      return;
    }
    // If selected tenant is in options, use it
    const found = options.find((t) => t.id === value);
    if (found) {
      setSelectedTenant(found);
      return;
    }
    // If not, fetch by id (using searchTenants with id, since backend supports id search)
    searchTenants(value, type)
      .then((results) => {
        const match = results.find((t) => t.id === value);
        if (match) setSelectedTenant(match);
      })
      .catch(() => {});
  }, [value, options]);

  return (
    <div className="w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("w-full justify-between", error && "border-red-500")}
            tabIndex={0}
            aria-label="Select tenant"
            onBlur={() => setTouched(true)}
          >
            {selectedTenant
              ? `(${selectedTenant.verification}) ${selectedTenant.first_name} ${selectedTenant.last_name}`
              : "Type to search tenant..."}
            <ChevronsUpDownIcon className="ml-2 w-4 h-4 opacity-50 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[350px]">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search by name, email, or phone..."
              value={input}
              onValueChange={setInput}
              autoFocus
            />
            <CommandList>
              {loading ? (
                <div className="flex justify-center items-center py-4">
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" /> Searching...
                </div>
              ) : (
                <>
                  <CommandEmpty>No tenants found.</CommandEmpty>
                  <CommandGroup>
                    {options.map((tenant) => (
                      <CommandItem
                        key={tenant.id}
                        value={tenant.id}
                        onSelect={() => {
                          onChange(tenant.id);
                          setOpen(false);
                          setInput("");
                        }}
                        tabIndex={0}
                        aria-label={`${tenant.first_name} ${tenant.last_name}`}
                      >
                        <CheckIcon
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === tenant.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {tenant.first_name} {tenant.last_name} ({tenant.email} /{" "}
                        {tenant.phone})
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && touched && (
        <span className="block mt-1 text-xs text-red-500">{error}</span>
      )}
    </div>
  );
};
