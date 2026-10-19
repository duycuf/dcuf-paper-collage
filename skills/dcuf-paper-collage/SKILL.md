---
name: dcuf-paper-collage
description: >-
  Video cắt dán giấy xé (paper collage) 10–16 giây cho bất kỳ thương hiệu nào. Dùng làm intro kênh, quảng cáo cửa hàng, giới thiệu sản phẩm, portfolio,
  ra mắt dịch vụ. Xuất cả 16:9 và 9:16 (dựng lại bố cục dọc, không cắt khung). Kiểu stop-motion "on twos", toàn bộ dựng bằng code. Ảnh vật thể lấy từ
  kho ảnh free rồi tách nền trên máy, không dùng AI sinh ảnh, không tốn credit. Hỏi người dùng bằng tiếng Việt, mỗi lần một câu, có lựa chọn sẵn, hợp
  với người không rành kỹ thuật. Có sẵn: bảng màu tự sinh từ màu thương hiệu, bảng chọn font và bảng chọn màu bằng hình, font có dấu, nhạc tổng hợp kèm
  tiếng giấy, ghi công ảnh, bàn giao ở −14 LUFS. Dùng khi người dùng muốn video kiểu collage / cắt dán / scrapbook / giấy xé / tạp chí cắt chữ / mixed-media
  / zine, hoặc gửi một clip collage và bảo "làm giống cái này" (kỹ thuật San Diego Zoo "Africa Rocks"). Không dùng cho ảnh ghép tĩnh, moodboard,
  lưới clip chia màn hình hay một hiệu ứng chuyển cảnh lẻ.
---

# dcuf-paper-collage

Một phim collage là **một cú máy liền mạch kiểu stop-motion xuyên qua các lớp giấy xé**, cắt theo nhạc. Phim kết bằng tựa lớn, cú xé trang ra logo và lời kêu gọi. Mọi thứ là code, chỉ trừ ảnh vật thể cắt dán.

**Người dùng là chủ shop, người làm nội dung, nhân viên marketing, không rành kỹ thuật.** Họ không gõ lệnh, không sửa file.
- Hỏi bằng lời thường, **mỗi lần một câu** qua công cụ hỏi có lựa chọn, luôn có một lựa chọn "em đề xuất" đặt đầu.
- Đầu vào đã có câu trả lời thì bỏ qua câu đó. Họ nói "em quyết đi" thì chọn mặc định rồi báo lại.
- Thứ gì nhìn được (kịch bản, bảng ảnh, font, màu, bản nháp) thì **cho xem**, đừng chỉ đọc tên.
- Xưng hô theo người dùng. Lệnh và đường dẫn trong file này là việc của Claude, không đưa cho họ.

`<SKILL>` = thư mục chứa file này. `<CORE>` = skill `dcuf-video-core` nếu máy có (mượn `scripts/deliver.mjs` để bàn giao); không có thì dùng lệnh ffmpeg thay thế ở mục 8. Không cần HyperFrames.

## Nguyên tắc (lý do ở references/lessons.md)
- **Kỹ thuật lấy từ clip mẫu, câu chuyện lấy từ thương hiệu.** Giữ ngữ pháp chuyển động, không chép cốt truyện.
- **Ẩn dụ bằng vật thật**: mỗi việc thương hiệu làm = một vật thật + một mẩu giấy ghi chữ. Cả phim chỉ một màn hình (bàn làm việc). Không đưa ảnh chụp màn hình thật của khách vào, không người, không nhân vật, trừ khi họ yêu cầu.
- **Lựa chọn bằng hình**: font → bảng font đánh số, màu → bảng màu đánh số. Người dùng trả lời bằng một con số.
- **Nhanh và thấy được**: gửi kịch bản, bảng ảnh, bản nháp sớm, báo giờ xong theo đồng hồ.
- Không nháy sáng toàn khung (người nhạy cảm ánh sáng). Nháy logo chỉ nằm trong dải giấy.

