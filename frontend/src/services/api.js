import axios from "axios";

export const BASE_URL = "http://127.0.0.1:8000";

const API = axios.create({
  baseURL: BASE_URL,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  const adminToken = localStorage.getItem("admin_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (adminToken) {
    config.headers.Authorization = `Bearer ${adminToken}`;
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
export const getDepartments    = (school_id) => API.get("/publications/pub-depts", { params: { school_id } });
export const getSchools        = () => API.get("/publications/pub/schools");
export const getMyProfile      = () => API.get("/faculty/me/profile");

export default API;
