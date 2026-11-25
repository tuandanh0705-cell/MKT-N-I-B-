# Meta Ecom MKT Hub — Tài Liệu Tổng Hợp Hệ Thống & Vận Hành (Bản Hiện Tại)

> **Cập nhật lần cuối:** 20/11/2026  
> **Trạng thái:** Đã hoàn thiện, vượt qua kiểm tra build/E2E và đã deploy chạy production trên Vercel + Neon PostgreSQL.

---

## 1. Thông tin triển khai & Hạ tầng

| Thành phần | Môi trường Production (Online) | Môi trường Local (Phát triển / Test) |
|---|---|---|
| **Web App** | `https://mktteam.vercel.app` (Vercel Hobby) | `http://localhost:3000` (`npm run start` / `npm run dev`) |
| **Framework** | Next.js `16.4.6` (App Router + Turbopack), React 19, TypeScript, Tailwind CSS | Cùng codebase |
| **Database** | Neon Serverless PostgreSQL (`neon-indigo-tree`, kết nối qua Vercel Storage) | Prisma Dev PostgreSQL (`localhost:51214`) |
| **ORM** | Prisma `7.10.1` + `@prisma/adapter-pg` + `pg` (`src/lib/prisma.ts`) | Cùng cấu hình (`max=1` khi chạy local PGlite, `max=10` trên Neon) |
| **Build command** | `npm run build` (`prisma generate && next build`) | `npm run build` |

---

## 2. Tài khoản Team & Quyền hạn (9 tài khoản từ `prisma/seed.ts`)

Mật khẩu khởi tạo mặc định cho tất cả tài khoản sau khi seed là **`123456`**:

| Tên | Email đăng nhập | Vai trò | Phạm vi / Ghi chú công suất |
|---|---|---|---|
| **Hương** | `huong.leader@metaecom.vn` | `LEADER` | Thuyền trưởng — xem & quản trị toàn bộ dự án, duyệt QC/Brief, xem cấu hình Intake |
| **Lâm** | `lam@metaecom.vn` | `MEMBER` | Content Marketing + Design (dự án Inpro) |
| **Thảo** | `thao@metaecom.vn` | `MEMBER` | Content (dự án Olympic AI) |
| **Vy** | `vy@metaecom.vn` | `MEMBER` | Content + Edit (dự án Livestream) |
| **Cảnh** | `canh@metaecom.vn` | `MEMBER` | Content + Edit (dự án Livestream) |
| **Tuns** | `tuan.web@metaecom.vn` | `MEMBER` | WEB + AI + ADS |
| **Tuấn 2k8** | `tuan.support@metaecom.vn` | `MEMBER` | Support / Seeding |
| **Hoàng** | `hoang@metaecom.vn` | `MEMBER` | Media Quay / Dựng (giới hạn **2 video/ngày**) |
| **Mai** | `mai@metaecom.vn` | `MEMBER` | Media Design (giới hạn **16 ảnh/tuần**) |

### Lưu ý bảo mật BẮT BUỘC khi team dùng online:
1. **Đổi mật khẩu tài khoản:** Nhắc toàn bộ thành viên đăng nhập lần đầu xong vào biểu tượng chìa khóa (thanh trên cùng bên phải trong `AppShell`) để đổi mật khẩu khác `123456`.
2. **Đổi mật khẩu Database Neon (khuyến nghị):** Nếu chuỗi `DATABASE_URL` từng được chia sẻ/dán trong quá trình cài đặt, có thể vào Neon Dashboard → Reset Password rồi cập nhật lại biến `DATABASE_URL` và `DATABASE_URL_UNPOOLED` trên Vercel + **Redeploy**.
3. **Cô lập dữ liệu (Project Isolation):**
   - `LEADER` xem được toàn bộ dự án & nhân sự.
   - Thành viên thuộc dự án (`ProjectMember`) xem được toàn bộ task trong dự án đó (gồm cả order Media thuộc dự án), không thấy thông tin dự án mình không tham gia.
   - Nhân sự dùng chung (Media, Web/Ads, Support) chỉ xem các task được giao hoặc tự tạo, kèm kiểm tra công suất & lịch nghỉ khi giao việc.

