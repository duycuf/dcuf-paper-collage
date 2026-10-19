// Extract frames from a video at a fixed fps into JPEGs (AVFoundation, no deps).
// usage: extract <in.mp4> <out_dir> <fps> [maxWidth=1920] [quality=0.9]
import AVFoundation
import AppKit
let a = CommandLine.arguments
guard a.count >= 4 else { print("usage: extract <in> <out_dir> <fps> [maxW] [q]"); exit(2) }
let url = URL(fileURLWithPath: a[1]); let out = URL(fileURLWithPath: a[2]); let fps = Double(a[3]) ?? 24
let maxW = a.count > 4 ? (Double(a[4]) ?? 1920) : 1920; let q = a.count > 5 ? (Double(a[5]) ?? 0.9) : 0.9
try? FileManager.default.createDirectory(at: out, withIntermediateDirectories: true)
let asset = AVURLAsset(url: url)
let dur = CMTimeGetSeconds(asset.duration)
let gen = AVAssetImageGenerator(asset: asset)
gen.requestedTimeToleranceBefore = .zero; gen.requestedTimeToleranceAfter = .zero
gen.appliesPreferredTrackTransform = true
gen.maximumSize = CGSize(width: maxW, height: maxW)
let n = Int(floor(dur * fps + 1e-6))
var written = 0
for i in 0..<n {
  autoreleasepool {
    let t = CMTime(seconds: (Double(i) + 0.5) / fps, preferredTimescale: 600)
    guard let cg = try? gen.copyCGImage(at: t, actualTime: nil) else { return }
    let rep = NSBitmapImageRep(cgImage: cg)
    if let d = rep.representation(using: .jpeg, properties: [.compressionFactor: q]) {
      try? d.write(to: out.appendingPathComponent(String(format: "f_%04d.jpg", i))); written += 1
    }
  }
}
let tracks = asset.tracks(withMediaType: .video)
let nfps = tracks.first?.nominalFrameRate ?? 0
let size = tracks.first?.naturalSize ?? .zero
print("{\"frames\":\(written),\"duration\":\(dur),\"src_fps\":\(nfps),\"w\":\(Int(size.width)),\"h\":\(Int(size.height))}")
