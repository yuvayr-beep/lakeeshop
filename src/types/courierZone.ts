export interface CourierZone {
  id: number;
  courierId: number;
  courierCode?: string;
  courierName?: string;
  shipMode: string;
  zoneCode: string;
  zoneName: string;
  status?: boolean;
  createdBy?: number;
  updatedBy?: number;
  createdByName?: string;
  updatedByName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CourierZoneFormData {
  shipMode: string;
  zoneCode: string;
  zoneName: string;
}
