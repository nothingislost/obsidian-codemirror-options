// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE

// Because sometimes you need to mark the selected *text*.
//
// Adds an option 'styleSelectedText' which, when enabled, gives
// selected text the CSS class given as option value, or
// "CodeMirror-selectedtext" when the value is not a string.

(function() {
    "use strict";
  
    CodeMirror.defineOption("styleSelectedText", false, function(cm, val, old) {
      var prev = old && old != CodeMirror.Init;
      if (val && !prev) {
        cm.state.markedSelection = [];
        cm.state.markedSelectionStyle = typeof val == "string" ? val : "CodeMirror-selectedtext";
        reset(cm);
        cm.on("cursorActivity", onCursorActivity);
        cm.on("change", onChange);
      } else if (!val && prev) {
        cm.off("cursorActivity", onCursorActivity);
        cm.off("change", onChange);
        clear(cm);
        cm.state.markedSelection = cm.state.markedSelectionStyle = null;
      }
    });
  
    function onCursorActivity(cm) {
      cm.operation(function() { update(cm); });
    }
  
    function onChange(cm) {
      if (cm.state.markedSelection.length)
        cm.operation(function() { clear(cm); });
      if (cm.state.markedLines.length)
        cm.operation(function() { clear(cm); });        
    }
  
    var CHUNK_SIZE = 8;
    var Pos = CodeMirror.Pos;
  
    function cmp(pos1, pos2) {
      return pos1.line - pos2.line || pos1.ch - pos2.ch;
    }
  
    function coverRange(cm, from, to, addAt) {
      if (cmp(from, to) == 0) {
        return;
      }
      var array = cm.state.markedSelection;
      var lines = cm.state.markedLines = [];
      var cls = cm.state.markedSelectionStyle;
      for (var line = from.line;;) {
        var start = line == from.line ? from : Pos(line, 0);
        var endLine = line + CHUNK_SIZE, atEnd = endLine >= to.line;
        var end = atEnd ? to : Pos(endLine, 0);
        var mark = cm.markText(start, end, {className: cls});
        for (var i = from.line; i < to.line + 1; ++i) {
          var line = cm.addLineClass(i, "wrap", "CodeMirror-activeline");
          lines.push(line);
        }
        if (addAt == null) array.push(mark);
        else array.splice(addAt++, 0, mark);
        if (atEnd) break;
        line = endLine;
      }
    }
  
    function clear(cm) {
      var array = cm.state.markedSelection;
      for (var i = 0; i < array.length; ++i) array[i].clear();
      array.length = 0;
      clearLines(cm);
    }

    function clearLines(cm) {
      var lines = cm.state.markedLines;
      if (lines) { 
        for (var i = 0; i < lines.length; ++i) {
          cm.removeLineClass(lines[i], "wrap", "CodeMirror-activeline")
        }
        lines.length = 0;
      }
    }
  
    function reset(cm) {
      clear(cm);
      cm.listSelections().forEach((selection) => {
        if (selection.anchor.line < selection.head.line) {
          coverRange(cm, selection.anchor, selection.head)
        } else if (selection.anchor.line === selection.head.line && selection.anchor.ch < selection.head.ch) {
          coverRange(cm, selection.anchor, selection.head)
         } else {
          coverRange(cm, selection.head, selection.anchor)
        }
      });
    }
  
    function update(cm) {
      cm.listSelections().forEach((selection) => {
         if (selection.anchor.line < selection.head.line) { 
           update2(cm, selection.anchor, selection.head);
          } else if (selection.anchor.line === selection.head.line && selection.anchor.ch < selection.head.ch) {
           update2(cm, selection.anchor, selection.head);
          } else {
           update2(cm, selection.head, selection.anchor);
          }
      });
    }

    function update2(cm, from, to) {
      if (cmp(from, to) == 0) return clear(cm);
  
      var array = cm.state.markedSelection;
      if (!array.length) return coverRange(cm, from, to);
  
      var coverStart = array[0].find(), coverEnd = array[array.length - 1].find();
      if (!coverStart || !coverEnd || to.line - from.line < CHUNK_SIZE ||
          cmp(from, coverEnd.to) >= 0 || cmp(to, coverStart.from) <= 0)
        return reset(cm);
  
      while (cmp(from, coverStart.from) > 0) {
        array.shift().clear();
        if (array[0]) coverStart = array[0].find();
      }
      if (cmp(from, coverStart.from) < 0) {
        if (coverStart.to.line - from.line < CHUNK_SIZE) {
          array.shift().clear();
          coverRange(cm, from, coverStart.to, 0);
        } else {
          clearLines(cm);
          coverRange(cm, from, coverStart.from, 0);
        }
      }
  
      while (cmp(to, coverEnd.to) < 0) {
        array.pop().clear();
        coverEnd = array[array.length - 1].find();
      }
      if (cmp(to, coverEnd.to) > 0) {
        if (to.line - coverEnd.from.line < CHUNK_SIZE) {
          array.pop().clear();
          coverRange(cm, coverEnd.from, to);
        } else {
          coverRange(cm, coverEnd.to, to);
        }
      }
    }
  })();
  