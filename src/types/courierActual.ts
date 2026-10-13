export interface CourierActual {
  id: number;
  courierCode: string;
  courierName?: string;
  awbNumber: string;
  billedWeight: number;
  actualCost: number;
  createdAt?: string;
  createdBy?: number;
  createdByName?: string;
}

export interface CourierActualFormData {
  courierCode: string;
  awbNumber: string;
  billedWeight: number | '';
  actualCost: number | '';
}
