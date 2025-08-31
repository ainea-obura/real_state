import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { useForm, FormProvider } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { fetchMediaProjects } from '@/actions/managements/media';
import { fetchVendorTable } from '@/actions/finance/vendor';

const statusOptions = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];
const priorities = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];
const vendorOptions = [
  // Removed static options; will fetch from backend
];

const nodeSchema = z.object({
  project: z.string().min(1, 'Project is required'),
  block: z.string().optional(),
  unit: z.string().optional(),
});

const infoSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: z.string().min(1, 'Status is required'),
  priority: z.string().min(1, 'Priority is required'),
  vendor: z.string().min(1, 'Vendor is required'),
  // created_by: z.string().optional(), // Optionally add if needed
});

interface CreateMaintenanceModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  loading?: boolean;
}

const initialNode = { project: '', block: '', unit: '' };
const initialInfo = { title: '', description: '', status: '', priority: '', vendor: '' };

const CreateMaintenanceModal: React.FC<CreateMaintenanceModalProps> = ({ open, onClose, onSubmit, loading }) => {
  const [step, setStep] = useState(1);
  const nodeForm = useForm({
    resolver: zodResolver(nodeSchema),
    defaultValues: initialNode,
    mode: 'onTouched',
  });
  const infoForm = useForm({
    resolver: zodResolver(infoSchema),
    defaultValues: initialInfo,
    mode: 'onTouched',
  });
  const [projectSearch, setProjectSearch] = useState('');

  // Use React Query to fetch projects from real API
  const { data: projectsData, isLoading: isProjectLoading } = useQuery({
    queryKey: ['media-projects', projectSearch],
    queryFn: () => fetchMediaProjects({ q: projectSearch }),
    enabled: open && projectSearch.length > 0,
    staleTime: 5 * 60 * 1000,
  });
  const projectResults = projectsData?.data.results || [];

  // Fetch vendors from backend
  const {
    data: vendorTable,
    isLoading: isVendorLoading,
    isError: isVendorError,
    refetch: refetchVendors,
  } = useQuery({
    queryKey: ['vendor-table'],
    queryFn: () => fetchVendorTable({ isDropdown: true }),
    enabled: open,
  });
  const vendorOptions = Array.isArray(vendorTable?.results)
    ? vendorTable.results.map((vendor: any) => ({ value: vendor.id, label: vendor.name }))
    : [];

  // Find selected project/block/unit/house
  const selectedProject = useMemo(() => projectResults.find((p: any) => p.id === nodeForm.watch('project')), [projectResults, nodeForm.watch('project')]);
  // Blocks: BLOCK, HOUSE, BASEMENT
  const blocks = useMemo(() =>
    (selectedProject?.children || []).filter((b: any) => b.node_type === 'BLOCK' || b.node_type === 'HOUSE' || b.node_type === 'BASEMENT'),
    [selectedProject]
  );
  const selectedBlock = useMemo(() => blocks.find((b: any) => b.id === nodeForm.watch('block')), [blocks, nodeForm.watch('block')]);
  const isHouse = selectedBlock?.node_type === 'HOUSE';
  const isBasement = selectedBlock?.node_type === 'BASEMENT';
  // Floors: only for BLOCK
  const floors = useMemo(() =>
    selectedBlock && selectedBlock.node_type === 'BLOCK'
      ? (selectedBlock.children || []).filter((f: any) => f.node_type === 'FLOOR')
      : [],
    [selectedBlock]
  );

  useEffect(() => {
    nodeForm.setValue('block', '');
    nodeForm.setValue('unit', '');
  }, [nodeForm.watch('project')]);
  useEffect(() => {
    nodeForm.setValue('unit', '');
  }, [nodeForm.watch('block')]);

  useEffect(() => {
    if (!open) {
      setStep(1);
      nodeForm.reset(initialNode);
      infoForm.reset(initialInfo);
      setProjectSearch('');
    }
  }, [open]);

  const handleNodeNext = async () => {
    const valid = await nodeForm.trigger();
    if (valid) setStep(2);
  };

  const handleInfoSubmit = async (data: any) => {
    const nodeData = nodeForm.getValues();
    let node_id = '';
    // Node selection logic: match MediaUploadModal
    if (isHouse || isBasement) {
      node_id = nodeData.block || '';
    } else if (nodeData.unit) {
      node_id = nodeData.unit || '';
    } else if (nodeData.block) {
      node_id = nodeData.block || '';
    } else {
      node_id = nodeData.project || '';
    }
    // Prepare payload
    const payload: any = {
      node_id,
      vendor_id: data.vendor,
      title: data.title,
      status: data.status,
      priority: data.priority,
    };
    if (data.description && data.description.trim() !== '') {
      payload.description = data.description;
    }
    onSubmit(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Maintenance Request</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2 items-center mb-4">
          <div className={`h-2 w-2 rounded-full ${step === 1 ? 'bg-primary' : 'bg-gray-300'}`}></div>
          <div className={`h-2 w-2 rounded-full ${step === 2 ? 'bg-primary' : 'bg-gray-300'}`}></div>
        </div>
        {step === 1 && (
          <FormProvider {...nodeForm}>
            <form className="space-y-8" onSubmit={e => { e.preventDefault(); handleNodeNext(); }}>
              <div>
                <label className="block mb-1 text-sm font-medium">Project</label>
                <div className="relative">
                  <Input
                    placeholder="Search project..."
                    value={projectSearch}
                    onChange={e => setProjectSearch(e.target.value)}
                    className="pr-10"
                    disabled={loading}
                  />
                  <Search className="top-2.5 right-2 absolute w-4 h-4 text-muted-foreground" />
                </div>
                {projectSearch.length > 0 && (
                  <div className="overflow-y-auto absolute z-20 mt-2 w-full max-h-32 bg-white rounded border shadow-sm">
                    {isProjectLoading ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">Loading...</div>
                    ) : projectResults.length ? (
                      projectResults.map((p: any) => (
                        <div
                          key={p.id}
                          className={`px-3 py-2 cursor-pointer hover:bg-primary/10 ${nodeForm.watch('project') === p.id ? 'bg-primary/10 font-semibold' : ''}`}
                          onClick={() => {
                            nodeForm.setValue('project', p.id, { shouldValidate: true });
                            setProjectSearch(p.name); // Set to project name, not empty string
                          }}
                        >
                          {p.name}
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-muted-foreground">No projects found</div>
                    )}
                  </div>
                )}
                {nodeForm.formState.errors.project && <div className="mt-1 text-xs text-red-600">{nodeForm.formState.errors.project.message as string}</div>}
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block mb-1 text-sm font-medium">Block / House</label>
                  <Select
                    value={nodeForm.watch('block')}
                    onValueChange={val => nodeForm.setValue('block', val)}
                    disabled={!selectedProject || loading}
                  >
                    <SelectTrigger className="w-full !h-11">
                      <SelectValue placeholder="Select block or house" />
                    </SelectTrigger>
                    <SelectContent>
                      {blocks.map((b: any) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.node_type === 'HOUSE' ? 'House: ' : b.node_type === 'BASEMENT' ? 'Basement: ' : 'Block: '}{b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Unit Dropdown (grouped by floor) - only for BLOCK */}
                {!(isHouse || isBasement) && (
                  <div className="flex-1">
                    <label className="block mb-1 text-sm font-medium">Unit (optional)</label>
                    <Select
                      value={nodeForm.watch('unit')}
                      onValueChange={val => nodeForm.setValue('unit', val)}
                      disabled={!selectedBlock || loading}
                    >
                      <SelectTrigger className="w-full !h-11">
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {floors.map((floor: any) => {
                          const floorUnits = floor.children.filter((u: any) => u.node_type === 'UNIT');
                          if (floorUnits.length === 0) return null;
                          return (
                            <React.Fragment key={floor.id}>
                              <div className="px-2 py-1 mt-2 mb-1 text-xs font-semibold rounded bg-muted/50 text-muted-foreground">
                                {floor.name}
                              </div>
                              {floorUnits.map((u: any) => (
                                <SelectItem key={u.id} value={u.id} className="pl-6">{u.name}</SelectItem>
                              ))}
                            </React.Fragment>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
                <Button type="submit" variant="default" disabled={loading}>
                  Next
                </Button>
              </DialogFooter>
            </form>
          </FormProvider>
        )}
        {step === 2 && (
          <FormProvider {...infoForm}>
            <form className="space-y-8" onSubmit={infoForm.handleSubmit(handleInfoSubmit)}>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className="block mb-1 text-sm font-medium">Title</label>
                  <Input
                    placeholder="Title"
                    {...infoForm.register('title')}
                    disabled={loading}
                    className="w-full"
                  />
                  {infoForm.formState.errors.title && <div className="mt-1 text-xs text-red-600">{infoForm.formState.errors.title.message as string}</div>}
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium">Status</label>
                  <Select
                    value={infoForm.watch('status')}
                    onValueChange={val => infoForm.setValue('status', val)}
                    disabled={loading}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {infoForm.formState.errors.status && <div className="mt-1 text-xs text-red-600">{infoForm.formState.errors.status.message as string}</div>}
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium">Priority</label>
                  <Select
                    value={infoForm.watch('priority')}
                    onValueChange={val => infoForm.setValue('priority', val)}
                    disabled={loading}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {priorities.map(p => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {infoForm.formState.errors.priority && <div className="mt-1 text-xs text-red-600">{infoForm.formState.errors.priority.message as string}</div>}
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium">Vendor</label>
                  <Select
                    value={infoForm.watch('vendor')}
                    onValueChange={val => infoForm.setValue('vendor', val)}
                    disabled={loading || isVendorLoading || isVendorError}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={isVendorLoading ? 'Loading vendors...' : isVendorError ? 'Failed to load vendors' : 'Select Vendor'} />
                    </SelectTrigger>
                    <SelectContent>
                      {isVendorLoading && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">Loading...</div>
                      )}
                      {isVendorError && (
                        <div className="px-3 py-2 text-sm text-red-500">Failed to load vendors</div>
                      )}
                      {!isVendorLoading && !isVendorError && vendorOptions.length > 0 &&
                        vendorOptions.map(v => (
                          <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                        ))}
                      {!isVendorLoading && !isVendorError && vendorOptions.length === 0 && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">No vendors found</div>
                      )}
                    </SelectContent>
                  </Select>
                  {infoForm.formState.errors.vendor && <div className="mt-1 text-xs text-red-600">{infoForm.formState.errors.vendor.message as string}</div>}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block mb-1 text-sm font-medium">Description</label>
                <Textarea
                  placeholder="Description (optional)"
                  {...infoForm.register('description')}
                  disabled={loading}
                  rows={4}
                  className="w-full"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={loading}>Back</Button>
                <Button type="submit" variant="default" disabled={loading}>
                  {loading ? 'Creating...' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </FormProvider>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateMaintenanceModal; 