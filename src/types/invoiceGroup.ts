export interface InvoiceGroupDetail {
  id?: number;
  clientId: number;
  programId: number;
  courierServiceId: number;
  shipMode: string;
}

export interface InvoiceGroup {
  id: number;
  groupName: string;
  remarks: string;
  sequenceNo: number;
  status: boolean;
  details: InvoiceGroupDetail[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateInvoiceGroupPayload {
  groupName: string;
  remarks: string;
  sequenceNo: number;
  details: {
    clientId: number;
    programId: number;
    courierServiceId: number;
    shipMode: string;
  }[];
}

export interface EditInvoiceGroupPayload {
  groupName: string;
  remarks: string;
  sequenceNo: number;
  details: {
    id?: number;
    clientId: number;
    programId: number;
    courierServiceId: number;
    shipMode: string;
  }[];
}

export interface BusinessUnit {
  id: number;
  clientId: number;
  unitCode?: string;
  unitName?: string;
  merchantId?: string;
  legalName?: string;
  dispatchWithinDays?: number;
  deliverWithinDays?: number;
  hasOwnProductCode?: boolean;
  hasMultiProductOrder?: boolean;
  hasProgram?: boolean;
  status?: number;
}

export interface ClientItem {
  id: number;
  clientCode: string;
  clientName: string;
  legalName?: string;
  logoUrl?: string;
  status?: number;
  remarks?: string;
  businessUnits?: BusinessUnit[];
}

export interface ClientProgram {
  id: number;
  businessUnitId: number;
  programCode: string;
  programName: string;
  programLabel?: string;
  poweredByDescription?: string;
  allowRpi?: boolean;
  tatHours?: number;
  status?: number;
}

export interface CourierServiceItem {
  id: number;
  courierId: number;
  serviceCode: string;
  serviceName: string;
  serviceType: string;
  description?: string;
  attributes?: string;
  status?: boolean;
}
