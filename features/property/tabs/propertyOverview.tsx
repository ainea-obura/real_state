import { FolderPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';

import Header from '../../projects/profile/tabs/Components/structure/header';

const PropertyOverview = () => {
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <Header
        title="Property Overview"
        description="Overview of the property and its performance."
      >
        <Button>
          <FolderPlus className="w-4 h-4" />
          Add
        </Button>
      </Header>
    </div>
  );
};

export default PropertyOverview;
