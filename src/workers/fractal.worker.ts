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
        pixels[offset] = 31;
        pixels[offset + 1] = 42;
        pixels[offset + 2] = 40;
      } else {
        const normalized = iteration / request.maxIterations;
        const band = Math.floor(normalized * 12) / 12;
        pixels[offset] = 229 - Math.round(band * 126);
        pixels[offset + 1] = 235 - Math.round(band * 113);
        pixels[offset + 2] = 230 - Math.round(band * 118);
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
