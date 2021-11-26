// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// DESCRIPTION: Fold and render embedded HTML snippets

(function (mod) {
  //[HyperMD] UMD patched!
  /*plain env*/ mod(null, (HyperMD.FoldHTML = HyperMD.FoldHTML || {}), CodeMirror, HyperMD, HyperMD.Fold);
})(function (require, exports, CodeMirror, core_1, fold_1) {
  "use strict";
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.getAddon =
    exports.FoldHTML =
    exports.suggestedOption =
    exports.defaultOption =
    exports.HTMLFolder =
    exports.defaultRenderer =
    exports.defaultChecker =
      void 0;

  const purifySettings = {
    ALLOW_UNKNOWN_PROTOCOLS: true,
    IN_PLACE: true,
    // RETURN_DOM_FRAGMENT: true,
    // RETURN_DOM_IMPORT: true,
    FORBID_TAGS: ["style"],
    ADD_TAGS: ["iframe"],
    ADD_ATTR: ["frameborder", "allowfullscreen", "allow", "aria-label-position"],
  };
  // export type CheckerFunc = (html: string, pos: Position, cm: cm_t) => boolean;
  var defaultChecker = function (html) {
    // TODO: Remove this since we're now using DOMPurify?
    if (/^<(?:br)/i.test(html)) {
      return false; // check first element...
    }
    if (/<(?:script|style|link|meta|object|embed)/i.test(html)) {
      // TODO: dyamically add/remove iframe block
      return false; // don't allow some tags
    }
    if (/\son\w+\s*=/i.test(html)) {
      return false; // don't allow `onclick=` etc.
    }
    if (/(src|background|href)\s*=\s*["']?javascript:/i.test(html)) {
      return false; // don't allow `src="javascript:` etc.
    }
    return true;
  };
  exports.defaultChecker = defaultChecker;
  /**
   * Create HTMLElement from HTML string and do special process with HyperMD.ReadLink
   */
  var defaultRenderer = function (html, pos, cm) {
    var tagBegin = /^<(\w+)\s*/.exec(html);
    if (!tagBegin) return null;
    var tagName = tagBegin[1];
    var ans = document.createElement(tagName);
    var propRE = /([\w\:\-]+)(?:\s*=\s*((['"]).*?\3|\S+))?\s*/g;
    var propLastIndex = (propRE.lastIndex = tagBegin[0].length);
    var tmp;
    while ((tmp = propRE.exec(html))) {
      if (tmp.index > propLastIndex) break; // emmm
      var propName = tmp[1];
      var propValue = tmp[2]; // could be wrapped by " or '
      if (propValue && /^['"]/.test(propValue)) propValue = propValue.slice(1, -1);
      ans.setAttribute(propName, propValue);
      propLastIndex = propRE.lastIndex;
    }
    if ("innerHTML" in ans) {
      // node may contain innerHTML
      var startCh = html.indexOf(">", propLastIndex) + 1;
      var endCh = html.length;
      if ((tmp = new RegExp("</" + tagName + "\\s*>\\s*$", "i").exec(html))) {
        endCh = tmp.index;
      }
      var innerHTML = html.slice(startCh, endCh);
      if (innerHTML) {
        ans.innerHTML = innerHTML;
      }
      window.DOMPurify.sanitize(ans, purifySettings);
      // ans.replaceWith(cleanHTML);
      // resolve relative URLs and change default behavoirs
      core_1.visitElements([ans], function (el) {
        var tagName = el.tagName.toLowerCase();
        if (tagName === "a") {
          // for links, if target not set, add target="_blank"
          if (!el.getAttribute("target")) el.setAttribute("target", "_blank");
        }
        // Then, resovle relative URLs
        var urlAttrs = {
          a: ["href"],
          img: ["src"],
          iframe: ["src"],
        }[tagName];
        if (urlAttrs) {
          for (var i = 0; i < urlAttrs.length; i++) {
            var _url, _resolvedUrl;
            var attr = urlAttrs[i];
            var attrValue = el.getAttribute(attr);
            _resolvedUrl = window.app.metadataCache.getFirstLinkpathDest(decodeURI(attrValue), "");
            if (_resolvedUrl) {
              _url = window.app.vault.getResourcePath(_resolvedUrl);
            } else {
              _url = "";
            }
            if (_url) {
              el.setAttribute(attr, decodeURI(attrValue));
              el.addClass("internal-link");
            }
          }
        }
      });
    }
    return ans;
  };
  exports.defaultRenderer = defaultRenderer;
  /********************************************************************************** */
  var stubClass = "hmd-fold-html-stub";
  var stubClassOmittable = "hmd-fold-html-stub omittable";
  /********************************************************************************** */
  //#region Folder
  /**
   * Detect if a token is a beginning of HTML, and fold it!
   *
   * @see FolderFunc in ./fold.ts
   */
  var HTMLFolder = function (stream, token) {
    if (!token.type || !/ hmd-html-begin/.test(token.type)) return null;
    var endInfo = stream.findNext(/ hmd-html-\w+/, true); // find next html start/end token
    if (!endInfo || !/ hmd-html-end/.test(endInfo.token.type) || / hmd-html-unclosed/.test(endInfo.token.type))
      return null;
    var cm = stream.cm;
    var from = { line: stream.lineNo, ch: token.start };
    var to = { line: endInfo.lineNo, ch: endInfo.token.end };
    var inlineMode = from.ch != 0 || to.ch < cm.getLine(to.line).length;

    var addon = exports.getAddon(cm);
    var html = cm.getRange(from, to);

    var reqAns = stream.requestRange(from, to);
    if (reqAns !== fold_1.RequestRangeResult.OK) return null;

    // now we are ready to fold and render!
    var marker = addon.renderAndInsert(html, from, to, inlineMode);
    return marker;
  };
  exports.HTMLFolder = HTMLFolder;
  //#endregion
  fold_1.registerFolder("html", exports.HTMLFolder, false);
  exports.defaultOption = {
    checker: exports.defaultChecker,
    renderer: exports.defaultRenderer,
    stubText: "<HTML>",
    isolatedTagName: /^(?:div|pre|details|form|mark|table|iframe|ul|ol|input|textarea|p|summary|a)$/i,
  };
  exports.suggestedOption = {};
  core_1.suggestedEditorConfig.hmdFoldHTML = exports.suggestedOption;
  CodeMirror.defineOption("hmdFoldHTML", exports.defaultOption, function (cm, newVal) {
    ///// convert newVal's type to `Partial<Options>`, if it is not.
    if (!newVal) {
      newVal = {};
    } else if (typeof newVal == "function") {
      newVal = { checker: newVal };
    } else if (typeof newVal != "object") {
      console.warn("[HyperMD][FoldHTML] incorrect option value type");
      newVal = {};
    }
    ///// apply config and write new values into cm
    var inst = exports.getAddon(cm);
    for (var k in exports.defaultOption) {
      inst[k] = k in newVal ? newVal[k] : exports.defaultOption[k];
    }
    ///// Type Check
    if (inst.isolatedTagName && !(inst.isolatedTagName instanceof RegExp)) {
      if (window["ECHOMD_DEBUG"]) {
        console.error("[HyperMD][FoldHTML] option isolatedTagName only accepts RegExp");
      }
      inst.isolatedTagName = exports.defaultOption.isolatedTagName;
    }
  });
  //#endregion
  /********************************************************************************** */
  //#region Addon Class
  var FoldHTML = /** @class */ (function () {
    function FoldHTML(cm) {
      this.cm = cm;
      // options will be initialized to defaultOption when constructor is finished
    }
    /**
     * Render HTML, insert into editor and return the marker
     */
    FoldHTML.prototype.renderAndInsert = function (html, from, to, inlineMode) {
      var cm = this.cm;
      var stub = this.makeStub();
      var el = this.renderer(html, from, cm);
      var breakFn = function () {
        return fold_1.breakMark(cm, marker);
      };
      if (!el) return null;
      stub.addEventListener("click", breakFn, false);
      if (!el.tagName.match(this.isolatedTagName || /^$/)) el.addEventListener("click", breakFn, false);
      var replacedWith;
      var marker;
      var isBlock = false;
      function updateWidgetByEl(targetEl) {
        const found = cm.hmd.Fold.folded.html.filter(
          el => el.replacedWith?.contains(targetEl) || el.associatedLineWidget?.node?.contains(targetEl)
        );
        if (found.length) {
          found[0].changed();
          // console.log("html widget size change");
        }
      }
      if (inlineMode) {
        /** put HTML inline */
        stub.className = stubClassOmittable;

        var span = document.createElement("span");
        span.setAttribute("class", "hmd-fold-html rendered-widget");
        span.setAttribute("style", "display: inline-flex");
        span.appendChild(stub);
        span.appendChild(el);

        replacedWith = span;
        /** If element size changed, we notify CodeMirror */

        function watchInlineSize(w, h, el) {
          try {
            updateWidgetByEl(el);
          } catch (err) {}
        }

        const inlineObserverCallback = entries => {
          for (let entry of entries) {
            if (entry.contentRect) {
              var width = entry.contentRect.width,
                height = entry.contentRect.height;
              try {
                watchInlineSize(width, height, entry.target);
              } catch {}
              entry = null;
            }
          }
        };
        if (!cm.inlineHTMLObserver) {
          cm.inlineHTMLObserver = new ResizeObserver(inlineObserverCallback);
        }

        cm.inlineHTMLObserver.observe(el);

        function onInlineMarkClear() {
          cm.inlineHTMLObserver.unobserve(el);
          marker.off("clear", onInlineMarkClear);
          stub.removeEventListener("click", breakFn);
          el.removeEventListener("click", breakFn);
          stub = null;
          el = null;
          marker.replacedWith = null;
          marker.widgetNode = null;
          marker = null;
        }

        setTimeout(function () {
          marker.on("clear", onInlineMarkClear);
        }, 0);
      } else {
        isBlock = true;
        stub.className = stubClass;
        /** use lineWidget to insert element */
        replacedWith = stub;
        // this causes any text selection to immediately stop if the cursor is coming out of a block html element
        // without this, the line widget will get duplicated on cursor selection. see issue #51
        if (cm.state.selectingText) cm.state.selectingText();
        var lineWidget_1
        if (!cm.getLineHandle(from.line).widgets || cm.getLineHandle(from.line).widgets?.length === 0) {
          lineWidget_1 = cm.addLineWidget(to.line, el, {
            above: false,
            coverGutter: false,
            className: "rendered-html rendered-html-block rendered-widget",
            noHScroll: false,
            showIfHidden: false,
          });
        } else if (cm.getLineHandle(from.line).widgets?.length) {
          lineWidget_1 = cm.getLineHandle(from.line).widgets[0];
        } else {
          return;
        }
        var wrapperLine = from.line;
        cm.addLineClass(wrapperLine, "wrap", "rendered-html-block-wrapper");

        const blockHTMLObserverCallback = entries => {
          for (let entry of entries) {
            if (entry.contentRect) {
              try {
                updateWidgetByEl(entry.target);
              } catch {}
            }
          }
        };
        if (!cm.blockHTMLObserver) {
          cm.blockHTMLObserver = new ResizeObserver(blockHTMLObserverCallback);
        }
        cm.blockHTMLObserver.observe(el);
        // Marker is not created yet. Bind events later
        function onBlockClear() {
          marker.off("clear", onBlockClear);
          cm.blockHTMLObserver.unobserve(el);
          stub.removeEventListener("click", breakFn);
          el.removeEventListener("click", breakFn);
          stub = null;
          el = null;
          lineWidget_1.clear();
          lineWidget_1 = null;
          cm.removeLineClass(wrapperLine, "wrap", "rendered-html-block-wrapper");
          marker.replacedWith = null;
          marker.widgetNode = null;
          marker.associatedLineWidget = null;
          marker = null;
        }
        setTimeout(function () {
          marker.on("clear", onBlockClear);
        }, 0);
      }
      marker = cm.markText(from, to, {
        replacedWith: replacedWith,
        atomic: false,
        inclusiveLeft: isBlock,
        inclusiveRight: isBlock,
      });
      marker.associatedLineWidget = lineWidget_1;

      return marker;
    };
    FoldHTML.prototype.makeStub = function () {
      var ans = document.createElement("span");
      ans.setAttribute("class", stubClass);
      ans.textContent = this.stubText || "<HTML>";
      return ans;
    };
    return FoldHTML;
  })();
  exports.FoldHTML = FoldHTML;
  //#endregion
  /** ADDON GETTER (Singleton Pattern): a editor can have only one FoldHTML instance */
  exports.getAddon = core_1.Addon.Getter("FoldHTML", FoldHTML, exports.defaultOption /** if has options */);
});
