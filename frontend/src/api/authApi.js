import axios from 'axios';

const authApi = axios.create({
  baseURL: '/api/auth',
  headers: { 'Content-Type': 'application/json' },
});

export const registerUser = (data) => authApi.post('/register', data);
export const loginUser = (data) => authApi.post('/login', data);
export const getMe = (token) =>
  authApi.get('/me', { headers: { Authorization: `Bearer ${token}` } });
