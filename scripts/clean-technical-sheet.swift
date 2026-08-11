import AppKit
import CoreText
import Foundation
import ImageIO
import UniformTypeIdentifiers
import Vision

guard CommandLine.arguments.count >= 3 else {
    fputs("Usage: clean-technical-sheet <input> <output> [--force]\n", stderr)
    exit(2)
}

let inputURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])
let forceSanitize = CommandLine.arguments.contains("--force")

guard
    let source = CGImageSourceCreateWithURL(inputURL as CFURL, nil),
    let image = CGImageSourceCreateImageAtIndex(source, 0, nil)
else {
    fputs("Cannot read image\n", stderr)
    exit(3)
}

let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.usesLanguageCorrection = false
request.recognitionLanguages = ["zh-Hans", "en-US"]

do {
    try VNImageRequestHandler(cgImage: image, orientation: .up).perform([request])
} catch {
    fputs("Vision OCR failed: \(error)\n", stderr)
    exit(4)
}

let observations = request.results ?? []
let recognized = observations
    .compactMap { $0.topCandidates(1).first?.string }
    .joined(separator: " ")
let normalized = recognized.lowercased()

let sewingKeywords = ["缝制方法", "sewing method", "sexing method", "stitching method"]
let dimensionKeywords = ["产品参数", "description", "尺寸", "dimension", "size"]
let hasMeasurement = normalized.range(
    of: #"\d+(?:[.,]\d+)?\s*(?:mm|cm|毫米|厘米)"#,
    options: .regularExpression
) != nil
let isSewing = sewingKeywords.contains { normalized.contains($0) }
let isDimensions = dimensionKeywords.contains { normalized.contains($0) } && hasMeasurement

guard forceSanitize || isSewing || isDimensions else {
    print(#"{"kind":"irrelevant"}"#)
    exit(10)
}

let width = image.width
let height = image.height
guard let context = CGContext(
    data: nil,
    width: width,
    height: height,
    bitsPerComponent: 8,
    bytesPerRow: 0,
    space: CGColorSpaceCreateDeviceRGB(),
    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
) else {
    fputs("Cannot create image context\n", stderr)
    exit(5)
}

context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
context.setFillColor(NSColor.white.cgColor)

let measurementExpression = try! NSRegularExpression(
    pattern: #"\d+(?:[.,]\d+)?\s*(?:mm|cm)"#,
    options: [.caseInsensitive]
)

for observation in observations {
    guard let candidate = observation.topCandidates(1).first else { continue }
    let text = candidate.string
    let range = NSRange(text.startIndex..<text.endIndex, in: text)
    let measurements = measurementExpression.matches(in: text, range: range).compactMap {
        Range($0.range, in: text).map { String(text[$0]) }
    }
    let box = observation.boundingBox
    let pixelRect = CGRect(
        x: box.minX * CGFloat(width),
        y: box.minY * CGFloat(height),
        width: box.width * CGFloat(width),
        height: box.height * CGFloat(height)
    ).insetBy(dx: -4, dy: -4)

    let onlyMeasurements = text
        .replacingOccurrences(of: #"\d+(?:[.,]\d+)?\s*(?:mm|cm)"#, with: "", options: [.regularExpression, .caseInsensitive])
        .trimmingCharacters(in: .whitespacesAndNewlines)
        .isEmpty
    if onlyMeasurements {
        continue
    }

    context.fill(pixelRect)
    if let measurement = measurements.first {
        let fontSize = max(12, pixelRect.height * 0.78)
        let attributes: [NSAttributedString.Key: Any] = [
            .font: NSFont(name: "Helvetica Neue", size: fontSize) ?? NSFont.systemFont(ofSize: fontSize),
            .foregroundColor: NSColor.black,
        ]
        let line = CTLineCreateWithAttributedString(NSAttributedString(string: measurement, attributes: attributes))
        context.saveGState()
        context.textMatrix = .identity
        context.textPosition = CGPoint(x: pixelRect.minX + 3, y: pixelRect.minY + max(1, pixelRect.height * 0.08))
        CTLineDraw(line, context)
        context.restoreGState()
    }
}

guard let cleaned = context.makeImage() else {
    fputs("Cannot create cleaned image\n", stderr)
    exit(6)
}

guard let destination = CGImageDestinationCreateWithURL(
    outputURL as CFURL,
    UTType.jpeg.identifier as CFString,
    1,
    nil
) else {
    fputs("Cannot create output\n", stderr)
    exit(7)
}

CGImageDestinationAddImage(
    destination,
    cleaned,
    [kCGImageDestinationLossyCompressionQuality: 0.97] as CFDictionary
)
guard CGImageDestinationFinalize(destination) else {
    fputs("Cannot write output\n", stderr)
    exit(8)
}

print(#"{"kind":"\#(forceSanitize ? "sanitized" : isSewing ? "sewing" : "dimensions")"}"#)
