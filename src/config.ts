// src/config.ts

// 1. Determine the Base API URL
// In production, you will set VITE_API_URL in your build environment
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

// 2. Derived URLs
export const FORM_IO_API_URL = `${API_BASE_URL}/api/forms`;
export const GOOGLE_LOGIN_URL = `${API_BASE_URL}/oauth2/authorization/google`;