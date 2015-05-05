// Copyright 2015 Kristin Siu and Eric Butler
var jvnutil = function() {
    "use strict";

    // modify all strings to have a format function
    if (!String.prototype.format) {
        String.prototype.format = function() {
            var args = arguments;
            return this.replace(/{(\d+)}/g, function(match, index) {
                return typeof args[index] !== 'undefined' ? args[index] : match;
            });
        };

        /// EX: "foo{x}".dictformat({x: "bar"}) ---> "foobar"
        String.prototype.dictformat = function(args) {
            return this.replace(/{([^}]+)}/g, function(match, name) { 
                return typeof args[name] !== 'undefined' ? args[name] : match;
            });
        };

        String.prototype.strip = function() {
            return this.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
        };
    }

    var self = {};

    self.async_each = function(list, func, callback) {
        var remaining = list.length;

        function ecb() {
            remaining--;
            if (remaining === 0) {
                callback();
            }
        }

        list.forEach(function(x) {
            func(x, ecb);
        });
    };

    return self;

}();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = jvnutil;
}

