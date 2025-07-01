import axios from 'axios';

const api = axios.create({
  baseURL: 'https://nuzlocke-api.zyndoras.de/api',
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
  // Wenn die Antwort erfolgreich ist (Status 2xx), gib sie einfach weiter
  (response) => {
    return response;
  },
  // Wenn die Antwort einen Fehler hat...
  (error) => {
    // Prüfe, ob der Fehler ein 401 "Unauthorized" Status ist
    if (error.response && error.response.status === 401) {
      // Dein Token ist ungültig oder abgelaufen
      console.log('Sitzung abgelaufen, automatischer Logout.');
      
      // Führe die Logout-Logik aus
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Leite den Nutzer zur Login-Seite weiter und lade die Seite neu, um alles zurückzusetzen
      window.location.href = '/login';
    }
    
    // Leite andere Fehler normal weiter
    return Promise.reject(error);
  }
);


export default api;
