# 📋 Daily Planner Web App

Web app lập kế hoạch ngày với Next.js + Supabase. Miễn phí, đồng bộ đa thiết bị.

---

## 🚀 Hướng dẫn deploy (khoảng 15 phút)

### BƯỚC 1 — Tạo Supabase database (miễn phí)

1. Vào [supabase.com](https://supabase.com) → **Start your project**
2. Đăng ký / đăng nhập bằng GitHub
3. Nhấn **New project** → đặt tên (ví dụ: `daily-planner`) → chọn region **Southeast Asia** → nhấn **Create new project** (chờ ~2 phút)
4. Vào tab **SQL Editor** (menu trái) → nhấn **New query**
5. Copy toàn bộ nội dung file `supabase-schema.sql` → paste vào → nhấn **Run**
6. Vào **Authentication > Providers** → bật **Google** (nếu muốn đăng nhập Google, cần tạo OAuth app — xem hướng dẫn bên dưới)
7. Vào **Project Settings > API** → copy 2 giá trị:
   - `Project URL` → đây là `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → đây là `NEXT_PUBLIC_SUPABASE_ANON_KEY`

> **Bật Google OAuth (tuỳ chọn):**
> - Vào [console.cloud.google.com](https://console.cloud.google.com) → tạo project → APIs & Services → Credentials → Create OAuth Client → Web application
> - Authorized redirect URI: `https://your-project.supabase.co/auth/v1/callback`
> - Copy Client ID và Client Secret → dán vào Supabase > Authentication > Providers > Google

---

### BƯỚC 2 — Đưa code lên GitHub

1. Vào [github.com](https://github.com) → đăng nhập → nhấn **New repository**
2. Đặt tên `daily-planner` → nhấn **Create repository**
3. Trên trang repo vừa tạo, nhấn **uploading an existing file**
4. Kéo thả **toàn bộ thư mục** này vào → nhấn **Commit changes**

---

### BƯỚC 3 — Deploy lên Vercel

1. Vào [vercel.com](https://vercel.com) → đăng nhập bằng GitHub
2. Nhấn **Add New > Project** → chọn repo `daily-planner` → nhấn **Import**
3. Mở phần **Environment Variables** → thêm 2 biến:
   - `NEXT_PUBLIC_SUPABASE_URL` = URL từ bước 1
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Key từ bước 1
4. Nhấn **Deploy** → chờ ~2 phút
5. ✅ Xong! Vercel cho bạn link dạng `daily-planner-xxx.vercel.app`

---

### BƯỚC 4 — Cập nhật Supabase redirect URL

1. Quay lại Supabase > **Authentication > URL Configuration**
2. Thêm vào **Redirect URLs**: `https://daily-planner-xxx.vercel.app/auth/callback`
3. Lưu lại

---

## 💻 Chạy local (để test trước khi deploy)

```bash
# Yêu cầu: Node.js 18+

# 1. Copy file env
cp .env.local.example .env.local
# Rồi mở .env.local và điền URL + Key từ Supabase

# 2. Cài dependencies
npm install

# 3. Chạy
npm run dev

# Mở http://localhost:3000
```

---

## 📁 Cấu trúc project

```
daily-planner-app/
├── app/
│   ├── auth/callback/route.ts   # Xử lý OAuth callback
│   ├── globals.css              # CSS global
│   ├── layout.tsx               # Layout gốc
│   └── page.tsx                 # Toàn bộ app
├── lib/
│   └── supabase.ts              # Supabase client
├── supabase-schema.sql          # SQL tạo database
├── .env.local.example           # Template biến môi trường
└── package.json
```

---

## ✨ Tính năng

- ✅ Đăng nhập Google / Email
- ✅ Checklist với mức ưu tiên
- ✅ Timeline theo giờ
- ✅ Pomodoro timer với vòng tròn tiến trình
- ✅ Quick Capture (ghi nhanh ý tưởng)
- ✅ Daily Review với điểm năng suất
- ✅ Năng lượng theo giờ
- ✅ Đồng bộ real-time, dùng được mọi thiết bị
- ✅ Hoàn toàn miễn phí
