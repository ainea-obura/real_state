import { FC } from "react";
import { RentalUnit } from "./schema";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Image as ImageIcon } from "lucide-react";

interface RentCardProps {
  rental: RentalUnit;
}

function getDaysRemaining(rental_end: string) {
  const end = new Date(rental_end);
  const today = new Date();
  // Zero out time for both dates
  end.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diff = end.getTime() - today.getTime();
  return Math.max(Math.ceil(diff / (1000 * 60 * 60 * 24)), 0);
}

const RentCard: FC<RentCardProps> = ({ rental }) => {
  const daysRemaining = rental.rental_end ? getDaysRemaining(rental.rental_end) : null;
  return (
    <div className="flex flex-col min-h-[370px] h-full rounded-xl bg-gray-50 border border-gray-200  overflow-hidden">
      {/* Thumbnail with status badge */}
      <div className="flex overflow-hidden relative justify-center items-center w-full h-60 bg-gray-200 group">
        {/* Status badge (opacity on hover) */}
        <span
          className={`absolute top-2 right-2 z-10 px-2 py-1 rounded text-xs font-semibold transition-all duration-200
            opacity-0 group-hover:opacity-100
            ${rental.status === "rented"
              ? "bg-green-500 text-white group-hover:bg-green-200 group-hover:text-green-900"
              : "bg-gray-400 text-white group-hover:bg-gray-200 group-hover:text-gray-900"}
          `}
        >
          {rental.status === "rented" ? "Rented" : "Available"}
        </span>
        {rental.thumbnail ? (
          <img
            src={rental.thumbnail.replace(/^\/public/, "")}
            alt={rental.name}
            className="object-cover w-full h-60"
          />
        ) : (
          <div className="flex flex-col justify-center items-center w-full h-60 text-gray-400">
            <ImageIcon className="mb-1 w-10 h-10" />
            <span className="text-xs">No Image</span>
          </div>
        )}
      </div>
      {/* Header: Name & Location */}
      <CardHeader className="flex flex-row justify-between items-center px-4 pt-3 pb-2 bg-transparent">
        <div className="flex flex-col gap-1 w-full">
          <div className="flex gap-2 items-center">
            <CardTitle className="text-lg font-semibold truncate max-w-[160px]">{rental.name}</CardTitle>
          </div>
          <div className="flex gap-2 items-center pl-0 text-xs text-muted-foreground">
            <span>Block {rental.location_node.block} &rarr; Floor {rental.location_node.floor}</span>
          </div>
        </div>
        <Badge variant="secondary">
          {daysRemaining !== null ? `${daysRemaining} days left` : "-"}
        </Badge>
      </CardHeader>
      {/* Details */}
      <div className="flex flex-col flex-1 justify-between px-4 pb-4 space-y-2">
        {/* Unit Details */}
        <div className="pb-2 space-y-1 border-b border-gray-200 border-dashed">
          <div className="flex gap-2 items-center text-sm">
            <span>{rental.type}</span>
            <span className="mx-2">•</span>
            <span>{rental.size}</span>
          </div>
        </div>
        {/* Tenant & Agent Details */}
        <div className="pt-2 space-y-1">
          <div className="flex gap-2 items-center text-sm">
            <span>
              Tenant: <span className="font-bold text-black">{rental.tenant ? rental.tenant.name : "—"}</span>
            </span>
          </div>
          {rental.agent && (
            <div className="flex gap-2 items-center text-sm">
              <span>
                Agent: <span className="font-bold text-black">{rental.agent ? rental.agent.name : "—"}</span>
              </span>
            </div>
          )}
          {rental.rental_start && rental.rental_end && (
            <div className="flex gap-2 items-center text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>
                {rental.rental_start} - {rental.rental_end}
              </span>
            </div>
          )}
        </div>
        {/* Price at the bottom */}
        <div className="flex gap-2 items-center pt-2 mt-auto text-sm">
          <span className="text-lg font-semibold text-primary">
            {rental.rental_price.toLocaleString()}
          </span>
          <span className="text-muted-foreground">/ month</span>
        </div>
      </div>
    </div>
  );
};

export default RentCard; 