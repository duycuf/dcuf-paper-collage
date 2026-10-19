# Example prompts

The two prompts that produced the original kaye.creatives film in `assets/examples/kaye_10s_*` (shared with the original skill).

## 1 · Build

> I need a 10 sec launch video for my youtube channel kaye.creatives (youtube.com/@Kaye.creates), it's about AI filmmaking.
>
> I love this ref: https://pin.it/PEA0wLw2I. That torn paper collage look is exactly the vibe. Don't copy it 1:1 though, make it about my channel.
>
> Do as much as you can in code. Only generate stuff code can't do, like photo cutouts of a camera, an F1 car, a plane, a laptop. No people please.
>
> Idea: someone clicks a paper play button, the page rips open into my worlds (F1 car, camera lens into a kaleidoscope, a laptop with a prompt being typed), then "KAYE / CREATIVES" drops in, the page tears to the logo, and it ends with a subscribe click.
>
> Use Fraunces Black Italic for the title, dark night sky colours with neon pink. Fun music that hits on the cuts. Throw a few agents at it so it's faster.

## 2 · Polish

> looks good, let's polish it. make sure the music lands on the cuts, nothing covers the car or the title, no flashing on the whole screen. then render the final pls

## How these map onto the skill

Prompt 1 already answers almost every question in section 1 of SKILL.md: channel name, length, reference, what may be generated (object cut-outs only, no people), the idea for each beat, font, colours, music. So the agent doesn't need to ask again. Prompt 2 is exactly three items of "Check before sending": music on the cuts, nothing covers the hero or the title, no full-screen flashing.

## Adapting them

Change: the brand / channel name and handle, the reference link (a downloaded mp4 works best), the list of objects, the idea for 4–5 beats, the title font, the colours.
- Cut-outs now come from free stock photos, cut out on the machine (no credits). Replace "Only generate stuff code can't do, like photo cutouts of …" with "Use free stock photos for the cutouts (a camera, an F1 car, a plane, a laptop)", or attach your own product photos.
- Title in Vietnamese (or any language with accents): pick a font that has the needed glyphs, e.g. Be Vietnam Pro, Playfair Display, Lexend; check with `fonts_fetch.mjs --check` and the font sheet.
- "Throw a few agents at it" means you allow several agents in parallel (more tokens).

Vietnamese version of prompt 1, for a shop:

> Làm video 10 giây giới thiệu tiệm trà sữa của mình, kiểu cắt dán giấy xé. Có bản dọc cho TikTok. Khách đặt món qua điện thoại, cuối video là nút "Nhắn đặt ngay". Màu theo logo, chữ tiếng Việt.
