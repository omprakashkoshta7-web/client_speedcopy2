import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface LoadingContextType {
  isLoading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const LoadingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [requestCount, setRequestCount] = useState(0);

  const startLoading = useCallback(() => {
    setRequestCount(c => c + 1);
  }, []);

  const stopLoading = useCallback(() => {
    setRequestCount(c => Math.max(0, c - 1));
  }, []);

  return (
    <LoadingContext.Provider value={{ isLoading: requestCount > 0, startLoading, stopLoading }}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => {
  const ctx = useContext(LoadingContext);
  if (!ctx) throw new Error('useLoading must be used within LoadingProvider');
  return ctx;
};
