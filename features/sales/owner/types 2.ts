export interface PropertyReservation {
  id: string;
  propertyId: string;
  propertyName: string;
  projectName: string;
  reservationType: 'temporary' | 'conditional' | 'priority';
  duration: number; // in days
  startDate: string;
  endDate: string;
  reservationFee: number;
  notes?: string;
  status: 'active' | 'expired' | 'cancelled' | 'converted';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  assignedTo?: string;
}

export interface CreatePropertyReservationRequest {
  propertyId: string;
  reservationType: 'temporary' | 'conditional' | 'priority';
  duration: number;
  startDate: string;
  endDate: string;
  reservationFee: number;
  notes?: string;
}

export interface PropertyReservationResponse {
  success: boolean;
  message: string;
  data?: PropertyReservation;
  error?: string;
}

export interface PropertyReservationListResponse {
  success: boolean;
  message: string;
  data: {
    count: number;
    results: PropertyReservation[];
  };
  error?: string;
}
