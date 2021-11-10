// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// DESCRIPTION: Fold Embeds `![]`
//

import { Component, MarkdownRenderer, debounce } from "obsidian";

(function (mod) {
  mod(null, {}, CodeMirror, HyperMD.Fold, HyperMD.ReadLink);
})(function (require, exports, CodeMirror, fold_1) {
  "use strict";
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.EmbedFolder = void 0;
  var debug = false;
  var EmbedFolder = function (stream, token) {
    var cm = stream.cm;
    var embedRE = /(\bformatting-embed\b)/;
    var extRE = /\.(jpe?g|png|gif|svg|bmp)/;
    var urlRE = /(\bformatting-link-string\b)|(\bformatting-link\b)/; // matches the parentheses
    if (embedRE.test(token.type) && (token.string === "!" || token.string === "![[")) {
      var replacedWith;
      var lineNo = stream.lineNo;
      // find the begin and end of url part
      var since = { line: lineNo, ch: token.start };
      var url_begin = stream.findNext(urlRE, 0, since);
      if (!url_begin) {
        return null;
      }
      var url_end = stream.findNext(urlRE, url_begin.i_token + 1);
      var rawurl = cm.getRange({ line: lineNo, ch: url_begin.token.end }, { line: lineNo, ch: url_end.token.start });
      // bail if the embed is an image
      if (extRE.test(rawurl)) return null;
      var from = { line: lineNo, ch: token.start };
      var to = { line: lineNo, ch: url_end.token.end };
      var inlineMode = from.ch != 0 || to.ch < cm.getLine(to.line).length;
      var rngReq = stream.requestRange(from, to, from, from);
      var stubClassOmittable = "hmd-fold-embed-stub omittable";
      if (rngReq === fold_1.RequestRangeResult.OK) {
        var info = {
          editor: cm,
          lang: "embed",
          attributes: null,
          marker: null,
          lineWidget: null,
          el: null,
          break: undefined_function,
          changed: undefined_function,
        };
        var breakFn = function () {
          return fold_1.breakMark(cm, marker);
        };
        // Renderer
        var code = cm.getRange(from, to);
        var el = document.createElement("div");
        var ctx = new Component();
        ctx.sourcePath = cm.state.fileName;
        const previewMode = window.app.workspace.activeLeaf.view.previewMode,
          renderer = previewMode.renderer;
        try {
          // process the markdown
          MarkdownRenderer.renderMarkdown(code, el, cm.state.fileName, ctx);
          // kick off the preview mode process that renders the embed
          renderer.owner.postProcess({ el: el }, [], renderer.frontmatter);
          var targetChild;
          Array.from(renderer.owner._children).forEach(child => {
            if (child.containerEl === el.querySelector(".markdown-embed-content")) {
              targetChild = child;
            }
          });
        } catch (error) {
          el.innerText = "Failed to render embed: " + error;
        }
        function unload() {
          previewMode.removeChild(targetChild);
          renderer.owner._children.remove(targetChild);
          targetChild.unload();
          targetChild = null;
        }
        info.unload = unload;
        var type = "embed";
        var stub = document.createElement("span");
        stub.className = stubClass;
        stub.textContent = "<EMBED>";
        stub.addEventListener("click", breakFn, false);
        var marker, lineWidget;
        function updateWidgetByEl(targetEl) {
          const found = cm.hmd.Fold.folded.embed?.filter(
            el => el.replacedWith?.contains(targetEl) || el.associatedLineWidget?.node?.contains(targetEl)
          );
          if (found?.length) {
            found[0].changed();
            if (debug) console.log("embed widget size change");
          } else {
            if (debug) console.log("couldnt find widget");
          }
        }
        var updateWidgetByElDebounced = debounce(updateWidgetByEl, 250);
        function watchInlineSize(w, h, el) {
          try {
            if (debug) console.log("widget size change pre bounce");
            updateWidgetByElDebounced(el);
          } catch (err) {
            if (debug) console.log(el);
          }
        }

        const embedObserverCallback = entries => {
          for (let entry of entries) {
            if (entry.contentRect) {
              var width = entry.contentRect.width,
                height = entry.contentRect.height;
              try {
                watchInlineSize(width, height, entry.target);
              } catch (err) {
                if (debug) console.log(err);
              }
              entry = null;
            }
          }
        };

        if (!cm.embedObserver) {
          cm.embedObserver = new ResizeObserver(embedObserverCallback);
        }

        if (inlineMode) {
          stub.className = stubClassOmittable;

          var displayType, embedType;
          var span = document.createElement("span");
          if (code.contains("^")) {
            displayType = "inline";
            embedType = "block";
          } else if (code.contains("#")) {
            displayType = "flex";
            embedType = "header";
          } else {
            displayType = "flex";
            embedType = "page";
          }
          span.setAttribute("class", "rendered-inline-embed rendered-widget embed-type-" + embedType);
          span.setAttribute("style", `display: ${displayType};`);
          if (token.start < 7) {
            stub.addClass("flip-stub");
          }
          span.appendChild(stub);
          span.appendChild(el);
          var targetFile = rawurl.match(/^([^#]*)#/);
          if (targetFile && targetFile.length > 1 && targetFile[1]) {
            targetFile = targetFile[1];
          } else {
            targetFile = cm.state.fileName?.replace(/\.md$/, "");
          }
          span.setAttribute("aria-label", targetFile);
          el.onClickEvent = function (e, t) {
            this.addEventListener("click", e, t), this.addEventListener("auxclick", e, t);
          };
          el.onClickEvent(function (e) {
            if (e.composedPath()[0].className === "internal-link") return;
            (0 !== e.button && 1 !== e.button) ||
              (e.preventDefault(), window.app.workspace.openLinkText(rawurl, cm.state.fileName, false));
          });

          replacedWith = span;

          cm.embedObserver.observe(span);
          info.changed = function () {
            if (debug) console.log("info invoked widget change");
            try {
              marker.changed();
            } catch (err) {
              if (debug) console.log("widget update failure", err);
            }
          };
          info.break = function () {
            if (debug) console.log("info invoked widget break");
            fold_1.breakMark(cm, marker);
          };
          function onInlineMarkClear() {
            cm.embedObserver.unobserve(span);
            if (info.unload) {
              try {
                info.unload();
                if (debug) console.log("info invoked widget unload");
              } catch (err) {
                if (debug) console.log("failed info invoked widget unload: ", err);
              }
            }
            // var markers = cm.hmd.Fold.folded.embed;
            // var idx;
            // if (markers && (idx = markers.indexOf(marker)) !== -1) {
            //   if (debug) console.log("found inline marker in registry", markers, marker);
            //   markers.splice(idx, 1);
            // } else {
            //   if (debug) console.log("unable to find inline wiget in fold registry", markers, marker);
            // }
            marker.off("clear", onInlineMarkClear);
            stub.removeEventListener("click", breakFn);
            el.removeEventListener("click", breakFn);
            stub = null;
            el = null;
            marker.replacedWith = null;
            marker.widgetNode = null;
            marker = null;
            info = null;
          }

          setTimeout(function () {
            marker.on("clear", onInlineMarkClear);
          }, 100);
        } else {
          // Block Placement
          var $wrapper = document.createElement("div");
          $wrapper.className = contentClass;
          $wrapper.style.minHeight = "1em";
          $wrapper.appendChild(el);
          if (code.contains("^")) {
            displayType = "inline";
            embedType = "block";
          } else if (code.contains("#")) {
            displayType = "flex";
            embedType = "header";
          } else {
            displayType = "flex";
            embedType = "page";
          }
          $wrapper.setAttribute("class", "rendered-embed rendered-widget embed-type-" + embedType);
          if (!cm.getLineHandle(lineNo).widgets || cm.getLineHandle(lineNo).widgets?.length === 0) {
            lineWidget = cm.addLineWidget(to.line, $wrapper, {
              above: false,
              coverGutter: false,
              handleMouseEvents: false,
              className: "rendered-block-embed rendered-widget",
              noHScroll: false,
              showIfHidden: false,
            });
          } else if (cm.getLineHandle(lineNo).widgets?.length) {
            lineWidget = cm.getLineHandle(lineNo).widgets[0];
          } else {
            return;
          }

          var wrapperLine = stream.lineNo;
          cm.addLineClass(wrapperLine, "wrap", `rendered-${type}-wrapper`);

          cm.embedObserver.observe($wrapper);

          replacedWith = stub;

          info.changed = function () {
            if (debug) console.log("info invoked widget change: " + lineWidget.id);
            try {
              lineWidget.changed();
            } catch (err) {
              if (debug) console.log("widget update failure", err);
            }
          };
          info.break = function () {
            if (debug) console.log("info invoked widget break: " + lineWidget.id);
            cm.embedObserver.unobserve($wrapper);
            fold_1.breakMark(cm, marker);
          };
          stub.addEventListener("click", info.break, false);
          var redraw = info.redraw;
          if (redraw) {
            lineWidget.on("redraw", info.redraw);
          }
          function onCodeBlockClear() {
            cm.embedObserver.unobserve($wrapper);
            if (redraw) {
              lineWidget.off("redraw", info.redraw);
            }
            marker.off("clear", onCodeBlockClear);
            if (debug) console.log("clear invoked on widget: " + lineWidget.id);
            stub.removeEventListener("click", info.break);
            if (info.unload) {
              try {
                info.unload();
                if (debug) console.log("info invoked widget unload: " + lineWidget.id);
              } catch (err) {
                if (debug) console.log("failed info invoked widget unload: ", err);
              }
            }
            var markers = cm.hmd.Fold.folded.embed;
            var idx;
            if (markers && (idx = markers.indexOf(marker)) !== -1) {
              if (debug) console.log("found block marker in registry", markers, marker);
              markers.splice(idx, 1);
            } else {
              if (debug) console.log("unable to find block wiget in fold registry", marker, markers);
            }
            cm.removeLineClass(wrapperLine, "wrap", `rendered-${type}-wrapper`);
            cm.removeLineClass(wrapperLine, "wrap", "rendered-code-block-wrapper");
            lineWidget.clear();
            if (debug) console.log("info invoked widget clear: " + lineWidget.id);
            lineWidget = null;
            marker.replacedWith = null;
            marker.widgetNode = null;
            marker = null;
            info.unload = null;
            info = null;
          }
          setTimeout(function () {
            marker.on("clear", onCodeBlockClear);
          }, 0);
        }
        marker = cm.markText(from, to, {
          replacedWith: replacedWith,
          inclusiveLeft: false,
          inclusiveRight: false,
        });
        marker.associatedLineWidget = lineWidget;
        setTimeout(() => {
          marker.changed();
        }, 0);
        return marker;
      } else {
        if (debug && window["ECHOMD_DEBUG"]) {
          console.log("[embed]FAILED TO REQUEST RANGE: ", rngReq);
        }
      }
    }
    return null;
  };
  var contentClass = "hmd-fold-embed-content hmd-fold-embed"; // + renderer_type
  var stubClass = "hmd-fold-embed-stub hmd-fold-embed"; // + renderer_type
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  var undefined_function = function () {};
  exports.EmbedFolder = EmbedFolder;
  fold_1.registerFolder("embed", exports.EmbedFolder, true);
});
