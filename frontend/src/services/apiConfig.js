const useDevProxy =
  ['https', 'tunnel'].includes(import.meta.env.MODE) && window.location.protocol === 'https:';

export const backendUrl = useDevProxy
  ? window.location.origin
  : import.meta.env.VITE_BACKEND_URL || `${window.location.protocol}//${window.location.hostname}:3000`;
