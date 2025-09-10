// src/services/productService.js
import axios from 'axios';
import authService from './authService';

class ProductService {
  constructor() {
    this.API_URL = 'http://localhost:5001/api';
    this.setupAxiosInterceptors();
  }

  setupAxiosInterceptors() {
    // Add request interceptor để tự động thêm JWT token
    axios.interceptors.request.use(
      (config) => {
        const token = authService.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('[ProductService] Added token to request headers');
        }
        return config;
      },
      (error) => {
        console.error('[ProductService] Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor để handle token expiry và network errors
    axios.interceptors.response.use(
      (response) => {
        console.log('[ProductService] Response received:', response.status);
        return response;
      },
      async (error) => {
        console.error('[ProductService] Response error:', error);
        
        if (error.code === 'ERR_NETWORK') {
          console.error('[ProductService] Network error detected');
          // Don't auto-logout on network errors
          return Promise.reject(error);
        }
        
        if (error.response?.status === 401) {
          console.log('[ProductService] Token expired, logging out');
          authService.logout();
          window.location.href = '/login';
        }
        
        return Promise.reject(error);
      }
    );
  }

  // Get all products
  async getAllProducts() {
    try {
      console.log('Fetching products from:', `${this.API_URL}/products`);
      const response = await axios.get(`${this.API_URL}/products`, {
        timeout: 10000, // 10 second timeout
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      console.log('Products fetched successfully:', response.data.length, 'items');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Get products failed:', error);
      
      let errorMessage = 'Failed to fetch products';
      if (error.code === 'ERR_NETWORK') {
        errorMessage = 'Network error: Cannot connect to server. Please check if backend is running.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication failed. Please login again.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // Get single product by ID
  async getProduct(productId) {
    try {
      const response = await axios.get(`${this.API_URL}/products/${productId}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Get product failed:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to fetch product'
      };
    }
  }

  // Create new product
  async createProduct(productData) {
    try {
      const response = await axios.post(`${this.API_URL}/products`, productData);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Create product failed:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to create product'
      };
    }
  }

  // Update existing product
  async updateProduct(productId, updateData) {
    try {
      const response = await axios.put(`${this.API_URL}/products/${productId}`, updateData);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Update product failed:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to update product'
      };
    }
  }

  // Delete product
  async deleteProduct(productId) {
    try {
      await axios.delete(`${this.API_URL}/products/${productId}`);
      return {
        success: true
      };
    } catch (error) {
      console.error('Delete product failed:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to delete product'
      };
    }
  }

  // Get product by barcode
  async getProductByBarcode(barcode) {
    try {
      const response = await axios.get(`${this.API_URL}/products/barcode/${barcode}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Get product by barcode failed:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Product not found'
      };
    }
  }
}

export const productService = new ProductService();
