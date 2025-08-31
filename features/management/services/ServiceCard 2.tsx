import { FC } from "react";
import { PropertyServiceCard } from "./schema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Image as ImageIcon, FolderOpen } from "lucide-react";

interface ServiceCardProps {
  serviceCard: PropertyServiceCard;
}

const statusColors: Record<string, string> = {
  active: "bg-green-500 text-white",
  paused: "bg-yellow-400 text-white",
  cancelled: "bg-gray-400 text-white",
};

const ServiceCard: FC<ServiceCardProps> = ({ serviceCard }) => {
  const { name, status, thumbnail, services, start_date, end_date, descendant, project_id } = serviceCard;
  const displayServices = services.slice(0, 2);
  const extraCount = services.length - 2;

  // Assume project profile URL pattern:
  const projectUrl = `/projects/${project_id}`;

  return (
    <Card className="flex overflow-hidden flex-col h-full rounded-xl border shadow-sm">
      <div className="flex overflow-hidden relative justify-center items-center w-full h-60 bg-gray-200 group">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={name}
            className="object-cover w-full h-60"
          />
        ) : (
          <div className="flex justify-center items-center w-full h-60">
            <ImageIcon size={48} className="text-gray-300" />
          </div>
        )}
      </div>
      <div className="flex relative flex-col flex-1 gap-2 p-4">
        {/* Project link icon */}
        <a
          href={projectUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Open project profile"
          className="absolute top-2 right-2 text-gray-400 transition-colors hover:text-primary"
          tabIndex={0}
        >
          <FolderOpen size={20} />
        </a>
        <div className="text-lg font-bold truncate" title={name}>
          {name}
        </div>
        {descendant && (
          <div className="text-xs truncate text-muted-foreground">
            {descendant}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {displayServices.map((service) => (
            <Badge key={service.id} variant="secondary" className="text-xs">
              {service.name}
            </Badge>
          ))}
          {extraCount > 0 && (
            <Badge variant="outline" className="text-xs bg-gray-100">
              +{extraCount}
            </Badge>
          )}
        </div>
        {(start_date || end_date) && (
          <div className="mt-2 text-xs text-muted-foreground">
            {start_date || "?"} – {end_date || "?"}
          </div>
        )}
      </div>
    </Card>
  );
};

export default ServiceCard; 