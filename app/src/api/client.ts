import axios from "axios";

// ------------------------------------------------------------------
// Your laptop's local IP address + the server port.
// Find the IP with `ipconfig` (IPv4 Address). Do NOT use "localhost":
// on the phone, localhost means the phone itself.
// ------------------------------------------------------------------
export const API_URL = "http://192.168.56.1:3000";

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

// ---------- Types (match the JSON the server returns) ----------
export type Role = "owner" | "workshop";
export type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled";

export interface User {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  role: Role;
  workshop_id: number | null;
}

export interface Car {
  id: number;
  owner_id: number;
  make: string;
  model: string;
  year: number | null;
  plate_number: string;
  mileage: number | null;
  photo_url: string | null;
}

export interface Service {
  id: number;
  workshop_id: number;
  name: string;
  price: number | null;
  duration_min: number | null;
}

export interface Workshop {
  id: number;
  user_id: number;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  avg_rating: number;
  services?: Service[];
}

export interface Appointment {
  id: number;
  car_id: number;
  workshop_id: number;
  service_id: number;
  scheduled_at: string;
  status: AppointmentStatus;
  notes: string | null;
  issue_photo_url: string | null;
  service_name: string;
  price: number | null;
  workshop_name: string;
  make: string;
  model: string;
  plate_number: string;
}

// ---------- Error helper: turns any request error into a readable message ----------
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const serverMessage = (error.response?.data as { error?: string } | undefined)?.error;
    if (serverMessage) return serverMessage;
    if (!error.response) return "Can't reach the server. Check the IP in client.ts and that you're on the same Wi-Fi.";
  }
  return "Something went wrong. Please try again.";
}

// ---------- Auth & users ----------
export const authApi = {
  login: (email: string, password: string) =>
    api.post<User>("/auth/login", { email, password }).then((r) => r.data),

  register: (data: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
    role: Role;
    address?: string;
    latitude?: number;
    longitude?: number;
  }) => api.post<User>("/auth/register", data).then((r) => r.data),

  updateProfile: (id: number, data: { fullName: string; phone?: string }) =>
    api.put<User>(`/users/${id}`, data).then((r) => r.data),

  deleteAccount: (id: number) => api.delete(`/users/${id}`),
};

// ---------- Workshops ----------
export const workshopsApi = {
  getAll: () => api.get<Workshop[]>("/workshops").then((r) => r.data),
  getById: (id: number) => api.get<Workshop>(`/workshops/${id}`).then((r) => r.data),
};

// ---------- Cars ----------
export type CarInput = {
  make: string;
  model: string;
  year?: number;
  plateNumber: string;
  mileage?: number;
  photoUrl?: string;
};

export const carsApi = {
  getMine: (ownerId: number) =>
    api.get<Car[]>("/cars", { params: { ownerId } }).then((r) => r.data),
  create: (ownerId: number, car: CarInput) =>
    api.post<Car>("/cars", { ownerId, ...car }).then((r) => r.data),
  update: (id: number, car: CarInput) => api.put<Car>(`/cars/${id}`, car).then((r) => r.data),
  remove: (id: number) => api.delete(`/cars/${id}`),
};

// ---------- Appointments ----------
export const appointmentsApi = {
  getForOwner: (ownerId: number) =>
    api.get<Appointment[]>("/appointments", { params: { ownerId } }).then((r) => r.data),
  getForWorkshop: (workshopId: number) =>
    api.get<Appointment[]>("/appointments", { params: { workshopId } }).then((r) => r.data),
  create: (data: {
    carId: number;
    workshopId: number;
    serviceId: number;
    scheduledAt: string; // e.g. "2026-11-25T10:00"
    notes?: string;
    issuePhotoUrl?: string;
  }) => api.post<Appointment>("/appointments", data).then((r) => r.data),
  setStatus: (id: number, status: Exclude<AppointmentStatus, "pending">) =>
    api.put<Appointment>(`/appointments/${id}/status`, { status }).then((r) => r.data),
  remove: (id: number) => api.delete(`/appointments/${id}`),
};

// ---------- Reviews ----------
export const reviewsApi = {
  create: (appointmentId: number, rating: number, comment?: string) =>
    api.post("/reviews", { appointmentId, rating, comment }),
  remove: (id: number) => api.delete(`/reviews/${id}`),
};
