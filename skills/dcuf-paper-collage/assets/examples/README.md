# Ví dụ câu chuyện

Mẫu chính là `assets/template/` (khung 10 s, điền `comp/film.config.js`, không sửa code). Các file ở đây là **câu chuyện khác** để đọc và mượn cảnh. Mỗi file tự chứa đủ hàm, viết cứng chữ và tên ảnh của dự án gốc (khối `COPY` ở đầu): chép vào `comp/scenes.js` (và `audio/score.html`) của dự án mới, rồi thay `COPY`, tên ảnh và `duration`.

| file | dài | khổ | câu chuyện | cảnh đáng mượn |
|---|---|---|---|---|
| `tra-moc_film.config.js` + `tra-moc_palettes.js` | 10 s | 16:9 + 9:16 | **mẫu điền sẵn của khung 10 s**: "Trà Mộc", tiệm trà giả định, chữ tiếng Việt (ly trà sữa → xe máy giao hàng → đẩy vào miệng tách trà → kính vạn hoa → laptop đặt món → TRÀ NGON / TỚI LIỀN. → logo → NHẮN ĐẶT NGAY) | chép đè `comp/film.config.js` + `comp/palettes.js` để xem một config đầy đủ; ảnh: tìm lại theo tên (references/cutouts.md) |
| `kaye_10s_scenes.js` + `kaye_10s_score.html` | 10 s | 16:9 | phim gốc của skill: intro kênh YouTube (nút ▶ → xe F1 → máy quay → kính vạn hoa → bàn dựng → tựa → logo → SUBSCRIBE) | bản gốc của khung 10 s, dùng để so khi mẫu chạy sai |
| `kaye_30s_scenes.js` + `kaye_30s_score.html` | 30 s | 16:9 | bản dài của phim trên: quảng cáo điện thoại, chữ cắt báo (ransom), tường ảnh thumbnail | `CLX.ransom`, tường ảnh, cảnh điện thoại |
| `chapters_12s_scenes.js` + `chapters_12s_score.html` | 12 s | 16:9 | portfolio theo chương: mỗi dịch vụ một trang màu riêng với một vật (điện thoại reo + bong bóng chat · hộp đồ nghề + quạt thẻ · máy tính tiền + hóa đơn in ra · tường poster), cuối cùng mọi vật bay vào một cuốn sách gập lại | quạt thẻ (`skillScene`), hóa đơn in ra (`autoScene`), sách nuốt mọi vật (`bookScene`), trang chương có dải giấy riêng. `comp/devices.js` có bản dùng chung: `DV.cardFan`, `DV.receipt` |
| `promo_16s_scenes.js` + `promo_16s_score.html` | 16 s | 16:9 | khung 10 s kéo dài, nhiều vật hơn mỗi nhịp | cách kéo dài từng cảnh bằng ánh xạ thời gian |
| `promo_16s_9x16_scenes.js` | 16 s | 9:16 | bản dọc dựng lại của file trên (đặt `format: '9x16'` trong config) | cách đặt lại tiền cảnh, `landCover`, vùng an toàn 15 % dưới |
| `test_collage_scenes.js`, `test_fx_scenes.js` | — | 16:9 | trang thử từng thiết bị của `collage.js` / `collage_fx.js` | khi viết thiết bị mới |

Ba file `chapters_12s`, `promo_16s*` dựng cho portfolio duycuf.vn (19/10/2026). Ảnh cắt của chúng không đi kèm: thiếu ảnh thì hiện thẻ xám có tên, đọc khối `COPY` và `cuts:` để biết cần vật gì.

## Cách đổi độ dài mà không viết lại cảnh
Ánh xạ thời gian thay vì sửa số trong cảnh: `Cut(a, b, (ctx, t) => titleScene(ctx, t + (6.0 - a)))`. Độ lệch giữ là bội số của 1/12 s. Cảnh nào vẽ cảnh kế bên (kính vạn hoa → bàn qua `drawNext`, tựa → bàn trước 71/12, cảnh cuối → tựa) thì dời cả khối. Sau đó sửa `K.setup({bars})`, các cue nhạc và mốc ảnh tĩnh. Thời gian vượt độ dài phim thì giữ khung cuối.
