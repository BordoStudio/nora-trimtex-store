import CoreImage
import Foundation
import ImageIO
import UniformTypeIdentifiers
import Vision

func trace(_ message: String) {
    FileHandle.standardError.write(Data("\(message)\n".utf8))
}

struct SampleProduct: Decodable {
    let id: String
    let sku: String
}

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let productsURL = root.appendingPathComponent("data/catalog.samples.json")
let pagesURL = root.appendingPathComponent("data/catalog.sample-pages.json")
let decoder = JSONDecoder()
let products = try decoder.decode([SampleProduct].self, from: Data(contentsOf: productsURL))
let pageMap = try decoder.decode([String: [String]].self, from: Data(contentsOf: pagesURL))
let ciContext = CIContext(options: [.useSoftwareRenderer: true])

func containsCJK(_ value: String) -> Bool {
    value.unicodeScalars.contains { scalar in
        let code = scalar.value
        return (0x3400...0x4DBF).contains(code)
            || (0x4E00...0x9FFF).contains(code)
            || (0xF900...0xFAFF).contains(code)
    }
}

func isOldBrand(_ value: String) -> Bool {
    let normalized = value.uppercased()
        .unicodeScalars
        .filter { CharacterSet.alphanumerics.contains($0) }
        .map(String.init)
        .joined()
    return normalized.contains("DONGLI")
        || normalized.contains("DONG")
        || normalized.contains("DNGL")
        || normalized.contains("DONOL")
        || normalized.contains("ARTTEXTILE")
        || normalized.contains("TEXTILE")
        || ((normalized.contains("ART") || normalized.contains("ARY") || normalized.contains("AAT"))
            && (normalized.contains("TEXT") || normalized.contains("TEX") || normalized.contains("T8K")))
}

func isMeasurementUnit(_ value: String) -> Bool {
    let normalized = value.uppercased()
        .trimmingCharacters(in: .whitespacesAndNewlines)
        .replacingOccurrences(of: " ", with: "")
    return ["MM", "CM", "M", "毫米", "厘米"].contains(normalized)
}

func averageColour(_ image: CIImage, around rect: CGRect) -> CIColor {
    let sampleRect = rect.intersection(image.extent)
    guard !sampleRect.isNull,
          let filter = CIFilter(name: "CIAreaAverage", parameters: [
            kCIInputImageKey: image,
            kCIInputExtentKey: CIVector(cgRect: sampleRect),
          ]),
          let output = filter.outputImage
    else { return CIColor(red: 0.94, green: 0.93, blue: 0.90, alpha: 1) }

    var rgba = [UInt8](repeating: 0, count: 4)
    ciContext.render(
        output,
        toBitmap: &rgba,
        rowBytes: 4,
        bounds: CGRect(x: 0, y: 0, width: 1, height: 1),
        format: .RGBA8,
        colorSpace: CGColorSpaceCreateDeviceRGB()
    )
    return CIColor(
        red: Double(rgba[0]) / 255,
        green: Double(rgba[1]) / 255,
        blue: Double(rgba[2]) / 255,
        alpha: 1
    )
}

func outputType(for url: URL) -> CFString {
    switch url.pathExtension.lowercased() {
    case "gif": return UTType.gif.identifier as CFString
    case "png": return UTType.png.identifier as CFString
    default: return UTType.jpeg.identifier as CFString
    }
}

