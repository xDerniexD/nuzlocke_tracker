import axios from 'axios';

// Lese die Basis-URL aus der Umgebungsvariable
const API_URL = `${import.meta.env.VITE_API_BASE_URL}/api`;

const api = axios.create({
  // KORREKTUR: Verwende die vollständige URL aus der Variable
  baseURL: API_URL,
});

// Request Interceptor: Fügt den Token VOR jeder Anfrage hinzu
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Der "Wächter" für Antworten
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      console.log('Sitzung abgelaufen, automatischer Logout.');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;