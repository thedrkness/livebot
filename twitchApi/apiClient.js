import { ApiClient } from "@twurple/api";
import { authProvider } from "./authProvider.js";
export const apiClient = new ApiClient({ authProvider });
