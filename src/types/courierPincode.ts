export interface ServiceablePincode {
  id: number;
  courierId?: number;
  courierCode?: string;
  courierName?: string;
  courierServiceId?: number;
  shipMode?: string;
  serviceCode?: string;
  serviceName?: string;
  serviceType?: string;
  pincode: string;
  zoneId?: number;
  zoneCode?: string;
  zoneName?: string;
  courierCityName?: string;
  cityName?: string;
  stateName?: string;
  handlingCityCode?: string;
  handlingBranchCode?: string;
  codAvailable?: boolean;
  prepaidAvailable?: boolean;
  expectedDeliveryDays?: number;
  status?: boolean;
  active?: boolean;
  remarks?: string | null;
  createdBy?: number;
  updatedBy?: number;
  createdByName?: string;
  updatedByName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ServiceablePincodeFormData {
  courierServiceId: number | '';
  pincode: string;
  codAvailable: boolean;
  prepaidAvailable: boolean;
  expectedDeliveryDays: number | '';
  active: boolean;
}

export interface BulkPincodeItem {
  courierCode: string;
  serviceCode?: string;
  shipMode: string;
  zoneCode: string;
  pincode: string;
  cityName: string;
  handlingCityCode: string;
  handlingBranchCode: string;
  stateName: string;
  stateCode: string;
}

export interface BulkBlockUnblockPayload {
  courierId: number;
  shipMode: string;
  pincodes: string[];
  remarks: string;
  block: boolean;
}
