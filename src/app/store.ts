import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';

interface NavigationState {
  selectedMenu: string | null;
  selectedSubMenu: string | null;
}

const initialState: NavigationState = {
  selectedMenu: null,
  selectedSubMenu: null,
};

const navigationSlice = createSlice({
  name: 'navigation',
  initialState,
  reducers: {
    selectMenu(state, action: PayloadAction<{ menu: string; subMenu: string | null }>) {
      state.selectedMenu = action.payload.menu;
      state.selectedSubMenu = action.payload.subMenu;
    },
  },
});

export const { selectMenu } = navigationSlice.actions;

export const store = configureStore({
  reducer: {
    navigation: navigationSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 