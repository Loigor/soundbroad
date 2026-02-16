import axios from 'axios';

const baseURL =
  // Allow overriding via env, but default to same-origin (nginx proxy).
  import.meta.env.VITE_API_BASE_URL ?? '';

export const api = axios.create({
  baseURL
});

