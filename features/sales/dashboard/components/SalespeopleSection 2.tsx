import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface Salesperson {
  name: string;
  assigned: number;
  outstanding: number;
  overdueFollowUps: number;
}

interface SalespeopleSectionProps {
  salespeople: Salesperson[];
}

const SalespeopleSection = ({ salespeople }: SalespeopleSectionProps) => {
  // Helper function to format money
  const money = (x: number | undefined) => {
    if (!x) return "—";
    return `KES ${x.toLocaleString()}`;
  };

  // Helper function to get initials
  const initials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <div className="p-4 border rounded-xl">
      <div className="mb-6">
        <h3 className="font-bold text-gray-900 text-xl">
          Outstanding – Salespeople
        </h3>
        <p className="mt-1 text-gray-600">
          Assignments, outstanding amounts, and overdue follow-ups
        </p>
      </div>
      <div className="gap-4 grid grid-cols-1 md:grid-cols-3">
        {salespeople.map((sp) => (
          <div
            key={sp.name}
            className="hover:shadow-sm p-4 border rounded-lg transition-all duration-300"
          >
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="font-semibold text-sm">
                  {initials(sp.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">
                  {sp.name}
                </p>
                <Badge variant="secondary" className="text-xs">
                  {sp.assigned} properties
                </Badge>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Outstanding:</span>
                <span className="ml-2 font-semibold text-gray-900 truncate">
                  {money(sp.outstanding)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Overdue follow-ups:</span>
                <span className="font-semibold text-gray-900">
                  {sp.overdueFollowUps}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SalespeopleSection;
