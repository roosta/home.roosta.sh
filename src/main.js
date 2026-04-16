import "./style.css";
import { throttle } from "lodash-es";
import ARTIFACTS from "virtual:artifacts";

const DEFAULT_COLOR = "yellow";

// [row-offset, col-offset] for each position in a 3×3 compass grid
const COMPASS = {
  nw: [0, 0], n: [0, 1], ne: [0, 2],
   w: [1, 0], c: [1, 1],  e: [1, 2],
  sw: [2, 0], s: [2, 1], se: [2, 2],
};

const ANGLE_TO_DIR = {
  "-180": "w", "-135": "nw", "-90": "n", "-45": "ne",
     "0": "e",   "45": "se",  "90": "s", "135": "sw", "180": "w",
};

// Each eye occupies two character columns per compass step
const EYE_CHAR_WIDTH = 2;

const EYE_ORIGINS   = [[25, 52], [25, 66]];
const ANCHOR_CELL   = [26, 63];
const CENTER_BOUNDS = { rows: [24, 28], cols: [51, 79] };


// charGrid helpers ------------------------------------------------ {{{

// Parse anchor nodes from markup
function parseNodes(pre) {
  const chars = [];
  for (const node of pre.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      for (const ch of node.textContent) chars.push({ ch, anchor: null });
    } else if (node.nodeName === "A") {
      for (const ch of node.textContent) chars.push({ ch, anchor: node });
    }
  }
  return chars;
}

// Split a flat {ch, anchor}[] into lines on '\n', dropping a trailing empty
// line.
function splitIntoLines(chars) {
  const lines = chars.reduce((acc, item) => {
    if (item.ch === "\n") acc.push([]);
    else acc.at(-1).push(item);
    return acc;
  }, [[]]);
  if (lines.at(-1)?.length === 0) lines.pop();
  return lines;
}

// Pad lines to add animation space
function padLines(lines) {
  const maxLen = Math.max(...lines.map(l => l.length));
  return lines.map(line => [
    ...line,
    ...Array(maxLen - line.length).fill({ ch: " ", anchor: null }),
  ]);
}

// Build a <span id="line-y"> row element, reconstructing any <a> wrappers.
function buildRow(line, y, pre) {
  const rowEl = document.createElement("span");
  rowEl.id = `line-${y}`;
  let curAnchorNode = null;
  let curAnchorEl = null;

  const spans = line.map(({ ch, anchor }) => {
    const span = document.createElement("span");
    span.textContent = ch;

    if (anchor !== curAnchorNode) {
      if (curAnchorEl) rowEl.appendChild(curAnchorEl);
      curAnchorNode = anchor;
      if (anchor) {
        curAnchorEl = document.createElement("a");
        for (const attr of anchor.attributes) {
          curAnchorEl.setAttribute(attr.name, attr.value);
        }
      } else {
        curAnchorEl = null;
      }
    }

    (curAnchorEl ?? rowEl).appendChild(span);
    return span;
  });

  if (curAnchorEl) rowEl.appendChild(curAnchorEl);
  rowEl.appendChild(document.createTextNode("\n"));
  pre.appendChild(rowEl);
  return spans;
}

// ─── charGrid ────────────────────────────────────────────────────────────────

// Build a grid from index.html <pre> tags
function charGrid(pre) {
  const lines = padLines(splitIntoLines(parseNodes(pre)));
  pre.textContent = "";
  return lines.map((line, y) => buildRow(line, y, pre));
}

// }}}
// Utilities ------------------------------------------------------- {{{

// Returns the page-relative center of a cell element
function cellPos(el) {
  const r = el.getBoundingClientRect();
  const b = document.body.getBoundingClientRect();
  return [r.left - b.left + r.width / 2, r.top - b.top + r.height / 2];
}

// Snap a mouse position to the nearest compass direction relative to (ax, ay)
function getCompass(mx, my, ax, ay) {
  const angle = Math.atan2(my - ay, mx - ax) * (180 / Math.PI);
  const snapped = Math.round(angle / 45) * 45;
  return ANGLE_TO_DIR[snapped] ?? "c";
}

// Check if mouse is in center,
function isInCenter(grid, x, y) {
  const { rows: [r0, r1], cols: [c0, c1] } = CENTER_BOUNDS;
  const tl = grid[r0][c0].getBoundingClientRect();
  const br = grid[r1][c1].getBoundingClientRect();
  return x >= tl.left && x <= br.right && y >= tl.top && y <= br.bottom;
}

// Return the two cell spans that represent the eye pupil in a given direction
function eyeCells(grid, [r, c], dir) {
  const [dr, dc] = COMPASS[dir];
  const col = c + dc * EYE_CHAR_WIDTH;
  return [grid[r + dr][col], grid[r + dr][col + 1]];
}

// }}}
// Eyes ------------------------------------------------------------ {{{

