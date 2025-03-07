import "./style.css"

import {
  throttle,
} from 'lodash-es';

const defaultColor = "yellow"

// Match angles to compass directions
const directions = {
  "-180": "w",
  "-135": "nw",
  "-90": "n",
  "-45": "ne",
  "0": "e",
  "45": "se",
  "90": "s",
  "135": "sw",
  "180": "w"
};

const state = {
  _color: defaultColor,
  _compass: "c",
  eyes: document.querySelectorAll(".eye"),

  get color() {
    return this._color;
  },
  set color(c) {
    let eye = document.querySelectorAll(`.${this.compass}`);
    this.eyes.forEach(e => {
      e.classList.remove(`${this.color}-bg`);
    })
    eye.forEach(e => {
      e.classList.add(`${c}-bg`)
    })
    this._color = c;
  },
  get compass() {
    return this._compass;
  },
  set compass(c) {
    let eye = document.querySelectorAll(`.${c}`);
    let prev = document.querySelectorAll(`.${this.compass}`)
    prev.forEach(e => {
      e.classList.remove(`${this.color}-bg`);
    })
    eye.forEach(e => {
      e.classList.add(`${this.color}-bg`);
    })
    this._compass = c;
  }
}

// Calculate angle from mouse pos, container width height.
// return a cardinal direction from global object ie. nw, se etc..
function posToDirection(mouseX, mouseY, centerX, centerY) {
  const step = 45;
  const dx =  mouseX - centerX;
  const dy =  mouseY - centerY;
  const radians = Math.atan2(dy, dx);
  const angle = radians * 180 / Math.PI;
  const key = Math.round(angle / step) * step
  return directions[key];
}

function handleLinks() {
  const links = document.querySelectorAll("a");
  links.forEach(el => {
    el.addEventListener("mouseenter", () => {
      state.color = el.dataset.color
    })
    el.addEventListener("mouseleave", () => {
      state.color = defaultColor;
    })
  })

}

// Tracks mouse, and updates state.compass with cardinal directions
function trackCompass() {
  const centerArea = document.querySelectorAll(".ca");
  const anchorEl = document.querySelector(".anchor");
  const wait = 200;
  onmousemove = throttle((event) => {

    // Check if we're in center area
    const inCenter = Array.from(centerArea).some(el => {
      return (el.parentNode.querySelector(":hover") === el)
    })

    const anchorRect = anchorEl.getBoundingClientRect();
    const bodyRect = document.body.getBoundingClientRect();

    // Calculate cardinal direction when center is false
    const compass = inCenter ? "c" : posToDirection(
      event.pageX,
      event.pageY,
      anchorRect.left - bodyRect.left - (anchorRect.width / 2),
      anchorRect.top - bodyRect.top - (anchorRect.height / 2),
    )
    if (compass !== state.compass) {
      state.compass = compass;
    }
  }, wait)
}

// Entry
function main() {
  handleLinks();
  trackCompass();
}

main();
