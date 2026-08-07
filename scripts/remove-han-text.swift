import AppKit
import Foundation
import ImageIO
import UniformTypeIdentifiers
import Vision

guard CommandLine.arguments.count == 3 else {
    fputs("Usage: swift scripts/remove-han-text.swift <input> <output>\n", stderr)
    exit(2)
}

let inputURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])

func isHan(_ scalar: Unicode.Scalar) -> Bool {
    switch scalar.value {
    case 0x3400...0x4DBF, 0x4E00...0x9FFF, 0xF900...0xFAFF, 0x20000...0x2FA1F:
        return true
    default:
        return false
    }
}

func isUnwantedDiagramGlyph(_ scalar: Unicode.Scalar) -> Bool {
    if isHan(scalar) {
        return true
    }

    // Chinese source sheets often prefix a numeric size with punctuation
    // (for example "总长：800mm"). Once the label is removed, that
    // punctuation is visual noise and should not remain on the clean diagram.
    return [":", "：", "，", "、", "；"].contains(String(scalar))
}

guard
    let source = CGImageSourceCreateWithURL(inputURL as CFURL, nil),
    let image = CGImageSourceCreateImageAtIndex(source, 0, nil)
else {
    fputs("Cannot read image: \(inputURL.path)\n", stderr)
    exit(3)
}

let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.usesLanguageCorrection = false
request.recognitionLanguages = ["zh-Hans", "en-US"]

let handler = VNImageRequestHandler(cgImage: image, orientation: .up)
do {
    try handler.perform([request])
} catch {
    fputs("Vision OCR failed: \(error)\n", stderr)
    exit(8)
}

let width = image.width
let height = image.height
let colorSpace = CGColorSpaceCreateDeviceRGB()
guard let context = CGContext(
    data: nil,
    width: width,
    height: height,
    bitsPerComponent: 8,
    bytesPerRow: 0,
    space: colorSpace,
    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
) else {
    fputs("Cannot create image context\n", stderr)
    exit(4)
}

context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
context.setFillColor(NSColor.white.cgColor)

var removed = 0
for observation in request.results ?? [] {
    guard let candidate = observation.topCandidates(1).first else { continue }
    let text = candidate.string
    var index = text.startIndex
    while index < text.endIndex {
        let next = text.index(after: index)
        let character = text[index..<next]
        if character.unicodeScalars.contains(where: isUnwantedDiagramGlyph),
           let box = try? candidate.boundingBox(for: index..<next) {
            let normalized = box.boundingBox
            let pixelRect = CGRect(
                x: normalized.minX * CGFloat(width),
                y: normalized.minY * CGFloat(height),
                width: normalized.width * CGFloat(width),
                height: normalized.height * CGFloat(height)
            ).insetBy(dx: -2.5, dy: -2.5)
            context.fill(pixelRect)
            removed += 1
        }
        index = next
    }
}

guard let cleaned = context.makeImage() else {
    fputs("Cannot create cleaned image\n", stderr)
    exit(5)
}

let outputType = UTType.jpeg.identifier as CFString
guard let destination = CGImageDestinationCreateWithURL(outputURL as CFURL, outputType, 1, nil) else {
    fputs("Cannot create output: \(outputURL.path)\n", stderr)
    exit(6)
}

CGImageDestinationAddImage(
    destination,
    cleaned,
    [kCGImageDestinationLossyCompressionQuality: 0.96] as CFDictionary
)
guard CGImageDestinationFinalize(destination) else {
    fputs("Cannot write output: \(outputURL.path)\n", stderr)
    exit(7)
}

print("\(inputURL.lastPathComponent): removed \(removed) Han glyphs")
