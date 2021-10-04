// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// DESCRIPTION: Fold URL of links `[text](url)`
//

(function (mod){ //[HyperMD] UMD patched!
  /*plain env*/ mod(null,  {}, HyperMD.Fold, HyperMD);
})(function (require, exports, fold_1, core_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.LinkFolder = void 0;
    var DEBUG = false;
    var LinkFolder = function (stream, token) {
        var cm = stream.cm;
        // a valid beginning must be ...
        if (!((token.string === "[" && // the leading [
            token.state.linkText && // (double check) is link text
            !token.state.linkTitle && // (double check) not image's title
            !/\bimage\b/.test(token.type)) // and is not a image mark
        ))
            return null;
        var spanExtractor = core_1.getLineSpanExtractor(cm);
        // first, find the link text span
        var linkTextSpan = spanExtractor.findSpanWithTypeAt({ line: stream.lineNo, ch: token.start }, "linkText");
        if (!linkTextSpan)
            return null;
        // then find the link href span
        var linkHrefSpan = spanExtractor.findSpanWithTypeAt({ line: stream.lineNo, ch: linkTextSpan.end + 1 }, "linkHref");
        if (!linkHrefSpan)
            return null;
        // now compose the ranges
        var hrefFrom = { line: stream.lineNo, ch: linkHrefSpan.begin };
        var hrefTo = { line: stream.lineNo, ch: linkHrefSpan.end };
        var linkFrom = { line: stream.lineNo, ch: linkTextSpan.begin };
        // const linkTo: Position = { line: stream.lineNo, ch: linkTextSpan.end };
        // and check if the range is OK
        var rngReq = stream.requestRange(hrefFrom, hrefTo, linkFrom, hrefFrom);
        if (rngReq !== fold_1.RequestRangeResult.OK)
            return null;
        // everything is OK! make the widget
        var text = cm.getRange(hrefFrom, hrefTo);
        var _a = splitLink(text.substr(1, text.length - 2)), url = _a.url, title = _a.title;
        var imgElem = document.createElement("span");
        imgElem.setAttribute("class", "hmd-link-icon");
        imgElem.setAttribute("title", url + "\n" + title);
        imgElem.setAttribute("data-url", url);
        var marker = cm.markText(hrefFrom, hrefTo, {
            collapsed: true,
            replacedWith: imgElem,
        });
        imgElem.addEventListener("click", function () { return fold_1.breakMark(cm, marker); }, false);
        return marker;
    };
    function splitLink(content) {
        // remove title part (if exists)
        content = content.trim();
        var url = content, title = "";
        var mat = content.match(/^(\S+)\s+("(?:[^"\\]+|\\.)+"|[^"\s].*)/);
        if (mat) {
            url = mat[1];
            title = mat[2];
            if (title.charAt(0) === '"')
                title = title.substr(1, title.length - 2).replace(/\\"/g, '"');
        }
        return { url: url, title: title };
    }
    exports.LinkFolder = LinkFolder;
    fold_1.registerFolder("link", exports.LinkFolder, true);
});
