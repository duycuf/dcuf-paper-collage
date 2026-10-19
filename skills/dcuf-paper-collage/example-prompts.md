# Prompt mẫu đi kèm skill

Anh gửi 18/10/2026 cùng bộ skill (ảnh chụp từ trang hướng dẫn của người chia sẻ). Đây chính là hai prompt đã tạo ra bản mẫu kaye.creatives nằm trong `assets/template/`.

## 1 · Dựng

> I need a 10 sec launch video for my youtube channel kaye.creatives (youtube.com/@Kaye.creates), it's about AI filmmaking.
>
> I love this ref: https://pin.it/PEA0wLw2I. That torn paper collage look is exactly the vibe. Don't copy it 1:1 though, make it about my channel.
>
> Do as much as you can in code. Only generate stuff code can't do, like photo cutouts of a camera, an F1 car, a plane, a laptop. No people please.
>
> Idea: someone clicks a paper play button, the page rips open into my worlds (F1 car, camera lens into a kaleidoscope, a laptop with a prompt being typed), then "KAYE / CREATIVES" drops in, the page tears to the logo, and it ends with a subscribe click.
>
> Use Fraunces Black Italic for the title, dark night sky colours with neon pink. Fun music that hits on the cuts. Throw a few agents at it so it's faster.

## 2 · Hoàn thiện

> looks good, let's polish it. make sure the music lands on the cuts, nothing covers the car or the title, no flashing on the whole screen. then render the final pls

## Cách prompt này khớp với skill

Prompt 1 trả lời sẵn gần hết câu hỏi "Intake" của SKILL.md: tên kênh, thời lượng, ref, giới hạn generate (chỉ cutout, không người), ý tưởng từng cảnh, font, màu, nhạc. Nhờ vậy agent không phải hỏi lại. Prompt 2 là đúng ba mục trong phần "QA before sending": nhạc khớp cắt, không che vật chính/tiêu đề, không nháy toàn màn hình.

## Dùng cho kênh của anh

Đổi các chỗ: tên kênh và handle, link ref (nên là file mp4 tải về), danh sách vật cần cutout, ý tưởng 4–5 nhịp, font tiêu đề (nếu chữ có dấu tiếng Việt thì chọn font có Vietnamese, ví dụ Be Vietnam Pro, Playfair Display, Lexend; font nào cũng phải xem trên Google Fonts có bộ "Vietnamese" rồi render thử bằng `font_sheet`), màu.
- Ảnh cắt giờ lấy từ trang ảnh free rồi tách nền ngay trên máy (không tốn credit). Thay câu "Only generate stuff code can't do, like photo cutouts of …" bằng "Use free stock photos for the cutouts (a camera, an F1 car, a plane, a laptop)", hoặc gửi kèm ảnh sản phẩm của anh. Chỉ khi anh ghi rõ "dùng Higgsfield" thì skill mới generate.
- "Throw a few agents at it" ở máy này nghĩa là anh cho phép chạy Workflow nhiều agent (tốn token hơn).
- Máy Windows chạy được rồi (xem `NGUON.md`).
