// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE

(function (mod) {
  mod(CodeMirror);
})(function (CodeMirror) {
  "use strict";
  var WRAP_CLASS = "CodeMirror-activeline";
  var BACK_CLASS = "CodeMirror-activeline-background";
  var GUTT_CLASS = "CodeMirror-activeline-gutter";

  CodeMirror.defineOption("styleActiveLine", false, function (cm, val, old) {
    var prev = old == CodeMirror.Init ? false : old;
    if (val == prev) return;
    if (prev) {
      cm.off("beforeSelectionChange", selectionChange);
      clearActiveLines(cm);
      delete cm.state.activeLines;
    }
    if (val) {
      cm.state.activeLines = [];
      updateActiveLines(cm, cm.listSelections());
      cm.on("beforeSelectionChange", selectionChange);
      cm.refresh();
    }
  });

  function clearActiveLines(cm) {
    for (var i = 0; i < cm.state.activeLines.length; i++) {
      cm.removeLineClass(cm.state.activeLines[i], "wrap", WRAP_CLASS);
      cm.removeLineClass(cm.state.activeLines[i], "background", BACK_CLASS);
      cm.removeLineClass(cm.state.activeLines[i], "gutter", GUTT_CLASS);
    }
  }

  function sameArray(a, b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] != b[i]) return false;
    return true;
  }

  function updateActiveLines(cm, ranges) {
    var active = [];
    for (var i = 0; i < ranges.length; i++) {
      var range = ranges[i];
      var option = cm.getOption("styleActiveLine");
      // if (typeof option == "object" && option.nonEmpty ? range.anchor.line != range.head.line : !range.empty())
      // nothingislost: modified the nonEmpty option to support multiple selected lines
      if (typeof option == "object" && option.nonEmpty ? false : !range.empty()) continue;
      // nothingislost: support forwards and backwards multi line selections
      if (range.head.line > range.anchor.line) {
        var start = range.anchor.line,
          end = range.head.line;
      } else {
        var start = range.head.line,
          end = range.anchor.line;
      }
      // nothingislost: get the visual start for all lines in the selection
      for (var j = start; j < end + 1; ++j) {
        var line = cm.getLineHandleVisualStart(j);
        if (active[active.length - 1] != line) active.push(line);
      }
    }
    if (sameArray(cm.state.activeLines, active)) return;
    cm.operation(function () {
      clearActiveLines(cm);
      for (var i = 0; i < active.length; i++) {
        cm.addLineClass(active[i], "wrap", WRAP_CLASS);
        cm.addLineClass(active[i], "background", BACK_CLASS);
        cm.addLineClass(active[i], "gutter", GUTT_CLASS);
      }
      cm.state.activeLines = active;
    });
  }

  function selectionChange(cm, sel) {
    updateActiveLines(cm, sel.ranges);
  }
});
