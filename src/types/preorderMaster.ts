export interface PreorderShortageReason {
  id: number;
  reasonCode: string;
  reasonName: string;
  description: string;
  status: boolean;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}
