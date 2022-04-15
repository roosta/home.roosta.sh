import "./style.css"

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

function main() {
  const gh = document.querySelectorAll(".github");
  const rd = document.querySelectorAll(".reddit");
  attach(gh);
  attach(rd);
}

main();
