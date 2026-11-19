import { _$LH, html, render } from "lit-html";
import { styleMap } from "lit-html/directives/style-map.js";
import Reveal from "reveal.js";
import NotesPlugin from "reveal.js/plugin/notes";
import "./main.css";
import styles from "./styles.module.scss";
import {
  cowboyChristmas,
  doctorWho,
  elfOverture,
  hollyJollyChristmas,
  jingleBells,
  lastChristmas,
  polarExpress,
  rockinChristmas,
  walkingInTheAir,
} from "./slides";

const SLIDE_WIDTH = 1024;
const SLIDE_HEIGHT = 768;
const FORCE_PICTURE_SLIDE: "start" | "end" | null = "start";

document.documentElement.style.setProperty("--slide-width", `${SLIDE_WIDTH}px`);
document.documentElement.style.setProperty(
  "--slide-height",
  `${SLIDE_HEIGHT}px`,
);

export type PictureSlideProps = {
  url: string;
  scaleStart?: number;
  scaleEnd?: number;
  xStart?: number;
  xEnd?: number;
  yStart?: number;
  yEnd?: number;
  duration?: number;
  delay?: number;
  snow?: boolean;
};

const pictureSlide = ({
  url,
  snow = false,
  scaleStart = 100,
  scaleEnd = 100,
  xStart = 0,
  xEnd = 0,
  yStart = 0,
  yEnd = 0,
  duration = 70_000,
  delay = 1_500,
}: PictureSlideProps) => {
  const resolve = (value: number, scale: number) => {
    const maxOffset = (scale - 100) / 2;
    return (value / 100) * maxOffset;
  };

  if (FORCE_PICTURE_SLIDE === "start") {
    xEnd = xStart;
    yEnd = yStart;
    scaleEnd = scaleStart;
  } else if (FORCE_PICTURE_SLIDE === "end") {
    xStart = xEnd;
    yStart = yEnd;
    scaleStart = scaleEnd;
  }

  return html`
    <section class=${snow ? styles.snowSlide : ""}>
      ${snow
        ? html`<canvas
            class="${styles.snowBehind}"
            data-snow="far"
            aria-hidden="true"
          ></canvas>`
        : ""}
      <img
        class="${styles.imgFull}"
        data-transition=${duration > 0}
        data-src="${url}"
        style=${styleMap({
          "--scale-start": `${scaleStart}%`,
          "--scale-end": `${scaleEnd}%`,
          "--x-start": `${resolve(xStart, scaleStart)}%`,
          "--x-end": `${resolve(xEnd, scaleEnd)}%`,
          "--y-start": `${resolve(yStart, scaleStart)}%`,
          "--y-end": `${resolve(yEnd, scaleEnd)}%`,
          "--duration": `${duration}ms`,
          "--delay": `${delay}ms`,
        })}
      />
      ${snow
        ? html`<canvas
            class="${styles.snowInFront}"
            data-snow
            aria-hidden="true"
          ></canvas>`
        : ""}
    </section>
  `;
};

type Snowflake = {
  x: number;
  y: number;
  radius: number;
  speed: number;
  drift: number;
  sway: number;
  phase: number;
  opacity: number;
};

// Keep snow falling while the slide fades out after it stops being active
const SNOW_LINGER_MS = 10_000;

