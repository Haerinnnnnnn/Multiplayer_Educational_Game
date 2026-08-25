const useDevProxy =
  ['https', 'tunnel'].includes(import.meta.env.MODE) &&
  window.location.protocol === 'https:' &&
  (import.meta.env.VITE_BACKEND_URL?.includes('127.0.0.1') ||
    import.meta.env.VITE_BACKEND_URL?.includes('localhost') ||
    import.meta.env.VITE_BACKEND_URL?.includes('192.168.'));

export const backendUrl = useDevProxy
  ? window.location.origin
  : import.meta.env.VITE_BACKEND_URL || window.location.origin;
