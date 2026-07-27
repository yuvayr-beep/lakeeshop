export interface CourierPartner {
  id: number;
  courierCode: string;
  courierName: string;
  description: string;
  trackingUrlTemplate: string;
  originCityCode: string;
  originBranchCode: string;
  vendorNo: string;
  businessName: string;
  websiteAddress: string;
  emailId: string;
  ccEmailIds: string;
  courierSinceDate: string;
  courierPan: string;
  liabilityType: string;
  liabilityLimitAmt: number;
  fscPercentage: number;
  abwChargeAmount: number;
  dimWeightFactor: number;
  remarks: string;
  thresholdQuantity: number;
  logoUrl: string;
  mandatoryAwbForInvoice: boolean;
  displayProductValue: boolean;
  abwChargeWaiveOff: boolean;
  hasPreAllottedAwb: boolean;
  isEnablePreOrder: boolean;
  attributes: string;
  status?: boolean;
  createdBy?: number;
  updatedBy?: number;
  createdByName?: string;
  updatedByName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CourierFormData {
  courierCode: string;
  courierName: string;
  description: string;
  vendorNo: string;
  businessName: string;
  websiteAddress: string;
  courierSinceDate: string;
  courierPan: string;

  trackingUrlTemplate: string;
  originCityCode: string;
  originBranchCode: string;
  emailId: string;
  ccEmailIds: string;
  logoUrl: string;

  liabilityType: string;
  liabilityLimitAmt: number | '';
  fscPercentage: number | '';
  abwChargeAmount: number | '';
  dimWeightFactor: number | '';
  remarks: string;
  thresholdQuantity: number | '';
  mandatoryAwbForInvoice: boolean;
  displayProductValue: boolean;
  abwChargeWaiveOff: boolean;
  hasPreAllottedAwb: boolean;
  isEnablePreOrder: boolean;
  attributes: string;
}