func redLogoRects(in cgImage: CGImage) -> [CGRect] {
    let width = cgImage.width
    let height = cgImage.height
    let rowBytes = width * 4
    var pixels = [UInt8](repeating: 0, count: rowBytes * height)
    guard let context = CGContext(
        data: &pixels,
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: rowBytes,
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ) else { return [] }
    context.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))

    func isLogoRed(_ index: Int) -> Bool {
        let offset = index * 4
        let red = Int(pixels[offset])
        let green = Int(pixels[offset + 1])
        let blue = Int(pixels[offset + 2])
        return red > 115 && red > green + 35 && red > blue + 25
    }

    var visited = [UInt8](repeating: 0, count: width * height)
    var rects: [CGRect] = []
    let maximumLogoWidth = max(10, width / 35)
    let maximumLogoHeight = max(10, height / 35)
    let maximumArea = max(80, width * height / 1800)

    for start in 0..<(width * height) where visited[start] == 0 && isLogoRed(start) {
        var queue = [start]
        visited[start] = 1
        var cursor = 0
        var count = 0
        var minX = width
        var maxX = 0
        var minY = height
        var maxY = 0

        while cursor < queue.count {
            let index = queue[cursor]
            cursor += 1
            count += 1
            let x = index % width
            let y = index / width
            minX = min(minX, x)
            maxX = max(maxX, x)
            minY = min(minY, y)
            maxY = max(maxY, y)
            for dy in -1...1 {
                for dx in -1...1 where dx != 0 || dy != 0 {
                    let nx = x + dx
                    let ny = y + dy
                    guard nx >= 0, nx < width, ny >= 0, ny < height else { continue }
                    let neighbour = ny * width + nx
                    if visited[neighbour] == 0 && isLogoRed(neighbour) {
                        visited[neighbour] = 1
                        queue.append(neighbour)
                    }
                }
            }
        }

        let componentWidth = maxX - minX + 1
        let componentHeight = maxY - minY + 1
        let backgroundPadding = max(8, max(componentWidth, componentHeight) * 2)
        let sampleMinX = max(0, minX - backgroundPadding)
        let sampleMaxX = min(width - 1, maxX + backgroundPadding)
        let sampleMinY = max(0, minY - backgroundPadding)
        let sampleMaxY = min(height - 1, maxY + backgroundPadding)
        var paleBackgroundPixels = 0
        var sampledBackgroundPixels = 0
        for sampleY in sampleMinY...sampleMaxY {
            for sampleX in sampleMinX...sampleMaxX {
                if sampleX >= minX, sampleX <= maxX, sampleY >= minY, sampleY <= maxY { continue }
                let pixelOffset = (sampleY * width + sampleX) * 4
                let red = Int(pixels[pixelOffset])
                let green = Int(pixels[pixelOffset + 1])
                let blue = Int(pixels[pixelOffset + 2])
                let maximum = max(red, max(green, blue))
                let minimum = min(red, min(green, blue))
                sampledBackgroundPixels += 1
                if minimum > 172, maximum - minimum < 48 {
                    paleBackgroundPixels += 1
                }
            }
        }
        let paleBackgroundRatio = sampledBackgroundPixels > 0
            ? Double(paleBackgroundPixels) / Double(sampledBackgroundPixels)
            : 0
        guard count >= 4,
              count <= maximumArea,
              componentWidth <= maximumLogoWidth,
              componentHeight <= maximumLogoHeight,
              paleBackgroundRatio >= 0.62
        else { continue }

        let centerX = CGFloat(minX + maxX) / 2
        let centerY = CGFloat(height) - CGFloat(minY + maxY) / 2
        let radius = CGFloat(max(componentWidth, componentHeight))
        let patchWidth = max(CGFloat(width) * 0.022, radius * 7.5)
        let patchHeight = max(CGFloat(height) * 0.012, radius * 3.8)
        rects.append(CGRect(
            x: centerX - patchWidth / 2,
            y: centerY - patchHeight / 2,
            width: patchWidth,
            height: patchHeight
        ))
    }
    return rects
}

func maskImage(for observation: VNRecognizedTextObservation, width: Int, height: Int, scaleX: CGFloat, scaleY: CGFloat) -> CIImage? {
    let points = [observation.topLeft, observation.topRight, observation.bottomRight, observation.bottomLeft]
        .map { CGPoint(x: $0.x * CGFloat(width), y: $0.y * CGFloat(height)) }
    let center = CGPoint(
        x: points.map(\.x).reduce(0, +) / 4,
        y: points.map(\.y).reduce(0, +) / 4
    )
    let expanded = points.map { point in
        CGPoint(
            x: center.x + (point.x - center.x) * scaleX,
            y: center.y + (point.y - center.y) * scaleY
        )
    }
    guard let context = CGContext(
        data: nil,
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: width,
        space: CGColorSpaceCreateDeviceGray(),
        bitmapInfo: CGImageAlphaInfo.none.rawValue
    ) else { return nil }
    context.setFillColor(gray: 0, alpha: 1)
    context.fill(CGRect(x: 0, y: 0, width: width, height: height))
    context.setFillColor(gray: 1, alpha: 1)
    context.beginPath()
    context.move(to: expanded[0])
    expanded.dropFirst().forEach { context.addLine(to: $0) }
    context.closePath()
    context.fillPath()
    guard let cgMask = context.makeImage() else { return nil }
    return CIImage(cgImage: cgMask)
}

