import { LucideIcon } from 'lucide-react';

interface SideBarCardProps {
  icon: LucideIcon;
  title: string;
  value: string;
  desc: string;
}

const SideBarCard: React.FC<SideBarCardProps> = ({
  icon: Icon,
  title,
  value,
  desc,
}) => {
  return (
    <div className="flex items-center gap-4 hover:bg-primary/10 p-4 border rounded-md w-full h-full min-h-32 transition-all duration-300 ease-in-out cursor-pointer">
      <div className="bg-primary/10 p-4 rounded-md text-secondary-foreground">
        <Icon />
      </div>

      <div className="flex flex-col w-full">
        <h1 className="font-medium text-gray-500 text-sm">{title}</h1>
        <p className="text-gray-400 text-sm">{desc}</p>
        <p className="font-semibold text-primary text-xl">{value}</p>
      </div>
    </div>
  );
};

export default SideBarCard;