## 0 · Chuẩn bị máy (Claude tự làm, chỉ báo một dòng)
Cần Node ≥ 22, `ffmpeg`/`ffprobe` trên PATH, Chrome/Edge/Brave, `uv` (Python cho tìm ảnh + tách nền), mạng để tải Google Fonts. Thiếu thì hỏi "Em cài … nhé?" rồi tự cài (Windows: `winget install OpenJS.NodeJS.LTS` / `Gyan.FFmpeg` / `astral-sh.uv`). Lần tách nền đầu tiên tải model ~180 MB về `$U2NET_HOME` (không đặt thì `~/.u2net`).
macOS chạy được cả bản `.sh`/Swift cũ; mọi lệnh dưới đây là bản Node/Python chạy trên mọi máy.

## 1 · Hỏi (mỗi lần một câu)
| # | Hỏi (lời thường) | Lựa chọn (mặc định in đậm) | Ghi vào |
|---|---|---|---|
| 1 | "Video này để làm gì?" | **Quảng cáo / giới thiệu thương hiệu** · Intro kênh YouTube · Ra mắt sản phẩm · Portfolio cá nhân | `script.md` |
| 2 | "Gửi em tên thương hiệu đúng chính tả, link web/fanpage, logo, ảnh sản phẩm nếu có nhé" | (để họ thả file / link) | `brief.md` |
| 3 | "Đăng ở đâu?" | **Cả hai: Reels/TikTok (dọc) + YouTube/web (ngang)** · Chỉ dọc 9:16 · Chỉ ngang 16:9 | `format` |
| 4 | "Chữ trên video bằng tiếng gì?" | **Tiếng Việt** · Tiếng Anh | font (mục 5) |
| 5 | Kịch bản: Claude **tự đề xuất** 2 bản từ tài liệu (mục 3), cho xem bảng kịch bản | Bản A · Bản B · Sửa chữ | `script.md` |
| 6 | Màu: **gửi bảng màu** (mục 6) | số 0–3 | `palette` |
| 7 | Font tựa: **gửi bảng font** (mục 6) | số 1–8 | `titleFont` |
| 8 | "Cuối video mời người xem làm gì?" | **Nhắn tin / liên hệ** · Ghé web · Theo dõi kênh · Đặt hàng | `cta`, `url` |

- Nhạc mặc định là nhạc tổng hợp có sẵn, khớp từng nhịp. Chỉ khi họ nhắc tới nhạc riêng mới dùng nhạc của họ (mục 7).
- **Tóm tắt trước khi làm**: "anh/chị đã chọn" và "em tự quyết", rồi hỏi "Em làm theo vậy nhé?". Chọn một ý chưa phải là đồng ý làm.

| Đừng nói | Nói |
|---|---|
| cut-out, sprite | ảnh vật cắt rời |
| palette, grade | bảng màu |
| keyframe, beat, cue | khoảnh khắc, nhịp |
| render, draft | xuất video, bản nháp |
| 9:16 / 16:9 | khổ dọc (điện thoại) / khổ ngang (máy tính) |

## 2 · Dự án (1 phút)
```bash
node <SKILL>/scripts/new_project.mjs <thư mục> <slug>
cd <thư mục>/<slug>      # mọi lệnh dưới đây chạy trong dự án (agent: thêm `cd <dự án> &&` trước mỗi lệnh)
```
Tạo `comp/` (phim), `audio/score.html` (nhạc), `tools/`, `cutouts/`, `keyframes/raw/`, `refs/`, `review/`. **Mọi chỗ riêng của thương hiệu nằm trong một file: `comp/film.config.js`** (chữ, tên ảnh cắt cho từng nhịp, khổ, bảng màu, font). `comp/scenes.js` chỉ đọc file đó, không cần sửa cho phim 10 s.
Ảnh còn thiếu hiện thành **thẻ xám có ghi tên**, nên bản nháp chạy được ngay từ phút đầu. Ảnh nền (cỏ, đá, cây, mây, `cassette`) là tùy chọn: thiếu thì vẽ giấy trơn.

## 3 · Câu chuyện + bảng kịch bản (gửi trong ~15 phút)
Đọc web/tài liệu của thương hiệu, chọn **3 việc họ làm** (hoặc 3 sản phẩm), mỗi việc một vật thật. Viết `script.md`: `giây | nhạc | thấy gì | chữ trên hình (nguyên văn)`. Nhịp 120 BPM, 24 fps. Mỗi mẩu chữ ≤ ~32 ký tự, tựa 2 dòng ngắn.

