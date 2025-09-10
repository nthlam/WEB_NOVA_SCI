#!/bin/bash
# remove old mongo server and redis server
# docker stop shopping-cart-backend shopping-cart-worker mongo-db redis-cache
# docker rm shopping-cart-backend shopping-cart-worker mongo-db redis-cache

sudo docker compose down
echo "Rebuilding services with Docker Compose..."
sudo docker compose up --build -d


# SNACK post cho mình uwb_location phân bố nhiều nơi nằm trong hình chữ nhật 4 vị trí: (x,y) = () (2300,3333);(2333,2222);(2300,1222) từ api: post /api/motion/uwb-location (có thể đọc folder be để biết body request) khoảng 1000 bản phân bố không đều giữa các vị trí, thời gian  phân bố không đều ở các vị trí, thời gian từ 8h sáng đến 12h sáng nay
# FOOD tạo tiếp uwb-location trong khoảng x từ 600-900, y từ 1380-1840 với 1000 bản ghi
# MEET tạo tiếp uwb-location trong khoảng x từ 1482-1941, y từ 1840-2300 với 1500 bản ghi
# VEGETABLES tạo tiếp uwb-location trong khoảng x từ 500-1850, y từ 5520-6200 với 2000 bản ghi, tên các bản ghi lặp lại từ lần trước
# DRINK tạo tiếp uwb-location trong khoảng x từ 1100-1300, y từ 3700-4200 với 800 bản ghi, tên các bản ghi lặp lại từ lần trước 