import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Supplier {
  id: number;
  supplierCode: string;
  name: string;
  legalName: string;
  gstin?: string;
  pan?: string;
  website?: string;
  gstType?: string;
  categoryId?: number;
  leadDays?: number;
  defaultDiscountPercent?: number;
  usesOwnProductCode?: boolean;
  paymentTermsDays?: number;
  creditLimit?: number;
  preferredSupplier?: boolean;
  remarks?: string;
  status: number;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: number;
  createdByName?: string;
  updatedBy?: number;
  updatedByName?: string;
}

interface SupplierState {
  selectedSupplierId: number | null;
  selectedSupplier: Supplier | null;
}

const initialState: SupplierState = {
  selectedSupplierId: null,
  selectedSupplier: null,
};

const supplierSlice = createSlice({
  name: 'supplier',
  initialState,
  reducers: {
    selectSupplier(state, action: PayloadAction<Supplier>) {
      state.selectedSupplierId = action.payload.id;
      state.selectedSupplier = action.payload;
    },
    clearSelectedSupplier(state) {
      state.selectedSupplierId = null;
      state.selectedSupplier = null;
    },
  },
});

export const { selectSupplier, clearSelectedSupplier } = supplierSlice.actions;
export default supplierSlice.reducer;
