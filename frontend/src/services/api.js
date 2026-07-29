import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:8000",
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const loginAPI          = (email, password) => API.post("/auth/login", { email, password });
export const getDashboard      = (id) => API.get(`/faculty/${id}/dashboard`);
export const getPublications   = (params) => API.get("/publications/", { params });
export const getPublication    = (id) => API.get(`/publications/${id}`);
export const getPubCounts      = (params) => API.get("/publications/stats/counts", { params });
export const addPublication    = (data) => API.post("/publications/", data);
export const updatePublication = (id, data) => API.put(`/publications/${id}`, data);
export const deletePublication = (id) => API.delete(`/publications/${id}`);

export default API;
