import axios from "axios";

export const BASE_URL = "http://127.0.0.1:8000";

const API = axios.create({
  baseURL: BASE_URL,
});

API.interceptors.request.use((config) => {
  if (config.headers.Authorization) return config;
  const token = localStorage.getItem("token");
  const adminToken = localStorage.getItem("admin_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (adminToken) {
    config.headers.Authorization = `Bearer ${adminToken}`;
  }
  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401 && localStorage.getItem("admin_token")) {
      localStorage.removeItem("admin_token");
      if (window.location.pathname.startsWith("/admin")) {
        window.location.reload();
      }
    }
    return Promise.reject(error);
  }
);

export const loginAPI          = (email, password) => API.post("/auth/login", { email, password });
export const getDashboard      = (id, source) => API.get(`/faculty/${id}/dashboard`, { params: source && source !== "all" ? { source } : {} });
export const getPublications   = (params) => API.get("/publications/", { params });
export const getPublication    = (id) => API.get(`/publications/${id}`);
export const getPubCounts      = (params) => API.get("/publications/stats/counts", { params });
export const addPublication    = (data) => API.post("/publications/", data);
export const updatePublication = (id, data) => API.put(`/publications/${id}`, data);
export const deletePublication = (id) => API.delete(`/publications/${id}`);
export const getDepartments    = (school_id) => API.get("/publications/pub-depts", { params: { school_id } });
export const getSchools        = () => API.get("/publications/pub/schools");
export const getMyProfile      = () => API.get("/faculty/me/profile");

// ── Security / password ────────────────────────────────────────────────
export const forgotPasswordRequest = (identifier) => API.post("/security/forgot-password/request", { identifier });
export const forgotPasswordVerify  = (otp, identifier) => API.post("/security/forgot-password/verify", { otp, identifier });
export const forgotPasswordReset   = (data) => API.post("/security/forgot-password/reset", data);
export const getChangePasswordOptions  = () => API.post("/security/change-password/options");
export const changePasswordRequest = (purpose) => API.post("/security/change-password/request", { purpose });
export const changePasswordVerify  = (otp) => API.post("/security/change-password/verify", { otp });
export const changePasswordConfirm = (data) => API.post("/security/change-password/confirm", data);
export const emailChangePasswordRequest = (email) => API.post("/security/change-password/email/request", { email });
export const emailChangePasswordVerify  = (otp) => API.post("/security/change-password/email/verify", { otp });
export const emailChangePasswordConfirm = (data) => API.post("/security/change-password/email/confirm", data);
export const getAccountInfo    = () => API.get("/security/account-info");
export const updateAccountInfo = (data) => API.put("/security/account-info", data);
export const verifyAccountInfo = (field, otp) => API.post("/security/account-info/verify", { field, otp });
export const checkPasswordStrength = (password) => API.post("/security/password/strength", { password });

// Admin security
export const getSecurityOverview = () => API.get("/admin/security/overview");
export const getSecurityLogs     = (params) => API.get("/admin/security/logs", { params });
export const getSecurityFaculty  = (id) => API.get(`/admin/security/faculty/${id}`);
export const adminVerifyContact   = (id, field) => API.post(`/admin/security/faculty/${id}/verify-contact`, { field });
export const adminResetPassword   = (id, new_password) => API.post(`/admin/security/faculty/${id}/reset-password`, { new_password });
export const adminForceReset      = (id) => API.post(`/admin/security/faculty/${id}/force-reset`);
export const adminUnlock          = (id) => API.post(`/admin/security/faculty/${id}/unlock`);

// Admin bulk import
export const adminImportRows     = (entity, mode, rows, dryRun) => API.post(`/admin/import/${entity}`, { mode, dry_run: dryRun, rows });
export const adminImportFile     = (entity, file, mode, dryRun) => {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("mode", mode);
  fd.append("dry_run", dryRun);
  return API.post(`/admin/import/${entity}/file`, fd);
};
export const getImportTemplate = (entity, fmt, sample) =>
  API.get(`/admin/import/template/${entity}`, { params: { fmt, sample }, responseType: "blob" });

export default API;
