// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// DESCRIPTION: Fold Image Markers `![](xxx)`
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
  mod(null, {}, CodeMirror, HyperMD.Fold, HyperMD.ReadLink);
})(function (require, exports, CodeMirror, fold_1) {
  "use strict";
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.ImageFolder = void 0;
  CodeMirror = __importStar(CodeMirror);
  var DEBUG = false;
  var ImageFolder = function (stream, token) {
    var cm = stream.cm;
    var imgRE = /(\bimage-marker\b)|(\bformatting-embed\b)/;
    var extRE = /\.(jpe?g|png|gif|svg|bmp)/;
    var urlRE = /(\bformatting-link-string\b)|(\bformatting-link\b)/; // matches the parentheses
    if (imgRE.test(token.type) && (token.string === "!" || token.string === "![[")) {
      var lineNo = stream.lineNo;
      // find the begin and end of url part
      var url_begin = stream.findNext(urlRE, 0);
      if (!url_begin) {
        return null;
      }
      // var url_end = stream.findNext(urlRE, url_begin.i_token + 1);
      var url_end = stream.findNext(urlRE, url_begin.i_token + 1);
      var from = { line: lineNo, ch: token.start };
      var to = { line: lineNo, ch: url_end.token.end };
      var rngReq = stream.requestRange(from, to, from, from);
      if (rngReq === fold_1.RequestRangeResult.OK) {
        var url = void 0;
        var alt = void 0;
        var title = void 0;
        {
          // extract the URL
          var rawurl = cm.getRange(
            // get the URL or footnote name in the parentheses
            { line: lineNo, ch: url_begin.token.end },
            { line: lineNo, ch: url_end.token.start }
          );
          if (!extRE.test(rawurl)) return null;
          if (url_end.token.string === "]") {
            var tmp = cm.hmdReadLink(rawurl, lineNo);
            if (!tmp) return null; // Yup! bad URL?!
            rawurl = tmp.content;
          }
          var split = splitLink(rawurl);
          url = split.url;
          title = split.title;
        }
        {
          // extract the alt
          alt = cm.getRange({ line: lineNo, ch: from.ch + 2 }, { line: lineNo, ch: url_begin.token.start - 1 });
        }
        var img = document.createElement("img");
        var marker = cm.markText(from, to, {
          collapsed: true,
          clearOnEnter: true,
          replacedWith: img,
          // inclusiveLeft: true,
          // inclusiveRight: true,
        });
        img.addEventListener(
          "load",
          function () {
            img.classList.remove("hmd-image-loading");
            marker.changed();
          },
          false
        );
        img.addEventListener(
          "error",
          function () {
            img.classList.remove("hmd-image-loading");
            img.classList.add("hmd-image-error");
            marker.changed();
          },
          false
        );
        img.className = "hmd-image hmd-image-loading";
        // Disable unsafe http URL
        if (url.match(/^http:\/\//)) {
          url = "";
          title = "";
          alt = "Unsafe http image is not allowed";
        }
        // Disable the break
        img.addEventListener("click", () => breakMark(cm, marker));
        img.addEventListener(
          "click",
          function () {
            CodeMirror.signal(cm, "imageClicked", {
              editor: cm,
              marker: marker,
              breakMark: fold_1.breakMark,
              element: img,
            });
          },
          false
        );
        img.alt = alt;
        img.title = title;
        var _resolvedUrl = window.app.metadataCache.getFirstLinkpathDest(decodeURIComponent(rawurl), "");
        let _url = window.app.vault.getResourcePath(_resolvedUrl);
        img.setAttribute("data-src", _url);
        img.setAttribute("src", _url);
        CodeMirror.signal(cm, "imageReadyToLoad", {
          editor: cm,
          marker: marker,
          breakMark: fold_1.breakMark,
          element: img,
        });
        return marker;
      } else {
        if (DEBUG && window["ECHOMD_DEBUG"]) {
          console.log("[image]FAILED TO REQUEST RANGE: ", rngReq);
        }
      }
    }
    return null;
  };
  function splitLink(content) {
    // remove title part (if exists)
    content = content.trim();
    var url = content,
      title = "";
    var mat = content.match(/^(\S+)\s+("(?:[^"\\]+|\\.)+"|[^"\s].*)/);
    if (mat) {
      url = mat[1];
      title = mat[2];
      if (title.charAt(0) === '"') title = title.substr(1, title.length - 2).replace(/\\"/g, '"');
    }
    return { url: url, title: title };
  }
  exports.ImageFolder = ImageFolder;
  fold_1.registerFolder("image", exports.ImageFolder, true);
});
