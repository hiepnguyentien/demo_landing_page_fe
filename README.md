# Finora Affiliate Landing Page

Landing page React + TypeScript + Vite cho luồng affiliate tracking.

## Chạy local

```bash
npm install
copy .env.example .env
npm run dev
```

Mở URL có `click_id`, ví dụ:

```text
http://localhost:5173/?click_id=AFF_001
```

`click_id` là bắt buộc. Nếu thiếu hoặc rỗng, nút tải ứng dụng sẽ bị khóa.

## Cấu hình

Chỉnh các biến trong `.env`:

- `VITE_API_BASE_URL`: Base URL của Backend, ví dụ `http://localhost:8080`.
- `VITE_GOOGLE_PLAY_URL`: URL ứng dụng trên Google Play.
- `VITE_APP_STORE_URL`: URL ứng dụng trên App Store.

Landing page gọi `GET /api/affiliate/config` khi khởi tạo và `POST /api/affiliate/click`
khi người dùng tải ứng dụng. OS được nhận diện từ User-Agent (`IOS` hoặc `ANDROID`).

## Build

```bash
npm run build
```
