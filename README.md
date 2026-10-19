# dcuf-paper-collage

A **Claude Code** skill that makes 10–16 second torn-paper collage videos: channel intros, shop ads, product launches, portfolios. Stop-motion "on twos", ripped paper with white edges, cut-out objects dropping in, a kaleidoscope, a big title, a page tear to the logo.

- Renders **horizontal 16:9** and **vertical 9:16** from the same project (the vertical version is re-laid out, not cropped).
- **No AI image generation, no credits**: object photos come from free stock sites (Wikimedia Commons, Openverse, Internet Archive; Pexels/Pixabay with your own key) and are cut out on your machine. Photo credits are collected for you.
- **Brand palettes** generated from your brand colours; colours and title font are picked from numbered picture sheets.
- **Fonts bundled**, including full Vietnamese glyphs, so accented titles render correctly.
- **Synthesised music** that hits every beat, with paper foley (slaps, rips, whooshes).
- Made for non-technical users: Claude asks one question at a time, **in your language**, with ready-made choices.

*Tiếng Việt: xem [phần cuối](#tiếng-việt).*

## Install

### Option 1: plugin (recommended)
In Claude Code (the `claude` window in your terminal):
```
/plugin marketplace add duycuf/dcuf-paper-collage
/plugin install dcuf-paper-collage@dcuf-paper-collage
```
Update later with `/plugin marketplace update dcuf-paper-collage`.

### Option 2: manual
```bash
git clone https://github.com/duycuf/dcuf-paper-collage.git
```
then copy `skills/dcuf-paper-collage` into `~/.claude/skills/` (Windows: `C:\Users\<you>\.claude\skills\`).

## Requirements
- Node.js ≥ 22, `ffmpeg` (with `ffprobe`), Chrome / Edge / Brave, `uv` (Python, for photo search and cut-outs).
- Windows: `winget install OpenJS.NodeJS.LTS Gyan.FFmpeg astral-sh.uv`. macOS: `brew install node ffmpeg uv`.
- The first cut-out downloads a ~180 MB model (set `U2NET_HOME` to keep it on another drive).
- If something is missing, Claude asks and installs it for you.

## Use
Open Claude Code in a working folder and say, for example:
> Make a 10-second paper collage intro for my coffee shop, with a vertical version for TikTok.

or call `/dcuf-paper-collage` directly. Claude asks for the brand name and where you'll post, then sends a script, colour sheet, font sheet and a draft for you to approve before the final export.

Examples: `skills/dcuf-paper-collage/assets/examples/` (a fictional Vietnamese tea shop "Trà Mộc", a 12 s chapter story, 16 s horizontal and vertical versions).

## Credits
- The core (canvas collage engine, the kaye.creatives 10 s sample film, the render tools, the frame-by-frame analysis of the San Diego Zoo "Africa Rocks" ad) comes from the **"paper-collage-film"** skill shared online **without an author or licence**. All credit for that work belongs to its original author.
- This version adds: Windows support, free stock photos + local cut-outs instead of AI image generation, one config file for any brand, vertical 9:16, palettes from brand colours, Vietnamese fonts, photo credits, a guided Q&A in the user's language.
- **If you are the original author:** open an issue here to be credited, change the licence, or ask for removal, and I'll do it right away.
- No open licence yet because the core's licence is unknown: use it freely for your own videos, but please don't resell the skill.
- Fonts in `comp/fonts/` are Google Fonts (SIL OFL / Apache 2.0). Photos you download while using it have their own licences: see `cutouts/credits_all.md` in your project and credit CC BY / BY-SA photos in the video description.

## Tiếng Việt

Skill cho Claude Code làm video cắt dán giấy xé 10–16 giây (intro kênh, quảng cáo cửa hàng, giới thiệu sản phẩm, portfolio), xuất cả khổ ngang và khổ dọc. Ảnh lấy từ kho ảnh free và tách nền trên máy, không tốn credit. Font tiếng Việt có sẵn, đủ dấu.

- **Cài:** trong Claude Code gõ hai lệnh ở mục [Install](#install), hoặc chép thư mục `skills/dcuf-paper-collage` vào `C:\Users\<tên>\.claude\skills\`.
- **Dùng:** nói tiếng Việt bình thường, ví dụ "Làm video cắt dán 10 giây giới thiệu tiệm trà sữa của mình, có bản dọc cho TikTok". Claude sẽ hỏi bằng tiếng Việt, mỗi lần một câu, rồi gửi kịch bản, bảng màu, bảng font và bản nháp để bạn duyệt.
- Máy cần Node.js ≥ 22, ffmpeg, Chrome/Edge và uv; thiếu gì Claude hỏi rồi cài giúp.
