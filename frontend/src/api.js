const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

async function request(path, options = {}) {
  const token = localStorage.getItem("solarflow-token");
  const headers = { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      message = body.detail || message;
    } catch {
      // Keep the HTTP status message when the server does not return JSON.
    }
    throw new Error(message);
  }
  if (response.status === 204) return null;
  const type = response.headers.get("content-type") || "";
  if (type.includes("text/csv")) return response.blob();
  return response.json();
}

const json = (method, body) => ({ method, body: JSON.stringify(body) });

export const api = {
  login: (body) => request("/auth/login", json("POST", body)),
  register: (body) => request("/auth/register", json("POST", body)),
  logout: () => request("/auth/logout", { method: "POST" }),
  me: () => request("/auth/me"),
  dashboard: () => request("/dashboard"),
  enquiries: (params = "") => request(`/enquiries${params ? `?${params}` : ""}`),
  enquiry: (id) => request(`/enquiries/${id}`),
  saveEnquiry: (body, id) => request(id ? `/enquiries/${id}` : "/enquiries", json(id ? "PUT" : "POST", body)),
  deleteEnquiry: (id) => request(`/enquiries/${id}`, { method: "DELETE" }),
  followups: (includeCompleted = true) => request(`/follow-ups?include_completed=${includeCompleted}`),
  addFollowup: (body) => request("/follow-ups", json("POST", body)),
  completeFollowup: (id, completed) => request(`/follow-ups/${id}?completed=${completed}`, { method: "PATCH" }),
  deleteFollowup: (id) => request(`/follow-ups/${id}`, { method: "DELETE" }),
  customers: () => request("/customers"),
  employees: () => request("/employees"),
  addEmployee: (body) => request("/employees", json("POST", body)),
  deleteEmployee: (id) => request(`/employees/${id}`, { method: "DELETE" }),
  reports: () => request("/reports"),
  exportReports: () => request("/reports/export"),
};
