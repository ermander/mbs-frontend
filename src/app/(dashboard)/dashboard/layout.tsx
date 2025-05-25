"use client";
import { ReactNode } from 'react'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import { Provider } from 'react-redux'
import { store, persistor } from '../../store'
import { PersistGate } from 'redux-persist/integration/react';

export default function DashboardLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'row', margin: "-8px" }}>
          <Sidebar />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh' }}>
            <Header />
            <main style={{ background: '#f5f6f9', flex: 1, minHeight: 0, overflowY: 'auto' }}>
              {children}
            </main>
          </div>
        </div>
      </PersistGate>
    </Provider>
  );
}