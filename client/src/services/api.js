import axios from 'axios';

const getBaseURL = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return '/api';
  }
  return 'http://localhost:5000/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
});

api.interceptors.request.use((config) => {
  config.metadata = { startTime: new Date() };
  return config;
});

api.interceptors.response.use(
  (response) => {
    const duration = new Date() - response.config.metadata.startTime;
    console.log(`[Frontend] request to ${response.config.url}: ${duration} ms`);
    return response;
  },
  (error) => {
    if (error.config && error.config.metadata) {
      const duration = new Date() - error.config.metadata.startTime;
      console.log(`[Frontend] request error to ${error.config.url}: ${duration} ms`);
    }
    return Promise.reject(error);
  }
);

export default api;
