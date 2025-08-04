import axios from 'axios'
const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api`;

const axiosInstance = axios.create({
  baseURL: apiUrl,
  withCredentials: true,
});

export default axiosInstance;
