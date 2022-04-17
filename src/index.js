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

// Track state in global obj
const stateObj = {
  color: defaultColor,
  compass: "c",
};

// Select all eye positions,
const eyes = document.querySelectorAll(".eye");

// Setup proxy to handle state changes
// We want to fire logic when either compass or color changes
const state = new Proxy(stateObj, {
  set: function (target, key, value) {
    if (key === "color") {
      let eye = document.querySelectorAll(`.${target.compass}`);
      eyes.forEach(e => {
        e.classList.remove(`${target.color}-bg`);
      })
      eye.forEach(e => {
        e.classList.add(`${value}-bg`)
      })
    } else if (key === "compass") {
      let eye = document.querySelectorAll(`.${value}`);
      let prev = document.querySelectorAll(`.${target.compass}`)
      prev.forEach(e => {
        e.classList.remove(`${target.color}-bg`);
      })
      eye.forEach(e => {
        e.classList.add(`${target.color}-bg`);
      })
    }
    target[key] = value;
    return true;
  }
})

// Calculate angle from mouse pos, container width height.
// return a cardinal direction from global object ie. nw, se etc..
function posToDirection(mouseX, mouseY, width, height) {
  const step = 45;
  const dx =  mouseX - (width / 2);
  const dy =  mouseY - (height / 2);
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
  const wait = 200;
  onmousemove = throttle((event) => {

    // Check if we're in center area
    const center = Array.from(centerArea).some(el => {
      return (el.parentNode.querySelector(":hover") === el)
    })

    // Calculate cardinal direction when center is false
    const compass = center ? "c" : posToDirection(
      event.pageX,
      event.pageY,
      document.body.offsetWidth,
      document.body.offsetHeight,
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
