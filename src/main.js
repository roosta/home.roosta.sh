import "./style.css";
import { throttle } from "lodash-es";

const DEFAULT_COLOR = "yellow";

// Compass as grid offset: [row, col] in a 3x3
const COMPASS = {
  nw: [0, 0], n: [0, 1], ne: [0, 2],
   w: [1, 0], c: [1, 1],  e: [1, 2],
  sw: [2, 0], s: [2, 1], se: [2, 2],
};

const DIRECTIONS = [
  [-180, "w"], [-135, "nw"], [-90, "n"], [-45, "ne"],
  [0, "e"], [45, "se"], [90, "s"], [135, "sw"], [180, "w"],
];

const EYE_ORIGINS = [[25, 52], [25, 66]];
const ANCHOR = [26, 63];
const CENTER_BOUNDS = { rows: [24, 28], cols: [51, 79] };

const LINKS = [
  { text: "  code  ", row: 36, col: 39, href: "https://github.com/roosta", color: "blue" },
  { text: "  art   ", row: 41, col: 39, href: "https://gallery.roosta.sh", color: "magenta" },
  { text: "  whois ", row: 36, col: 82, href: "#", color: "green" },
  { text: "  blog  ", row: 41, col: 82, href: "#", color: "cyan" },
];

function charGrid(pre) {
  const lines = pre.textContent.split("\n");
  pre.textContent = "";
  return lines.map((line, y) => {
    const row = document.createElement("span");
    row.id = `line-${y}`;
    const spans = [...line].map((ch) => {
      const s = document.createElement("span");
      s.textContent = ch;
      row.appendChild(s);
      return s;
    });
    row.appendChild(document.createTextNode("\n"));
    pre.appendChild(row);
    return spans;
  });
}

function cellPos(el) {
  const r = el.getBoundingClientRect();
  const b = document.body.getBoundingClientRect();
  return [r.left - b.left + r.width / 2, r.top - b.top + r.height / 2];
}

function getCompass(mx, my, ax, ay) {
  const angle = Math.atan2(my - ay, mx - ax) * 180 / Math.PI;
  const step = Math.round(angle / 45) * 45;
  return DIRECTIONS.find(([a]) => a === step)?.[1] ?? "c";
}

function isInCenter(grid, x, y) {
  const { rows: [r0, r1], cols: [c0, c1] } = CENTER_BOUNDS;
  const tl = grid[r0][c0].getBoundingClientRect();
  const br = grid[r1][c1].getBoundingClientRect();
  return x >= tl.left && x <= br.right && y >= tl.top && y <= br.bottom;
}

function main() {
  const grid = charGrid(document.querySelector("pre.ansi"));
  let compass = "c";
  let color = DEFAULT_COLOR;
  let prevCompass = null;

  // Snapshot all 9 compass positions for each eye socket, grab eye char from center
  const eyeData = EYE_ORIGINS.map(([r, c]) => {
    const snapshot = {};
    for (const [dir, [dr, dc]] of Object.entries(COMPASS)) {
      const row = r + dr;
      const col = c + dc * 2;
      snapshot[dir] = [grid[row][col].textContent, grid[row][col + 1].textContent];
    }
    const eyeChar = snapshot["c"];
    // Blank center in both the grid and snapshot so restoring it never re-draws the eye
    const [cdr, cdc] = COMPASS["c"];
    const crow = r + cdr;
    const ccol = c + cdc * 2;
    grid[crow][ccol].textContent = " ";
    grid[crow][ccol + 1].textContent = " ";
    snapshot["c"] = [" ", " "];
    return { origin: [r, c], snapshot, eyeChar };
  });

  function render() {
    eyeData.forEach(({ origin: [r, c], snapshot, eyeChar }) => {
      // Restore previous position to original chars
      if (prevCompass !== null) {
        const [pdr, pdc] = COMPASS[prevCompass];
        const prow = r + pdr;
        const pcol = c + pdc * 2;
        grid[prow][pcol].textContent = snapshot[prevCompass][0];
        grid[prow][pcol + 1].textContent = snapshot[prevCompass][1];
        grid[prow][pcol].className = "";
        grid[prow][pcol + 1].className = "";
      }

      // Place eye char at new compass position
      const [dr, dc] = COMPASS[compass];
      const row = r + dr;
      const col = c + dc * 2;
      grid[row][col].textContent = eyeChar[0];
      grid[row][col + 1].textContent = eyeChar[1];
      grid[row][col].className = `${color}-fg`;
      grid[row][col + 1].className = `${color}-fg`;
    });
    prevCompass = compass;
  }

  render();

  document.querySelectorAll("a").forEach((a) => {
    a.addEventListener("mouseenter", () => { color = a.dataset.color; render(); });
    a.addEventListener("mouseleave", () => { color = DEFAULT_COLOR; render(); });
  });

  document.addEventListener("mousemove", throttle((e) => {
    const [ax, ay] = cellPos(grid[ANCHOR[0]][ANCHOR[1]]);
    const dir = isInCenter(grid, e.clientX, e.clientY)
      ? "c"
      : getCompass(e.pageX, e.pageY, ax, ay);
    if (dir !== compass) {
      compass = dir;
      render();
    }
  }, 200));
}

main();