**Khung 10 s (mẫu có sẵn, `film.config.js`)**
| giây | nhịp | trường trong config |
|---|---|---|
| 0–1.0 | trang giấy; vật chính rơi xuống (chạm 0.5), 3 vật nhỏ bật lên, nhãn mở đầu, con trỏ bấm 0.875 | `hero`, `pops`, `peek`, `openTag` |
| 1.0–2.5 | trang xé từ giữa → **việc 1**: vật bay qua các dải chéo, 3 bong bóng chat | `world1` |
| 2.5–3.5 | vết xé quét → **việc 2**: đẩy máy vào một vòng tròn (ống kính, miệng cốc, mặt đồng hồ), mống mắt giấy | `lens` |
| 3.5–4.5 | kính vạn hoa 3 vòng + 3 vật bay, lỗ lục giác → bàn | `kaleido` |
| 4.5–5.5 | **việc 3**: điện thoại hoặc laptop trên bàn, gõ đơn / lời nhắn, bấm nút, 3 vật đập xuống | `desk` (`device`) |
| 5.5–6.0 | máy ngửa lên, chùm dải giấy chở vật chính bay đi | `hero` |
| 6.0–7.5 | **tựa lớn** rơi xuống, 2 vật bay ngang | `title`, `titleFont`, `titleFly` |
| 7.5–8.5 | xé trang → dải logo + chức danh, logo nháy trong dải | `brand`, `role`, `logoFont`, `extraTag` |
| 8.5–10 | nút kêu gọi đập xuống, bấm 9.0 → đổi chữ, URL | `cta`, `url` |

Ví dụ ánh xạ:
| nhịp | tiệm trà sữa | studio ảnh | shop nội thất |
|---|---|---|---|
| vật chính | ly trà sữa | máy ảnh | ghế bành |
| việc 1 (bay qua dải) | xe máy giao hàng + bong bóng "1 ly trân châu nha" | ống kính | xe tải giao hàng |
| việc 2 (vòng tròn) | miệng ly nhìn từ trên | ống kính | gương tròn |
| kính vạn hoa | trân châu, lá trà, đá | phim, đèn flash | gối, đèn |
| bàn | **điện thoại** đặt món + máy tính tiền | laptop chỉnh ảnh | điện thoại đặt lịch tư vấn |

Câu chuyện khác khung 10 s (sửa `scenes.js`, xem `assets/examples/README.md`): 12 s theo chương (mỗi việc một trang, cuối cùng mọi vật bay vào một cuốn sách), 16 s dài hơn có bản dọc riêng, 30 s (quảng cáo điện thoại, chữ cắt báo, tường ảnh). **Gửi bảng kịch bản, chờ họ đồng ý rồi mới tìm ảnh.**

**Điện thoại hay laptop** (`desk.device`): khách của thương hiệu làm việc đó trên thiết bị nào thì dùng thiết bị đó. Đặt món, đặt lịch, nhắn tin, mua online → `'phone'` (vẽ bằng code, không cần ảnh, không cần đo; màn hình kiểu app: thanh tiêu đề `ui`, ô đơn `label` + `prompt`, nút `button`, hàng món `menu` + `menuLabel`, ngón tay chạm). Làm việc, thiết kế, viết, lập trình → `'laptop'` (ảnh laptop + `screenQuad`).

