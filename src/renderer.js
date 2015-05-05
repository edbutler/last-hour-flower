// Copyright 2015 Kristin Siu and Eric Butler
var html_renderer = function() {
    "use strict";

    var self = {};
    var event_fn;

    var requestAnimationFrame = window.requestAnimationFrame;

    /*
    var sound_talk = new Howl({
        urls: ["sounds/talk.wav"],
        loop: true,
        volume: 0.4
    });
    */

    // HACK this only works for one event type
    self.emit = function(e) { event_fn(); };
    self.on = function(et, fn) { event_fn = fn; };

    self.play_sfx = function(id) {
        //var elem = document.getElementById(id);
        //elem.currentTime = 0;
        //elem.play();
        //sound_talk.play();
    }

    self.stop_sfx = function(id) {
        //var elem = document.getElementById(id);
        //elem.pause();
        //sound_talk.stop();
    }

    self.query_text_input = function(message, callback) {
        $('#query-text-label').text(message);
        var form = $('#query-text-form');
        var button = $("#query-text-button");

        function onclick(e) {
            var value = $('#query-text-answer').val();

            if (value.length === 0) return false;

            // force focus onto the submit button to make mobile keyboards behave
            button.focus();
            form.unbind("submit", onclick);
            form.css('display', 'none');
            callback(value);
        }

        form.bind("submit", onclick);
        form.css('display', 'block');
    };

    self.display_text = function(character, text, callback) {
        var disp_char = $('#display-character');
        var disp_text = $('#display-text');
        var game = $('#content');

        function onclick() {
            game.removeClass('clickable');
            game.unbind("click", onclick);
            // don't clear the text, should leave it up for when questions/etc are up
            callback();
        }

        var start_time = null;
        var chars_per_second = 80;
        var extra_display_seconds = 0.2;

        self.play_sfx('sfx-talk');

        function update(timestamp) {
            var seconds = timestamp / 1000.0;
            if (start_time === null) start_time = seconds;
            var delta = seconds - start_time;
            var num_chars = Math.floor(delta * chars_per_second);

            disp_text.children('span').each(function(i) {
                if (i < num_chars) {
                    $(this).css('visibility', 'visible');
                }
            });

            if (delta > text.length / chars_per_second + extra_display_seconds) {
                game.addClass('clickable');
                game.bind("click", onclick);
                self.stop_sfx('sfx-talk');
            } else {
                requestAnimationFrame(update);
            }
        }

        disp_text.empty();
        _.each(text, function(c, i) {
            var li = $('<span/>', {text:c}).appendTo(disp_text);
            li.css('visibility', 'hidden');
        });
        requestAnimationFrame(update);

        disp_char.text(character);
        //disp_text.text(text);
        //game.addClass('clickable');
        //game.bind("click", onclick);
    };

    self.query_choice = function(choices, callback) {
        var list = $('#choices');

        function onselect(index) {
            list.empty();
            $(window).focus();
            list.css('display', 'none');
            callback(choices[index].id);
        }

        _.each(choices, function(c, i) {
            var li = $('<li/>', {text:c.text}).appendTo(list);
            li.click(function(e) { e.stopPropagation(); onselect(i); });
        });
        list.css('display', 'block');
    };

    return self;
}();

