/*!
 * HyperMD, copyright (c) by laobubu
 * Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
 *
 * Break the Wall between writing and preview, in a Markdown Editor.
 *
 * HyperMD makes Markdown editor on web WYSIWYG, based on CodeMirror
 *
 * Homepage: http://laobubu.net/HyperMD/
 * Issues: https://github.com/laobubu/HyperMD/issues
 */
(function (global, factory) {
  (global = typeof globalThis !== "undefined" ? globalThis : global || self),
    factory((global.HyperMD = {}), global.CodeMirror);
})(this, function (exports, CodeMirror) {
  "use strict";

  /**
   * Provides some common PolyFill
   *
   * @internal Part of HyperMD core.
   *
   * You shall NOT import this file; please import "core" instead
   */
  if (typeof Object["assign"] != "function") {
    // Must be writable: true, enumerable: false, configurable: true
    Object.defineProperty(Object, "assign", {
      value: function assign(target, varArgs) {
        var arguments$1 = arguments;

        if (target == null) {
          // TypeError if undefined or null
          throw new TypeError("Cannot convert undefined or null to object");
        }
        var to = Object(target);
        for (var index = 1; index < arguments.length; index++) {
          var nextSource = arguments$1[index];
          if (nextSource != null) {
            // Skip over if undefined or null
            for (var nextKey in nextSource) {
              // Avoid bugs when hasOwnProperty is shadowed
              if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                to[nextKey] = nextSource[nextKey];
              }
            }
          }
        }
        return to;
      },
      writable: true,
      configurable: true,
    });
  }

  /**
   * Provides some universal utils
   *
   * @internal Part of HyperMD core.
   *
   * You shall NOT import this file; please import "core" instead
   */
  /** Simple FlipFlop */
  var FlipFlop = /** @class */ (function () {
    /**
     * Simple FlipFlop
     *
     * @param {function} on_cb see FlipFlop.ON(callback)
     * @param {function} off_cb see FlipFlop.OFF(callback)
     * @param {T} [state] initial state. default: false (boolean)
     * @param {string} [subkey] if get an object, use this key to retrive status. default: "enabled"
     */
    function FlipFlop(on_cb, off_cb, state, subkey) {
      if (state === void 0) {
        state = false;
      }
      if (subkey === void 0) {
        subkey = "enabled";
      }
      this.on_cb = on_cb;
      this.off_cb = off_cb;
      this.state = state;
      this.subkey = subkey;
    }
    /** set a callback when state is changed and is **NOT** `null`, `false` etc. */
    FlipFlop.prototype.ON = function (callback) {
      this.on_cb = callback;
      return this;
    };
    /** set a callback when state is set to `null`, `false` etc. */
    FlipFlop.prototype.OFF = function (callback) {
      this.off_cb = callback;
      return this;
    };
    /**
     * Update FlipFlop status, and trig callback function if needed
     *
     * @param {T|object} state new status value. can be a object
     * @param {boolean} [toBool] convert retrived value to boolean. default: false
     */
    FlipFlop.prototype.set = function (state, toBool) {
      var newVal = typeof state === "object" && state ? state[this.subkey] : state;
      if (toBool) {
        newVal = !!newVal;
      }
      if (newVal === this.state) {
        return;
      }
      if ((this.state = newVal)) {
        this.on_cb && this.on_cb(newVal);
      } else {
        this.off_cb && this.off_cb(newVal);
      }
    };
    FlipFlop.prototype.setBool = function (state) {
      return this.set(state, true);
    };
    /**
     * Bind to a object's property with `Object.defineProperty`
     * so that you may set state with `obj.enable = true`
     */
    FlipFlop.prototype.bind = function (obj, key, toBool) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      var _this = this;
      Object.defineProperty(obj, key, {
        get: function () {
          return _this.state;
        },
        set: function (v) {
          return _this.set(v, toBool);
        },
        configurable: true,
        enumerable: true,
      });
      return this;
    };
    return FlipFlop;
  })();
  /** async run a function, and retry up to N times until it returns true */
  function tryToRun(fn, times, onFailed) {
    times = ~~times || 5;
    var delayTime = 250;
    function nextCycle() {
      if (!times--) {
        if (onFailed) {
          onFailed();
        }
        return;
      }
      try {
        if (fn()) {
          return;
        }
      } catch (e) {}
      setTimeout(nextCycle, delayTime);
      delayTime *= 2;
    }
    setTimeout(nextCycle, 0);
  }
  /**
   * make a debounced function
   *
   * @param {Function} fn
   * @param {number} delay in ms
   */
  function debounce(fn, delay) {
    var deferTask = null;
    var notClearBefore = 0;
    var run = function () {
      fn();
      deferTask = 0;
    };
    var ans = function () {
      var nowTime = +new Date();
      if (deferTask) {
        if (nowTime < notClearBefore) {
          return;
        } else {
          clearTimeout(deferTask);
        }
      }
      deferTask = setTimeout(run, delay);
      notClearBefore = nowTime + 100; // allow 100ms error
    };
    ans.stop = function () {
      if (!deferTask) {
        return;
      }
      clearTimeout(deferTask);
      deferTask = 0;
    };
    return ans;
  }
  /**
   * addClass / removeClass etc.
   *
   * using CodeMirror's (although they're legacy API)
   */
  var addClass = CodeMirror.addClass;
  var rmClass = CodeMirror.rmClass;
  var contains = CodeMirror.contains;
  /**
   * a fallback for new Array(count).fill(data)
   */
  function repeat(item, count) {
    var ans = new Array(count);
    if (ans["fill"]) {
      ans["fill"](item);
    } else {
      for (var i = 0; i < count; i++) {
        ans[i] = item;
      }
    }
    return ans;
  }
  function repeatStr(item, count) {
    var ans = "";
    while (count-- > 0) {
      ans += item;
    }
    return ans;
  }
  /**
   * Visit element nodes and their children
   */
  function visitElements(seeds, handler) {
    var queue = [seeds],
      tmp;
    while ((tmp = queue.shift())) {
      for (var i = 0; i < tmp.length; i++) {
        var el = tmp[i];
        if (!el || el.nodeType != Node.ELEMENT_NODE) {
          continue;
        }
        handler(el);
        if (el.children && el.children.length > 0) {
          queue.push(el.children);
        }
      }
    }
  }
  /**
   * A lazy and simple Element size watcher. NOT WORK with animations
   */
  function watchSize(el, onChange, needPoll) {
    var _a = el.getBoundingClientRect(),
      width = _a.width,
      height = _a.height;
    /** check size and trig onChange */
    var check = debounce(function () {
      var rect = el.getBoundingClientRect();
      var newWidth = rect.width,
        newHeight = rect.height;
      if (width != newWidth || height != newHeight) {
        onChange(newWidth, newHeight, width, height);
        width = newWidth;
        height = newHeight;
        setTimeout(check, 200); // maybe changed again later?
      }
    }, 100);
    var nextTimer = null;
    function pollOnce() {
      if (nextTimer) {
        clearTimeout(nextTimer);
      }
      if (!stopped) {
        nextTimer = setTimeout(pollOnce, 200);
      }
      check();
    }
    var stopped = false;
    function stop() {
      stopped = true;
      check.stop();
      if (nextTimer) {
        clearTimeout(nextTimer);
        nextTimer = null;
      }
      for (var i = 0; i < eventBinded.length; i++) {
        eventBinded[i][0].removeEventListener(eventBinded[i][1], check, false);
      }
    }
    var eventBinded = [];
    function bindEvents(el) {
      var tagName = el.tagName;
      var computedStyle = getComputedStyle(el);
      var getStyle = function (name) {
        return computedStyle.getPropertyValue(name) || "";
      };
      if (getStyle("resize") != "none") {
        needPoll = true;
      }
      // size changes if loaded
      if (/^(?:img|video)$/i.test(tagName)) {
        el.addEventListener("load", check, false);
        el.addEventListener("error", check, false);
      } else if (/^(?:details|summary)$/i.test(tagName)) {
        el.addEventListener("click", check, false);
      }
    }
    if (!needPoll) {
      visitElements([el], bindEvents);
    }
    // bindEvents will update `needPoll`
    if (needPoll) {
      nextTimer = setTimeout(pollOnce, 200);
    }
    return {
      check: check,
      stop: stop,
    };
  }
  function makeSymbol(name) {
    if (typeof Symbol === "function") {
      return Symbol(name);
    }
    return "_\n" + name + "\n_" + Math.floor(Math.random() * 0xffff).toString(16);
  }

  /*! *****************************************************************************
  Copyright (c) Microsoft Corporation.

  Permission to use, copy, modify, and/or distribute this software for any
  purpose with or without fee is hereby granted.

  THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
  REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
  AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
  INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
  LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
  OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
  PERFORMANCE OF THIS SOFTWARE.
  ***************************************************************************** */

  var __assign = function () {
    __assign =
      Object.assign ||
      function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
      };
    return __assign.apply(this, arguments);
  };

  /**
   * Ready-to-use functions that powers up your Markdown editor
   *
   * @internal Part of HyperMD core.
   *
   * You shall NOT import this file; please import "core" instead
   */
  // if (HyperMD_Mark in editor), the editor was a HyperMD mode at least once
  var HyperMD_Mark = "__hypermd__";
  /**
   * The default configuration that used by `HyperMD.fromTextArea`
   *
   * Addons may update this object freely!
   */
  var suggestedEditorConfig = {
    lineNumbers: true,
    lineWrapping: true,
    theme: "light",
    mode: "text/x-hypermd",
    tabSize: 4,
    autoCloseBrackets: true,
    foldGutter: true,
    gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter", "HyperMD-goback"],
  };
  /**
   * Editor Options that disable HyperMD WYSIWYG visual effects.
   * These option will be applied when user invoke `switchToNormal`.
   *
   * Addons about visual effects, shall update this object!
   */
  var normalVisualConfig = {
    theme: "default",
  };
  /**
   * Initialize an editor from a <textarea>
   * Calling `CodeMirror.fromTextArea` with recommended HyperMD options
   *
   * @see CodeMirror.fromTextArea
   *
   * @param {HTMLTextAreaElement} textArea
   * @param {object} [config]
   * @returns {cm_t}
   */
  function fromTextArea(textArea, config) {
    var final_config = __assign(__assign({}, suggestedEditorConfig), config);
    var cm = CodeMirror.fromTextArea(textArea, final_config);
    cm[HyperMD_Mark] = true;
    return cm;
  }
  function switchToNormal(editor, options_or_theme) {
    // this CodeMirror editor has never been in HyperMD mode. `switchToNormal` is meanless
    if (!editor[HyperMD_Mark]) {
      return;
    }
    if (typeof options_or_theme === "string") {
      options_or_theme = { theme: options_or_theme };
    }
    var opt = __assign(
      __assign(__assign({}, normalVisualConfig), { theme: editor.getOption("theme") }),
      options_or_theme
    );
    for (var key in opt) {
      editor.setOption(key, opt[key]);
    }
  }
  function switchToHyperMD(editor, options_or_theme) {
    if (typeof options_or_theme === "string") {
      options_or_theme = { theme: options_or_theme };
    }
    var opt = {};
    if (HyperMD_Mark in editor) {
      // has been HyperMD mode once. Only modify visual-related options
      for (var key in normalVisualConfig) {
        opt[key] = suggestedEditorConfig[key];
      }
      Object.assign(opt, { theme: editor.getOption("theme") }, options_or_theme);
    } else {
      // this CodeMirror editor is new to HyperMD
      Object.assign(opt, suggestedEditorConfig, { theme: editor.getOption("theme") }, options_or_theme);
      editor[HyperMD_Mark] = true;
    }
    for (var key in opt) {
      editor.setOption(key, opt[key]);
    }
  }

  /**
    @internal DO NOT IMPORT THIS MODULE!
              If you want to use this module, import it from `core`:

                  import { cm_internal } from "../core"

    The following few functions are from CodeMirror's source code.

    MIT License

    Copyright (C) 2017 by Marijn Haverbeke <marijnh@gmail.com> and others

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    THE SOFTWARE.

    */
  /**
   * Find the view element corresponding to a given line. Return null when the line isn't visible.
   *
   * @see codemirror\src\measurement\position_measurement.js 5.37.0
   * @param n lineNo
   */
  function findViewIndex(cm, n) {
    if (n >= cm.display.viewTo) {
      return null;
    }
    n -= cm.display.viewFrom;
    if (n < 0) {
      return null;
    }
    var view = cm.display.view;
    for (var i = 0; i < view.length; i++) {
      n -= view[i].size;
      if (n < 0) {
        return i;
      }
    }
  }
  /**
   * Find a line view that corresponds to the given line number.
   *
   * @see codemirror\src\measurement\position_measurement.js 5.37.0
   */
  function findViewForLine(cm, lineN) {
    if (lineN >= cm.display.viewFrom && lineN < cm.display.viewTo) {
      return cm.display.view[findViewIndex(cm, lineN)];
    }
    var ext = cm.display.externalMeasured;
    if (ext && lineN >= ext.lineN && lineN < ext.lineN + ext.size) {
      return ext;
    }
  }
  /**
   * Find a line map (mapping character offsets to text nodes) and a
   * measurement cache for the given line number. (A line view might
   * contain multiple lines when collapsed ranges are present.)
   *
   * @see codemirror\src\measurement\position_measurement.js 5.37.0
   */
  function mapFromLineView(lineView, line, lineN) {
    if (lineView.line == line) {
      return {
        map: lineView.measure.map,
        cache: lineView.measure.cache,
        before: false,
      };
    }
    if (!lineView.rest) return;
    for (var i = 0; i < lineView.rest.length; i++) {
      if (lineView.rest[i] == line) {
        return {
          map: lineView.measure.maps[i],
          cache: lineView.measure.caches[i],
          before: false,
        };
      }
    }
    for (var i = 0; i < lineView.rest.length; i++) {
      if (lineView.rest[i].lineNo() > lineN) {
        return {
          map: lineView.measure.maps[i],
          cache: lineView.measure.caches[i],
          before: true,
        };
      }
    }
  }

  var cm_internal = /*#__PURE__*/ Object.freeze({
    __proto__: null,
    findViewIndex: findViewIndex,
    findViewForLine: findViewForLine,
    mapFromLineView: mapFromLineView,
  });

  /**
   * CodeMirror-related utils
   *
   * @internal Part of HyperMD core.
   *
   * You shall NOT import this file; please import "core" instead
   */
  /**
   * Useful tool to seek for tokens
   *
   *     var seeker = new TokenSeeker(cm)
   *     seeker.setPos(0, 0) // set to line 0, char 0
   *     var ans = seeker.findNext(/fomratting-em/)
   *
   */
  var TokenSeeker = /** @class */ (function () {
    function TokenSeeker(cm) {
      this.cm = cm;
    }
    TokenSeeker.prototype.findNext = function (condition, varg, since) {
      var lineNo = this.lineNo;
      var tokens = this.lineTokens;
      var token = null;
      var i_token = this.i_token + 1;
      var maySpanLines = false;
      if (varg === true) {
        maySpanLines = true;
      } else if (typeof varg === "number") {
        i_token = varg;
      }
      if (since) {
        if (since.line > lineNo) {
          i_token = tokens.length; // just ignore current line
        } else if (since.line < lineNo);
        else {
          for (; i_token < tokens.length; i_token++) {
            if (tokens[i_token].start >= since.ch) {
              break;
            }
          }
        }
      }
      for (; i_token < tokens.length; i_token++) {
        var token_tmp = tokens[i_token];
        if (typeof condition === "function" ? condition(token_tmp, tokens, i_token) : condition.test(token_tmp.type)) {
          token = token_tmp;
          break;
        }
      }
      if (!token && maySpanLines) {
        var cm_1 = this.cm;
        var startLine = Math.max(since ? since.line : 0, lineNo + 1);
        cm_1.eachLine(startLine, cm_1.lastLine() + 1, function (line_i) {
          lineNo = line_i.lineNo();
          tokens = cm_1.getLineTokens(lineNo);
          i_token = 0;
          if (since && lineNo === since.line) {
            for (; i_token < tokens.length; i_token++) {
              if (tokens[i_token].start >= since.ch) {
                break;
              }
            }
          }
          for (; i_token < tokens.length; i_token++) {
            var token_tmp = tokens[i_token];
            if (
              typeof condition === "function" ? condition(token_tmp, tokens, i_token) : condition.test(token_tmp.type)
            ) {
              token = token_tmp;
              return true; // stop `eachLine`
            }
          }
        });
      }
      return token ? { lineNo: lineNo, token: token, i_token: i_token } : null;
    };
    TokenSeeker.prototype.findPrev = function (condition, varg, since) {
      var lineNo = this.lineNo;
      var tokens = this.lineTokens;
      var token = null;
      var i_token = this.i_token - 1;
      var maySpanLines = false;
      if (varg === true) {
        maySpanLines = true;
      } else if (typeof varg === "number") {
        i_token = varg;
      }
      if (since) {
        if (since.line < lineNo) {
          i_token = -1; // just ignore current line
        } else if (since.line > lineNo);
        else {
          for (; i_token < tokens.length; i_token++) {
            if (tokens[i_token].start >= since.ch) {
              break;
            }
          }
        }
      }
      if (i_token >= tokens.length) {
        i_token = tokens.length - 1;
      }
      for (; i_token >= 0; i_token--) {
        var token_tmp = tokens[i_token];
        if (typeof condition === "function" ? condition(token_tmp, tokens, i_token) : condition.test(token_tmp.type)) {
          token = token_tmp;
          break;
        }
      }
      if (!token && maySpanLines) {
        var cm = this.cm;
        var startLine = Math.min(since ? since.line : cm.lastLine(), lineNo - 1);
        var endLine = cm.firstLine();
        // cm.eachLine doesn't support reversed searching
        // use while... loop to iterate
        lineNo = startLine + 1;
        while (!token && endLine <= --lineNo) {
          cm.getLineHandle(lineNo);
          tokens = cm.getLineTokens(lineNo);
          i_token = 0;
          if (since && lineNo === since.line) {
            for (; i_token < tokens.length; i_token++) {
              if (tokens[i_token].start >= since.ch) {
                break;
              }
            }
          }
          if (i_token >= tokens.length) {
            i_token = tokens.length - 1;
          }
          for (; i_token >= 0; i_token--) {
            var token_tmp = tokens[i_token];
            if (
              typeof condition === "function" ? condition(token_tmp, tokens, i_token) : condition.test(token_tmp.type)
            ) {
              token = token_tmp;
              break; // FOUND token !
            }
          }
        }
      }
      return token ? { lineNo: lineNo, token: token, i_token: i_token } : null;
    };
    /**
     * return a range in which every token has the same style, or meet same condition
     */
    TokenSeeker.prototype.expandRange = function (style, maySpanLines) {
      var cm = this.cm;
      var isStyled;
      if (typeof style === "function") {
        isStyled = style;
      } else {
        if (typeof style === "string") {
          style = new RegExp("(?:^|\\s)" + style + "(?:\\s|$)");
        }
        isStyled = function (token) {
          return token ? style.test(token.type || "") : false;
        };
      }
      var from = {
        lineNo: this.lineNo,
        i_token: this.i_token,
        token: this.lineTokens[this.i_token],
      };
      var to = Object.assign({}, from);
      // find left
      var foundUnstyled = false,
        tokens = this.lineTokens,
        i = this.i_token;
      while (!foundUnstyled) {
        if (i >= tokens.length) {
          i = tokens.length - 1;
        }
        for (; i >= 0; i--) {
          var token = tokens[i];
          if (!isStyled(token, tokens, i)) {
            foundUnstyled = true;
            break;
          } else {
            from.i_token = i;
            from.token = token;
          }
        }
        if (foundUnstyled || !(maySpanLines && from.lineNo > cm.firstLine())) {
          break;
        } // found, or no more lines
        tokens = cm.getLineTokens(--from.lineNo);
        i = tokens.length - 1;
      }
      // find right
      var foundUnstyled = false,
        tokens = this.lineTokens,
        i = this.i_token;
      while (!foundUnstyled) {
        if (i < 0) {
          i = 0;
        }
        for (; i < tokens.length; i++) {
          var token = tokens[i];
          if (!isStyled(token, tokens, i)) {
            foundUnstyled = true;
            break;
          } else {
            to.i_token = i;
            to.token = token;
          }
        }
        if (foundUnstyled || !(maySpanLines && to.lineNo < cm.lastLine())) {
          break;
        } // found, or no more lines
        tokens = cm.getLineTokens(++to.lineNo);
        i = 0;
      }
      return { from: from, to: to };
    };
    TokenSeeker.prototype.setPos = function (line, ch, precise) {
      if (ch === void 0) {
        ch = line;
        line = this.line;
      } else if (typeof line === "number") {
        line = this.cm.getLineHandle(line);
      }
      var sameLine = line === this.line;
      var i_token = 0;
      if (precise || !sameLine) {
        this.line = line;
        if (!line) {
          // 👈 0xGG Team: This is sometimes null?
          return;
        }
        this.lineNo = line.lineNo();
        this.lineTokens = this.cm.getLineTokens(this.lineNo);
      } else {
        // try to speed-up seeking
        i_token = this.i_token;
        var token = this.lineTokens[i_token];
        if (token.start > ch) {
          i_token = 0;
        }
      }
      var tokens = this.lineTokens;
      for (; i_token < tokens.length; i_token++) {
        if (tokens[i_token].end > ch) {
          break;
        } // found
      }
      this.i_token = i_token;
    };
    /** get (current or idx-th) token */
    TokenSeeker.prototype.getToken = function (idx) {
      if (typeof idx !== "number") {
        idx = this.i_token;
      }
      return this.lineTokens[idx];
    };
    /** get (current or idx-th) token type. always return a string */
    TokenSeeker.prototype.getTokenType = function (idx) {
      if (typeof idx !== "number") {
        idx = this.i_token;
      }
      var t = this.lineTokens[idx];
      return (t && t.type) || "";
    };
    return TokenSeeker;
  })();
  /**
   * CodeMirror's `getLineTokens` might merge adjacent chars with same styles,
   * but this one won't.
   *
   * This one will consume more memory.
   *
   * @param {CodeMirror.LineHandle} line
   * @returns {string[]} every char's style
   */
  function getEveryCharToken(line) {
    var ans = new Array(line.text.length);
    var ss = line.styles;
    var i = 0;
    if (ss) {
      // CodeMirror already parsed this line. Use cache
      for (var j = 1; j < ss.length; j += 2) {
        var i_to = ss[j],
          s = ss[j + 1];
        while (i < i_to) {
          ans[i++] = s;
        }
      }
    } else {
      // Emmm... slow method
      var cm = line.parent.cm || line.parent.parent.cm || line.parent.parent.parent.cm;
      var ss_1 = cm.getLineTokens(line.lineNo());
      for (var j = 0; j < ss_1.length; j++) {
        var i_to = ss_1[j].end,
          s = ss_1[j].type;
        while (i < i_to) {
          ans[i++] = s;
        }
      }
    }
    return ans;
  }
  /**
   * return a range in which every char has the given style (aka. token type).
   * assuming char at `pos` already has the style.
   *
   * the result will NOT span lines.
   *
   * @param style aka. token type
   * @see TokenSeeker if you want to span lines
   */
  function expandRange(cm, pos, style) {
    var line = pos.line;
    var from = { line: line, ch: 0 };
    var to = { line: line, ch: pos.ch };
    var styleFn = typeof style === "function" ? style : false;
    var styleRE = !styleFn && new RegExp("(?:^|\\s)" + style + "(?:\\s|$)");
    var tokens = cm.getLineTokens(line);
    var iSince;
    for (iSince = 0; iSince < tokens.length; iSince++) {
      if (tokens[iSince].end >= pos.ch) {
        break;
      }
    }
    if (iSince === tokens.length) {
      return null;
    }
    for (var i = iSince; i < tokens.length; i++) {
      var token = tokens[i];
      if (styleFn ? styleFn(token) : styleRE.test(token.type)) {
        to.ch = token.end;
      } else {
        break;
      }
    }
    for (var i = iSince; i >= 0; i--) {
      var token = tokens[i];
      if (!(styleFn ? styleFn(token) : styleRE.test(token.type))) {
        from.ch = token.end;
        break;
      }
    }
    return { from: from, to: to };
  }
  /**
   * Get ordered range from `CodeMirror.Range`-like object or `[Position, Position]`
   *
   * In an ordered range, The first `Position` must NOT be after the second.
   */
  function orderedRange(range) {
    if ("anchor" in range) {
      range = [range.head, range.anchor];
    }
    if (CodeMirror.cmpPos(range[0], range[1]) > 0) {
      return [range[1], range[0]];
    } else {
      return [range[0], range[1]];
    }
  }
  /**
   * Check if two range has intersection.
   *
   * @param range1 ordered range 1  (start <= end)
   * @param range2 ordered range 2  (start <= end)
   */
  function rangesIntersect(range1, range2) {
    var from1 = range1[0],
      to1 = range1[1];
    var from2 = range2[0],
      to2 = range2[1];
    return !(CodeMirror.cmpPos(to1, from2) < 0 || CodeMirror.cmpPos(from1, to2) > 0);
  }

  /**
   * Post-process CodeMirror-mode-parsed lines, find the ranges
   *
   * for example, a parsed line `[**Hello** World](xxx.txt)` will gives you:
   *
   * 1. link from `[` to `)`
   * 2. bold text from `**` to another `**`
   */
  var LineSpanExtractor = /** @class */ (function () {
    function LineSpanExtractor(cm) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      var _this = this;
      this.cm = cm;
      this.caches = []; // cache for each lines
      cm.on("change", function (cm, change) {
        var line = change.from.line;
        if (_this.caches.length > line) {
          _this.caches.splice(line);
        }
      });
    }
    LineSpanExtractor.prototype.getTokenTypes = function (token, prevToken) {
      var prevState = prevToken ? prevToken.state : {};
      var state = token.state;
      var styles = " " + token.type + " ";
      var ans = {
        // em
        em: state.em ? 1 /* IS_THIS_TYPE */ : prevState.em ? 2 /* LEAVING_THIS_TYPE */ : 0 /* NOTHING */,
        // strikethrough
        strikethrough: state.strikethrough
          ? 1 /* IS_THIS_TYPE */
          : prevState.strikethrough
          ? 2 /* LEAVING_THIS_TYPE */
          : 0 /* NOTHING */,
        // strong
        strong: state.strong ? 1 /* IS_THIS_TYPE */ : prevState.strong ? 2 /* LEAVING_THIS_TYPE */ : 0 /* NOTHING */,
        // mark
        mark: state.highlight
          ? 1 /* IS_THIS_TYPE */
          : prevState.highlight
          ? 2 /* LEAVING_THIS_TYPE */
          : 0 /* NOTHING */,
        // ins
        ins: state.ins ? 1 /* IS_THIS_TYPE */ : prevState.ins ? 2 /* LEAVING_THIS_TYPE */ : 0 /* NOTHING */,
        // sub
        sub: state.sub ? 1 /* IS_THIS_TYPE */ : prevState.sub ? 2 /* LEAVING_THIS_TYPE */ : 0 /* NOTHING */,
        // sup
        sup: state.sup ? 1 /* IS_THIS_TYPE */ : prevState.sup ? 2 /* LEAVING_THIS_TYPE */ : 0 /* NOTHING */,
        // code
        code: state.code ? 1 /* IS_THIS_TYPE */ : prevState.code ? 2 /* LEAVING_THIS_TYPE */ : 0 /* NOTHING */,
        // obsidian internal link
        internalLink:
          (token && token.type && token.type.contains("formatting-link-start")) ||
          (token && token.type && token.type.contains("hmd-internal-link"))
            ? 1
            : token && token.type && token.type.contains("formatting-link-end")
            ? 2
            : 0,
        // linkText
        linkText: state.linkText
          ? state.hmdLinkType === 3 /* NORMAL */ ||
            state.hmdLinkType === 7 /* BARELINK2 */ ||
            state.hmdLinkType === 4 /* WIKILINK */
            ? 1 /* IS_THIS_TYPE */
            : 0 /* NOTHING */
          : prevState.linkText
          ? 2 /* LEAVING_THIS_TYPE */
          : 0 /* NOTHING */,
        // linkHref
        linkHref:
          state.linkHref && !state.linkText
            ? 1 /* IS_THIS_TYPE */
            : !state.linkHref && !state.linkText && prevState.linkHref && !prevState.linkText
            ? 2 /* LEAVING_THIS_TYPE */
            : 0 /* NOTHING */,
        // task checkbox
        task:
          styles.indexOf(" formatting-task ") !== -1
            ? 1 /* IS_THIS_TYPE */ | 2 /* LEAVING_THIS_TYPE */
            : 0 /* NOTHING */,
        // hashtag
        hashtag: state.hmdHashtag
          ? 1 /* IS_THIS_TYPE */
          : prevState.hmdHashtag
          ? 2 /* LEAVING_THIS_TYPE */
          : 0 /* NOTHING */,
      };
      ans["highlight"] = ans["mark"]; // create a token alias
      return ans;
    };
    /** get spans from a line and update the cache */
    LineSpanExtractor.prototype.extract = function (lineNo, precise) {
      if (!precise) {
        // maybe cache is valid?
        var cc = this.caches[lineNo];
        if (cc) {
          return cc;
        }
      }
      var tokens = this.cm.getLineTokens(lineNo);
      var lineText = this.cm.getLine(lineNo);
      var lineLength = lineText.length;
      var ans = [];
      var unclosed = {};
      for (var i = 0; i < tokens.length; i++) {
        var token = tokens[i];
        var types = this.getTokenTypes(token, tokens[i - 1]);
        for (var type in types) {
          var span = unclosed[type];
          if (types[type] & 1 /* IS_THIS_TYPE */) {
            // style is active
            if (!span) {
              // create a new span if needed
              span = {
                type: type,
                begin: token.start,
                end: lineLength,
                head: token,
                head_i: i,
                tail: tokens[tokens.length - 1],
                tail_i: tokens.length - 1,
                text: lineText.slice(token.start),
              };
              ans.push(span);
              unclosed[type] = span;
            }
          }
          if (types[type] & 2 /* LEAVING_THIS_TYPE */) {
            // a style is exiting
            if (span) {
              // close an unclosed span
              span.tail = token;
              span.tail_i = i;
              span.end = token.end;
              span.text = span.text.slice(0, span.end - span.begin);
              unclosed[type] = null;
            }
          }
        }
      }
      this.caches[lineNo] = ans;
      return ans;
    };
    LineSpanExtractor.prototype.findSpansAt = function (pos) {
      var spans = this.extract(pos.line);
      var ch = pos.ch;
      var ans = [];
      for (var i = 0; i < spans.length; i++) {
        var span = spans[i];
        if (span.begin > ch) {
          break;
        }
        if (ch >= span.begin && span.end >= ch) {
          ans.push(span);
        }
      }
      return ans;
    };
    LineSpanExtractor.prototype.findSpanWithTypeAt = function (pos, type) {
      var spans = this.extract(pos.line);
      var ch = pos.ch;
      for (var i = 0; i < spans.length; i++) {
        var span = spans[i];
        if (span.begin > ch) {
          break;
        }
        if (ch >= span.begin && span.end >= ch && span.type === type) {
          return span;
        }
      }
      return null;
    };
    return LineSpanExtractor;
  })();
  var extractor_symbol = makeSymbol("LineSpanExtractor");
  /**
   * Get a `LineSpanExtractor` to extract spans from CodeMirror parsed lines
   *
   * for example, a parsed line `[**Hello** World](xxx.txt)` will gives you:
   *
   * 1. link from `[` to `)`
   * 2. bold text from `**` to another `**`
   */
  function getLineSpanExtractor(cm) {
    if (extractor_symbol in cm) {
      return cm[extractor_symbol];
    }
    var inst = (cm[extractor_symbol] = new LineSpanExtractor(cm));
    return inst;
  }

  function updateCursorDisplay(cm, skipCacheCleaning) {
    if (!skipCacheCleaning) {
      var lvs = cm.display.view; // LineView s
      for (var lineView of lvs) {
        if (lineView.measure) {
          lineView.measure.cache = {};
          lineView.measure.caches = [{}];
        }
      }
    }
    setTimeout(function () {
      cm.display.input.showSelection(cm.display.input.prepareSelection());
    }, 60); // wait for css style
  }

  /**
   * Utils for HyperMD addons
   *
   * @internal Part of HyperMD core.
   *
   * You shall NOT import this file; please import "core" instead
   */
  var Addon = /** @class */ (function () {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    function Addon(cm) {}
    return Addon;
  })();
  /** make a Singleton getter */
  function Getter(name, ClassCtor, defaultOption) {
    return function (cm) {
      if (!cm.hmd) {
        cm.hmd = {};
      }
      if (!cm.hmd[name]) {
        var inst = new ClassCtor(cm);
        cm.hmd[name] = inst;
        if (defaultOption) {
          for (var k in defaultOption) {
            inst[k] = defaultOption[k];
          }
        }
        return inst;
      }
      return cm.hmd[name];
    };
  }

  var addon = /*#__PURE__*/ Object.freeze({
    __proto__: null,
    Addon: Addon,
    Getter: Getter,
  });

  Object.defineProperty(exports, "cmpPos", {
    enumerable: true,
    get: function () {
      return CodeMirror.cmpPos;
    },
  });
  exports.Addon = addon;
  exports.FlipFlop = FlipFlop;
  exports.TokenSeeker = TokenSeeker;
  exports.addClass = addClass;
  exports.cm_internal = cm_internal;
  exports.contains = contains;
  exports.debounce = debounce;
  exports.updateCursorDisplay = updateCursorDisplay;
  exports.expandRange = expandRange;
  exports.fromTextArea = fromTextArea;
  exports.getEveryCharToken = getEveryCharToken;
  exports.getLineSpanExtractor = getLineSpanExtractor;
  exports.makeSymbol = makeSymbol;
  exports.normalVisualConfig = normalVisualConfig;
  exports.orderedRange = orderedRange;
  exports.rangesIntersect = rangesIntersect;
  exports.repeat = repeat;
  exports.repeatStr = repeatStr;
  exports.rmClass = rmClass;
  exports.suggestedEditorConfig = suggestedEditorConfig;
  exports.switchToHyperMD = switchToHyperMD;
  exports.switchToNormal = switchToNormal;
  exports.tryToRun = tryToRun;
  exports.visitElements = visitElements;
  exports.watchSize = watchSize;

  Object.defineProperty(exports, "__esModule", { value: true });
});