## 4 · Ảnh vật cắt rời (ảnh free + tách nền trên máy)
Chỉ những vật code không vẽ được. Thứ tự: ảnh của khách (sản phẩm, logo) → ảnh free. Chi tiết: references/cutouts.md.
```bash
uv run tools/stock_search.py search "<vật> isolated white background"          # → refs/stock/<q>/sheet.jpg (đánh số)
uv run tools/stock_search.py get refs/stock/<q>/results.json 3 --name <tên>_raw  # → keyframes/raw/ + dòng ghi công trong cutouts/credits.md
uv run tools/cutout.py keyframes/raw/<tên>_raw.jpg cutouts/<tên>.png            # tách nền + viền giấy trắng
```
- **Xem `sheet.jpg` trước khi chọn**: một vật, nền đơn giản, nét, ≥ 1200 px, không logo hãng khác, không người.
- Nguồn không cần key: Wikimedia Commons, Openverse, Internet Archive. Pexels/Pixabay chỉ khi có `PEXELS_API_KEY`/`PIXABAY_API_KEY` trong biến môi trường. **Không ghi key vào file.**
- Agent tìm ảnh song song được (references/agent_workflow.md). Brief cho agent phải dặn: không đưa email, tên, thông tin cá nhân của người dùng vào User-Agent hay bất kỳ request nào.
- **Đo lại trên ảnh mới** (tọa độ theo pixel của ảnh cắt, mở ảnh ra xem):
  - `lens.lensPx` + `lens.lensR`: tâm và bán kính vòng tròn để đẩy máy vào; `lens.spriteSize` = kích thước ảnh.
  - `desk.screenQuad`: 4 góc màn hình laptop (trên-trái, trên-phải, dưới-phải, dưới-trái); `desk.spriteSize`. Điện thoại vẽ bằng code thì bỏ qua.
- Logo dạng file → `cutouts/logo.png`. Logo dạng chữ → `brand` + `logoFont`.
- Gửi bảng ảnh đã cắt trên nền màu (đỏ + xanh) để duyệt: không viền nền cũ, không mất chi tiết.
- Xong ảnh: `node tools/credits.mjs` → `cutouts/credits_all.md` + đoạn ghi công dán vào mô tả video (ảnh CC BY / BY-SA bắt buộc ghi).

## 5 · Chữ và font
- Mọi chữ trên hình nằm trong `film.config.js`. Riêng chữ trên màn hình: `desk.ui`, `desk.label`, `desk.placeholder`, `desk.prompt`, `desk.button`, `desk.menuLabel`.
- **Font nằm sẵn trong dự án** (`comp/fonts/`, file woff2 có bộ chữ Việt, không tải Google Fonts lúc render), nên dấu luôn lấy đúng từ font, không bị trộn font dự phòng.
- **Có dấu tiếng Việt**: Be Vietnam Pro, Inter Tight, Lexend, Unbounded, Baloo 2, Lobster, Yeseva One, Playfair Display, Fraunces, Alfa Slab One, Bevan, Anton, Bungee, Gluten, JetBrains Mono. Nút kêu gọi, chữ cắt báo, nhãn, bong bóng đã dùng các font này.
- **Không có dấu** (chỉ để trang trí chữ Latin, không dùng cho chữ Việt): Chewy, Ultra, Rubik, Lilita One, Shrikhand, Chango, Rye, Cinzel, Abril Fatface, Special Elite, Permanent Marker, Instrument Serif. Logo mặc định là `'Baloo 2:800'`; `'Chewy'` chỉ khi tên thương hiệu không có dấu.
- **Thêm font** (font thương hiệu trên Google Fonts):
  ```bash
  node tools/fonts_fetch.mjs --check "Tên Font"        # có tiếng Việt không
  node tools/fonts_fetch.mjs "Tên Font:900"            # tải về comp/fonts/ + cập nhật fonts.css
  ```
  Rồi thêm mặt chữ vào `fonts()` trong `comp/film.js` (vd `'900 96px "Tên Font"'`) và đặt `titleFont`/`logoFont`. Mỗi họ font chỉ nạp **một** độ đậm cho tựa (engine vẽ bằng mặt chữ đã nạp).
- Font "Việt hóa" kiểu SVN-/UTM- thường chỉ miễn phí cho cá nhân, giấy phép không rõ: chỉ dùng khi khách có file và quyền dùng. Có file .woff2/.ttf thì chép vào `comp/fonts/` và thêm một dòng `@font-face` cuối `fonts.css`.
- Soát dấu trên ảnh tĩnh: phóng to từng chỗ chữ (nhãn, bong bóng, màn hình, nút, URL); mọi chữ có dấu cùng một nét với chữ không dấu, dấu không chạm viền giấy, dòng 2 của tựa không mất dấu.

