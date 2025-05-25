import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { persistReducer, persistStore } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import {
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';

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

const persistConfig = {
  key: 'navigation',
  storage,
};

const persistedNavigationReducer = persistReducer(persistConfig, navigationSlice.reducer);

export const store = configureStore({
  reducer: {
    navigation: persistedNavigationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 