# Chấm công PWA - GitHub Pages

## Đưa lên GitHub Pages
1. Tạo repository mới (hoặc dùng repo web hiện có).
2. Upload **toàn bộ file trong thư mục này vào root repo**: `index.html`, `app.js`, `style.css`, `manifest.webmanifest`, `sw.js`, `icon-192.png`, `icon-512.png`.
3. GitHub > Settings > Pages > Deploy from a branch > `main` / `(root)` > Save.
4. Mở URL GitHub Pages bằng HTTPS.

## Cài như ứng dụng
- Chrome/Edge PC hoặc Android: dùng nút **Cài ứng dụng** khi nó xuất hiện, hoặc menu trình duyệt > Install app/Add to Home screen.
- iPhone/iPad: Safari > Share > Add to Home Screen.

## Dữ liệu GitHub
Trong app bấm **GitHub**, cấu hình owner/repo/branch/file và Fine-grained token có quyền `Contents: Read and write` cho repo dữ liệu.
Mặc định gợi ý: `kendevill/chamcong-data`, branch `main`, file `data.json`.
Token chỉ lưu trong localStorage của thiết bị, không nằm trong source GitHub Pages.

## Offline
Giao diện/app shell được cache bởi service worker. Dữ liệu chấm công đang có vẫn nằm trong localStorage. Đồng bộ lên/xuống GitHub cần mạng.
