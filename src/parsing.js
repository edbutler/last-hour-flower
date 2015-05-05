// Copyright 2015 Kristin Siu and Eric Butler
var parsing = function() {
    "use strict";

    /// Throws an exception, aborting the parsing process.
    /// pos can either be a token or a character stream position object
    /// msg is a string containing a human-readable description of the type of error.
    function throw_error(pos, msg) {
        var str = "ERROR @ {0}:{1}: {2}".format(pos.line + 1, pos.col + 1, msg);
        throw new Error(str);
    }

    var TOKEN_SYMBOL = "SYMBOL";
    var TOKEN_IDENTIFIER = "IDENTIFIER";
    var TOKEN_TEXT = "TEXT";

    var CharStream = function(str) {
        var self = {};

        var bufidx = 0;
        var line = 0;
        var col = 0;

        self.iseof = function() {
            return str.length <= bufidx;
        };

        self.peek = function() {
            return str.charAt(bufidx);
        };

        self.next = function() {
            var c = str.charAt(bufidx);
            if (c == "\n") {
                line++;
                col = 0;
            } else {
                col++;
            }
            bufidx++;
            return c;
        };

        self.position = function() {
            return {line:line, col:col};
        };

        return self;
    };

    var Lexer = function(cs) {

        var self = {};

        var is_peeked = false;
        var current_token;

        var symbols = {
            "[":1, "]":1, "{":1, "}":1, "(":1, ")":1,
        };
        var text_start_chars = {
            ":":1, "*":1, "$":1
        };

        function iseof() {
            return cs.iseof();
        }
        self.iseof = iseof;

        function isspace(c) {
            return c == ' ' || c == '\t' || c == '\r' || c == '\n';
        }

        function isalpha(c) {
            return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';
        }

        function isident(c) {
            return isalpha(c) || (c >= '0' && c <= '9');
        }

        function iscommentstart(c) {
            return c === '#';
        }

        function read_until_newline() {
            var text = "";
            while (!cs.iseof() && cs.peek() !== "\n") {
                text += cs.next();
            }
            // read the ending newline
            if (!cs.iseof()) cs.next();
            return text.strip();
        }

        function skip_whitespace() {
            while (!cs.iseof() && (isspace(cs.peek()) || iscommentstart(cs.peek()))) {
                if (iscommentstart(cs.next())) {
                    read_until_newline();
                }
            }
        }

        function get_next() {
            // skip whitespace (will do nothing if eof)
            skip_whitespace();

            if (iseof()) {
                throw_error(cs.position(), "Unexpected EOF.");
            }

            var pos = cs.position();
            var c = cs.next();
            var token;

            // check for tokens
            if (c in symbols) {
                token = {type: TOKEN_SYMBOL, text:c};
            }

            // check for special lines
            else if (c in text_start_chars) {
                token = {type: TOKEN_TEXT, start:c, text: read_until_newline()};
            }

            // check for identifier start
            else if (isalpha(c)) {
                var ident = c;
                while (!cs.iseof() && isident(cs.peek())) {
                    c = cs.next();
                    ident += c;
                }
                token = {type: TOKEN_IDENTIFIER, text: ident};
            }

            else {
                throw_error(pos, "Unexpected character '{0}'".format(Number(c)));
            }

            token.line = pos.line;
            token.col = pos.col;

            skip_whitespace();

            return token;
        }

        function peek() {
            if (!is_peeked) {
                current_token = get_next();
                is_peeked = true;
            }
            return current_token;
        }
        self.peek = peek;

        function next() {
            var token = peek();
            is_peeked = false;
            return token;
        }
        self.next = next;

        return self;
    };

    var Parser = function(lex) {
        var self = {};

        function match_program() {
            var scenes = [];
            while (!lex.iseof()) {
                scenes.push(match_scene());
            }
            return scenes;
        }

        function match_scene() {
            match_symbol("[");
            var name = match_ident();
            match_symbol("]");

            var do_track_progress = true;
            if (peek_ident('noprogress')) {
                match_ident();
                do_track_progress = false;
            }

            var lines = [];
            while (!lex.iseof() && !peek_symbol("[")) {
                lines.push(match_line());
            }

            return {name: name, lines: lines, do_track_progress:do_track_progress};
        }

        function match_line() {
            if (peek_symbol("{")) {
                return match_choice();
            } else {
                return match_basic_line();
            }
        }

        function match_basic_line() {
            var t = lex.peek().type;
            if (t === TOKEN_IDENTIFIER) {
                // convo line
                var chr = match_ident();
                var expr;
                if (peek_symbol("(")) {
                    match_symbol("(");
                    expr = match_ident();
                    match_symbol(")");
                } else {
                    expr = null;
                }
                return {type: "say", character: chr, expression: expr, text: match_dialogue()};
            } else if (t === TOKEN_TEXT) {
                var text = match_jscode();
                if (/^async /.test(text)) {
                    return {type: "js", async: true, text: text.replace(/^async (.*)$/, "$1")};
                } else {
                    return {type: "js", async: false, text: text};
                }
            } else {
                throw_error(lex.peek(), "Unexpected token '{0}' when parsing basic line.".format(lex.peek().text));
            }
        }

        var valid_choices = {
            'single':1,
            'exhaustive':1,
            'entry':1
        };

        function match_choice() {
            match_symbol("{");
            var choices = [];
            var lines = [];

            var choice_kind = 'single';
            if (lex.peek().type === TOKEN_IDENTIFIER) {
                var token = lex.peek();
                choice_kind = match_ident();
                if (!(choice_kind in valid_choices)) {
                    throw_error(token, "'{0}' is not a valid choice kind".format(choice_kind));
                }
            }

            // HACK HACK HACK
            if (choice_kind === 'entry') {
                while (!peek_symbol("}")) {
                    lines.push(match_line());
                }
                match_symbol("}");
                return {type: 'entry', lines:lines};

            } else {
                do {
                    var text = match_choice_header();
                    lines = [];
                    while (!peek_symbol("}") && !peek_text("*")) {
                        lines.push(match_line());
                    }
                    choices.push({id: choices.length, text: text, response: lines});
                } while (!peek_symbol("}"));
                match_symbol("}");

                return {type: "choice", kind: choice_kind, choices: choices};
            }
        }


        function match_symbol(symbol) {
            var token = lex.next();
            if (token.type !== TOKEN_SYMBOL || token.text !== symbol) {
                throw_error(token, "Expected symbol {0}".format(symbol));
            }
        }

        function peek_symbol(symbol) {
            var token = lex.peek();
            return token.type === TOKEN_SYMBOL && token.text === symbol;
        }

        function match_ident() {
            var token = lex.next();
            if (token.type !== TOKEN_IDENTIFIER) {
                throw_error(token, "Expected identifier");
            }
            return token.text;
        }

        function peek_ident(val) {
            var token = lex.peek();
            return token.type === TOKEN_IDENTIFIER && token.text === val;
        }

        function match_text(start_symbol, errmsg) {
            var token = lex.next();
            if (token.type !== TOKEN_TEXT || token.start !== start_symbol) {
                throw_error(token, "Expected {0} followed by {1}".format(start_symbol, errmsg));
            }
            return token.text;
        }

        function peek_text(start_symbol) {
            var token = lex.peek();
            return token.type === TOKEN_TEXT && token.start === start_symbol;
        }

        function match_dialogue() {
            return match_text(":", "text");
        }

        function match_jscode() {
            return match_text("$", "js code");
        }

        function match_choice_header() {
            return match_text("*", "choice header");
        }

        self.parse = function() {
            return match_program();
        };

        return self;
    };

    function browser_parse_scene(data, callback) {
        var p = new Parser(new Lexer(new CharStream(data)));
        var ast = p.parse();
        callback(ast);
    }

    function nodejs_parse_scene(fname, callback) {
        var fs = require('fs');

        fs.readFile(fname, 'utf8', function (err,data) {
            if (err) {
                return console.log(err);
            }
            var p = new Parser(new Lexer(new CharStream(data)));
            var ast = p.parse();
            callback(ast);
        });
    }

    return {
        parse_scene: typeof module !== 'undefined' ? nodejs_parse_scene : browser_parse_scene
    };

}();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = parsing;
}