const startSnowfall = () => {
  const canvases = Array.from(
    document.querySelectorAll<HTMLCanvasElement>("canvas[data-snow]"),
  );
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  if (reducedMotion || canvases.length === 0) return () => {};

  const snow = canvases.map((canvas) => {
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error("Unable to create a canvas rendering context");

    // Flakes in the far layer are smaller and slower to look distant
    const depthScale = canvas.dataset.snow === "far" ? 0.55 : 1;
    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let flakes: Snowflake[] = [];

    const resize = () => {
      const newWidth = canvas.clientWidth;
      const newHeight = canvas.clientHeight;
      const newPixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      if (
        newWidth === width &&
        newHeight === height &&
        newPixelRatio === pixelRatio
      ) {
        return;
      }

      if (width > 0 && height > 0) {
        flakes.forEach((flake) => {
          flake.x *= newWidth / width;
          flake.y *= newHeight / height;
        });
      }

      width = newWidth;
      height = newHeight;
      pixelRatio = newPixelRatio;
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      if (flakes.length === 0 && width > 0 && height > 0) {
        flakes = Array.from({ length: 100 }, () => ({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: (0.8 + Math.random() * 2.4) * depthScale,
          speed: (25 + Math.random() * 55) * depthScale,
          drift: (-9 + Math.random() * 18) * depthScale,
          sway: (3 + Math.random() * 12) * depthScale,
          phase: Math.random() * Math.PI * 2,
          opacity: 0.4 + Math.random() * 0.6,
        }));
      }
    };

    new ResizeObserver(resize).observe(canvas);
    resize();

    return {
      canvas,
      context,
      flakes: () => flakes,
      resize,
      lastPresentAt: null as number | null,
    };
  });

  let animationFrame = 0;
  let previousTime = 0;
  const animate = (time: number) => {
    const slide = document.querySelector(".reveal .slides > section.present");
    const activeSnow = snow.filter((layer) => {
      if (layer.canvas.closest("section") === slide) layer.lastPresentAt = time;
      if (layer.lastPresentAt === null) return false;
      if (time - layer.lastPresentAt < SNOW_LINGER_MS) return true;

      layer.lastPresentAt = null;
      return false;
    });
    if (document.hidden || activeSnow.length === 0) {
      animationFrame = 0;
      previousTime = 0;
      return;
    }

    const delta =
      previousTime === 0 ? 0 : Math.min((time - previousTime) / 1000, 0.05);
    previousTime = time;
    activeSnow.forEach(({ canvas, context, flakes, resize }) => {
      resize();
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      context.clearRect(0, 0, width, height);

      flakes().forEach((flake) => {
        flake.phase += delta;
        flake.x += (flake.drift + Math.sin(flake.phase) * flake.sway) * delta;
        flake.y += flake.speed * delta;
        if (flake.y - flake.radius > height) {
          flake.y = -flake.radius;
          flake.x = Math.random() * width;
        }
        if (flake.x < -flake.radius) flake.x = width + flake.radius;
        if (flake.x > width + flake.radius) flake.x = -flake.radius;

        context.beginPath();
        context.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(255, 255, 255, ${flake.opacity})`;
        context.fill();
      });
    });

    animationFrame = requestAnimationFrame(animate);
  };

  const resumeSnowfall = () => {
    if (animationFrame === 0) animationFrame = requestAnimationFrame(animate);
  };
  const pauseSnowfall = () => {
    if (animationFrame !== 0) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    previousTime = 0;
  };

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pauseSnowfall();
    else resumeSnowfall();
  });
  resumeSnowfall();
  return resumeSnowfall;
};

const emptySlide = () => html`<section></section>`;

type Slide = { type: "picture"; props: PictureSlideProps } | { type: "empty" };

const logoSlideProps: PictureSlideProps = {
  url: "/assets/logo.png",
  snow: true,
};

// TODO the durations
const pieceSlides: PictureSlideProps[][] = [
  [logoSlideProps],
  elfOverture,
  jingleBells,
  rockinChristmas,
  lastChristmas,
  cowboyChristmas,
  walkingInTheAir,
  hollyJollyChristmas,
  polarExpress,
  doctorWho,
  [logoSlideProps],
];

const slides: Slide[] = [
  { type: "empty" },

  ...pieceSlides.flatMap((group): Slide[] => {
    return [
      ...group.map((props): Slide => {
        return { type: "picture", props };
      }),
      { type: "empty" },
    ];
  }),
];

render(
  html`
    <div class="reveal">
      <div class="slides">
        ${slides.map((config) => {
          if (config.type === "empty") return emptySlide();
          else if (config.type === "picture") return pictureSlide(config.props);
          else config satisfies never;
        })}
      </div>
    </div>
  `,
  document.body,
);

let lastKey: number | null = null;
const deck = new Reveal({
  hash: true,
  width: SLIDE_WIDTH,
  height: SLIDE_HEIGHT,
  transition: FORCE_PICTURE_SLIDE
    ? "none"
    : (styles.fadeToBlack as any) /* TODO */,
  backgroundTransition: "none",
  margin: 0,
  controls: "speaker-only",
  overview: false,
  progress: false,
  keyboardCondition: () => {
    if (FORCE_PICTURE_SLIDE) return true;

    if (lastKey && Date.now() - lastKey < 1000) return false;

    lastKey = Date.now();
    return true;
  },
  // press s for speaker view
  plugins: [NotesPlugin],
});

const resumeSnowfall = startSnowfall();
deck.on("slidechanged", resumeSnowfall);
deck.on("ready", resumeSnowfall);
deck.initialize();

let wakeLock: WakeLockSentinel | null = null;
const requestWakeLock = async () => {
  wakeLock = await navigator.wakeLock.request("screen");
  wakeLock.addEventListener("release", () => {
    wakeLock = null;
  });
};

// The lock is released automatically when the tab is hidden, so re-acquire it
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") requestWakeLock();
});
requestWakeLock();