## 6 · Màu và font tựa: chọn bằng hình
```bash
node tools/brand_palette.mjs --primary "#hex" [--secondary "#hex"] [--accent "#hex"] [--ink "#hex"] [--paper "#hex"]
node tools/palette_sheet.mjs 1.5 4.3 6.9 8.75 --pals orig,brand,brandVivid,brandDark [--format 9x16]
node tools/font_sheet.mjs "DÒNG 1|DÒNG 2" "Be Vietnam Pro:900|Playfair Display:italic 900|Yeseva One|Lobster|Unbounded:900|Lexend:800|Baloo 2:800|Fraunces:italic 900"
```
- Màu chính lấy từ logo/web của thương hiệu. Script sinh 3 bảng vào `comp/palettes.js`:
  - `brand`: nền giấy sáng, gần web nhất, nhưng phẳng hơn.
  - `brandVivid`: nền mảng lớn bằng màu tương phản, collage nổi nhất. **Em đề xuất bảng này.**
  - `brandDark`: nền tối.
- Gửi `review/palettes_sheet.png` (dòng 0 = màu gốc của engine). Người dùng chọn số → `palette:` trong config.
- **Soát ánh tím**: bảng màu chuyển mọi điểm ảnh, kể cả ảnh sản phẩm và logo. Màu xanh trời gốc dễ hóa tím; `unblue` (0–1) trong bảng màu sửa chỗ này. Sản phẩm phải giữ đúng màu thật.
- Bảng font: `review/title_fonts_sheet.png`, đánh số, đã tô theo bảng màu đang chọn.

## 7 · Nhạc
`audio/score.html` tổng hợp nhạc ngay trong trình duyệt (funk + tiếng giấy: đập, xé, vút, bật, gõ phím, click), khớp sẵn khung 10 s.
- Đổi nhịp: `window.SCORE_CONFIG` {dur, drop, mid, build, vac, lift, end} và `window.SCORE_CUES` ở `<script>` đầu file.
- Bỏ tiếng của sự kiện không có trong phim: xóa dòng trong `paper()`, đừng gán cue = null (sẽ lỗi).
```bash
node tools/render_audio.mjs "<dự án>/audio/score.html" audio/score.wav
node tools/aac.mjs audio/score.wav audio/score.m4a
python tools/music_window.py audio/score.wav --hits 0.5:0.35,1.0:1.0,6.0:1.0,7.5:0.45,8.5:1.0   # mỗi cú lớn to nhất trong cửa sổ của nó
```
Nhạc riêng của khách: `python tools/music_window.py track.mp3 --len 10` → chọn đoạn → `python tools/cut_audio.py track.mp3 <bắt đầu> 10 audio/score.m4a`, rồi dời hình theo nhịp của bài. Claude không nghe được: kiểm bằng số (references/music_notes_10s.md) và nói rõ với người dùng.

## 8 · Nháp → duyệt → bản cuối → bàn giao
```bash
node tools/render_film.mjs draft                                   # ~30 s → <slug>_draft.mp4
node tools/render_film.mjs draft --format 9x16                     # bản dọc từ cùng config → <slug>_draft_9x16.mp4
node tools/strip.mjs .frames_draft review/strip.png 1              # dải khung hình để tự soát
node tools/capture.mjs comp/index.html review/st --stills 0.5,1.75,3.0,4.1,5.0,6.9,8.2,9.5 [--query format=9x16]
node tools/render_film.mjs final audio/score.m4a <slug>_final.mp4 [--format 9x16]
node <CORE>/scripts/deliver.mjs <slug>_final.mp4 --out <thư mục bàn giao> --name "<Thương hiệu> - Intro" --version "v1" --cover-at 6.9
```
- Gửi bản nháp kèm vài khung tĩnh. Sửa theo góp ý rồi mới xuất bản cuối.
- Mỗi dự án chỉ chạy **một** lệnh xuất cùng lúc (lệnh xuất xóa thư mục khung của nó).
- `deliver.mjs`: chuẩn −14 LUFS, đặt tên `<tên> - 16x9|9x16 - <bản>.mp4`, ảnh bìa.
- Không có dcuf-video-core: chuẩn âm lượng `ffmpeg -i <slug>_final.mp4 -c:v copy -af loudnorm=I=-14:TP=-1:LRA=11 -c:a aac -b:a 256k "<Thương hiệu> - Intro - 16x9 - v1.mp4"`, ảnh bìa `ffmpeg -ss 6.9 -i <slug>_final.mp4 -frames:v 1 cover.png`.

