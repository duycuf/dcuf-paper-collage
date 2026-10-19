// Mux a video file and an audio file into one MP4 (passthrough video, AAC audio), trimmed to the video duration.
// usage: mux <video.mp4> <audio.m4a> <out.mp4>
import AVFoundation
let a = CommandLine.arguments
guard a.count >= 4 else { print("usage: mux <video> <audio> <out>"); exit(2) }
let v = AVURLAsset(url: URL(fileURLWithPath: a[1])); let au = AVURLAsset(url: URL(fileURLWithPath: a[2]))
let out = URL(fileURLWithPath: a[3]); try? FileManager.default.removeItem(at: out)
let comp = AVMutableComposition()
let vt = v.tracks(withMediaType: .video)[0]
let range = CMTimeRange(start: .zero, duration: v.duration)
let cv = comp.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)!
try! cv.insertTimeRange(range, of: vt, at: .zero)
cv.preferredTransform = vt.preferredTransform
let at = au.tracks(withMediaType: .audio)[0]
let ca = comp.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)!
let ad = CMTimeMinimum(au.duration, v.duration)
try! ca.insertTimeRange(CMTimeRange(start: .zero, duration: ad), of: at, at: .zero)
let ex = AVAssetExportSession(asset: comp, presetName: AVAssetExportPresetPassthrough)!
ex.outputURL = out; ex.outputFileType = .mp4; ex.shouldOptimizeForNetworkUse = true
let sem = DispatchSemaphore(value: 0)
ex.exportAsynchronously { sem.signal() }
sem.wait()
if ex.status == .completed { print("wrote \(out.path)") } else { print("failed: \(String(describing: ex.error))"); exit(1) }
