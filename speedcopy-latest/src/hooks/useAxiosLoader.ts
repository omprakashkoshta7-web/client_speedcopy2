import { useEffect } from 'react';
import apiClient from '../services/api.service';
import { useLoading } from '../context/LoadingContext';

/**
 * Attaches axios interceptors to the global loading bar.
 * Must be called inside a component that is wrapped by LoadingProvider.
 */
const useAxiosLoader = () => {
  const { startLoading, stopLoading } = useLoading();

  useEffect(() => {
    const reqInterceptor = apiClient.interceptors.request.use(
      config => {
        startLoading();
        return config;
      },
      error => {
        stopLoading();
        return Promise.reject(error);
      }
    );

    const resInterceptor = apiClient.interceptors.response.use(
      response => {
        stopLoading();
        return response;
      },
      error => {
        stopLoading();
        return Promise.reject(error);
      }
    );

    return () => {
      apiClient.interceptors.request.eject(reqInterceptor);
      apiClient.interceptors.response.eject(resInterceptor);
    };
  }, [startLoading, stopLoading]);
};

export default useAxiosLoader;
