import "./style.css"

import {
  throttle,
} from 'lodash-es';

var directions = {
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

// Toggle class for input coll
function toggle(coll) {
  return () => {
    coll.forEach(el => {
      el.classList.toggle("hover");
    })
  }
}

// Handle clicks
// Click area spans multiple elements, which can't be grouped, so we'll handle
// link dispatch here
function click(el) {
  return () => {
    if (el.classList.contains("github")) {
      window.location.href = "https://github.com/roosta"
    } else if (el.classList.contains("reddit")) {
      window.location.href = "https://reddit.com"
    }
  }
}

// Setup hover for clickable elements,
// Tricky to use css for this due to how the ansi art is structured
function attach(coll) {
  const events = ["mouseenter", "mouseleave"];
  events.forEach(evt => {
    coll.forEach(el => {
      el.addEventListener(evt, toggle(coll))
    })
  })
  coll.forEach(el => {
    el.addEventListener("click", click(el))
  })
}

// Calculate angle from mouse pos, container width height.
// return a cardinal direction from global object ie. nw, se etc..
function posToCardinal(mouseX, mouseY, width, height) {
  const step = 45;
  const dx =  mouseX - (width / 2);
  const dy =  mouseY - (height / 2);
  const radians = Math.atan2(dy, dx);
  const angle = radians * 180 / Math.PI;
  const key = Math.round(angle / step) * step
  return directions[key];
}

// Attach mouse listener, make eyes follow cursor.
function handleEyes() {
  const eyes = document.querySelectorAll(".eye");
  const ca = document.querySelectorAll(".ca");
  const wait = 200;
  onmousemove = throttle((event) => {

    // Check if we're in center area
    const center = Array.from(ca).some(el => {
      return (el.parentNode.querySelector(":hover") === el)
    })

    // Calculate cardinal direction when center is false
    const compass = center ? "c" : posToCardinal(
      event.clientX,
      event.clientY,
      window.innerWidth,
      window.innerHeight,
    )
    eyes.forEach(e => {
      e.classList.remove("focus");
    })
    const eye = document.querySelectorAll(`.${compass}`);
    eye.forEach(e => {
      e.classList.add("focus");
    })
  }, wait)
}

function main() {
  // const gh = document.querySelectorAll(".github");
  // const rd = document.querySelectorAll(".reddit");
  // attach(gh);
  // attach(rd);
  handleEyes();
}

main();
