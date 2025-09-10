# IoT Admin Dashboard - Frontend Setup Guide

## ✅ Hoàn thành: Chức năng đăng nhập Admin

### 📁 Cấu trúc thư mục đã tạo:
```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Login.js          # Giao diện đăng nhập với Bootstrap
│   │   ├── Dashboard.js      # Dashboard admin cơ bản
│   │   └── ProtectedRoute.js # Bảo vệ routes cần authentication
│   ├── contexts/
│   │   └── AuthContext.js    # Context quản lý authentication state
│   ├── services/
│   │   └── authService.js    # Service xử lý API authentication
│   ├── App.js               # Component chính với routing
│   ├── index.js            # Entry point
│   ├── index.css           # Custom CSS với theme xanh dương
│   └── reportWebVitals.js  # Performance monitoring
├── package.json            # Dependencies và scripts
├── .env                   # Environment variables
├── .gitignore            # Git ignore rules
└── README.md            # Hướng dẫn này
```

### 🔧 Tech Stack:
- **React 18.2.0** - Frontend framework
- **React Router DOM 6.15.0** - Routing
- **Bootstrap 5.3.0** - UI framework
- **React Bootstrap 2.9.0** - Bootstrap components for React
- **Axios 1.6.0** - HTTP client
- **JWT Decode 4.0.0** - JWT token handling

### 🚀 Cách chạy Frontend:

1. **Mở PowerShell trong thư mục frontend:**
   ```powershell
   cd "G:\IOT_NOVA\Pi_app_main\icc-25-nova\projects\pi_app\be\frontend"
   ```

2. **Start development server:**
   ```powershell
   npm start
   ```

3. **Truy cập ứng dụng:**
   - URL: http://localhost:3000
   - Sẽ tự redirect đến /login nếu chưa đăng nhập

### 🔐 Thông tin đăng nhập Admin:
- **Email:** admin@example.com
- **Password:** admin123

### ✅ **BUG FIXES APPLIED:**
- [x] Fixed API request format: Changed from FormData to URLSearchParams
- [x] Fixed backend user role handling: Handle string role values correctly
- [x] Enhanced error logging for better debugging
- [x] Improved dashboard with success message and detailed user info

### 🎨 Tính năng đã implement:

#### ✅ Authentication System:
- [x] Login form với validation
- [x] JWT token storage trong localStorage
- [x] Auto logout khi token expired
- [x] Protected routes với ProtectedRoute component
- [x] Auth context để quản lý state global

#### ✅ UI/UX Features:
- [x] Responsive design (desktop-first)
- [x] Bootstrap 5 UI components
- [x] Theme xanh dương (#007bff)
- [x] Loading states và error handling
- [x] Form validation với feedback
- [x] Demo login button
- [x] Debug mode với console logs

#### ✅ Security Features:
- [x] Admin role verification
- [x] Token expiry checking
- [x] Axios interceptors cho auto token attachment
- [x] Auto redirect on 401 errors

### 🐛 Debug Information:
- Debug mode: Enabled (REACT_APP_DEBUG=true)
- API Base URL: http://localhost:5001/api
- Console logs chi tiết cho mọi action
- Auth state được log trong AuthContext

### 📡 API Integration:
- **Login endpoint:** POST /api/auth/login
- **Request format:** form-data với username/password
- **Response format:** 
  ```json
  {
    "access_token": "jwt_token_here",
    "refresh_token": "refresh_token_here", 
    "token_type": "bearer",
    "session_id": "session_id_here"
  }
  ```

### 🔄 Flow hoạt động:
1. User truy cập app -> redirect to /login
2. User nhập email/password -> call API login
3. API trả về JWT token -> lưu vào localStorage
4. Redirect to /dashboard với protected route
5. Dashboard hiển thị thông tin admin
6. Token được attach vào mọi API request
7. Auto logout khi token expired

### 🎯 Các bước tiếp theo (chờ instruction):
- [ ] Quản lý Products
- [ ] Xem Motion Logs
- [ ] Quản lý Sessions
- [ ] Dashboard statistics
- [ ] User management
- [ ] Real-time data với WebSocket

### 🛠️ Troubleshooting:
- Nếu không start được: Xóa node_modules và npm install lại
- Nếu CORS error: Kiểm tra backend đang chạy port 5001
- Nếu login fail: Kiểm tra admin account đã tạo chưa (admin@example.com/admin123)

### 📱 Responsive Support:
- Desktop: ✅ Optimized
- Tablet: ✅ Bootstrap responsive
- Mobile: ✅ Mobile-friendly forms
