import { FC } from "react";
import { DateRangePicker } from "@/components/date-range-picker";

interface DateRangeFilterProps {
  value: { from: Date | undefined; to: Date | undefined };
  onChange: (range: { from: Date | undefined; to: Date | undefined }) => void;
}

const DateRangeFilter: FC<DateRangeFilterProps> = ({ value, onChange }) => {
  // Adapt to DateRangePicker's onUpdate signature
  return (
    <div className="mb-4">
      <DateRangePicker
        initialDateFrom={value.from}
        initialDateTo={value.to}
        onUpdate={({ range }) => onChange(range)}
        showCompare={false}
      />
    </div>
  );
};

export default DateRangeFilter; 