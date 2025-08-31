import { DateRangePicker } from '../../../components/date-range-picker';

interface DateRange {
  from: Date;
  to?: Date;
}

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const DateRangeFilter = ({ value, onChange }: DateRangeFilterProps) => {
  return (
    <div>
      <DateRangePicker
        initialDateFrom={value.from}
        initialDateTo={value.to}
        onUpdate={({ range }) => onChange(range)}
        align="start"
        showCompare={false}
      />
    </div>
  );
};

export default DateRangeFilter;
