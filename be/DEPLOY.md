# Deploy Backend to Render

## Cấu hình đã tạo:

### 1. Files được tạo:
- `main.py` - Entry point cho Render
- `Procfile` - Backup start command
- `render.yaml` - Cấu hình chính thức cho Render
- Health endpoint `/health` trong `__init__.py`

### 2. Cấu trúc deploy:
```
be/
├── main.py              # Entry point (import từ backend)
├── Procfile            # Start command
├── render.yaml         # Service config
└── backend/
    ├── __init__.py     # FastAPI app instance
    ├── requirements.txt # Dependencies
    └── ... (other modules)
```

## Cách deploy trên Render:

### Bước 1: Tạo Web Service
1. Đăng nhập Render.com
2. Chọn "New" → "Web Service"
3. Connect repository GitHub

### Bước 2: Cấu hình Service
- **Name**: `iot-nova-backend`
- **Environment**: `Python 3`
- **Region**: `Singapore` (gần Việt Nam)
- **Branch**: `main`
- **Root Directory**: `Pi_app_main/icc-25-nova/projects/pi_app/be`

### Bước 3: Build & Deploy Settings
- **Build Command**: `pip install -r backend/requirements.txt`
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Bước 4: Environment Variables (Optional)
- `ENVIRONMENT=production`
- `MONGODB_URI=<your-mongodb-connection-string>`

## Test sau khi deploy:

### Health Check:
```
GET https://your-app-name.onrender.com/health
```

### API Endpoints:
```
GET https://your-app-name.onrender.com/api/users/
GET https://your-app-name.onrender.com/api/products/
```

## Troubleshooting:

### Lỗi "Could not import module main":
- ✅ Đã fix bằng cách tạo `main.py` ở root
- ✅ Import đúng từ `backend` package

### Lỗi dependencies:
- ✅ File `requirements.txt` đã complete
- ✅ Build command đúng path

### Lỗi startup:
- ✅ Health endpoint đã được thêm
- ✅ CORS đã config cho production

## Logs để debug:
1. Trong Render Dashboard → Service → Logs
2. Xem Build logs và Runtime logs
3. Check Environment variables

## Frontend cần update:
Sau khi deploy thành công, cập nhật URL backend trong frontend:
```javascript
// frontend/src/services/api.js
const API_BASE_URL = 'https://your-app-name.onrender.com';
```
