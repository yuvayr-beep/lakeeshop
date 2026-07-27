export interface CourierService {
  id: number;
  courierId: number;
  serviceCode: string;
  serviceName: string;
  serviceType: 'SURFACE' | 'DP' | 'BOTH' | string;
  description: string;
  attributes: string;
  status?: boolean;
  createdBy?: number;
  updatedBy?: number;
  createdByName?: string;
  updatedByName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CourierServiceFormData {
  courierId: number;
  serviceCode: string;
  serviceName: string;
  serviceType: string;
  description: string;
  attributes: string;
}
