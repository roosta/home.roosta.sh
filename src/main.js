import "./style.css";
import { throttle } from "lodash-es";

const DEFAULT_COLOR = "yellow";

const COMPASS = {
  nw: [0, 0], n: [0, 1], ne: [0, 2],
   w: [1, 0], c: [1, 1],  e: [1, 2],
  sw: [2, 0], s: [2, 1], se: [2, 2],
};

const ANGLE_TO_DIR = {
  "-180": "w", "-135": "nw", "-90": "n", "-45": "ne",
  "0": "e", "45": "se", "90": "s", "135": "sw", "180": "w",
};

const EYE_ORIGINS = [[25, 52], [25, 66]];
const ANCHOR = [26, 63];
const CENTER_BOUNDS = { rows: [24, 28], cols: [51, 79] };

const ARTIFACTS = [
`
┌┐
││
└┘
`,
`
┌─────┐
│     │
│     │
└─────┘
`
]

// Parse ASCII art from markup and build DOM
function charGrid(pre) {
  // Flatten child nodes into {ch, anchor} pairs, preserving anchor membership
  const chars = [];
  for (const node of pre.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      for (const ch of node.textContent) chars.push({ ch, anchor: null });
    } else if (node.nodeName === "A") {
      for (const ch of node.textContent) chars.push({ ch, anchor: node });
    }
  }

  // Split into lines on newline
  const lines = [];
  let current = [];
  for (const item of chars) {
    if (item.ch === "\n") { lines.push(current); current = []; }
    else current.push(item);
  }
  if (current.length) lines.push(current);

  // Pad all lines to the same width so empty rows still have addressable cells
  const maxLen = Math.max(...lines.map(l => l.length));
  const padded = lines.map(line => {
    const pad = maxLen - line.length;
    return pad > 0 ? [...line, ...Array(pad).fill({ ch: ' ', anchor: null })] : line;
  });

  pre.textContent = "";
  return padded.map((line, y) => {
    const rowEl = document.createElement("span");
    rowEl.id = `line-${y}`;
    let curAnchorNode = null;
    let curAnchorEl = null;

    const spans = line.map(({ ch, anchor }) => {
      const s = document.createElement("span");
      s.textContent = ch;

      if (anchor !== curAnchorNode) {
        if (curAnchorEl) rowEl.appendChild(curAnchorEl);
        curAnchorNode = anchor;
        if (anchor) {
          curAnchorEl = document.createElement("a");
          for (const attr of anchor.attributes) curAnchorEl.setAttribute(attr.name, attr.value);
        } else {
          curAnchorEl = null;
        }
      }

      (curAnchorEl ?? rowEl).appendChild(s);
      return s;
    });

    if (curAnchorEl) rowEl.appendChild(curAnchorEl);
    rowEl.appendChild(document.createTextNode("\n"));
    pre.appendChild(rowEl);
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
  return ANGLE_TO_DIR[step] ?? "c";
}

function isInCenter(grid, x, y) {
  const { rows: [r0, r1], cols: [c0, c1] } = CENTER_BOUNDS;
  const tl = grid[r0][c0].getBoundingClientRect();
  const br = grid[r1][c1].getBoundingClientRect();
  return x >= tl.left && x <= br.right && y >= tl.top && y <= br.bottom;
}

function eyeCells(grid, [r, c], dir) {
  const [dr, dc] = COMPASS[dir];
  const col = c + dc * 2;
  return [grid[r + dr][col], grid[r + dr][col + 1]];
}

function initEyes(grid) {
  return EYE_ORIGINS.map((origin) => {
    const [r, c] = origin;
    const snapshot = {};
    for (const [dir, [dr, dc]] of Object.entries(COMPASS)) {
      const col = c + dc * 2;
      snapshot[dir] = [grid[r + dr][col].textContent, grid[r + dr][col + 1].textContent];
    }
    const eyeChar = snapshot["c"];
    eyeCells(grid, origin, "c").forEach((s) => (s.textContent = " "));
    snapshot["c"] = [" ", " "];
    return { origin, snapshot, eyeChar };
  });
}

function animateArtifact(grid, artifactStr, startCol, startRow, intervalMs = 300) {
  const lines = artifactStr.trim().split('\n');
  const rows = grid.length;
  let topRow = startRow ?? rows; // start just below the given row
  let active = []; // { r, c, prev } cells we've temporarily overwritten

  function step() {
    // Restore previous cells to their saved content
    for (const { r, c, prev } of active) {
      if (grid[r]?.[c]) {
        grid[r][c].textContent = prev;
        grid[r][c].classList.remove('artifact-fg');
      }
    }
    active = [];

    topRow--;

    for (let dy = 0; dy < lines.length; dy++) {
      const r = topRow + dy;
      if (r < 0 || r >= rows) continue;

      // If we intersect the sheer line
      if (r === startRow) {
        // Find leftmost and rightmost non-space positions in this artifact line
        const line = lines[dy];
        let first = -1, last = -1;
        for (let dx = 0; dx < line.length; dx++) {
          if (line[dx] !== ' ') { if (first === -1) first = dx; last = dx; }
        }
        if (first === -1) continue;
        // Left corner → ┘, right corner → └, blank everything between
        for (let dx = first; dx <= last; dx++) {
          const c = startCol + dx;
          if (!grid[r]?.[c]) continue;
          active.push({ r, c, prev: grid[r][c].textContent });
          if (dx === first)      grid[r][c].textContent = '┘';
          else if (dx === last)  grid[r][c].textContent = '└';
          else                   grid[r][c].textContent = ' ';
        }
      } else if (r < startRow) {
        for (let dx = 0; dx < lines[dy].length; dx++) {
          const c = startCol + dx;
          const ch = lines[dy][dx];
          if (ch === ' ' || !grid[r]?.[c]) continue;
          if (grid[r][c].textContent === ' ') {
            active.push({ r, c, prev: ' ' });
            grid[r][c].textContent = ch;
            grid[r][c].classList.add('artifact-fg');
          }
        }
      }
    }

    if (topRow + lines.length <= 0) topRow = startRow;
    setTimeout(step, intervalMs);
  }

  setTimeout(step, intervalMs);
}

function main() {
  const grid = charGrid(document.querySelector("pre.ansi"));
  let compass = "c";
  let color = DEFAULT_COLOR;
  let prevCompass = null;

  const eyeData = initEyes(grid);

  function render() {
    eyeData.forEach(({ origin, snapshot, eyeChar }) => {
      if (prevCompass !== null) {
        eyeCells(grid, origin, prevCompass)
          .forEach((s, i) => { s.textContent = snapshot[prevCompass][i]; s.className = ""; });
      }
      eyeCells(grid, origin, compass)
        .forEach((s, i) => { s.textContent = eyeChar[i]; s.className = `${color}-fg`; });
    });
    prevCompass = compass;
  }

  render();

  animateArtifact(grid, ARTIFACTS[1], 10, 27);

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