---

## 3. Bản đồ tính năng & Các trang trong hệ thống

### A. Nhóm Hằng ngày
- **`/leader` — Boong Thuyền Trưởng** *(chỉ `LEADER`)*:
  - Thống kê nhanh task *Đang chạy / Chờ duyệt / Quá hạn / Đã xong* và tiến độ *Luyện Tập*.
  - **Biệt đội 3D** (lưới thẻ + Boong Sunny 3D Three.js), check-in 9h sáng và cảnh báo *Den Den Mushi* khi có nhân sự gặp vướng mắc (`AT_RISK`).
  - Lọc nhanh bảng nhiệm vụ toàn băng: `⛵ Đang ra khơi`, `👀 Chờ duyệt`, `🌊 Quá hạn`, `📋 Ngoài team`, `Tất cả`; hỗ trợ duyệt nhanh 1 click.
- **`/my-work` — Nhật Ký Hải Trình**:
  - Check-in 9h sáng 1 chạm + Nhân vật 3D đồng hành + nhắc các khóa học bắt buộc đang làm dở.
  - **Bố cục 1 ngày tập trung:** thanh ngang **T2 → CN** chọn từng ngày, bên dưới chỉ hiển thị To-Do của đúng ngày đang chọn (mục *Quá hạn / Chưa lên ngày*, *Sắp tới sau tuần này*, *Đã hoàn thành* được thu gọn ở dưới).
  - **Đồng bộ KPI hàng ngày theo đầu việc đặt tên cụ thể** *(vd `2 bài Content Facebook`, `1 kịch bản TVC`, `1 bài SEO Web`)*: tự sinh task tương ứng kèm checklist nhỏ (`#1`, `#2`...) và phản ánh tiến độ theo từng đầu việc hoàn thành.
  - **Nhận diện ngày nghỉ:** Chủ Nhật (`Nghỉ CN`) và ngày có đơn nghỉ phép đã duyệt dạng nghỉ cả ngày/công tác (`Nghỉ phép`) không tự động đồng bộ KPI bắt buộc và không báo đỏ `0/N`.
  - **Hoàn thành subtask & Gửi duyệt QC:**
    - Tick đủ 100% checklist nhỏ trên task KPI ngày / task không cần QC / hoặc do Leader thao tác → tự động đánh dấu hoàn thành task cha (`MARK_DONE`).
    - Task Content/Media thường do `MEMBER` làm → giữ nguyên để không bỏ qua QC của Leader và hiện toast + nút nhanh **Gửi duyệt** (`SUBMIT_FOR_REVIEW` → `WAITING_APPROVAL`).
- **`/media-orders` — Order Media**:
  - Phân tách 3 tab rõ ràng: **Brief Ảnh**, **Brief Video**, và **📋 Đơn Ngoài Team** (`isOutsideDepartment = true`).
  - Hỗ trợ nhập chi tiết từng ảnh/video (tỷ lệ khung hình, mô tả, link mẫu), chỉnh deadline/số lượng/trạng thái trực tiếp, tự cảnh báo đơn gấp (< 48h nội bộ, < 7 ngày đơn ngoài phòng ban, rơi vào T7/CN) và chế độ xóa hàng loạt đưa vào Thùng rác.
- **`/chat` — Chat Băng Mũ Rơm**:
  - Phòng chat chung toàn team (`⛵ Boong Tàu Sunny`), hòm thư góp ý ẩn danh (`🕵️ Hòm Thư Góp Ý Ẩn Danh`), chat nhóm theo dự án hoặc nhắn riêng.

