// src/services/authService.js
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

class AuthService {
  constructor() {
    this.API_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';
    this.TOKEN_KEY = 'iot_admin_token';
    this.REFRESH_TOKEN_KEY = 'iot_admin_refresh_token';
    this.SESSION_ID_KEY = 'iot_admin_session_id';
    
    // Debug logging
    this.debug = process.env.REACT_APP_DEBUG === 'true';
    
    this.setupAxiosInterceptors();
  }

  log(message, data = null) {
    if (this.debug) {
      console.log(`[AuthService] ${message}`, data ? data : '');
    }
  }

  error(message, error = null) {
    console.error(`[AuthService ERROR] ${message}`, error ? error : '');
  }

  // Setup axios interceptors để tự động thêm token vào headers
  setupAxiosInterceptors() {
    axios.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          this.log('Added token to request headers');
        }
        return config;
      },
      (error) => {
        this.error('Request interceptor error', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor để handle token expired
    axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          this.log('Received 401, attempting token refresh');
          
          try {
            const refreshResult = await this.refreshToken();
            if (refreshResult.success) {
              this.log('Token refreshed successfully, retrying original request');
              originalRequest.headers.Authorization = `Bearer ${refreshResult.accessToken}`;
              return axios(originalRequest);
            }
          } catch (refreshError) {
            this.error('Token refresh failed', refreshError);
          }
          
          this.log('Token refresh failed, clearing auth data and redirecting to login');
          this.clearAuthData();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Đăng nhập admin
  async login(email, password) {
    try {
      this.log('Attempting login', { email });
      this.log('API URL:', this.API_URL);
      
      // Tạo URL-encoded data thay vì FormData
      const urlEncodedData = new URLSearchParams();
      urlEncodedData.append('username', email);
      urlEncodedData.append('password', password);

      this.log('Sending login request with URL-encoded data');
      this.log('Request data:', urlEncodedData.toString());

      const response = await axios.post(`${this.API_URL}/auth/login`, urlEncodedData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000, // 10 second timeout
        validateStatus: function (status) {
          return status >= 200 && status < 300; // default
        }
      });

      this.log('Login response received', response.data);
      this.log('Response status:', response.status);
      this.log('Response headers:', response.headers);

      const { access_token, refresh_token, session_id } = response.data;

      if (!access_token) {
        throw new Error('No access token received from server');
      }

      // Decode token để lấy thông tin user
      const decodedToken = jwtDecode(access_token);
      this.log('Decoded token', decodedToken);

      // Kiểm tra role admin
      if (decodedToken.role !== 'admin') {
        throw new Error('Access denied: Admin role required');
      }

      // Lưu token vào localStorage
      this.setToken(access_token);
      this.setRefreshToken(refresh_token);
      this.setSessionId(session_id);

      this.log('Login successful, tokens saved to localStorage');

      // Bắt đầu auto-refresh token
      this.startAutoRefresh();

      return {
        success: true,
        user: {
          email: decodedToken.sub,
          role: decodedToken.role,
          sessionId: session_id
        },
        tokens: {
          accessToken: access_token,
          refreshToken: refresh_token,
          sessionId: session_id
        }
      };

    } catch (error) {
      this.error('Login failed', error);
      this.error('Error message:', error.message);
      this.error('Error code:', error.code);
      this.error('Error response data:', error.response?.data);
      this.error('Error status:', error.response?.status);
      this.error('Error headers:', error.response?.headers);
      this.error('Network error:', error.request && !error.response);
      
      let errorMessage = 'Login failed';
      
      // Network error (no response from server)
      if (error.request && !error.response) {
        errorMessage = 'Network error: Cannot connect to server. Please check if backend is running on http://localhost:5001';
      }
      // HTTP error responses
      else if (error.response?.status === 401) {
        errorMessage = 'Invalid email or password';
      } else if (error.response?.status === 403) {
        errorMessage = 'Access denied: Admin role required';
      } else if (error.response?.status === 422) {
        errorMessage = 'Invalid input format';
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // Refresh token khi sắp hết hạn
  async refreshToken() {
    try {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      this.log('Attempting to refresh token');

      const response = await axios.post(`${this.API_URL}/auth/refresh`, {
        refresh_token: refreshToken
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      this.log('Token refresh response received', response.data);

      const { access_token, refresh_token: newRefreshToken } = response.data;

      if (!access_token) {
        throw new Error('No access token received from refresh');
      }

      // Lưu token mới
      this.setToken(access_token);
      if (newRefreshToken) {
        this.setRefreshToken(newRefreshToken);
      }

      this.log('Token refreshed successfully');

      return {
        success: true,
        accessToken: access_token,
        refreshToken: newRefreshToken
      };

    } catch (error) {
      this.error('Token refresh failed', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Kiểm tra và tự động refresh token nếu sắp hết hạn
  async checkAndRefreshToken() {
    const token = this.getToken();
    if (!token) return false;

    try {
      const decodedToken = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      const timeUntilExpiry = decodedToken.exp - currentTime;

      // Nếu token sẽ hết hạn trong vòng 5 phút (300 giây), refresh ngay
      if (timeUntilExpiry < 300) {
        this.log('Token will expire soon, refreshing...');
        const refreshResult = await this.refreshToken();
        return refreshResult.success;
      }

      return true;
    } catch (error) {
      this.error('Check token error', error);
      return false;
    }
  }

  // Bắt đầu auto-refresh timer
  startAutoRefresh() {
    // Kiểm tra token mỗi 2 phút
    this.refreshInterval = setInterval(async () => {
      await this.checkAndRefreshToken();
    }, 120000); // 2 minutes

    this.log('Auto-refresh timer started');
  }

  // Dừng auto-refresh timer
  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
      this.log('Auto-refresh timer stopped');
    }
  }

  // Đăng xuất
  logout() {
    this.log('Logging out');
    this.stopAutoRefresh();
    this.clearAuthData();
  }

  // Kiểm tra user đã đăng nhập chưa
  isAuthenticated() {
    const token = this.getToken();
    if (!token) {
      this.log('No token found');
      return false;
    }

    try {
      const decodedToken = jwtDecode(token);
      const isExpired = decodedToken.exp * 1000 < Date.now();
      
      if (isExpired) {
        this.log('Token expired');
        this.clearAuthData();
        return false;
      }

      this.log('User is authenticated');
      return true;
    } catch (error) {
      this.error('Token decode error', error);
      this.clearAuthData();
      return false;
    }
  }

  // Lấy thông tin user hiện tại
  getCurrentUser() {
    const token = this.getToken();
    if (!token) return null;

    try {
      const decodedToken = jwtDecode(token);
      const sessionId = this.getSessionId();
      
      return {
        email: decodedToken.sub,
        role: decodedToken.role,
        sessionId: sessionId,
        exp: decodedToken.exp
      };
    } catch (error) {
      this.error('Get current user error', error);
      return null;
    }
  }

  // Token management methods
  setToken(token) {
    localStorage.setItem(this.TOKEN_KEY, token);
    this.log('Token saved to localStorage');
  }

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  setRefreshToken(refreshToken) {
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    this.log('Refresh token saved to localStorage');
  }

  getRefreshToken() {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  setSessionId(sessionId) {
    localStorage.setItem(this.SESSION_ID_KEY, sessionId);
    this.log('Session ID saved to localStorage');
  }

  getSessionId() {
    return localStorage.getItem(this.SESSION_ID_KEY);
  }

  clearAuthData() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.SESSION_ID_KEY);
    this.log('Auth data cleared from localStorage');
  }
}

const authServiceInstance = new AuthService();
export default authServiceInstance;
export { authServiceInstance as authService };
