import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CourierPartner } from '@/types/courier';

interface CourierState {
  selectedCourierId: number | null;
  selectedCourier: CourierPartner | null;
}

const initialState: CourierState = {
  selectedCourierId: null,
  selectedCourier: null,
};

const courierSlice = createSlice({
  name: 'courier',
  initialState,
  reducers: {
    selectCourier(state, action: PayloadAction<CourierPartner>) {
      state.selectedCourierId = action.payload.id;
      state.selectedCourier = action.payload;
      if (typeof window !== 'undefined') {
        localStorage.setItem('selectedCourier', JSON.stringify(action.payload));
      }
    },
    setSelectedCourierId(state, action: PayloadAction<number>) {
      state.selectedCourierId = action.payload;
    },
    clearSelectedCourier(state) {
      state.selectedCourierId = null;
      state.selectedCourier = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('selectedCourier');
      }
    },
  },
});

export const { selectCourier, setSelectedCourierId, clearSelectedCourier } = courierSlice.actions;
export default courierSlice.reducer;