### B. Nhóm Kiểm tra & Báo cáo
- **`/outputs` — Kiểm Tra & Duyệt Output** *(Leader)* / **Output Của Tôi** *(Member)*:
  - Thay thế hoàn toàn `/reviews` cũ (đường dẫn `/reviews` tự động chuyển hướng sang `/outputs?readiness=NEEDS_REVIEW`; toàn bộ thông báo/email/push đều trỏ về `/outputs?readiness=NEEDS_REVIEW`).
  - Xem trực tiếp nội dung Caption, ảnh/link tư liệu, **Mockup bài đăng Facebook** trước khi duyệt.
  - **Gemini AI Check QC Output:** chấm điểm theo bộ tiêu chuẩn QC nội bộ (Content / Ảnh / Video), gợi ý sửa Caption và đẩy lỗi sang form *Yêu cầu sửa (`REVISION_NEEDED`, tối đa 3 lần)*.
- **`/reports` — Báo Cáo Công Việc**:
  - Tổng hợp theo **Tuần → Tháng**, gộp các đầu việc cùng tính chất & tổng sản lượng.
  - Có cột **KPI cá nhân** đối chiếu số lượng đã xong trên chỉ tiêu KPI ngày nhân với số ngày công thực tế (`countKpiWorkingDays`: Thứ 2 → Thứ 6 trừ đơn nghỉ đã duyệt cả ngày, tính `0.5` cho nghỉ nửa buổi).
  - Hỗ trợ xuất Excel (CSV) và gửi báo cáo tuần/tháng lên Leader.
- **`/fanpage-reports` & `/fanpage-reports/[id]` — Báo Cáo Dữ Liệu Fanpage**:
  - Theo dõi Reach, Impressions, Engagement, ER%, Followers, Video Views, Inbox... qua **Graph API Realtime**, **Import CSV Meta**, hoặc webhook `/api/fanpages/ingest`.
  - Hiển thị biểu đồ xu hướng SVG tương tác, Donut cơ cấu tương tác, phễu hiệu suất và xếp hạng bài đăng nổi bật.

### C. Nhóm Dự án & Hậu cần / Quản trị
- **`/projects/[slug]`**: Không gian từng dự án với luồng việc *Brief → Demo → Feedback → Final → Lên sóng*, **Lịch đăng bài (`CALENDAR`)** theo nền tảng (Fanpage, TikTok, WEB), **Content Matrix** và **Brief Media**.
- **`/knowledge` — Khu Luyện Tập**: Quản lý khóa học bắt buộc và khóa chia sẻ, theo dõi % hoàn thành bài học của từng thành viên, nút nhắc học cho Leader.
- **`/resources` — Tài Nguyên & Thiết Bị**: Lưu trữ link/tài nguyên dùng chung và đặt lịch mượn/trả thiết bị quay chụp.
- **`/schedule` — Lịch Hoạt Động Băng**: Gửi & duyệt đơn xin nghỉ (`FULL_DAY`, `HALF_MORNING`, `HALF_AFTERNOON`, `REMOTE`, `BUSINESS_TRIP`) và lịch họp team.
- **`/budgets` — Kho Báu Ngân Sách**: Tạo và duyệt đề xuất chi phí sản xuất / chạy Ads.
- **`/team` — Băng & Ốc Sên Tin** *(chỉ `LEADER`)*: Quản lý nhân sự, phân dự án, cấu hình KPI ngày của từng thành viên, lấy endpoint & script **Google Form Intake** (`/api/intake/google-form`) cho đơn đặt hàng từ phòng ban ngoài, và cấu hình Push/nhắc lịch.

---

## 4. Biến môi trường & Cấu hình trên Vercel

