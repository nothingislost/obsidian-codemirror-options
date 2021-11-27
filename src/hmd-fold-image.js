// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// DESCRIPTION: Fold Image Markers `![](xxx)`
//

(function (mod) {
  mod(null, {}, CodeMirror, HyperMD.Fold, HyperMD.ReadLink);
})(function (require, exports, CodeMirror, fold_1) {
  "use strict";
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.ImageFolder = void 0;
  var DEBUG = false;
  var ImageFolder = function (stream, token) {
    var cm = stream.cm;
    var imgRE = /(\bimage-marker\b)|(\bformatting-embed\b)/;
    var extRE = /\.(jpe?g|png|gif|svg|bmp)/;
    var urlRE = /(\bformatting-link-string\b)|(\bformatting-link\b)/; // matches the parentheses
    if (imgRE.test(token.type) && (token.string === "!" || token.string === "![[")) {
      var lineNo = stream.lineNo;
      // find the begin and end of url part
      var since = { line: lineNo, ch: token.start };
      var url_begin = stream.findNext(urlRE, 0, since);
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
        var dimensions = void 0;
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
          var _matches;
          if ((_matches = url.match(/^([^|]+)\|(.*)$/))) {
            url = _matches[1];
            dimensions = _matches[2];
          }
        }
        {
          // extract the alt
          alt = cm.getRange({ line: lineNo, ch: from.ch + 2 }, { line: lineNo, ch: url_begin.token.start - 1 });
        }
        var _altMatches;
        if ((_altMatches = alt.match(/^(?:([^|]*)\|)?([0-9x]+)$/))) {
          dimensions = _altMatches[2];
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
        img.addEventListener(
          "click",
          function () {
            return fold_1.breakMark(cm, marker);
            // CodeMirror.signal(cm, "imageClicked", {
            //   editor: cm,
            //   marker: marker,
            //   breakMark: fold_1.breakMark,
            //   element: img,
            // });
          },
          false
        );
        img.alt = alt;
        img.title = title;
        var _url, _resolvedUrl;
        if (/^(app|http|https):\/\//.test(url)) {
          _url = url;
        } else {
          _resolvedUrl = window.app.metadataCache.getFirstLinkpathDest(decodeURIComponent(url), "");
          if (_resolvedUrl) {
            _url = window.app.vault.getResourcePath(_resolvedUrl);
          } else {
            _url = "";
            img.alt = "⚠️";
          }
        }

        img.setAttribute("data-src", _url);
        if (_resolvedUrl && _resolvedUrl.path) img.setAttribute("data-path", _resolvedUrl.path);
        img.setAttribute("src", _url);
        if (dimensions) {
          var _dims = dimensions.match(/^([0-9]+)x?([0-9]+)?$/);
          var width = _dims[1] ? `width: ${_dims[1]}px;` : "";
          var height = _dims[2] ? `height: ${_dims[2]}px;` : "";
          img.setAttribute("style", `${width} ${height}`);
        }
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
    // support ![Alt](/path/to/img.jpg “image title”) syntax
    // remove title part (if exists)
    content = content.trim();
    var url = content,
      title = "";
    var mat = content.match(/^([^"]+)("(?:[^"\\]+|\\.)+"|[^"\s].*)?/);
    if (mat) {
      url = mat[1];
      title = mat[2] ? mat[2] : "";
      if (title.charAt(0) === '"') title = title.substr(1, title.length - 2).replace(/\\"/g, '"');
    }
    return { url: url?.trim(), title: title };
  }
  exports.ImageFolder = ImageFolder;
  fold_1.registerFolder("image", exports.ImageFolder, true);
});
