# trade-signal-web

Mobile-first web app สำหรับ Trade Signal Noti

- ไม่มี login ใน MVP
- สร้าง workspaceId ใน localStorage อัตโนมัติ
- UI dark modern ตาม prototype เดิม
- Responsive: desktop sidebar, mobile bottom navigation
- Built-in CDC Action Zone dashboard
- Custom indicator script editor run ฝั่ง browser ด้วย Web Worker

## Local Development

```bash
cd trade-signal-web
npm install
cp .env.example .env
npm run dev
```

เปิด:

```text
http://localhost:5173
```

ต้องมี API ที่:

```env
VITE_API_BASE_URL=http://localhost:8080
```

## Cloud Run Deployment from GitHub

### Service

- Service name: `trade-signal-web`
- Region: `asia-southeast1`
- Authentication: Allow unauthenticated
- Port: `8080`
- Min instances: `0`
- Max instances: `1` หรือ `3`

### Build Env

ตั้งค่า build env ก่อน deploy:

```env
VITE_API_BASE_URL=https://YOUR_API_SERVICE_URL
```

หมายเหตุ: Vite จะ bake `VITE_API_BASE_URL` ตอน build time ถ้า API URL เปลี่ยนต้อง rebuild web

### Continuous Deployment

ใน Cloud Run Console:

```text
Create service
-> Continuously deploy from a repository
-> GitHub
-> repo: trade-signal-web
-> branch: ^main$
-> build type: Dockerfile
-> region: asia-southeast1
-> create
```

## Mobile-first Notes

- Desktop: sidebar ซ้าย + dashboard แบบหลาย column
- Mobile: bottom navigation + card list แทน table
- Watchlist และ Portfolio บนมือถือแสดงเป็น card เพื่อไม่ให้ตารางล้นจอ

## Custom Script Security

MVP นี้ custom script run ใน browser Web Worker เท่านั้น

ห้ามเอา script นี้ไปรันบน backend ตรง ๆ ด้วย `eval` หรือ `new Function` ใน Node main process
ถ้าจะทำ notification server-side ด้วย custom script ในอนาคต ต้องมี sandbox, timeout, memory limit, no network, output validation

## Telegram Notification UI

รอบนี้หน้า `Rules` มี panel `Telegram Notification` เพิ่มเข้ามา

ใช้ทำงานร่วมกับ API env:

```env
TELEGRAM_BOT_TOKEN=your-bot-token
```

ขั้นตอนใช้งาน:

1. สร้าง Telegram bot จาก `@BotFather`
2. ใส่ token ใน `trade-signal-api/.env`
3. Restart API
4. ส่งข้อความหา bot 1 ครั้ง
5. เอา chat id มาใส่ในหน้า Rules > Telegram Notification
6. กด Save Telegram
7. กด Send Test
8. กด Run Scanner Now เพื่อ scan rules ของ workspace ปัจจุบัน

หมายเหตุ: scanner รอบนี้รองรับ built-in `CDC_ACTION_ZONE` ก่อน ส่วน custom indicator ยังเป็น client-side preview เท่านั้น
