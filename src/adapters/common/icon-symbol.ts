/**
 * Avatar / icon symbol helpers.
 *
 * The only consumer today is the tree adapter's `formatNodeIcon` path.
 * The helper pre-composites an avatar (contain-fit image inside a
 * shape clip + optional stroked border) onto an off-screen canvas,
 * then returns a `data:image/png;base64,…` URL.
 *
 * Why a data URL and not a canvas?
 *   ECharts only accepts a URL string after the `image://` prefix for
 *   its image symbol type. Handing back an `HTMLCanvasElement` invites
 *   callers to stuff it into `itemStyle.color: { image: canvas }`
 *   (pattern fill), which is the wrong tool for "show this avatar
 *   inside a circle": pattern fill is positioned in world coordinates
 *   (not shape-local) and doesn't do contain-style fitting, so the
 *   avatar appears cropped and mis-aligned. Returning the URL forces
 *   the only correct usage: `symbol: 'image://<dataUrl>'`.
 *
 * Why not just use ECharts' native `image://` symbol with
 * `itemStyle.borderColor` / `borderWidth`?
 *   ECharts image symbols don't paint `itemStyle.border*` — the image
 *   IS the symbol; there's no underlying shape geometry to stroke.
 *   For both shapes (circle clip + rect frame), the only reliable way
 *   to add a border around an image is to bake it into the bitmap
 *   ourselves. This helper does exactly that.
 */

export interface IconRenderOptions {
  /** Avatar / icon image URL. Must be CORS-accessible (see notes below). */
  src: string;
  /**
   * Output shape. `'circle'` clips the image to an inscribed circle and
   * (when `borderWidth > 0`) strokes a ring along the inner edge.
   * `'rect'` keeps the canvas's natural rectangular bounds and
   * (when `borderWidth > 0`) strokes a rectangular frame.
   */
  shape: 'circle' | 'rect';
  /** Output canvas width (px). The image is contain-fitted inside this. */
  width: number;
  /** Output canvas height (px). The image is contain-fitted inside this. */
  height: number;
  /**
   * Stroke color for the surrounding ring/frame. Ignored when
   * `borderWidth <= 0`.
   */
  borderColor: string;
  /** Stroke width (px). Set to `0` to skip the border entirely. */
  borderWidth: number;
}

const dataUrlCache = new Map<string, Promise<string | undefined>>();

/**
 * Resolve the device-pixel ratio we should bake into the bitmap. The
 * canvas is sized at `width * dpr × height * dpr` device pixels so
 * the encoded PNG carries enough detail for ECharts to sample 1:1
 * into its own HiDPI backing canvas — without this oversample, a
 * 36 px-wide avatar PNG gets *upsampled* by 2× / 3× on Retina / 4K
 * displays and reads as visibly blurry.
 *
 * Capped at 3× to bound memory: a 36 px avatar baked at DPR=4 would
 * be a 144×144 PNG (≈3 KB each, but ×N nodes adds up on dense trees),
 * and real-world DPR > 3 typically means the user is at heavy browser
 * zoom — at which point the source-image quality is the bottleneck,
 * not the avatar oversampling. DPR ≤ 1 returns 1 (no oversample).
 */
function resolveDevicePixelRatio(): number {
  if (typeof window === 'undefined') return 1;
  const dpr = window.devicePixelRatio;
  if (!Number.isFinite(dpr) || dpr <= 1) return 1;
  return Math.min(dpr, 3);
}

function getCacheKey(opts: IconRenderOptions, dpr: number): string {
  return [
    opts.shape,
    opts.src,
    opts.width,
    opts.height,
    opts.borderColor,
    opts.borderWidth,
    // DPR is part of the key so a window dragged from a 2× Retina to
    // a 1× external monitor (or vice versa) regenerates the bitmap at
    // the new ratio instead of reusing a now-blurry / now-wasteful one.
    dpr,
  ].join('|');
}

/**
 * Pre-render an avatar bitmap and return it as a base64-encoded PNG
 * data URL. The bitmap has up to three baked-in features:
 *
 *   1. **Shape clip** — for `shape: 'circle'`, pixels outside the
 *      inscribed circle are transparent so the symbol reads as a
 *      round avatar. For `shape: 'rect'`, no clipping is applied
 *      (the canvas itself is rectangular).
 *   2. **Contain-style fit** — the source image is uniformly scaled
 *      down (never up) so the entire image fits inside the available
 *      area (canvas inset by `borderWidth` on every side) with
 *      letterboxing-equivalent transparency at the edges. The image
 *      is centered.
 *   3. **Stroked border** — when `borderWidth > 0`, a ring (circle)
 *      or frame (rect) of that thickness is stroked along the inner
 *      edge of the canvas in `borderColor`.
 *
 * Callers stitch the URL into ECharts via `symbol: 'image://<dataUrl>'`
 * so the avatar is drawn as a flat image symbol — no pattern-fill
 * quirks (which crop and mis-align under a circular shape), no
 * `itemStyle.borderRadius` (which has no effect on the built-in
 * `circle`/`rect` shape symbols anyway), and no double-render of
 * border or fill.
 *
 * **Returns `undefined`** when DOM/canvas are unavailable (SSR, vitest's
 * node environment, jsdom without 2D context), when the image fails to
 * load, or when the resulting canvas is CORS-tainted (the server didn't
 * send `Access-Control-Allow-Origin`, so `toDataURL` throws). Callers
 * fall back to their synchronous placeholder.
 *
 * **CORS note**: the image is fetched with `crossOrigin = 'anonymous'`
 * so the canvas stays untainted and `toDataURL` succeeds. Origins that
 * don't ship CORS headers will fail the load entirely — there is no
 * "load image but skip toDataURL" middle ground in the browser security
 * model. This is the correct trade-off: a load failure preserves the
 * synchronous placeholder, whereas a tainted canvas would throw
 * `SecurityError` on every render attempt.
 *
 * **Caching**: identical `(shape, src, width, height, borderColor,
 * borderWidth)` tuples share a single in-flight promise + cached data
 * URL, so re-renders / theme switches / chart re-creates don't re-fetch.
 */