func clean(_ url: URL, removeSmallMarks: Bool = true, removeRedLogos: Bool = false) throws -> Int {
    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
          let cgImage = CGImageSourceCreateImageAtIndex(source, 0, nil)
    else { throw NSError(domain: "SampleCleaner", code: 1, userInfo: [NSLocalizedDescriptionKey: "Cannot read \(url.path)"]) }

    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = false
    request.recognitionLanguages = ["zh-Hans", "en-US"]
    let recognitionScale = max(1, min(4, 2600 / max(1, cgImage.width)))
    let recognitionImage: CGImage
    if recognitionScale > 1 {
        let enlarged = CIImage(cgImage: cgImage).transformed(
            by: CGAffineTransform(scaleX: CGFloat(recognitionScale), y: CGFloat(recognitionScale))
        )
        recognitionImage = ciContext.createCGImage(enlarged, from: enlarged.extent) ?? cgImage
    } else {
        recognitionImage = cgImage
    }
    try VNImageRequestHandler(cgImage: recognitionImage, options: [:]).perform([request])

    let width = CGFloat(cgImage.width)
    let height = CGFloat(cgImage.height)
    var image = CIImage(cgImage: cgImage)
    var removed = 0

    if removeRedLogos {
        for rawRect in redLogoRects(in: cgImage) {
            let rect = rawRect.intersection(image.extent)
            guard !rect.isNull else { continue }
            let colour = averageColour(image, around: rect)
            image = CIImage(color: colour).cropped(to: rect).composited(over: image)
            removed += 1
        }
    }

    for observation in request.results ?? [] {
        guard let candidate = observation.topCandidates(1).first else { continue }
        let text = candidate.string
        let chinese = containsCJK(text)
        let oldBrand = isOldBrand(text)
        let nonArticleText = removeSmallMarks
            && !text.contains(where: \.isNumber)
            && !text.contains("-")
            && !isMeasurementUnit(text)
        guard chinese || oldBrand || nonArticleText else { continue }

        let box = observation.boundingBox
        let sampleRect = CGRect(
            x: box.minX * width,
            y: box.minY * height,
            width: box.width * width,
            height: box.height * height
        )
        var rect = sampleRect
        let horizontalPadding = chinese ? max(12, rect.height * 1.1) : max(5, rect.height * 0.22)
        let verticalPadding = max(4, rect.height * 0.18)
        rect = rect.insetBy(dx: -horizontalPadding, dy: -verticalPadding).intersection(image.extent)
        guard !rect.isNull else { continue }

        let colour = averageColour(image, around: sampleRect)
        let patch = CIImage(color: colour).cropped(to: image.extent)
        if let mask = maskImage(
            for: observation,
            width: cgImage.width,
            height: cgImage.height,
            scaleX: chinese || nonArticleText ? 1.80 : 1.08,
            scaleY: chinese || nonArticleText ? 1.50 : 1.18
        ), let blended = CIFilter(name: "CIBlendWithMask", parameters: [
            kCIInputImageKey: patch,
            kCIInputBackgroundImageKey: image,
            kCIInputMaskImageKey: mask,
        ])?.outputImage {
            image = blended
        }
        removed += 1
    }

    guard removed > 0,
          let outputImage = ciContext.createCGImage(image, from: image.extent)
    else { return 0 }

    let temporary = url.deletingLastPathComponent().appendingPathComponent(".clean-\(url.lastPathComponent)")
    guard let destination = CGImageDestinationCreateWithURL(temporary as CFURL, outputType(for: url), 1, nil)
    else { throw NSError(domain: "SampleCleaner", code: 2, userInfo: [NSLocalizedDescriptionKey: "Cannot write \(url.path)"]) }
    let properties: CFDictionary = [
        kCGImageDestinationLossyCompressionQuality: 0.96,
    ] as CFDictionary
    CGImageDestinationAddImage(destination, outputImage, properties)
    guard CGImageDestinationFinalize(destination) else {
        throw NSError(domain: "SampleCleaner", code: 3, userInfo: [NSLocalizedDescriptionKey: "Cannot finalize \(url.path)"])
    }
    _ = try FileManager.default.replaceItemAt(url, withItemAt: temporary)
    return removed
}

if CommandLine.arguments.count == 3, CommandLine.arguments[1] == "--file" {
    let target = URL(fileURLWithPath: CommandLine.arguments[2])
    let count = try clean(target)
    print("Cleaned \(target.path), removed \(count) text/logo regions.")
    exit(0)
}

if CommandLine.arguments.count == 3, CommandLine.arguments[1] == "--cjk-file" {
    let target = URL(fileURLWithPath: CommandLine.arguments[2])
    let count = try clean(target, removeSmallMarks: false)
    print("Cleaned \(target.path), removed \(count) Chinese/brand regions.")
    exit(0)
}