## Ngữ pháp chuyển động (số đo San Diego, references/reference_san_diego.md)
- Mọi thứ **on twos** (12 hình/giây): `q(t) = floor(t*12)/12`, lớp giấy rung 1–2 px mỗi hình.
- **Không cắt cứng trước logo**: zoom xuyên, xé trang, vết xé quét, lỗ lục giác, ngửa máy sau chùm dải giấy.
- Rơi xuống: 3 hình (mép vào → giữa không −8° → chạm) + 1 hình nảy (1.03→1). Bật lên: 1–2 hình.
- Đẩy vào chi tiết: zoom mũ ~1→6× trong ~1 s, tâm zoom trượt dần vào chi tiết.
- Kính vạn hoa: vòng soi gương, **không xoay**, cứ ~0.35–0.38 s lớn gấp đôi; một vật lặp lại chỉ thành một vòng.
- Tựa rơi từ trên, expo-out 9 hình, không vượt quá đích, viền giấy trắng + khối nổi phối cảnh.
- Xé trang ~0.42 s có mặt sau giấy cong màu tối → dải giấy có wordmark; logo đổi kiểu giữ 2-1-2-3-2-2 khung, chỉ trong dải.
- Clip mẫu khách gửi thì **số đo của clip đó thắng** các số trên: tách khung 12 fps (`tools/extract.mjs`), làm bảng (`tools/sheet.mjs`), ghi `refs/analysis.md` theo đề mục của reference_san_diego.md.

## Khổ dọc 9:16
Cùng dự án, cùng config, thêm `--format 9x16`. `scenes.js` có bảng bố cục riêng cho dọc (`L = pick({ngang}, {dọc})`), không cắt từ bản ngang:
- nền vẽ cho khổ ngang đi qua `landCover()` (phóng ×1.78 cho phủ kín 1080×1920);
- vật tiền cảnh đặt lại theo khổ dọc, chữ to ×1.3;
- **chừa 15 % dưới cùng** cho nút và chữ của Reels/TikTok: không đặt tựa, URL, nút kêu gọi ở đó.

## Soát trước khi gửi (tự nhìn khung hình)
- Khớp nhạc: sự kiện hình so với đỉnh `--hits` / `--timeline`, lệch ≤ 1 khung.
- On twos: từng cặp khung giống nhau, trừ các sự kiện 1 khung cố ý.
- Chỗ nối: không khung trống, không giật; không gì đứng yên > ~1 s trừ tựa/logo.
- Không gì che vật chính, tựa, chữ trên nút, URL (để ý đường con trỏ, vật bay ngang tựa).
- Logo đọc được trên nền của bảng màu đã chọn (tương phản đủ).
- Chữ trên giấy ≥ 36 px, mỗi mẩu ≥ 0.8 s; tựa ≥ 1.5 s; logo ≥ 1.5 s.
- Không còn thẻ xám "thiếu ảnh" ở tiền cảnh. Không ánh tím lạ. Chữ có dấu đúng font.
- Bản dọc: không có gì quan trọng trong 15 % dưới.
- Thời lượng đúng (`ffprobe`), có tiếng, đỉnh ≤ −1 dBFS.
- Ảnh CC BY / BY-SA đã có đoạn ghi công.

## Tài liệu
| cần | ở đâu |
|---|---|
| các ví dụ câu chuyện (10 s, 12 s chương, 16 s ngang + dọc, 30 s) | assets/examples/README.md |
| ngữ pháp San Diego đo từng khung, bảng màu, font | references/reference_san_diego.md |
| API của CL / CLX / DV (thiết bị dựng sẵn) | references/api.md + đầu file collage.js, collage_fx.js, devices.js |
| nguồn ảnh, mẹo tìm, tách nền | references/cutouts.md |
| bản đồ nhạc + số đo | references/music_notes_10s.md |
| mốc hình của khung 10 s, lỗi hay gặp khi sửa | references/edit_notes_10s.md |
| chạy nhiều agent song song | references/agent_workflow.md |
| vì sao mặc định như vậy | references/lessons.md |
| trang thử thiết bị mới | assets/examples/test_collage_scenes.js, test_fx_scenes.js |
