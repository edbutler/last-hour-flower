// Copyright 2015 Kristin Siu and Eric Butler
var cli_renderer = function() {
    "use strict";

    var readline = require('readline');
    var EE = require('events').EventEmitter;
    var ee = new EE();

    var self = {};

    self.emit = ee.emit;
    self.on = ee.on;

    self.query_text_input = function(message, callback) {
        var rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
        });

        rl.question(message + " ", function(response) {
            rl.close();
            callback(response);
        });
    };

    self.display_text = function(character, expression, text, callback) {
        console.log(character + ": " + text);
        callback();
    };

    self.query_choice = function(choices, callback) {
        choices.forEach(function(choice, index) {
            console.log("#{0}: {1}".format(index + 1, choice.text));
        });

        function on_choice(c) {
            var idx = parseInt(c) - 1;

            if (idx >= 0 && idx < choices.length) {
                callback(choices[idx].id);
            } else {
                console.log("Choice not valid.");
                query();
            }
        }

        function query() {
            self.query_text_input('Pick choice #:', on_choice);
        }

        query();
    };

    return self;

}();

module.exports = cli_renderer;

