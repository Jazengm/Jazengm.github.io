type RenderRequest = {
  id: number;
  width: number;
  height: number;
  mode: "mandelbrot" | "julia";
  centerX: number;
  centerY: number;
  scale: number;
  maxIterations: number;
  juliaReal: number;
  juliaImaginary: number;
};

type RenderResponse = {
  id: number;
  width: number;
  height: number;
  pixels: ArrayBuffer;
};

const INTERIOR_COLOR = [20, 36, 56] as const;
const EXTERIOR_LIGHT = [237, 242, 248] as const;
const EXTERIOR_BLUE = [35, 93, 159] as const;
const EXTERIOR_ORANGE = [198, 92, 46] as const;

const mixChannel = (start: number, end: number, amount: number) =>
  Math.round(start + (end - start) * amount);

self.onmessage = (event: MessageEvent<RenderRequest>) => {
  const request = event.data;
  const pixels = new Uint8ClampedArray(request.width * request.height * 4);
  const aspect = request.height / request.width;
  const left = request.centerX - request.scale / 2;
  const top = request.centerY - (request.scale * aspect) / 2;
  let offset = 0;

  for (let py = 0; py < request.height; py += 1) {
    const imaginary = top + (py / request.height) * request.scale * aspect;
    for (let px = 0; px < request.width; px += 1) {
      const real = left + (px / request.width) * request.scale;
      let zr = request.mode === "mandelbrot" ? 0 : real;
      let zi = request.mode === "mandelbrot" ? 0 : imaginary;
      const cr = request.mode === "mandelbrot" ? real : request.juliaReal;
      const ci =
        request.mode === "mandelbrot" ? imaginary : request.juliaImaginary;
      let iteration = 0;

      while (zr * zr + zi * zi <= 4 && iteration < request.maxIterations) {
        const nextReal = zr * zr - zi * zi + cr;
        zi = 2 * zr * zi + ci;
        zr = nextReal;
        iteration += 1;
      }

      if (iteration === request.maxIterations) {
        pixels[offset] = INTERIOR_COLOR[0];
        pixels[offset + 1] = INTERIOR_COLOR[1];
        pixels[offset + 2] = INTERIOR_COLOR[2];
      } else {
        const normalized = iteration / request.maxIterations;
        const band = Math.floor(normalized * 12) / 12;
        const warmAmount = Math.max(0, (band - 0.72) / 0.28) * 0.72;
        const blue = EXTERIOR_LIGHT.map((channel, index) =>
          mixChannel(channel, EXTERIOR_BLUE[index], band),
        );
        pixels[offset] = mixChannel(blue[0], EXTERIOR_ORANGE[0], warmAmount);
        pixels[offset + 1] = mixChannel(
          blue[1],
          EXTERIOR_ORANGE[1],
          warmAmount,
        );
        pixels[offset + 2] = mixChannel(
          blue[2],
          EXTERIOR_ORANGE[2],
          warmAmount,
        );
      }
      pixels[offset + 3] = 255;
      offset += 4;
    }
  }

  const response: RenderResponse = {
    id: request.id,
    width: request.width,
    height: request.height,
    pixels: pixels.buffer,
  };
  self.postMessage(response, { transfer: [response.pixels] });
};

export {};
