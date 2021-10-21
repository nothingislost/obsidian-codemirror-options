// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// POWERPACK for "addon/fold-code"
//
// This module provides `ChartRenderer` for FoldCode addon

(function (mod) {
  mod(null, {}, CodeMirror, HyperMD.Fold, HyperMD.FoldCode);
})(function (require, exports, CodeMirror, fold_1, fold_code_1) {
  "use strict";
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.ChartRenderer = void 0;
  CodeMirror = __importStar(CodeMirror);
  var dependencyCheck = function () {
    return window.app.plugins.getPlugin("obsidian-charts")?._loaded ? true : false;
  };
  var ChartRenderer = function (code, info) {
    var el = document.createElement("div");
    if (dependencyCheck()) {
      window.app.plugins.getPlugin("obsidian-charts").postprocessor(code, el);
    } else {
      el.innerText = "Error: Unable to find the Obsidian Charts plugin";
    }
    return {
      element: el,
      asyncRenderer: null,
    };
  };
  exports.ChartRenderer = ChartRenderer;
  if (true) {
    CodeMirror.defineOption("chart", null, function (cm) {
      fold_code_1.getAddon(cm).clear("chart");
      fold_1.getAddon(cm).startFold();
    });
    fold_code_1.registerRenderer({
      name: "chart",
      pattern: /^chart$/i,
      renderer: exports.ChartRenderer,
      suggested: true,
    });
  }
});
