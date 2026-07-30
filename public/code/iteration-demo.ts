/** Small, dependency-free sample linked from a fictional publication record. */
export function iterateQuadratic(
  z: { re: number; im: number },
  c: { re: number; im: number },
) {
  return {
    re: z.re * z.re - z.im * z.im + c.re,
    im: 2 * z.re * z.im + c.im,
  };
}
