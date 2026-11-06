import { _$LH, html, render } from "lit-html";
import { styleMap } from "lit-html/directives/style-map.js";
import Reveal from "reveal.js";
import NotesPlugin from "reveal.js/plugin/notes";
import "./main.css";
import styles from "./styles.module.scss";

const SLIDE_WIDTH = 1024;
const SLIDE_HEIGHT = 768;

document.documentElement.style.setProperty("--slide-width", `${SLIDE_WIDTH}px`);
document.documentElement.style.setProperty("--slide-height", `${SLIDE_HEIGHT}px`);

type PictureSlideProps = {
  url: string;
  scaleStart?: number;
  scaleEnd?: number;
  xStart?: number;
  xEnd?: number;
  yStart?: number;
  yEnd?: number;
  duration?: number;
  delay?: number;
};

const pictureSlide = ({
  url,
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
  return html`
    <section>
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
    </section>
  `;
};

const emptySlide = () => html`<section></section>`;

type Slide = { type: "picture"; props: PictureSlideProps } | { type: "empty" };

const logoSlideProps: PictureSlideProps = {
  url: "/assets/logo.png",
};

const addBuffer = (time: number): number => {
  return time * 1000 * 1.4 - 2000;
};

// TODO the durations
const pieceSlides: PictureSlideProps[][] = [
  [logoSlideProps],

  // puttin on the ritz
  [
    {
      url: "/assets/Puttin On The Ritz/e985c67c720ac67151411d8854a190c3715fe2955b89f0e7da6f7815c5cb9361.jpg",
      scaleStart: 180,
      xStart: -100,
      yStart: 40,
      duration: addBuffer(192),
    },
  ],
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
  transition: styles.fadeToBlack as any /* TODO */,
  // transition: "none",
  backgroundTransition: "none",
  margin: 0,
  controls: "speaker-only",
  overview: false,
  progress: false,
  keyboardCondition: () => {
    if (lastKey && Date.now() - lastKey < 1000) return false;

    lastKey = Date.now();
    return true;
  },
  plugins: [NotesPlugin],
});

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
