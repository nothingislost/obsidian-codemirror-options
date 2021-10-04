// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// DESCRIPTION: Auto show/hide markdown tokens like `##` or `*`
//
// Only works with `hypermd` mode, require special CSS rules
//
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        Object.defineProperty(o, k2, {
          enumerable: true,
          get: function () {
            return m[k];
          },
        });
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null)
      for (var k in mod)
        if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
  };

(function (mod) {
  //[HyperMD] UMD patched!
  /*plain env*/ mod(null, {}, CodeMirror, HyperMD, null);
})(function (require, exports, CodeMirror, core_1) {
  "use strict";
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.getAddon = exports.HideToken = exports.suggestedOption = exports.defaultOption = void 0;
  CodeMirror = __importStar(CodeMirror);
  var DEBUG = false;
  //#region Internal Function...
  /** check if has the class and remove it */
  function rmClass(el, className) {
    var c = " " + el.className + " ",
      cnp = " " + className + " ";
    if (c.indexOf(cnp) === -1) return false;
    el.className = c.replace(cnp, "").trim();
    return true;
  }
  /** check if NOT has the class and add it */
  function addClass(el, className) {
    var c = " " + el.className + " ",
      cnp = " " + className + " ";
    if (c.indexOf(cnp) !== -1) return false;
    el.className = el.className + " " + className;
    return true;
  }
  exports.defaultOption = {
    enabled: false,
    line: true,
    // does not yet support ins, sub, sup
    tokenTypes: "em|strong|strikethrough|code|linkText|task|mark|internalLink|highlight".split("|"),
  };
  exports.suggestedOption = {
    enabled: true,
  };
  core_1.suggestedEditorConfig.hmdHideToken = exports.suggestedOption;
  core_1.normalVisualConfig.hmdHideToken = false;
  CodeMirror.defineOption("hmdHideToken", exports.defaultOption, function (cm, newVal) {
    ///// convert newVal's type to `Partial<Options>`, if it is not.
    if (!newVal || typeof newVal === "boolean") {
      newVal = { enabled: !!newVal };
    } else if (typeof newVal === "string") {
      newVal = { enabled: true, tokenTypes: newVal.split("|") };
    } else if (newVal instanceof Array) {
      newVal = { enabled: true, tokenTypes: newVal };
    }
    ///// apply config and write new values into cm
    var inst = exports.getAddon(cm);
    for (var k in exports.defaultOption) {
      inst[k] = k in newVal ? newVal[k] : exports.defaultOption[k];
    }
  });
  //#endregion
  /********************************************************************************** */
  //#region Addon Class
  var hideClassName = "hmd-hidden-token";
  var lineInactiveClassName = "hmd-inactive-line";
  var HideToken = /** @class */ (function () {
    function HideToken(cm) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      var _this = this;
      this.cm = cm;
      this.renderLineHandler = function (cm, line, el) {
        // TODO: if we procLine now, we can only get the outdated lineView, lineViewMeasure and lineViewMap. Calling procLine will be wasteful!
        var changed = _this.procLine(line, el);
        if (DEBUG) console.log("renderLine return " + changed);
      };
      this.cursorActivityHandler = function (/*doc: CodeMirror.Doc*/) {
        _this.update();
      };
      this.update = core_1.debounce(function () {
        return _this.updateImmediately();
      }, 100);
      /** Current user's selections, in each line */
      this._rangesInLine = {};
      new core_1.FlipFlop(
        /* ON  */ function () {
          cm.on("cursorActivity", _this.cursorActivityHandler);
          cm.on("renderLine", _this.renderLineHandler);
          // cm.on("update", _this.update);
          _this.update();
          cm.refresh();
        },
        /* OFF */ function () {
          cm.off("cursorActivity", _this.cursorActivityHandler);
          cm.off("renderLine", _this.renderLineHandler);
          cm.off("update", _this.update);
          _this.update.stop();
          cm.refresh();
        }
      ).bind(this, "enabled", true);
    }
    /**
     * hide/show <span>s in one line, based on `this._rangesInLine`
     * @returns line changed or not
     */
    HideToken.prototype.procLine = function (line, pre) {
      var cm = this.cm;
      var lineNo = typeof line === "number" ? line : line.lineNo();
      if (typeof line === "number") line = cm.getLineHandle(line);
      var rangesInLine = this._rangesInLine[lineNo] || [];
      var lv = core_1.cm_internal.findViewForLine(cm, lineNo);
      if (!lv || lv.hidden || !lv.measure) return false;
      if (!pre) pre = lv.text;
      if (!pre) return false;
      if (DEBUG) if (!pre.isSameNode(lv.text)) console.warn("procLine got different node... " + lineNo);
      var mapInfo = core_1.cm_internal.mapFromLineView(lv, line, lineNo);
      var map = mapInfo.map;
      var nodeCount = map.length / 3;
      var changed = false;
      // change line status
      if (rangesInLine.length === 0) {
        // inactiveLine
        if (addClass(pre, lineInactiveClassName)) changed = true;
      } else {
        // activeLine
        if (rmClass(pre, lineInactiveClassName)) changed = true;
      }
      // show or hide tokens
      /**
       * @returns if there are Span Nodes changed
       */
      function changeVisibilityForSpan(span, shallHideTokens, iNodeHint) {
        if (DEBUG) console.log("changeVis start");
        var changed = false;
        iNodeHint = iNodeHint || 0;
        // iterate the map
        for (var i = iNodeHint; i < nodeCount; i++) {
          var begin = map[i * 3],
            end = map[i * 3 + 1];
          var domNode = map[i * 3 + 2];
          if (DEBUG) console.log("DOMTEST", span.head, begin);
          if (begin === span.head.start) {
            // find the leading token!
            if (/formatting-/.test(span.head.type) && domNode.nodeType === Node.TEXT_NODE) {
              if (DEBUG) console.log("DOMNODE", shallHideTokens, domNode, begin, span);
              // good. this token can be changed
              var domParent = domNode.parentElement;
              if (shallHideTokens ? addClass(domParent, hideClassName) : rmClass(domParent, hideClassName)) {
                if (DEBUG) console.log("HEAD DOM CHANGED");
                changed = true;
              }
              // Yiyi: Wikilink
              if (
                domParent.nextElementSibling && domParent.nextElementSibling.classList.contains("cm-internal-link-url")
              ) {
                if (
                  shallHideTokens
                    ? addClass(domParent.nextElementSibling, hideClassName)
                    : rmClass(domParent.nextElementSibling, hideClassName)
                ) {
                  if (DEBUG) console.log("HEAD DOM CHANGED");
                  changed = true;
                }
              }
              if (
                domParent.nextElementSibling && domParent.nextElementSibling.nextElementSibling && domParent.nextElementSibling.nextElementSibling.classList.contains("cm-internal-link-ref")
              ) {
                if (
                  shallHideTokens
                    ? addClass(domParent.nextElementSibling.nextElementSibling, hideClassName)
                    : rmClass(domParent.nextElementSibling.nextElementSibling, hideClassName)
                ) {
                  if (DEBUG) console.log("HEAD DOM CHANGED");
                  changed = true;
                }
              }
            }
            //FIXME: if leading formatting token is separated into two, the latter will not be hidden/shown!
            // search for the tailing token
            if (span.tail && /formatting-/.test(span.tail.type)) {
              for (var j = i + 1; j < nodeCount; j++) {
                var begin_1 = map[j * 3],
                  end_1 = map[j * 3 + 1];
                var domNode_1 = map[j * 3 + 2];
                if (begin_1 == span.tail.start) {
                  // if (DEBUG) console.log("TAIL DOM CHANGED", domNode)
                  if (domNode_1.nodeType === Node.TEXT_NODE) {
                    // good. this token can be changed
                    var domParent = domNode_1.parentElement;
                    if (shallHideTokens ? addClass(domParent, hideClassName) : rmClass(domParent, hideClassName)) {
                      changed = true;
                    }
                  }
                }
                if (begin_1 >= span.tail.end) break;
              }
            }
          }
          // whoops, next time we can start searching since here
          // return the hint value
          if (begin >= span.begin) break;
        }
        return changed;
      }
      var spans = core_1.getLineSpanExtractor(cm).extract(lineNo);
      // console.log('spans: ', spans)
      var iNodeHint = 0;
      for (var iSpan = 0; iSpan < spans.length; iSpan++) {
        var span = spans[iSpan];

        if (this.tokenTypes.indexOf(span.type) === -1) {
          continue; // not-interested span type
        }
        /* TODO: Use AST, instead of crafted Position */
        var spanRange = [
          { line: lineNo, ch: span.begin },
          { line: lineNo, ch: span.end },
        ];
        /* TODO: If use AST, compute `spanBeginCharInCurrentLine` in another way */
        var spanBeginCharInCurrentLine = span.begin;
        while (iNodeHint < nodeCount && map[iNodeHint * 3 + 1] < spanBeginCharInCurrentLine) iNodeHint++;
        var shallHideTokens = true;
        for (var iLineRange = 0; iLineRange < rangesInLine.length; iLineRange++) {
          var userRange = rangesInLine[iLineRange];
          if (core_1.rangesIntersect(spanRange, userRange)) {
            shallHideTokens = false;
            break;
          }
        }
        // console.log('changeVis', span, shallHideTokens)
        if (changeVisibilityForSpan(span, shallHideTokens, iNodeHint)) {
          changed = true;
        }
      }
      // finally clean the cache (if needed) and report the result
      if (changed) {
        // clean CodeMirror measure cache
        delete lv.measure.heights;
        lv.measure.cache = {};
      }
      return changed;
    };
    HideToken.prototype.updateImmediately = function () {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      var _this = this;
      this.update.stop();
      var cm = this.cm;
      var selections = cm.listSelections();
      var caretAtLines = {};
      var activedLines = {};
      cm.state.refreshCaretLine = null;
      var lastActivedLines = this._rangesInLine;
      for (var _i = 0, selections_1 = selections; _i < selections_1.length; _i++) {
        var selection = selections_1[_i];
        var oRange = core_1.orderedRange(selection);
        var line0 = oRange[0].line,
          line1 = oRange[1].line;
        caretAtLines[line0] = caretAtLines[line1] = true;
        for (var line = line0; line <= line1; line++) {
          if (!activedLines[line]) activedLines[line] = [oRange];
          else activedLines[line].push(oRange);
        }
      }
      this._rangesInLine = activedLines;
      if (DEBUG) console.log("======= OP START " + Object.keys(activedLines));
      let procResult = false;
      cm.operation(function () {
        // adding "inactive" class
        for (var line in lastActivedLines) {
          if (DEBUG) console.log("line in lastActivedLines");
          if (activedLines[line]) {
            if (DEBUG) console.log("line in lastActivedLines: continue");
            continue; // line is still active. do nothing
          }
          if (DEBUG) console.log("procLine", ~~line);
          _this.procLine(~~line); // or, try adding "inactive" class to the <pre>s
        }
        var caretLineChanged = false;
        var caretLineNo;
        // process active lines
        if (DEBUG) console.log("active lines", activedLines);
        for (var line in activedLines) {
          var lineChanged = procResult ? procResult : _this.procLine(~~line);
          if (DEBUG) console.log("lineChanged && caretAtLines[line]", lineChanged, caretAtLines[line]);
          if (lineChanged && caretAtLines[line]) caretLineChanged = true;
          caretLineNo = caretAtLines[line];
          if (DEBUG) console.log("caret line", line, caretLineChanged);
        }
        // refresh cursor position if needed
        if (caretLineChanged) {
          var lineHandle = cm.getLineHandle(line);
          if (DEBUG) console.log("caretLineChanged", caretLineChanged, caretLineNo, lineHandle);
          if (lineHandle.height === 0) {
            // edited by nothingislost as this was causing an infinite refresh loop on folded sections
            if (DEBUG) console.log("not refreshing due to 0 height");
          } else {
            core_1.updateCursorDisplay(cm, true);
            // cm.refresh();
          }
        }
      });
      if (DEBUG) console.log("======= OP END ");
    };
    return HideToken;
  })();
  exports.HideToken = HideToken;
  //#endregion
  /** ADDON GETTER (Singleton Pattern): a editor can have only one HideToken instance */
  exports.getAddon = core_1.Addon.Getter("HideToken", HideToken, exports.defaultOption /** if has options */);
});
