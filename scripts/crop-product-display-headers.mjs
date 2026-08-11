import { resolve } from "node:path";
import sharp from "../node_modules/.pnpm/sharp@0.34.5/node_modules/sharp/lib/index.js";

const directory = resolve(process.argv[2] || "public/products/dimensions");
const files = ["1100.jpg", "1101.jpg", "1326.jpg", "1327.jpg", "1328.jpg", "1383.jpg"];

for (const file of files) {
  const path = resolve(directory, file);
  const { data, info } = await sharp(path).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let cropTop = 0;

  for (let y = 220; y < Math.min(420, info.height); y += 1) {
    let nonWhite = 0;
    for (let x = 0; x < info.width; x += 1) {
      const offset = (y * info.width + x) * info.channels;
      if (data[offset] < 242 || data[offset + 1] < 242 || data[offset + 2] < 242) nonWhite += 1;
    }
    if (nonWhite / info.width > 0.55) {
      cropTop = y;
      break;
    }
  }

  if (!cropTop) throw new Error(`Could not locate photo boundary in ${file}`);

  const output = await sharp(path)
    .extract({ left: 0, top: cropTop, width: info.width, height: info.height - cropTop })
    .jpeg({ quality: 96, chromaSubsampling: "4:4:4" })
    .toBuffer();
  await sharp(output).toFile(path);
  console.log(`${file}: cropped ${cropTop}px header`);
}
