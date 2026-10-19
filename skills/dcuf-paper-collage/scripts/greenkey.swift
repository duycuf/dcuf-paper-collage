// greenkey: key a flat #00FF00 background to alpha, despill, split into connected components, write tight PNG crops.
// usage: greenkey <in.png> <out_prefix> [minAreaFrac=0.002]   -> <out_prefix>.png (1 piece) or <out_prefix>_1.png, _2.png … (left→right, top→bottom); prints JSON
import Foundation
import ImageIO
import CoreGraphics
import UniformTypeIdentifiers
let a = CommandLine.arguments
let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: a[1]) as CFURL, nil)!
let img = CGImageSourceCreateImageAtIndex(src, 0, nil)!
let W = img.width, H = img.height
let minFrac = a.count > 3 ? Double(a[3])! : 0.002
var px = [UInt8](repeating: 0, count: W * H * 4)
let cs = CGColorSpaceCreateDeviceRGB()
let ctx = CGContext(data: &px, width: W, height: H, bitsPerComponent: 8, bytesPerRow: W * 4, space: cs, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
ctx.draw(img, in: CGRect(x: 0, y: 0, width: W, height: H))
var alpha = [UInt8](repeating: 0, count: W * H)
for i in 0..<(W * H) {
  let r = Double(px[i*4]), g = Double(px[i*4+1]), b = Double(px[i*4+2])
  let gm = g - max(r, b)            // greenness
  var al = 1.0
  if gm > 90 { al = 0 } else if gm > 25 { al = 1 - (gm - 25) / 65 }
  if g > 160 && r < 110 && b < 110 { al = 0 }
  // despill
  var ng = g; if g > max(r, b) { ng = max(r, b) + (g - max(r, b)) * 0.15 }
  let A = UInt8(max(0, min(255, al * 255)))
  alpha[i] = A
  let k = Double(A) / 255
  px[i*4] = UInt8(r * k); px[i*4+1] = UInt8(ng * k); px[i*4+2] = UInt8(b * k); px[i*4+3] = A
}
// connected components on a 4x downscaled mask
let S = 4, w = W / S, h = H / S
var m = [Int32](repeating: 0, count: w * h)
for y in 0..<h { for x in 0..<w { var on = false; for dy in 0..<S { for dx in 0..<S { if alpha[(y*S+dy)*W + x*S+dx] > 128 { on = true } } }; m[y*w+x] = on ? -1 : 0 } }
var comps: [(Int,Int,Int,Int,Int)] = [] // minx,miny,maxx,maxy,count
var label: Int32 = 0
for y in 0..<h { for x in 0..<w where m[y*w+x] == -1 {
  label += 1; var st = [(x,y)]; m[y*w+x] = label; var bb = (x,y,x,y,0)
  while let (cx,cy) = st.popLast() { bb.4 += 1; bb.0 = min(bb.0,cx); bb.1 = min(bb.1,cy); bb.2 = max(bb.2,cx); bb.3 = max(bb.3,cy)
    for (nx,ny) in [(cx+1,cy),(cx-1,cy),(cx,cy+1),(cx,cy-1),(cx+1,cy+1),(cx-1,cy-1),(cx+1,cy-1),(cx-1,cy+1)] where nx>=0 && ny>=0 && nx<w && ny<h && m[ny*w+nx] == -1 { m[ny*w+nx] = label; st.append((nx,ny)) } }
  comps.append(bb) } }
let minCount = Int(Double(w*h) * minFrac)
var keep = comps.filter { $0.4 >= minCount }
keep.sort { ($0.1 / (h/3), $0.0) < ($1.1 / (h/3), $1.0) }
var outs: [String] = []
for (i, c) in keep.enumerated() {
  let pad = 6
  let x0 = max(0, c.0*S - pad), y0 = max(0, c.1*S - pad), x1 = min(W, (c.2+1)*S + pad), y1 = min(H, (c.3+1)*S + pad)
  let cw = x1 - x0, ch = y1 - y0
  var cp = [UInt8](repeating: 0, count: cw * ch * 4)
  for y in 0..<ch { for x in 0..<cw { let si = ((y0+y)*W + (x0+x)) * 4, di = (y*cw + x) * 4
    // keep only pixels belonging to this component's region (mask label at downscaled coords)
    let mx = min(w-1, (x0+x)/S), my = min(h-1, (y0+y)/S)
    var mine = m[my*w+mx] == Int32(0) || true
    if keep.count > 1 { let lab = m[my*w+mx]; mine = lab == 0 || lab == Int32(comps.firstIndex(where: { $0 == c })! + 1) }
    if mine { cp[di] = px[si]; cp[di+1] = px[si+1]; cp[di+2] = px[si+2]; cp[di+3] = px[si+3] } } }
  let octx = CGContext(data: &cp, width: cw, height: ch, bitsPerComponent: 8, bytesPerRow: cw * 4, space: cs, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  let oimg = octx.makeImage()!
  let path = keep.count == 1 ? a[2] + ".png" : a[2] + "_\(i+1).png"
  let d = CGImageDestinationCreateWithURL(URL(fileURLWithPath: path) as CFURL, UTType.png.identifier as CFString, 1, nil)!
  CGImageDestinationAddImage(d, oimg, nil); CGImageDestinationFinalize(d)
  outs.append("{\"file\":\"\(path)\",\"w\":\(cw),\"h\":\(ch),\"x\":\(x0),\"y\":\(y0)}")
}
print("[" + outs.joined(separator: ",") + "]")