### Đã cấu hình trên Project `mktteam` (Vercel):
| Biến | Mục đích | Ghi chú |
|---|---|---|
| `DATABASE_URL` | Kết nối Neon Postgres có `-pooler` | Vercel Storage tự sinh — dùng cho app chạy runtime |
| `DATABASE_URL_UNPOOLED` | Kết nối Neon Postgres trực tiếp không qua pgbouncer | Vercel Storage tự sinh — dùng khi chạy `npx prisma db push` từ máy |
| `AUTH_SECRET` | Khóa ký JWT cookie phiên đăng nhập (`mkt_hub_session`) | Chuỗi ngẫu nhiên >= 32 ký tự |
| `CRON_SECRET` | Khóa bảo vệ endpoint `/api/cron/reminders` | Khớp với Secret trên GitHub Actions |
| `APP_URL` | Domain chính thức `https://mktteam.vercel.app` (không có `/` cuối) | Dùng tạo link mở app trong email/thông báo/Google Form script |

### Biến tùy chọn (có thể bổ sung sau khi cần dùng):
- **Gửi Email thông báo qua Gmail (`src/lib/mailer.ts`):**
  - `SMTP_HOST="smtp.gmail.com"`
  - `SMTP_PORT="465"`
  - `SMTP_USER` *(Gmail dùng chung của Team MKT)*
  - `SMTP_PASS` *(App Password 16 ký tự trong Google Account → Security → 2-Step Verification → App passwords)*
  - `SMTP_FROM_NAME="Meta Ecom MKT Hub"`
- **Google Gemini AI Check QC:**
  - `GEMINI_API_KEY` và `GEMINI_MODEL="gemini-3.8-flash"` *(hoặc Leader nhập API Key trực tiếp ngay trên giao diện modal cài đặt AI ở `/outputs`)*.
- **Web Push Notification:** `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_SUBJECT` *(nếu không set env, hệ thống có cơ chế tự tạo secret lưu trong DB)*.

---

## 5. Nhắc lịch tự động (Cron) & Google Form ngoài team

### A. Kích hoạt nhắc lịch tự động hằng ngày
Workflow có sẵn tại `.github/workflows/reminders.yml` với 5 khung giờ Việt Nam:
- **09:00 hằng ngày** (`0 2 * * *` UTC): nhắc Check-in đầu ngày & task đến hạn.
- **12:00 Thứ Sáu** (`0 5 * * 5` UTC): nhắc lập Plan tuần sau.
- **15:00 hằng ngày** (`0 8 * * *` UTC): nhắc Content nộp ấn phẩm ngày mai chờ duyệt.
- **16:00 hằng ngày** (`0 9 * * *` UTC): tổng hợp hàng đợi gửi Leader duyệt.
- **17:30 hằng ngày** (`30 10 * * *` UTC): nhắc Media bàn giao cuối ngày & Content gửi Brief mới.

**Cách bật trên GitHub:**
1. Đảm bảo trong repo GitHub đã có file `.github/workflows/reminders.yml` *(nếu upload bằng GitHub Web bị ẩn thư mục `.github`, bấm **Add file → Create new file**, đặt tên `.github/workflows/reminders.yml` rồi dán nội dung từ file local trên máy).*
2. Vào Repo GitHub → **Settings → Secrets and variables → Actions → New repository secret**, thêm 2 secret:
   - `APP_URL` = `https://mktteam.vercel.app`
   - `CRON_SECRET` = *(giá trị giống hệt `CRON_SECRET` trên Vercel)*

### B. Nhận đơn từ phòng ban khác qua Google Form
- Vào `/team` (bằng tài khoản Leader) để lấy **Webhook URL**, **`x-intake-secret`** và đoạn code Google Apps Script dựng sẵn trỏ tới `/api/intake/google-form`.
- Đơn gửi từ form sẽ tự động vào dự án/hệ thống với cờ `isOutsideDepartment = true` (yêu cầu đặt trước tối thiểu 7 ngày) và xuất hiện ở tab **📋 Đơn Ngoài Team** trong `/media-orders` cũng như bộ lọc **Ngoài team** trên `/leader`.

---

## 6. Quy trình bảo trì & Cập nhật code về sau