// Snapshot every compass slot for each eye origin and clear the center slot
function initEyes(grid) {
  return EYE_ORIGINS.map((origin) => {
    const snapshot = Object.fromEntries(
      Object.keys(COMPASS).map(dir => [
        dir,
        eyeCells(grid, origin, dir).map(s => s.textContent),
      ])
    );

    const eyeChar = snapshot.c;
    eyeCells(grid, origin, "c").forEach(s => (s.textContent = " "));
    snapshot.c = [" ", " "];

    return { origin, snapshot, eyeChar };
  });
}

// }}}
// Artifact animation ---------------------------------------------- {{{

// Scroll an ASCII artifact upward past the clip row,
function animateArtifact(
  grid,
  artifactStr,
  startCol,
  clipRow,
  intervalMs = 300) {

  let lines = artifactStr.split("\n");
  lines = lines.filter(s => s !== "");
  const gridRows = grid.length;
  let scrollY    = clipRow; // grid row of the artifact's top line
  let painted    = []; // { r, c, prev } — cells we've temporarily overwritten

  // Restore cell to unplainted state
  function restore() {
    for (const { r, c, prev } of painted) {
      if (grid[r]?.[c]) {
        grid[r][c].textContent = prev;
        grid[r][c].classList.remove("artifact-fg");
      }
    }
    painted = [];
  }

  function paintCell(r, c, ch, styled = false) {
    if (!grid[r]?.[c]) return;
    painted.push({ r, c, prev: grid[r][c].textContent });
    grid[r][c].textContent = ch;
    if (styled) grid[r][c].classList.add("artifact-fg");
  }

  // At the clip row, replace the bottom edge of the last visible line with
  // closing corners (┘ … └) so the artifact appears to emerge from behind
  // the clip boundary.
  function paintClipEdge(refLine) {
    let first = -1, last = -1;
    for (let dx = 0; dx < refLine.length; dx++) {
      if (refLine[dx] !== " ") {
        if (first === -1) first = dx;
        last = dx;
      }
    }
    if (first === -1) return;

    for (let dx = first; dx <= last; dx++) {
      const ch = dx === first ? "┘" : dx === last ? "└" : " ";
      paintCell(clipRow, startCol + dx, ch);
    }
  }

  function step() {
    restore();
    scrollY--;

    for (let dy = 0; dy < lines.length; dy++) {
      const r = scrollY + dy;
      if (r < 0 || r >= gridRows) continue;

      if (r === clipRow) {
        // Draw closing corners only once at least one row is visible above
        if (dy > 0) paintClipEdge(lines[dy - 1]);
      } else if (r < clipRow) {
        // Paint non-space chars onto currently empty cells
        for (let dx = 0; dx < lines[dy].length; dx++) {
          const ch = lines[dy][dx];
          if (ch === " ") continue;
          const c = startCol + dx;
          if (grid[r]?.[c]?.textContent === " ") {
            paintCell(r, c, ch, true);
          }
        }
      }
    }

    if (scrollY + lines.length <= 0) scrollY = clipRow;
    setTimeout(step, intervalMs);
  }

  setTimeout(step, intervalMs);
}

// }}}
// Entry point ----------------------------------------------------- {{{

function main() {
  const grid    = charGrid(document.querySelector("pre.ansi"));
  const eyeData = initEyes(grid);

  let compass     = "c";
  let color       = DEFAULT_COLOR;
  let prevCompass = null;

  function renderEyes() {
    for (const { origin, snapshot, eyeChar } of eyeData) {
      if (prevCompass !== null) {
        eyeCells(grid, origin, prevCompass).forEach((s, i) => {
          s.textContent = snapshot[prevCompass][i]; s.className = "";
        });
      }
      eyeCells(grid, origin, compass).forEach((s, i) => {
          s.textContent = eyeChar[i]; s.className = `${color}-fg`;
        });
    }
    prevCompass = compass;
  }

  renderEyes();
  animateArtifact(grid, ARTIFACTS[3], 10, 27);
  animateArtifact(grid, ARTIFACTS[2], 1, 27);
  animateArtifact(grid, ARTIFACTS[1], 30, 26);

  // Change eye color on link hover
  document.querySelectorAll("a").forEach((a) => {
    a.addEventListener("mouseenter", () => {
      color = a.dataset.color;
      renderEyes();
    });
    a.addEventListener("mouseleave", () => {
      color = DEFAULT_COLOR;
      renderEyes();
    });
  });

  // Eyes follow mouse
  document.addEventListener("mousemove", throttle((e) => {
    const [ax, ay] = cellPos(grid[ANCHOR_CELL[0]][ANCHOR_CELL[1]]);
    const dir = isInCenter(grid, e.clientX, e.clientY)
      ? "c"
      : getCompass(e.pageX, e.pageY, ax, ay);
    if (dir !== compass) { compass = dir; renderEyes(); }
  }, 200));
}

// }}}

main();
// vim: set ts=2 sw=2 tw=0 fdm=marker et :
