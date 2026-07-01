import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true // Essential for holding secure Flask session cookie references
});

export default api;