### Cập nhật code lên GitHub & Vercel
- Sau khi sửa code ở máy local, đẩy lên nhánh `main` của GitHub → Vercel sẽ tự động build & deploy bản mới.
- **Nếu tiếp tục dùng GitHub Web UI:**
  - Chỉ upload những file vừa chỉnh sửa (vào đúng thư mục tương ứng trên web).
  - **Không bao giờ** upload `.env`, `node_modules/`, `.next/`, `src/generated/prisma/`, `tsconfig.tsbuildinfo`, `next-env.d.ts`.
  - GitHub Web giới hạn tối đa **100 file mỗi lần kéo thả**; khuyến nghị lâu dài nên dùng **Git** hoặc **GitHub Desktop** (tuân thủ sẵn `.gitignore`) để push chỉ những dòng thay đổi trong vài giây.

### Cập nhật cấu trúc Database (khi có chỉnh sửa `prisma/schema.prisma`)
Chạy tại thư mục dự án trên máy bằng chuỗi **`DATABASE_URL_UNPOOLED`** (lấy trong Vercel → *Settings → Environment Variables*):
```powershell
npx prisma db push --url "<DAN_CHUOI_DATABASE_URL_UNPOOLED_VAO_DAY>"
```

### Lưu ý về dữ liệu Local vs Production
- Database trên Vercel (`neon-indigo-tree`) hiện đã được chạy `npx prisma db push` và `npx tsx prisma/seed.ts` thành công (chứa sẵn 9 tài khoản team, 5 dự án gốc và dữ liệu khởi tạo mẫu).
- Dữ liệu thử nghiệm bạn từng tạo riêng trên `localhost` (trước khi deploy) vẫn nằm ở PostgreSQL local (`localhost:51214`), không tự động gộp sang Neon trừ khi export/copy riêng.

---

## 7. Cấu trúc & Kiến trúc code sau khi tối ưu

Các component giao diện lớn (> 900 dòng) đã được tách module hóa gọn nhẹ để dễ bảo trì:
- **Nhật Ký Hải Trình (`/my-work`):** `src/components/my-work-view.tsx` (856 dòng) tách cùng `my-work-top-widgets.tsx` (158 dòng), `my-work-sections.tsx` (331 dòng), `my-work-task-row.tsx`, `my-work-daily-kpi-panel.tsx`.
- **Chi tiết Fanpage:** `src/components/fanpage-detail-view.tsx` (522 dòng) tách biểu đồ & bảng lịch sử sang `fanpage-detail-charts.tsx` (680 dòng).
- **Modal Tạo Task / Order Media:** `src/components/create-task-modal.tsx` (677 dòng) tách form Brief Media & tùy chọn nâng cao sang `create-task-media-fields.tsx` (462 dòng).
- **Bảng Brief Media:** `src/components/media-brief-board.tsx` (716 dòng) tách từng dòng bảng sang `media-brief-row.tsx` (374 dòng).
- **Modal Kiểm tra Output & AI QC:** `src/components/output-inspector-modal.tsx` (518 dòng) tách cột phải QC/Gemini/Duyệt bài sang `output-inspector-qc-panel.tsx` (444 dòng).

### Trạng thái kiểm thử trước khi deploy:
- `npm run lint`: Pass (0 lỗi).
- `npm run build`: Pass (Next.js `16.4.6` + TypeScript + `57/57` routes).
- Toàn bộ `12` bộ kiểm thử E2E/API (bao gồm `verify_3_groups_final.mjs`, `smoke.mjs`, `verify_my_work_single_day.mjs`, `verify_daily_kpi_sync.mjs`, `test_knowledge_e2e.mjs`, `test_outputs_hub_e2e.mjs`, `test_subtasks_and_project_tabs.mjs`, `test_delete_mode_e2e.mjs`, `test_member_reports_grouping.mjs`, `test_media_brief_orders.mjs`, `test_publish_calendar_channels.mjs`, `verify_all_4_optimizations.mjs`) đã chạy đạt trước khi đóng gói và lên bản production tại `https://mktteam.vercel.app`.
