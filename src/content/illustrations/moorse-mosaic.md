---
title: "Moorse Mosaic"
summary: "A monochrome hexagonal mosaic."
tags: ["mathematica", "monochrome"]
image: "../../assets/illustrations/moorse-mosaic.png"
imageAlt: "A black, white, and gray hexagonal mosaic forming concentric bands around a pale central hexagon"
order: 3
placeholder: false
---

Colored via the function $(x,y)\mapsto \sqrt[3]{x^2+y^2}$.

Reference for the moorse strip phenomenon https://mathematica.stackexchange.com/a/181933/79389.

Source code:

```mathematica
n = 36; indexes =
 Select[Flatten[Table[{i, j}, {i, -n, n}, {j, -n, n}], 1],
  Apply[-n <= #1 + #2 <= n \[And] -n <= #1 - #2 <= n &]]; coords =
 Map[Apply[ReIm[(E^(-I \[Pi]/6) #1 + E^(I \[Pi]/6) #2)/3] &],
  indexes]; list =
 Map[{#[[1]], #[[2]], CubeRoot[Sin[#[[1]]^2 + #[[2]]^2]]} &,
  coords]; ListDensityPlot[list, ColorFunction -> GrayLevel,
 AspectRatio -> Automatic, Frame -> False, InterpolationOrder -> 0]

```
