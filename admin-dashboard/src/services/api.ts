import axios from 'axios';
import type { AxiosRequestConfig, AxiosError } from 'axios';
import type { 
  ApiResponse, 
  AuthResponse, 
  LoginCredentials, 
  User, 
  Category, 
  Content,
  SubscriptionPlan,
  PromptTemplate
} from '../types';

// API base URL
const API_URL = 'http://localhost:5010/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Create a separate instance with longer timeout for content generation
const longRunningApi = axios.create({
  baseURL: API_URL,
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Apply the same request interceptors to longRunningApi
longRunningApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }
        
        const response = await axios.post<ApiResponse<AuthResponse>>(`${API_URL}/auth/refresh`, { refreshToken });
        
        if (response.data.token && response.data.refreshToken) {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('refreshToken', response.data.refreshToken);
          
          // Retry original request with new token
          if (originalRequest.headers) {
            originalRequest.headers['Authorization'] = `Bearer ${response.data.token}`;
          }
          return axios(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// Apply the same response interceptors to longRunningApi
longRunningApi.interceptors.response.use(
  (response) => {
    // If the response has status but no success property, add it
    if (response.data && response.data.status === 'success' && response.data.success === undefined) {
      response.data.success = true;
    }
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Also apply the token refresh interceptor
longRunningApi.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }
        
        const response = await axios.post<ApiResponse<AuthResponse>>(`${API_URL}/auth/refresh`, { refreshToken });
        
        if (response.data.token && response.data.refreshToken) {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('refreshToken', response.data.refreshToken);
          
          // Retry original request with new token
          if (originalRequest.headers) {
            originalRequest.headers['Authorization'] = `Bearer ${response.data.token}`;
          }
          return axios(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// Axios error handler helper
const handleApiError = (error: any, operation: string) => {
  console.error(`Error during ${operation}:`, error);
  
  // Network errors don't have response property
  if (!error.response) {
    throw new Error(`Network error: Unable to connect to server. Please check your connection.`);
  }
  
  // Server returned an error response
  if (error.response?.data?.message) {
    throw new Error(error.response.data.message);
  }
  
  // Generic error
  throw error;
};

// Authentication APIs
export const authAPI = {
  login: async (credentials: LoginCredentials): Promise<ApiResponse<{ user: User }>> => {
    const response = await api.post<ApiResponse<{ user: User }>>('/auth/login', credentials);
    
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    
    if (response.data.refreshToken) {
      localStorage.setItem('refreshToken', response.data.refreshToken);
    }
    
    if (response.data.data?.user) {
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
    }
    
    return response.data;
  },
  
  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  },
  
  getCurrentUser: async (): Promise<ApiResponse<{ user: User }>> => {
    const response = await api.get<ApiResponse<{ user: User }>>('/users/profile');
    return response.data;
  },
};

// User APIs
export const userAPI = {
  getAllUsers: async (page = 1, limit = 10): Promise<ApiResponse<{ users: User[] }>> => {
    const response = await api.get<ApiResponse<{ users: User[] }>>('/admin/users', { 
      params: { page, limit } 
    });
    return response.data;
  },
  
  getUserById: async (userId: string): Promise<ApiResponse<{ user: User }>> => {
    const response = await api.get<ApiResponse<{ user: User }>>(`/admin/users/${userId}`);
    return response.data;
  },
  
  updateUser: async (userId: string, userData: Partial<User>): Promise<ApiResponse<{ user: User }>> => {
    const response = await api.patch<ApiResponse<{ user: User }>>(`/admin/users/${userId}`, userData);
    return response.data;
  },
  
  deleteUser: async (userId: string): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>(`/admin/users/${userId}`);
    return response.data;
  }
};

// Category APIs
export const categoryAPI = {
  getAllCategories: async (): Promise<ApiResponse<{ categories: Category[] }>> => {
    const response = await api.get<ApiResponse<{ categories: Category[] }>>('/categories');
    return response.data;
  },
  
  getCategoryById: async (categoryId: string): Promise<ApiResponse<{ category: Category }>> => {
    const response = await api.get<ApiResponse<{ category: Category }>>(`/categories/${categoryId}`);
    return response.data;
  },
  
  getCategoriesWithPoolStats: async (): Promise<ApiResponse<{ categories: Category[] }>> => {
    const response = await api.get<ApiResponse<{ categories: Category[] }>>('/categories/stats/pools');
    return response.data;
  },
  
  createCategory: async (categoryData: Partial<Category>): Promise<ApiResponse<{ category: Category }>> => {
    const response = await api.post<ApiResponse<{ category: Category }>>('/categories', categoryData);
    return response.data;
  },
  
  updateCategory: async (categoryId: string, categoryData: Partial<Category>): Promise<ApiResponse<{ category: Category }>> => {
    const response = await api.patch<ApiResponse<{ category: Category }>>(`/categories/${categoryId}`, categoryData);
    return response.data;
  },
  
  deleteCategory: async (categoryId: string): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>(`/categories/${categoryId}`);
    return response.data;
  },
  
  activateAllCategories: async (): Promise<ApiResponse<{ activatedCount: number }>> => {
    try {
      const response = await api.post<ApiResponse<{ activatedCount: number }>>('/categories/activate-all');
      return response.data;
    } catch (error) {
      console.error('Error activating all categories:', error);
      throw error;
    }
  }
};

// Content APIs
export const contentAPI = {
  getAllContent: async (page = 1, limit = 10, status?: string, contentType?: string): Promise<ApiResponse<{ content: Content[] }>> => {
    try {
      const response = await api.get<ApiResponse<{ content: Content[] }>>('/content', { 
        params: { page, limit, status, contentType } 
      });
      return response.data;
    } catch (error) {
      return handleApiError(error, 'fetching content');
    }
  },
  
  getPendingContent: async (): Promise<ApiResponse<{ content: Content[] }>> => {
    try {
      const response = await api.get<ApiResponse<{ content: Content[] }>>('/admin/content/pending');
      return response.data;
    } catch (error) {
      console.error('Error fetching pending content:', error);
      throw error;
    }
  },
  
  getContentById: async (contentId: string): Promise<ApiResponse<{ content: Content }>> => {
    try {
      const response = await api.get<ApiResponse<{ content: Content }>>(`/content/${contentId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching content ${contentId}:`, error);
      throw error;
    }
  },
  
  createContent: async (contentData: Partial<Content>): Promise<ApiResponse<{ content: Content }>> => {
    try {
      // Ensure contentType is set if not provided
      if (!contentData.contentType) {
        contentData.contentType = 'hack';
      }
      
      const response = await api.post<ApiResponse<{ content: Content }>>('/content', contentData);
      return response.data;
    } catch (error) {
      console.error('Error creating content:', error);
      throw error;
    }
  },
  
  updateContent: async (contentId: string, contentData: Partial<Content>): Promise<ApiResponse<{ content: Content }>> => {
    try {
      const response = await api.patch<ApiResponse<{ content: Content }>>(`/content/${contentId}`, contentData);
      return response.data;
    } catch (error) {
      console.error(`Error updating content ${contentId}:`, error);
      throw error;
    }
  },
  
  deleteContent: async (contentId: string): Promise<ApiResponse<null>> => {
    try {
      console.log(`Attempting to delete content with ID: ${contentId}`);
      // Use the correct API endpoint
      const response = await api.delete<ApiResponse<null>>(`/content/${contentId}`);
      
      // Check if the response was successful
      if (!response.data.success && response.data.status !== 'success') {
        throw new Error(response.data.message || 'Failed to delete content');
      }
      
      return response.data;
    } catch (error) {
      console.error(`Error deleting content ${contentId}:`, error);
      
      // Add better error details in the message
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      return {
        success: false,
        status: 'error',
        message: `Failed to delete content: ${errorMessage}`,
        data: null
      };
    }
  },
  
  moderateContent: async (contentId: string, action: 'approve' | 'reject', notes?: string): Promise<ApiResponse<{ content: Content }>> => {
    try {
      const response = await api.patch<ApiResponse<{ content: Content }>>(`/admin/content/${contentId}/moderate`, {
        action,
        moderationNotes: notes
      });
      return response.data;
    } catch (error) {
      console.error(`Error moderating content ${contentId}:`, error);
      throw error;
    }
  },
  
  generateContent: async (params: { 
    categoryIds: string[], 
    contentType?: string, 
    count?: number 
  }): Promise<ApiResponse<{ content: Content[] }>> => {
    try {
      // Use longRunningApi for content generation which may take longer
      const response = await longRunningApi.post<ApiResponse<{ content: Content[] }>>('/admin/content/generate', params);
      return response.data;
    } catch (error) {
      return handleApiError(error, 'generating content');
    }
  },
  
  generateMultipleContent: async (categoryId: string, contentType?: string, count: number = 10, difficulty: string = 'beginner', model?: string): Promise<ApiResponse<{ content: Content[] }>> => {
    try {
      // Use longRunningApi for content generation which may take longer
      const response = await longRunningApi.post<ApiResponse<{ content: Content[] }>>('/content/generate-multiple', {
        categoryId,
        contentType,
        count,
        difficulty,
        model
      });
      return response.data;
    } catch (error) {
      return handleApiError(error, 'generating content');
    }
  },

  getContentByPool: async (pool: string = 'regular', category?: string, contentType?: string): Promise<ApiResponse<{ content: Content[] }>> => {
    try {
      const response = await api.get<ApiResponse<{ content: Content[] }>>('/content/pool', {
        params: { pool, category, contentType }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching content by pool:', error);
      throw error;
    }
  },
  
  recycleContent: async (contentId: string): Promise<ApiResponse<{ content: Content }>> => {
    try {
      const response = await api.post<ApiResponse<{ content: Content }>>(`/content/${contentId}/recycle`);
      return response.data;
    } catch (error) {
      console.error(`Error recycling content ${contentId}:`, error);
      throw error;
    }
  },
  
  rewriteContent: async (contentId: string, model: string = 'o3'): Promise<ApiResponse<{ content: Content }>> => {
    try {
      const response = await longRunningApi.post<ApiResponse<{ content: Content }>>(`/content/${contentId}/rewrite`, {
        model: model
      });
      return response.data;
    } catch (error) {
      console.error(`Error rewriting content ${contentId}:`, error);
      throw error;
    }
  }
};

// Analytics APIs
export const analyticsAPI = {
  getContentAnalytics: async (): Promise<ApiResponse<any>> => {
    try {
      const response = await api.get<ApiResponse<any>>('/admin/analytics/content');
      return response.data;
    } catch (error) {
      console.error('Error fetching content analytics:', error);
      throw error;
    }
  },
  
  getUserAnalytics: async (): Promise<ApiResponse<any>> => {
    try {
      const response = await api.get<ApiResponse<any>>('/admin/analytics/users');
      return response.data;
    } catch (error) {
      console.error('Error fetching user analytics:', error);
      throw error;
    }
  }
};

// Subscription plan APIs
export const subscriptionAPI = {
  getAllPlans: async (): Promise<ApiResponse<{ plans: SubscriptionPlan[] }>> => {
    const response = await api.get<ApiResponse<{ plans: SubscriptionPlan[] }>>('/subscription/plans');
    return response.data;
  },
  
  getPlanById: async (planId: string): Promise<ApiResponse<{ plan: SubscriptionPlan }>> => {
    const response = await api.get<ApiResponse<{ plan: SubscriptionPlan }>>(`/subscription/plans/${planId}`);
    return response.data;
  },
  
  createPlan: async (planData: Partial<SubscriptionPlan>): Promise<ApiResponse<{ plan: SubscriptionPlan }>> => {
    const response = await api.post<ApiResponse<{ plan: SubscriptionPlan }>>('/subscription/plans', planData);
    return response.data;
  },
  
  updatePlan: async (planId: string, planData: Partial<SubscriptionPlan>): Promise<ApiResponse<{ plan: SubscriptionPlan }>> => {
    const response = await api.patch<ApiResponse<{ plan: SubscriptionPlan }>>(`/subscription/plans/${planId}`, planData);
    return response.data;
  },
  
  deletePlan: async (planId: string): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>(`/subscription/plans/${planId}`);
    return response.data;
  }
};

// Prompt template APIs
export const promptAPI = {
  getAllPromptTemplates: async (category?: string, contentType?: string): Promise<ApiResponse<{ templates: PromptTemplate[] }>> => {
    try {
      const params: Record<string, string> = {};
      if (category) params.category = category;
      if (contentType) params.contentType = contentType;
      
      const response = await api.get<ApiResponse<{ templates: PromptTemplate[] }>>('/prompts', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching prompt templates:', error);
      throw error;
    }
  },
  
  getPromptTemplateById: async (templateId: string): Promise<ApiResponse<{ template: PromptTemplate }>> => {
    try {
      const response = await api.get<ApiResponse<{ template: PromptTemplate }>>(`/prompts/${templateId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching template ${templateId}:`, error);
      throw error;
    }
  },
  
  createPromptTemplate: async (templateData: Partial<PromptTemplate>): Promise<ApiResponse<{ template: PromptTemplate }>> => {
    try {
      const response = await api.post<ApiResponse<{ template: PromptTemplate }>>('/prompts', templateData);
      return response.data;
    } catch (error) {
      console.error('Error creating prompt template:', error);
      throw error;
    }
  },
  
  updatePromptTemplate: async (templateId: string, templateData: Partial<PromptTemplate>): Promise<ApiResponse<{ template: PromptTemplate }>> => {
    try {
      const response = await api.patch<ApiResponse<{ template: PromptTemplate }>>(`/prompts/${templateId}`, templateData);
      return response.data;
    } catch (error) {
      console.error(`Error updating template ${templateId}:`, error);
      throw error;
    }
  },
  
  deletePromptTemplate: async (templateId: string): Promise<ApiResponse<null>> => {
    try {
      const response = await api.delete<ApiResponse<null>>(`/prompts/${templateId}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting template ${templateId}:`, error);
      throw error;
    }
  },
  
  importDefaultPrompts: async (): Promise<ApiResponse<{ count: number, promptIds: string[] }>> => {
    try {
      const response = await api.post<ApiResponse<{ count: number, promptIds: string[] }>>('/prompts/import-defaults');
      return response.data;
    } catch (error) {
      console.error('Error importing default prompts:', error);
      throw error;
    }
  },

  // New function to call the backend seeding route
  seedPromptsFromDefaultFile: async (): Promise<ApiResponse<{ updatedCategories: number; newPrompts: number; errors: string[] }>> => {
    try {
      // Note: The actual endpoint is /api/admin/prompts/seed-from-file
      // Axios instance `api` is already baseUred to /api, so we use /admin/prompts/seed-from-file
      const response = await api.post<ApiResponse<{ updatedCategories: number; newPrompts: number; errors: string[] }>>('/admin/prompts/seed-from-file');
      return response.data;
    } catch (error) {
      console.error('Error seeding prompts from default file:', error);
      throw error;
    }
  }
};

export default api; 