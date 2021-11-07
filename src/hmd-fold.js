// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// DESCRIPTION: Turn Markdown markers into real images, link icons etc. Support custom folders.
//
// You may set `hmdFold.customFolders` option to fold more, where `customFolders` is Array<FolderFunc>
//
//

import { debounce } from "obsidian";

var ___extends = (function () {
  var extendStatics = function (d, b) {
    extendStatics =
      Object.setPrototypeOf ||
      ({ __proto__: [] } instanceof Array &&
        function (d, b) {
          d.__proto__ = b;
        }) ||
      function (d, b) {
        for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p];
      };
    return extendStatics(d, b);
  };
  return function (d, b) {
    extendStatics(d, b);
    function __() {
      this.constructor = d;
    }
    d.prototype = b === null ? Object.create(b) : ((__.prototype = b.prototype), new __());
  };
})();

(function (mod) {
  //[HyperMD] UMD patched!
  /*plain env*/ mod(null, (HyperMD.Fold = HyperMD.Fold || {}), CodeMirror, HyperMD, HyperMD.AttributesAddon);
})(function (require, exports, CodeMirror, core_1, index_1) {
  "use strict";
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.getAddon =
    exports.Fold =
    exports.parseAttributes =
    exports.suggestedOption =
    exports.defaultOption =
    exports.breakMark =
    exports.registerFolder =
    exports.folderRegistry =
    exports.RequestRangeResult =
      void 0;

  var DEBUG = false;
  var FlagArray = typeof Uint8Array === "undefined" ? Array : Uint8Array;
  var RequestRangeResult;
  (function (RequestRangeResult) {
    // Use string values because in TypeScript, string enum members do not get a reverse mapping generated at all.
    // Otherwise the generated code looks ugly
    RequestRangeResult["OK"] = "ok";
    RequestRangeResult["CURSOR_INSIDE"] = "ci";
    RequestRangeResult["HAS_MARKERS"] = "hm";
  })((RequestRangeResult = exports.RequestRangeResult || (exports.RequestRangeResult = {})));
  //#endregion
  /********************************************************************************** */
  //#region FolderFunc Registry
  exports.folderRegistry = {};
  /**
   * Add a Folder to the System Folder Registry
   *
   * @param name eg. "math"  "html"  "image"  "link"
   * @param folder
   * @param suggested enable this folder in suggestedEditorConfig
   * @param force if a folder with same name is already exists, overwrite it. (dangerous)
   */
  function registerFolder(name, folder, suggested, force) {
    var registry = exports.folderRegistry;
    if (name in registry && !force) throw new Error("Folder " + name + " already registered");
    exports.defaultOption[name] = false;
    exports.suggestedOption[name] = !!suggested;
    registry[name] = folder;
  }
  exports.registerFolder = registerFolder;
  //#endregion
  /********************************************************************************** */
  //#region Utils
  /** break a TextMarker, move cursor to where marker is */
  function breakMark(cm, marker, chOffset) {
    // TODO: update this to support making a selection rather than placing the cursor
    cm.operation(function () {
      var fromPos = marker.find().from;
      fromPos = { line: fromPos.line, ch: fromPos.ch + ~~chOffset };
      var toPos = marker.find().to;
      toPos = { line: toPos.line, ch: toPos.ch + ~~chOffset };
      // need to clear before setting the cursor since some markers don't allow the
      // cursor to be placed next to them
      marker.clear();
      cm.setCursor(fromPos);
      // cm.setSelection(fromPos, toPos);
      cm.focus();
    });
  }
  exports.breakMark = breakMark;
  exports.defaultOption = {
    /* will be populated by registerFolder() */
  };
  exports.suggestedOption = {
    /* will be populated by registerFolder() */
  };
  core_1.suggestedEditorConfig.hmdFold = exports.suggestedOption;
  core_1.normalVisualConfig.hmdFold = false;
  CodeMirror.defineOption("hmdFold", exports.defaultOption, function (cm, newVal) {
    ///// convert newVal's type to `Record<string, boolean>`, if it is not.
    var inst = exports.getAddon(cm);
    if (!newVal || typeof newVal === "boolean") {
      newVal = newVal ? exports.suggestedOption : exports.defaultOption;
    }
    if ("customFolders" in newVal) {
      delete newVal["customFolders"];
    }
    ///// apply config
    for (var type in exports.folderRegistry) {
      inst.setStatus(cm, type, newVal[type]);
    }
    // then, folding task will be queued by setStatus()
  });
  Object.defineProperty(exports, "parseAttributes", {
    enumerable: true,
    get: function () {
      return index_1.parseAttributes;
    },
  });
  //#endregion
  /********************************************************************************** */
  //#region Addon Class
  var Fold = /** @class */ (function (_super) {
    ___extends(Fold, _super);
    function Fold(cm) {
      var _this = _super.call(this, cm) || this;
      _this.cm = cm;
      /**
       * stores Folder status for current editor
       * @private To enable/disable folders, use `setStatus()`
       */
      _this._enabled = {};
      /** Folder's output goes here */
      _this.folded = {};
      /// END OF APIS THAT EXPOSED TO FolderFunc
      ///////////////////////////////////////////////////////////////////////////////////////////
      /**
       * Fold everything! (This is a debounced, and `this`-binded version)
       */
      _this.startFold = core_1.debounce(_this.startFoldImmediately.bind(_this), 200);
      /** stores every affected lineNo */
      _this._quickFoldHint = [];
      this.registerEvents = function (enable) {
        if (enable) {
          cm.on("changes", _this.onChange);
          cm.on("viewportChange", _this.onViewportChange);
          cm.on("cursorActivity", _this.onCursorActivity);
          cm.on("gutterClick", _this.onGutterClick);
        } else {
          cm.off("changes", _this.onChange);
          cm.off("viewportChange", _this.onViewportChange);
          cm.off("cursorActivity", _this.onCursorActivity);
          cm.off("gutterClick", _this.onGutterClick);
        }
      };
      this.onViewportChange = function (cm, from, to) {
        _this.startFold(from, to);
      };
      this.onGutterClick = function (cm, line, gutter, clickEvent) {
        // check for widgets to render when lists or headers are expanded
        if (
          gutter === "CodeMirror-foldgutter" &&
          clickEvent.composedPath()[0]?.hasClass("CodeMirror-foldgutter-folded")
        ) {
          _this.startFoldImmediately(line, cm.getViewport().to + 1);
        }
      };
      this.checkForPreview = debounce(
        function () {
          document.querySelector("#math-preview")?.addClass("float-win-hidden");
        },
        500,
        true
      );
      this.onChange = function (cm, changes) {
        var changedMarkers = [];
        for (var _i = 0, changes_1 = changes; _i < changes_1.length; _i++) {
          var change = changes_1[_i];
          if (change.removed && change.removed.filter(text => text.includes("$")).length) {
            _this.checkForPreview();
          }
          var markers = cm.findMarks(change.from, change.to);
          for (var _a = 0, markers_1 = markers; _a < markers_1.length; _a++) {
            var marker = markers_1[_a];
            if (marker._hmd_fold_type) changedMarkers.push(marker);
          }
        }
        for (var _b = 0, changedMarkers_1 = changedMarkers; _b < changedMarkers_1.length; _b++) {
          var m = changedMarkers_1[_b];
          var line = cm.getLine(changes[0].from.line);
          if (
            line[changes[0].from.ch - 1] === "`" &&
            line[changes[0].from.ch] === "@" &&
            line.slice(changes[0].from.ch).length > 1
          ) {
            // This is widget, so don't clear
          } else {
            m.clear(); // TODO: add "changed" handler for FolderFunc
          }
        }
        var fromLine = 0,
          toLine = 0;
        var _changes = changes.map(change => {
          return { fromLine: change.from.line, toLine: change.to.line };
        });
        _changes.forEach(change => {
          fromLine = change.fromLine > fromLine ? change.fromLine : fromLine;
          toLine = change.toLine > toLine ? change.toLine : toLine;
        });
        _this.startFold(fromLine, toLine);
      };
      this.onCursorActivity = function (cm) {
        if (DEBUG) console.time("CA");
        var lineStuff = {};
        function addPosition(pos) {
          var lineNo = pos.line;
          if (!(lineNo in lineStuff)) {
            var lh = cm.getLineHandle(pos.line);
            var ms = lh.markedSpans || [];
            var markers = [];
            for (var i = 0; i < ms.length; i++) {
              var marker = ms[i].marker;
              if ("_hmd_crange" in marker) {
                var from = marker._hmd_crange[0].line < lineNo ? 0 : marker._hmd_crange[0].ch;
                var to = marker._hmd_crange[1].line > lineNo ? lh.text.length : marker._hmd_crange[1].ch;
                markers.push([marker, from, to]);
              }
            }
            lineStuff[lineNo] = {
              lineNo: lineNo,
              ch: [pos.ch],
              markers: markers,
            };
          } else {
            lineStuff[lineNo].ch.push(pos.ch);
          }
        }
        cm.listSelections().forEach(function (selection) {
          addPosition(selection.anchor);
          addPosition(selection.head);
        });
        for (var tmp_id in lineStuff) {
          var lineData = lineStuff[tmp_id];
          if (!lineData.markers.length) continue;
          for (var i = 0; i < lineData.ch.length; i++) {
            var ch = lineData.ch[i];
            for (var j = 0; j < lineData.markers.length; j++) {
              var _a = lineData.markers[j],
                marker = _a[0],
                from = _a[1],
                to = _a[2];
              if (from <= ch && ch <= to) {
                marker.clear();
                lineData.markers.splice(j, 1);
                j--;
              }
            }
          }
        }
        if (DEBUG) console.timeEnd("CA");
        _this.startQuickFold();
      };
      return _this;
    }
    /** enable/disable one kind of folder, in current editor */
    Fold.prototype.setStatus = function (cm, type, enabled) {
      // this logic will disable hmdFold completely if no folders are found in the registry
      var prevStatus;
      for (var _type in this._enabled) {
        if (this._enabled[_type]) {
          prevStatus = true;
          break;
        } else {
          prevStatus = false;
        }
      }
      if (!(type in exports.folderRegistry)) return;
      if (!this._enabled[type] !== !enabled) {
        this._enabled[type] = !!enabled;
        if (enabled) {
          this.startFold();
        } else this.clear(type);
      }
      var curStatus;
      for (var _type in this._enabled) {
        if (this._enabled[_type]) {
          curStatus = true;
          break;
        } else {
          curStatus = false;
        }
      }
      if (prevStatus && !curStatus) {
        this.registerEvents(false);
      } else if (!prevStatus && curStatus) {
        this.registerEvents(true);
      }
    };
    ///////////////////////////////////////////////////////////////////////////////////////////
    /// BEGIN OF APIS THAT EXPOSED TO FolderFunc
    /// @see FoldStream
    /**
     * Check if a range is foldable and update _quickFoldHint
     *
     * NOTE: this function is always called after `_quickFoldHint` reset by `startFoldImmediately`
     */
    Fold.prototype.requestRange = function (from, to, cfrom, cto) {
      if (!cto) cto = to;
      if (!cfrom) cfrom = from;
      var cm = this.cm;
      var markers = cm.findMarks(from, to);
      // nil: filter out any text selection markers so that we don't bug out the entire fold logic, ugh
      markers = markers.filter(marker => marker.className != "CodeMirror-selectedtext");
      if (DEBUG) console.log(`checking for marks from ${from.line}.${from.ch} -> ${to.line}.${to.ch}`);
      if (markers.length !== 0) {
        if (DEBUG) console.log("markers found, abort requestRange");
        return RequestRangeResult.HAS_MARKERS;
      }
      this._quickFoldHint.push(from.line);
      if (DEBUG) console.log("range quick pushed from line: " + from.line + "| " + this._quickFoldHint);
      // store "crange" for the coming marker
      this._lastCRange = [cfrom, cto];
      var selections = cm.listSelections();
      for (var i = 0; i < selections.length; i++) {
        var oselection = core_1.orderedRange(selections[i]);
        // note that "crange" can be bigger or smaller than marked-text range.
        if (core_1.rangesIntersect(this._lastCRange, oselection) || core_1.rangesIntersect([from, to], oselection)) {
          return RequestRangeResult.CURSOR_INSIDE;
        }
      }
      this._quickFoldHint.push(cfrom.line);
      if (DEBUG) console.log("range quick pushed cfrom line: " + cfrom.line + " => " + this._quickFoldHint);
      return RequestRangeResult.OK;
    };
    /**
     * Fold everything!
     *
     * @param toLine last line to fold. Inclusive
     */
    Fold.prototype.startFoldImmediately = function (fromLine, toLine) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      var _this = this;
      var cm = this.cm;
      var viewPort = cm.getViewport();
      // nil: if no from/to is passed, only scan the visible viewport, rather than the entire file
      fromLine = fromLine >= 0 ? fromLine : viewPort.from; // cm.firstLine();
      toLine = (toLine >= 0 ? toLine : viewPort.to) + 1; // cm.lastLine()) + 1;
      if (DEBUG) console.log("fold immediate func reset quickFold");
      this._quickFoldHint = [];
      this.setPos(fromLine, 0, true);
      if (DEBUG) console.log("start fold! ", fromLine, toLine);
      cm.operation(function () {
        return cm.eachLine(fromLine, toLine, function (line) {
          var lineNo = line.lineNo();
          if (lineNo < _this.lineNo) return;
          // skip current line...
          else if (lineNo > _this.lineNo) _this.setPos(lineNo, 0); // hmmm... maybe last one is empty line
          // all the not-foldable chars are marked
          var charMarked = new FlagArray(line.text.length);
          {
            // populate charMarked array.
            // @see CodeMirror's findMarksAt
            var lineMarkers = line.markedSpans;
            if (lineMarkers) {
              // nil: filter out any text selection markers so that we don't bug out the entire fold logic, ugh
              lineMarkers = lineMarkers.filter(markedSpan => markedSpan.marker.className !== "CodeMirror-selectedtext");
              for (var i = 0; i < lineMarkers.length; ++i) {
                var span = lineMarkers[i];
                var spanFrom = span.from == null ? 0 : span.from;
                var spanTo = span.to == null ? charMarked.length : span.to;
                for (var j = spanFrom; j < spanTo; j++) charMarked[j] = 1;
              }
            }
          }
          var tokens = _this.lineTokens;
          while (_this.i_token < tokens.length) {
            var token = tokens[_this.i_token];
            var type;
            var marker = null;
            var tokenFoldable = true;
            {
              for (var i = token.start; i < token.end; i++) {
                if (charMarked[i]) {
                  tokenFoldable = false;
                  break;
                }
              }
            }
            if (tokenFoldable) {
              // try all enabled folders in registry
              for (type in exports.folderRegistry) {
                if (!_this._enabled[type]) continue;
                if ((marker = exports.folderRegistry[type](_this, token))) break;
              }
            }
            if (!marker) {
              // this token not folded. check next
              _this.i_token++;
            } else {
              var _a = marker.find(),
                from = _a.from,
                to = _a.to;
              (_this.folded[type] || (_this.folded[type] = [])).push(marker);
              marker._hmd_fold_type = type;
              marker._hmd_crange = _this._lastCRange;
              marker.on("clear", function (from, to) {
                var markers = _this.folded[type];
                var idx;
                if (markers && (idx = markers.indexOf(marker)) !== -1) markers.splice(idx, 1);
                _this._quickFoldHint.push(from.line);
                if (DEBUG) console.log("on clear quick pushed from line: " + from.line + "| " + _this._quickFoldHint);
              });
              if (DEBUG) console.log("[FOLD] New marker ", type, from, to, marker);
              // now let's update the pointer position
              if (from.line > lineNo || from.ch > token.start) {
                // there are some not-marked chars after current token, before the new marker
                // first, advance the pointer
                _this.i_token++;
                // then mark the hidden chars as "marked"
                var fromCh = from.line === lineNo ? from.ch : charMarked.length;
                var toCh = to.line === lineNo ? to.ch : charMarked.length;
                for (var i = fromCh; i < toCh; i++) charMarked[i] = 1;
              } else {
                // classical situation
                // new marker starts since current token
                if (to.line !== lineNo) {
                  _this.setPos(to.line, to.ch);
                  return; // nothing left in this line
                } else {
                  _this.setPos(to.ch); // i_token will be updated by this.setPos()
                }
              }
            }
          }
        });
      });
    };
    /**
     * Start a quick fold: only process recent `requestRange`-failed ranges
     */
    Fold.prototype.startQuickFold = function () {
      var hint = this._quickFoldHint;
      if (hint.length === 0) return;
      var from = hint[0],
        to = from;
      for (var _i = 0, hint_1 = hint; _i < hint_1.length; _i++) {
        var lineNo = hint_1[_i];
        if (from > lineNo) from = lineNo;
        if (to < lineNo) to = lineNo;
      }
      this.startFold.stop();
      this.startFoldImmediately(from, to);
    };
    /**
     * Clear one type of folded TextMarkers
     *
     * @param type builtin folder type ("image", "link" etc) or custom fold type
     */
    Fold.prototype.clear = function (type) {
      this.startFold.stop();
      var folded = this.folded[type];
      if (!folded || !folded.length) return;
      var marker;
      while ((marker = folded.pop())) marker.clear();
    };
    /**
     * Clear all folding result
     */
    Fold.prototype.clearAll = function () {
      this.startFold.stop();
      for (var type in this.folded) {
        var folded = this.folded[type];
        var marker;
        while ((marker = folded.pop())) marker.clear();
      }
    };
    return Fold;
  })(core_1.TokenSeeker);
  exports.Fold = Fold;
  //#endregion
  /** ADDON GETTER (Singleton Pattern): a editor can have only one Fold instance */
  exports.getAddon = core_1.Addon.Getter("Fold", Fold);
});
