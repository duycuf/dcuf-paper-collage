# dcuf-paper-collage

Skill cho **Claude Code** làm video cắt dán giấy xé (paper collage) 10–16 giây: intro kênh, quảng cáo cửa hàng, giới thiệu sản phẩm, portfolio. Kiểu stop-motion "on twos", giấy xé viền trắng, ảnh vật cắt rời rơi xuống, kính vạn hoa, tựa lớn, xé trang ra logo.

- Xuất cả **ngang 16:9** và **dọc 9:16** từ cùng một dự án (bố cục dọc dựng lại, không cắt khung).
- **Không dùng AI sinh ảnh, không tốn credit**: ảnh vật lấy từ kho ảnh free (Wikimedia Commons, Openverse, Internet Archive; Pexels/Pixabay nếu có key), tách nền ngay trên máy, tự ghi nguồn ảnh.
- **Bảng màu tự sinh** từ màu thương hiệu; chọn màu và font tựa bằng bảng hình đánh số.
- **Font tiếng Việt** tải sẵn, đủ dấu.
- **Nhạc tổng hợp** khớp từng nhịp, kèm tiếng giấy (đập, xé, vút).
- Claude hỏi bằng tiếng Việt, mỗi lần một câu, người không rành kỹ thuật dùng được.

## Cài đặt

### Cách 1: plugin (khuyên dùng)
Trong Claude Code (cửa sổ `claude` trong terminal):
```
/plugin marketplace add duycuf/dcuf-paper-collage
/plugin install dcuf-paper-collage@dcuf-paper-collage
```
Repo đang để riêng tư: tài khoản GitHub của bạn phải được mời vào repo và máy đã đăng nhập GitHub (`gh auth login`) thì Claude Code mới tải được.

### Cách 2: chép tay
```bash
git clone https://github.com/duycuf/dcuf-paper-collage.git
```
rồi chép thư mục `skills/dcuf-paper-collage` vào `~/.claude/skills/` (Windows: `C:\Users\<tên>\.claude\skills\`).

## Máy cần có
- Node.js ≥ 22, `ffmpeg` (có `ffprobe`), Chrome / Edge / Brave, `uv` (Python, để tìm ảnh và tách nền).
- Windows: `winget install OpenJS.NodeJS.LTS Gyan.FFmpeg astral-sh.uv`. macOS: `brew install node ffmpeg uv`.
- Lần tách nền đầu tiên tải model khoảng 180 MB (đặt biến `U2NET_HOME` nếu muốn để model ở ổ khác).
- Thiếu thứ gì Claude sẽ hỏi rồi cài giúp.

## Dùng
Mở Claude Code trong một thư mục làm việc rồi nói, ví dụ:
> Làm video cắt dán 10 giây giới thiệu tiệm trà sữa của mình, có bản dọc cho TikTok.

hoặc gọi thẳng `/dcuf-paper-collage`. Claude sẽ hỏi tên thương hiệu, nơi đăng, rồi gửi kịch bản, bảng màu, bảng font, bản nháp để bạn duyệt trước khi xuất bản cuối.

Ví dụ có sẵn: `skills/dcuf-paper-collage/assets/examples/` (tiệm trà giả định "Trà Mộc", bản 12 s theo chương, bản 16 s ngang và dọc).

## Nguồn gốc và giới hạn chia sẻ
- Phần lõi (engine canvas cắt dán, khung phim mẫu, công cụ render, tài liệu phân tích quảng cáo San Diego Zoo "Africa Rocks") đến từ một skill "paper-collage-film" được chia sẻ trên mạng, **không ghi tác giả và giấy phép**. Bản này đã tùy biến nhiều: chạy Windows, ảnh free + tách nền thay cho AI sinh ảnh, khung dùng cho mọi thương hiệu bằng một file config, khổ dọc, bảng màu thương hiệu, font tiếng Việt, ghi công ảnh.
- Vì vậy repo **chỉ chia sẻ riêng cho bạn bè được mời**. Vui lòng **không đăng lại công khai** hay bán lại.
- Font trong `comp/fonts/` là Google Fonts (giấy phép SIL OFL / Apache 2.0). Ảnh bạn tải về khi dùng có giấy phép riêng từng ảnh: xem `cutouts/credits_all.md` trong dự án của bạn và ghi công ảnh CC BY / BY-SA trong mô tả video.
