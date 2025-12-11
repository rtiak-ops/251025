import axios, { type AxiosResponse, AxiosError } from "axios";
import type {
  Todo,
  CreateTodoData,
  UpdateTodoData,
  User,
  AuthToken,
} from "./types";

const API_BASE = "http://localhost:8000";
const TOKEN_KEY = "auth_token";

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getStoredToken = () => localStorage.getItem(TOKEN_KEY);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);
export const saveToken = (token: string) =>
  localStorage.setItem(TOKEN_KEY, token);

export const registerUser = async (
  email: string,
  password: string
): Promise<User> => {
  try {
    const res: AxiosResponse<User> = await api.post("/auth/register", {
      email,
      password,
    });
    return res.data;
  } catch (error) {
    console.error("Error registering user:", (error as AxiosError).message);
    throw error;
  }
};

export const loginUser = async (
  email: string,
  password: string
): Promise<AuthToken> => {
  try {
    const res: AxiosResponse<AuthToken> = await api.post("/auth/login", {
      email,
      password,
    });
    saveToken(res.data.access_token);
    return res.data;
  } catch (error) {
    console.error("Error logging in:", (error as AxiosError).message);
    throw error;
  }
};

// --- API関数 ---

export const getTodos = async (): Promise<Todo[]> => {
  try {
    const res: AxiosResponse<Todo[]> = await api.get("/todos");
    return res.data;
  } catch (error) {
    console.error("Error fetching todos:", (error as AxiosError).message);
    throw error;
  }
};

export const createTodo = async ({
  title,
  description,
}: CreateTodoData): Promise<Todo> => {
  try {
    const res: AxiosResponse<Todo> = await api.post("/todos", {
      title,
      description,
    });
    return res.data;
  } catch (error) {
    console.error("Error creating todo:", (error as AxiosError).message);
    throw error;
  }
};

export const updateTodo = async (
  id: number,
  data: UpdateTodoData
): Promise<Todo> => {
  try {
    const res: AxiosResponse<Todo> = await api.patch(`/todos/${id}`, data);
    return res.data;
  } catch (error) {
    console.error(
      `Error updating todo with ID ${id}:`,
      (error as AxiosError).message
    );
    throw error;
  }
};

export const deleteTodo = async (id: number): Promise<void> => {
  try {
    await api.delete(`/todos/${id}`);
  } catch (error) {
    console.error(
      `Error deleting todo with ID ${id}:`,
      (error as AxiosError).message
    );
    throw error;
  }
};
