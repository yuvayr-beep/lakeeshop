export interface CourierRate {
  id: number;
  courierId: number;
  courierCode?: string;
  courierName?: string;
  shipMode: string;
  zoneId: number;
  zoneCode?: string;
  zoneName?: string;
  slabStart: number;
  slabEnd: number;
  rate: number;
  status?: boolean;
  createdBy?: number;
  updatedBy?: number;
  createdByName?: string;
  updatedByName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CourierRateFormData {
  shipMode: string;
  zoneId: number | '';
  slabStart: number | '';
  slabEnd: number | '';
  rate: number | '';
}
