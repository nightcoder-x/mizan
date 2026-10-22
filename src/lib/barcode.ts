import { BarcodeDetector, prepareZXingModule } from "barcode-detector/ponyfill"
import wasmUrl from "zxing-wasm/reader/zxing_reader.wasm?url"

// Loaded only when the scanner opens; the decoder is about 1 MB.
// Serve the decoder from this site instead of a CDN, so the scanner works on the gym's Wi-Fi
// once the app is cached and no third party sees when it's used.
prepareZXingModule({
  overrides: {
    locateFile: (path: string, prefix: string) => (path.endsWith(".wasm") ? wasmUrl : prefix + path),
  },
})

export function createDetector() {
  return new BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] })
}