export function renderIconDataUrl(
  opts: IconRenderOptions,
): Promise<string | undefined> {
  const dpr = resolveDevicePixelRatio();
  const key = getCacheKey(opts, dpr);
  const cached = dataUrlCache.get(key);
  if (cached) return cached;

  const task = (async (): Promise<string | undefined> => {
    if (typeof document === 'undefined' || typeof Image === 'undefined') {
      return undefined;
    }
    const canvas = document.createElement('canvas');
    if (!canvas) return undefined;
    // Logical (CSS-pixel) dimensions — what the *content* is sized as.
    // All geometry below (border, contain-fit math, circle radius,
    // rect frame) operates in this coordinate space.
    const W = Math.max(1, Math.round(opts.width));
    const H = Math.max(1, Math.round(opts.height));
    // Backing-store (device-pixel) dimensions — what the bitmap is
    // *sampled at*. Oversampling by `dpr` is what makes the encoded
    // PNG sharp on Retina / 4K: ECharts' own backing canvas runs at
    // device pixels too, so a 2× / 3× source bitmap maps 1:1 instead
    // of being upsampled at draw time.
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    // After this scale, every (x, y, w, h) we pass to the context is
    // interpreted as logical pixels; the underlying transform takes
    // care of mapping to device pixels. `lineWidth: border` strokes
    // `border` *logical* pixels regardless of `dpr`, which is exactly
    // what we want — a 2 px ring on a 1× monitor and a 2 px ring on
    // Retina look identical to the user.
    ctx.scale(dpr, dpr);
    // Quality matters here: the typical case is a 256 px source image
    // contain-fitted into a 36 px box, i.e. a ~7× downsample. The
    // browser default ('low' on some engines) produces visibly aliased
    // output for that ratio; `'high'` triggers a multi-tap filter that
    // keeps facial features readable at avatar sizes.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const img = new Image();
    // Anonymous CORS so the canvas stays untainted; see CORS note above.
    img.crossOrigin = 'anonymous';
    const loaded = new Promise<boolean>((resolve) => {
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
    });
    img.src = opts.src;
    const ok = await loaded;
    if (!ok || !img.naturalWidth || !img.naturalHeight) return undefined;

    const border = Math.max(0, opts.borderWidth);
    // Reserve `border` logical px on every edge for the stroke (so the
    // border doesn't overlap the image content). For `border = 0` this
    // is a no-op and the image fills the full canvas.
    const innerW = Math.max(1, W - border * 2);
    const innerH = Math.max(1, H - border * 2);
    // Contain fit: uniform scale so the whole image fits, centered.
    const scale = Math.min(innerW / img.naturalWidth, innerH / img.naturalHeight);
    const drawW = Math.max(1, img.naturalWidth * scale);
    const drawH = Math.max(1, img.naturalHeight * scale);
    const drawX = (W - drawW) / 2;
    const drawY = (H - drawH) / 2;

    // Clear in logical coords — covers the full canvas because the
    // CTM scale maps (0..W, 0..H) onto (0..W*dpr, 0..H*dpr) device px.
    ctx.clearRect(0, 0, W, H);

    if (opts.shape === 'circle') {
      // Circular clip → contain-fit image inside the clip. The clip
      // radius is `r - border` so the image never bleeds under the
      // border ring (which would create a hairline of image pixels
      // outside the stroked circle on sub-pixel rendering).
      const r = Math.min(W, H) / 2;
      const cx = W / 2;
      const cy = H / 2;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(0, r - border), 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();

      if (border > 0) {
        // Stroke along the *inner* half of the border width — keeps
        // the ring fully inside the canvas bounds. (Default canvas
        // stroke straddles the path 50/50, so stroking at radius
        // `r - border / 2` with thickness `border` leaves exactly
        // half the stroke inside the canvas and half outside; we
        // shift inward to avoid clipping.)
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(0.5, r - border / 2), 0, Math.PI * 2);
        ctx.closePath();
        ctx.strokeStyle = opts.borderColor;
        ctx.lineWidth = border;
        ctx.stroke();
      }
    } else {
      // Rect: no clip needed (canvas IS rect). Draw the contain-fit
      // image, then optionally stroke a rectangular frame inset by
      // `border / 2` on every side so the stroke sits fully inside
      // the canvas (same inner-half convention as the circle path).
      ctx.drawImage(img, drawX, drawY, drawW, drawH);

      if (border > 0) {
        ctx.strokeStyle = opts.borderColor;
        ctx.lineWidth = border;
        ctx.strokeRect(
          border / 2,
          border / 2,
          Math.max(1, W - border),
          Math.max(1, H - border),
        );
      }
    }

    try {
      return canvas.toDataURL('image/png');
    } catch {
      // Cross-origin image without CORS headers taints the canvas;
      // `toDataURL` throws SecurityError. Surface as fallback so the
      // synchronous placeholder stays visible.
      return undefined;
    }
  })();

  dataUrlCache.set(key, task);
  return task;
}
