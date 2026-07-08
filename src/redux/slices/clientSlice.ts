import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Client {
  id: number;
  clientCode: string;
  clientName: string;
  legalName: string;
  logoUrl?: string;
  status: number;
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: number;
  createdByName?: string;
  updatedBy?: number;
  updatedByName?: string;
}

interface ClientState {
  selectedClientId: number | null;
  selectedClient: Client | null;
}

const initialState: ClientState = {
  selectedClientId: null,
  selectedClient: null,
};

const clientSlice = createSlice({
  name: 'client',
  initialState,
  reducers: {
    selectClient(state, action: PayloadAction<Client>) {
      state.selectedClientId = action.payload.id;
      state.selectedClient = action.payload;
    },
    clearSelectedClient(state) {
      state.selectedClientId = null;
      state.selectedClient = null;
    },
  },
});

export const { selectClient, clearSelectedClient } = clientSlice.actions;
export default clientSlice.reducer;
