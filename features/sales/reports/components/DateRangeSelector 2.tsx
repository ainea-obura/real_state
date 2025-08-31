import { DateRangePicker } from '@/components/date-range-picker';

interface DateRangeSelectorProps {
  selectedDateRange: {
    from: string;
    to: string;
  } | null;
  onDateRangeUpdate: (formattedRange: { from: string; to: string }) => void;
}

export const DateRangeSelector = ({
  onDateRangeUpdate,
}: DateRangeSelectorProps) => {
  const formatDateToDateOnly = (date: Date): string => {
    // Use local date methods to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`; // Returns YYYY-MM-DD format
  };

  const handleDateRangeUpdate = (values: {
    range: { from: Date; to: Date | undefined };
    rangeCompare?: { from: Date; to: Date | undefined };
  }) => {
    const formattedRange = {
      from: formatDateToDateOnly(values.range.from),
      to: values.range.to
        ? formatDateToDateOnly(values.range.to)
        : formatDateToDateOnly(values.range.from),
    };

    onDateRangeUpdate(formattedRange);

    console.log("Selected Date Range:", {
      from: values.range.from,
      to: values.range.to,
    });

    console.log("Formatted Date Range (Date Only):", formattedRange);
  };

  return (
    <div className="flex gap-3">
      <DateRangePicker onUpdate={handleDateRangeUpdate} />
    </div>
  );
};