if CommandLine.arguments.count >= 3, CommandLine.arguments[1] == "--scan" {
    let supportedExtensions = Set(["jpg", "jpeg", "png", "gif", "webp"])
    var files: [URL] = []
    for argument in CommandLine.arguments.dropFirst(2) {
        let target = URL(fileURLWithPath: argument)
        var isDirectory: ObjCBool = false
        guard FileManager.default.fileExists(atPath: target.path, isDirectory: &isDirectory) else { continue }
        if isDirectory.boolValue {
            guard let enumerator = FileManager.default.enumerator(
                at: target,
                includingPropertiesForKeys: [.isRegularFileKey],
                options: [.skipsHiddenFiles]
            ) else { continue }
            for case let file as URL in enumerator where supportedExtensions.contains(file.pathExtension.lowercased()) {
                files.append(file)
            }
        } else if supportedExtensions.contains(target.pathExtension.lowercased()) {
            files.append(target)
        }
    }

    var editedFiles = 0
    var removedRegions = 0
    for (index, file) in files.sorted(by: { $0.path < $1.path }).enumerated() {
        let count = try clean(file, removeSmallMarks: false, removeRedLogos: false)
        if count > 0 {
            editedFiles += 1
            removedRegions += count
            print("\(file.path): \(count) Chinese/brand regions")
        }
        if (index + 1) % 100 == 0 {
            trace("Checked \(index + 1)/\(files.count) images")
        }
    }
    print("Checked \(files.count) images; cleaned \(editedFiles); removed \(removedRegions) Chinese/brand regions.")
    exit(0)
}

if CommandLine.arguments.count == 3, CommandLine.arguments[1] == "--cover" {
    let target = URL(fileURLWithPath: CommandLine.arguments[2])
    let count = try clean(target, removeSmallMarks: true, removeRedLogos: true)
    print("Cleaned cover \(target.path), removed \(count) text/logo regions.")
    exit(0)
}

func suspiciousText(in url: URL) throws -> [String] {
    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
          let cgImage = CGImageSourceCreateImageAtIndex(source, 0, nil)
    else { return [] }
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = false
    request.recognitionLanguages = ["zh-Hans", "en-US"]
    try VNImageRequestHandler(cgImage: cgImage, options: [:]).perform([request])
    return (request.results ?? []).compactMap { observation in
        guard let text = observation.topCandidates(1).first?.string else { return nil }
        let uppercase = text.uppercased()
        let knownHeading = [
            "INSP", "MAINT", "PRODUCT DISPLAY", "DESCRIPTION", "INSTRUCTION",
            "DONG", "ART-TEXTILE", "ART TEXTILE", "TEXTILE",
        ]
            .contains { uppercase.contains($0) }
        let wideTextLine = !text.contains(where: \.isNumber)
            && observation.boundingBox.width > 0.24
            && observation.boundingBox.height > 0.03
        return knownHeading || wideTextLine ? text : nil
    }
}

var visiblePages: [(path: String, cleanBranding: Bool)] = []
var allCataloguePages: [(path: String, cleanBranding: Bool)] = []
for product in products {
    let allPages = pageMap[product.id] ?? []
    allCataloguePages.append(contentsOf: allPages.map { ($0, true) })
    if product.sku.hasPrefix("Y-DL-") {
        visiblePages.append(contentsOf: allPages.dropFirst(3).dropLast(min(4, max(0, allPages.count - 3))).map { ($0, false) })
    } else if product.sku.hasPrefix("YK-DL-") {
        visiblePages.append(contentsOf: allPages.dropFirst(1).dropLast(min(4, max(0, allPages.count - 1))).map { ($0, true) })
    }
}

if CommandLine.arguments.count == 2,
   CommandLine.arguments[1] == "--audit" || CommandLine.arguments[1] == "--audit-all" {
    let pages = CommandLine.arguments[1] == "--audit-all" ? allCataloguePages : visiblePages
    for page in pages {
        let url = root.appendingPathComponent("public").appendingPathComponent(page.path.trimmingCharacters(in: CharacterSet(charactersIn: "/")))
        let findings = try suspiciousText(in: url)
        if !findings.isEmpty {
            print("\(page.path)\t\(findings.joined(separator: " | "))")
        }
    }
    exit(0)
}

var editedFiles = 0
var removedRegions = 0
let pagesToClean = CommandLine.arguments.contains("--all") ? allCataloguePages : visiblePages
for page in pagesToClean {
    let url = root.appendingPathComponent("public").appendingPathComponent(page.path.trimmingCharacters(in: CharacterSet(charactersIn: "/")))
    let count = try clean(url, removeSmallMarks: page.cleanBranding)
    if count > 0 {
        editedFiles += 1
        removedRegions += count
        print("\(page.path): \(count) regions")
    }
}
print("Cleaned \(editedFiles) images, removed \(removedRegions) text/logo regions.")
