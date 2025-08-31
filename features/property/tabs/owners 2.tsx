import { FolderPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';

import Header from '../../projects/profile/tabs/Components/header';
import FeatureCard from './components/featureCard';

const Owners = () => {
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <Header
        title="Property Owners"
        description="Owners of the property and their details."
      >
        <Button>
          <FolderPlus className="w-4 h-4" />
          Add Owner
        </Button>
      </Header>

      <div className="gap-4 grid grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <FeatureCard
            key={index}
            icon={FolderPlus}
            title="Total Units"
            value={index + 1}
          />
        ))}
      </div>
    </div>
  );
};

export default Owners;
