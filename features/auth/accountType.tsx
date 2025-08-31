"use client";
import { BriefcaseBusiness, Building2, Percent, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  ButtonGroup,
  ButtonGroupItem,
} from "@/components/ui/radio-button-custom";
import { zodResolver } from "@hookform/resolvers/zod";

// Define the schema using zod
const accountTypeSchema = z.object({
  accountType: z.enum(["company", "landlord", "customer", "agent"], {
    required_error: "Account type is required",
  }),
});

// Define the form values type
type AccountTypeFormValues = z.infer<typeof accountTypeSchema>;

const AccountType = () => {
  const router = useRouter();
  const form = useForm<AccountTypeFormValues>({
    resolver: zodResolver(accountTypeSchema),
    defaultValues: {
      accountType: "",
    },
  });

  const onSubmit = (data: AccountTypeFormValues) => {
    // Handle form submission logic here
    router.replace("/create-company");
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="accountType"
          render={({ field }) => (
            <div className="space-y-4">
              <FormLabel>Account Type</FormLabel>
              <FormControl>
                <ButtonGroup
                  className="gap-4 grid grid-cols-2"
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <ButtonGroupItem
                    icon={<Building2 />}
                    heading="Company"
                    subHeading="Manage other properties & projects"
                    value="company"
                  />
                  <ButtonGroupItem
                    icon={<BriefcaseBusiness />}
                    heading="Landlord"
                    subHeading="Manage your own properties & projects"
                    value="landlord"
                  />
                  <ButtonGroupItem
                    icon={<UserRound />}
                    heading="Customer"
                    subHeading="Access your properties & projects"
                    value="customer"
                  />
                  <ButtonGroupItem
                    icon={<Percent />}
                    heading="Agent"
                    subHeading="Assist with properties & projects"
                    value="agent"
                  />
                </ButtonGroup>
              </FormControl>
              <FormMessage />
            </div>
          )}
        />
        <div className="flex justify-end items-end">
          <Button
            type="submit"
            size={"lg"}
            className="mt-4 px-4 py-2 rounded text-white cursor-pointer"
          >
            Next
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default AccountType;
