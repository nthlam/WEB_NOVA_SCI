# IoT NOVA Frontend Setup Guide

## Tại sao cần setup này?

File `index.html` trong thư mục `/build` không được push lên git vì:
- Thư mục `/build` bị ignore trong `.gitignore`
- Đây là file được tạo tự động khi build React app
- Mỗi máy cần generate file này sau khi clone code

## Cách setup sau khi clone repository:

### Bước 1: Cài đặt dependencies
```bash
npm install
```

### Bước 2: Generate index.html (Tự động chạy)
Script sẽ tự động chạy sau `npm install` nhờ `postinstall` hook, hoặc chạy thủ công:
```bash
npm run setup
```

### Bước 3: Start ứng dụng
```bash
npm start
```

## Scripts có sẵn:

- `npm run setup` - Generate index.html và copy static files
- `npm start` - Chạy development server
- `npm run build` - Tạo production build
- `npm test` - Chạy tests

## Cấu trúc thư mục sau setup:

```
frontend/
├── build/           # Được tạo bởi script setup
│   ├── index.html   # File chính được generate
│   ├── favicon.ico  # Copied từ public/
│   └── ...
├── public/          # Static files template
├── src/             # Source code
├── scripts/         # Setup scripts
│   └── generate-index.js
└── package.json
```

## Troubleshooting:

### Lỗi: Cannot find module
```bash
rm -rf node_modules package-lock.json
npm install
```

### File index.html không được tạo
```bash
npm run setup
```

### Port đã được sử dụng
Thay đổi port trong file `.env`:
```
PORT=3001
```

## Backend Integration:

Frontend này kết nối với backend Python FastAPI:
- Backend URL: `http://localhost:5001` (được config trong `package.json` proxy)
- API endpoints: `/api/auth/`, `/api/uwb/`, etc.

Đảm bảo backend đang chạy trước khi start frontend.
