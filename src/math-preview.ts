import { loadMathJax } from "obsidian";
export function unload_math_preview(cm) {
  cm.setOption("hmdFoldMath", {
    onPreview: null,
    onPreviewEnd: null,
  });
}

export function init_math_preview(cm) {
  if (loadMathJax) loadMathJax();
  if (!document.querySelector("#math-preview")) {
    const mathPreviewEl = document.createElement("div");
    mathPreviewEl.className = "float-win float-win-hidden";
    mathPreviewEl.id = "math-preview";
    const mathTitleEl = document.createElement("div");
    mathTitleEl.addClass("float-win-title");
    mathPreviewEl.appendChild(mathTitleEl);
    mathTitleEl.outerHTML = `<div class="float-win-title">
      <button class="float-win-close">
      <svg xmlns="http://www.w3.org/2000/svg" class="icon" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0z" fill="none"/><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
      </button>
      Math Preview
      </div>`;
    const mathContentEl = document.createElement("div");
    mathContentEl.addClass("float-win-content");
    mathContentEl.id = "math-preview-content";
    mathPreviewEl.appendChild(mathContentEl);
    document.body.appendChild(mathPreviewEl);
  }

  let mathRenderer = null;
  const win = new FloatWin("math-preview");
  let supressed = false;

  win.closeBtn.addEventListener(
    "click",
    function () {
      supressed = true; // for current TeX block
    },
    false
  );

  function updatePreview(expr) {
    if (supressed) return;

    if (!mathRenderer) {
      // initialize renderer and preview window
      mathRenderer = cm.hmd.FoldMath.createRenderer(document.getElementById("math-preview-content"), "display");
      mathRenderer.onChanged = function () {
        // finished rendering. show the window
        if (!win.visible) {
          const cursorPos = cm.charCoords(cm.getCursor(), "window");
          win.moveTo(cursorPos.left, cursorPos.bottom);
        }
        win.show();
      };
    }
    if (!mathRenderer.isReady()) return;
    mathRenderer.startRender(expr);
  }

  function hidePreview() {
    win.hide();
    supressed = false;
  }

  cm.setOption("hmdFoldMath", {
    onPreview: updatePreview,
    onPreviewEnd: hidePreview,
  });
}

function FloatWin(id) {
  const win = document.getElementById(id);
  // eslint-disable-next-line @typescript-eslint/no-this-alias
  const self = this;

  /** @type {HTMLDivElement} */
  const titlebar = win.querySelector(".float-win-title");
  titlebar.addEventListener(
    "selectstart",
    function () {
      return false;
    },
    false
  );

  /** @type {HTMLButtonElement} */
  const closeBtn = win.querySelector(".float-win-close");
  if (closeBtn) {
    closeBtn.addEventListener(
      "click",
      function () {
        self.hide();
      },
      false
    );
  }

  let boxX, boxY, mouseX, mouseY, offsetX, offsetY;

  titlebar.addEventListener(
    "mousedown",
    function (e) {
      if (e.target === closeBtn) return;

      boxX = win.offsetLeft;
      boxY = win.offsetTop;
      mouseX = getMouseXY(e).x;
      mouseY = getMouseXY(e).y;
      offsetX = mouseX - boxX;
      offsetY = mouseY - boxY;

      document.addEventListener("mousemove", move, false);
      document.addEventListener("mouseup", up, false);
    },
    false
  );

  function move(e) {
    let x = getMouseXY(e).x - offsetX;
    let y = getMouseXY(e).y - offsetY;
    const width = document.documentElement.clientWidth - (titlebar as HTMLElement).offsetWidth;
    const height = document.documentElement.clientHeight - (titlebar as HTMLElement).offsetHeight;

    x = Math.min(Math.max(0, x), width);
    y = Math.min(Math.max(0, y), height);

    win.style.left = x + "px";
    win.style.top = y + "px";
  }

  function up(e) {
    document.removeEventListener("mousemove", move, false);
    document.removeEventListener("mouseup", up, false);
  }

  function getMouseXY(e) {
    let x = 0,
      y = 0;
    e = e || window.event;
    if (e.pageX) {
      x = e.pageX;
      y = e.pageY;
    } else {
      x = e.clientX + document.body.scrollLeft - document.body.clientLeft;
      y = e.clientY + document.body.scrollTop - document.body.clientTop;
    }
    return {
      x: x,
      y: y,
    };
  }

  this.el = win;
  this.closeBtn = closeBtn;
  this.visible = !/float-win-hidden/.test(win.className);
}

FloatWin.prototype.show = function (moveToCenter) {
  if (this.visible) return;
  const el = this.el,
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    self = this;
  this.visible = true;
  el.className = this.el.className.replace(/\s*(float-win-hidden\s*)+/g, " ");

  if (moveToCenter) {
    setTimeout(function () {
      self.moveTo((window.innerWidth - el.offsetWidth) / 2, (window.innerHeight - el.offsetHeight) / 2);
    }, 0);
  }
};

FloatWin.prototype.hide = function () {
  if (!this.visible) return;
  this.visible = false;
  this.el.className += " float-win-hidden";
};

FloatWin.prototype.moveTo = function (x, y) {
  const s = this.el.style;
  s.left = x + "px";
  s.top = y + "px";
};
