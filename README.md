# Meta Ecom MKT Hub — Web App Quản lý Công việc Nội bộ

Phần mềm giao việc, đặt Order Media, duyệt ấn phẩm & kiểm soát tiến độ dành cho Team Marketing Meta Ecom (xây dựng từ cấu trúc file `[Meta Ecom] Team MKT - PCCV (Nội bộ)`).

## Tính năng chính (MVP Phase 1)
1. **Phân quyền Leader vs Nhân sự & Cô lập Dự án (Project Isolation):**
   - **Leader:** Giám sát toàn bộ dự án, nhân sự, bảng công suất, hàng đợi duyệt bài, check-in 9h sáng, cấp tài khoản & phân dự án.
   - **Nhân sự Content:** Xem toàn bộ đầu việc thuộc dự án mình tham gia (bao gồm tiến độ ảnh/video do Media làm cho dự án đó), ẩn hoàn toàn thông tin dự án khác.
   - **Nhân sự dùng chung (Media, Web/Ads, Support):** Xem đúng danh sách task/order được giao cho mình; hiển thị công suất tổng ẩn danh (Mai `x/16 ảnh/tuần`, Hoàng `y/2 video/ngày`) khi nhận order mới.
2. **Luồng Order Media & Duyệt bài (Brief → Demo → Feedback → Final):**
   - Dán Link Google Drive / Canva / Google Docs theo từng phiên bản (`Brief`, `Demo v1/v2/v3`, `Final`, `Link bài đã đăng`).
   - Tự cảnh báo nếu đặt Order gấp (< 2 ngày với nội bộ, < 7 ngày với phòng ban khác) hoặc deadline rơi vào T7/CN.
   - Đếm số lần chỉnh sửa (giới hạn 3 lần) kèm bộ **Checklist QC "Yêu cầu Output"** (26 mục Ảnh/Content + 40 lỗi Video).
3. **Thay thế báo cáo thủ công & Nhắc lịch tự động qua Email:**
   - Widget **Check-in 1 chạm** mỗi sáng (`Đúng tiến độ` / `Có nguy cơ trễ` + lý do gửi email báo ngay cho Leader).
   - Báo cáo **Weekly Marketing Operations** tự động tổng hợp sản lượng KPI tuần và ghi chú vướng mắc Thứ 6.
   - Gửi Email nhắc lịch qua **1 tài khoản Gmail của Team MKT** theo các khung giờ `09:00`, `15:00`, `16:00`, `17:30`, Thứ 6 `12:00`.

---

## Chạy thử trên máy tính cá nhân (Localhost)

### 1. Cài đặt thư viện
```bash
npm install
```

### 2. Khởi tạo Database PostgreSQL cục bộ (không cần cài Docker hay Postgres)
Prisma 7 tích hợp sẵn `prisma dev` để chạy PostgreSQL nhẹ ngay trong terminal:
```bash
npx prisma dev
```
*(Giữ cửa sổ terminal này chạy, copy dòng `DATABASE_URL=...` nó in ra dán vào file `.env` — tham khảo `.env.example`)*.

### 3. Tạo bảng, nạp dữ liệu mẫu Team MKT và chạy Web
Mở một terminal khác:
```bash
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts
npm run dev
```
Truy cập: `http://localhost:3000` (trang đăng nhập có sẵn bảng chọn nhanh tài khoản Leader / Thảo / Lâm / Vy / Mai / Hoàng / Tuấn với mật khẩu `123456`).

---

## Deploy lên GitHub + Vercel + Gmail Team MKT (Miễn phí)

1. **Tạo Repo Private trên GitHub** và push toàn bộ code này lên.
2. **Deploy trên Vercel:**
   - Vào Vercel → **Add New Project** → chọn repo GitHub vừa push.
   - Vào tab **Storage** trên Vercel → **Create Database → Neon (Serverless Postgres - gói Free)** để Vercel tự tạo Database và tự điền `DATABASE_URL`.
   - Trong **Settings → Environment Variables**, điền thêm:
     - `AUTH_SECRET`: chuỗi ngẫu nhiên dài >= 32 ký tự
     - `CRON_SECRET`: chuỗi bí mật để bảo vệ API nhắc lịch
     - `APP_URL`: link web Vercel của bạn (vd `https://meta-ecom-mkt.vercel.app`)
     - `SMTP_HOST`: `smtp.gmail.com`
     - `SMTP_PORT`: `465`
     - `SMTP_USER`: địa chỉ Gmail dùng chung của Team MKT
     - `SMTP_PASS`: **App Password 16 ký tự** của Gmail đó (Google Account → Security → 2-Step Verification → App passwords)
     - *(Khi dùng chính thức muốn ẩn khung đăng nhập nhanh Demo trên trang Login, thêm `NEXT_PUBLIC_HIDE_DEMO_USERS=true`)*
3. **Đẩy bảng & dữ liệu ban đầu lên Database Neon:**
   - Lấy `DATABASE_URL` từ Vercel chạy 1 lần dưới máy:
     ```bash
     npx prisma db push
     npx tsx prisma/seed.ts
     ```
4. **Kích hoạt Nhắc lịch tự động bằng GitHub Actions (đã có sẵn file `.github/workflows/reminders.yml`):**
   - Vào repo GitHub → **Settings → Secrets and variables → Actions** → thêm 2 secret: `APP_URL` và `CRON_SECRET` khớp với Vercel.
   - GitHub Actions sẽ tự động gọi `/api/cron/reminders` vào các mốc giờ Việt Nam (`09:00`, `15:00`, `16:00`, `17:30`, Thứ 6 `12:00`).
