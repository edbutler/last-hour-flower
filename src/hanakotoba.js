// Copyright 2015 Kristin Siu and Eric Butler
var hanakotoba = function() {
    'use strict';

    var self = {};

    var requestAnimationFrame = window.requestAnimationFrame;

    var constants = {
        //time_limit_millis: 20 * 60 * 1000,
        line_limit: 325,
        pio_like_start: 5,
        pio_love_threshold: 10,
        pio_hate_threshold: 0
    };

    var color_change_selectors = [
        {start: '#pio-base-s', end: '#pio-base-e'},
        {start: '#bgelem1-s', end: '#bgelem1-e'},
        {start: '#bgelem2-s', end: '#bgelem2-e'}
    ];

    var scenes = {
        friendship: [
            'DoYouRemember',
            'WhatDoesYourGardenGrow',
            'PluckedFromTheGarden',
            'AllBeautyIsEphemeral',
            'FromWhereThatNameCame',
            'ThatBraveThousandPetalFlower',
            'TimeStopsForNoOne',
        ],
        friendship_backup: 'NoWordsLeft',
        flower: [
            /*
            'ThatDeceptiveLily',
            'ThatBipolarChrysanthemum',
            'ThatUnluckyClover',
            'ThatStudiousMorningGlory',
            'ThatThornlessRose',
            'ThatResoluteIris',
            */
        ],
        flower_backup: 'NoFlowersLeft',
        love: [
            'ThePrincessAndHerPeony',
            'IlluminationsOfAPeonyLantern',
            'DanceInAnAmaranthGarden',
        ],
        hate: [
            'LikeAParasiticAnt',
            'PetalsFallAloneInDoubt',
        ]
    };

    var sounds = {
        /*
        door: new Howl({
            urls: ["sounds/door.wav"],
            volume: 0.6
        })
        */
    };

    var pio_sprite_width = 217;
    var BLINK = 2;
    var pio_sprite_offset = {
        angry:  [0, null],
        beady:  [1, null],
        blink:  [BLINK, null],
        brave:  [3, BLINK],
        ldown:  [5, 4],
        joy:    [6, null],
        lleft:  [8, 7],
        default: [9, BLINK],
        look:   [9, BLINK],
        lright: [11, 10],
        sad:    [12, BLINK],
        panic:  [13, null],
        lup:    [15, 14],
        wut:    [16, BLINK]
    };
    // pio blinking
    var anim_running = true;
    var current_expression = null;
    var next_blink_time = null;

    function create_canvas2d(width, height) {
        var c = document.createElement('canvas');
        c.width = width;
        c.height = height;
        return c;
    }

    function sv_from_rgb(rgb) {
        var r = rgb[0] / 255;
        var g = rgb[1] / 255;
        var b = rgb[2] / 255;

        var minRGB = Math.min(r, Math.min(g,b));
        var maxRGB = Math.max(r, Math.max(g,b));
        var diff = maxRGB - minRGB;

        var h, s;
        var v = maxRGB;
        if (diff == 0) {
            //h = 0;
            s = 0;
        } else {
            // This is how you'd compute the hue if you needed it.
            //if (r == maxRGB) {
            //    h = ((g - b) / diff) % 6;
            //} else if (g == maxRGB) {
            //    h = ((b - r) / diff) + 2;
            //} else { // b == maxRGB
            //    h = ((r - g) / diff) + 4;
            //}
            //h *= 60;
            s = diff / v;
        }

        return [s,v];
    }

    function rgb_from_hsv(hsv) {
        var h = hsv[0];
        var s = hsv[1];
        var v = hsv[2];

        var c = v * s;
        var h_prime = h / 60;
        var x = c * (1 - Math.abs((h_prime % 2) - 1));

        var new_r = 0.0;
        var new_g = 0.0;
        var new_b = 0.0;
        if (h_prime >= 0.0 && h_prime < 1.0) {
            new_r = c;
            new_g = x;
        } else if (h_prime >= 1.0 && h_prime < 2.0) {
            new_r = x;
            new_g = c;
        } else if (h_prime >= 2.0 && h_prime < 3.0) {
            new_g = c;
            new_b = x;
        } else if (h_prime >= 3.0 && h_prime < 4.0) {
            new_g = x;
            new_b = c;
        } else if (h_prime >= 4.0 && h_prime < 5.0) {
            new_r = x;
            new_b = c;
        } else if (h_prime >= 5.0 && h_prime < 6.0) {
            new_r = c;
            new_b = x;
        } else {
            // ??? undefined FAIL
        }

        var m = v - c;
        return [
            (new_r + m) * 255,
            (new_g + m) * 255,
            (new_b + m) * 255
        ];
    }

    function change_hue(imagedata) {
        var d = imagedata.data;
        for (var i = 0; i < d.length; i += 4) {
            // Convert to HSV
            var r = d[i  ];
            var g = d[i+1];
            var b = d[i+2];

            var sv = sv_from_rgb([r,g,b]);
            var s = sv[0];
            var v = sv[1];
            var new_rgb = rgb_from_hsv([35, s * .8, .95 * Math.pow(v, 2)]);

            d[i  ] = new_rgb[0];
            d[i+1] = new_rgb[1];
            d[i+2] = new_rgb[2];
        }
    }

    function set_pio_image(blendAmount) {
        _.each(color_change_selectors, function(d) {
            $(d.start).css('opacity', blendAmount);
        });
    }

    function set_bg_to_dataurl(selector, ctx) {
        $(selector).css('background-image', 'url(' + ctx.canvas.toDataURL() + ')');
    }

    function init_color_change_canvas(img, start_sel, end_sel) {
        var c = create_canvas2d(img.width, img.height);
        var ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        set_bg_to_dataurl(start_sel, ctx);
        var imgdata = ctx.getImageData(0, 0, c.width, c.height);
        change_hue(imgdata);
        ctx.putImageData(imgdata, 0, 0);
        set_bg_to_dataurl(end_sel, ctx);
        set_pio_image(1.0);
        c.remove();
    }

    function load_img(src, callbackfn) {
        var img = new Image();
        img.onload = function() {
            callbackfn(img);
        };
        img.src = src;
    }

    self.start = function(jvn, user, state, startfn) {
        // initialize game state
        state.pio_like = constants.pio_like_start;
        state.seen = {};
        state.location = 'black';
        state.lines_remaining = constants.line_limit;
        state.is_counter_running = false;
        //state.start_time = new Date().getTime();

        user.run_title = function(advance) {
            var button = $('#btn-start-game')
            button.fadeIn(1000);
            button.click(function() {
                $.when($('#title-window').fadeOut(1500)).then(function() {
                    $.when($('#bg-title').fadeOut(2000)).then(function() {
                        $.when($('#viz-window, #textbox').fadeIn(1000)).then(function() {
                            advance();
                        });
                    });
                });
            });
        }

        user.jump_scene = function(scene_name) {
            //console.log(state.lines_remaining + " lines remaining.");
            if (state.lines_remaining <= 0) {
                if (state.location === 'pio') {
                    jvn.jump_scene('RequiemForAFlower');
                } else {
                    jvn.jump_scene('NoRequiemForAFlower');
                }
            } else {
                jvn.jump_scene(scene_name);
            }
        }

        user.start_line_counter = function() {
            state.is_counter_running = true;
        }

        user.get_protag_name = function(message, advance) {
            jvn.input(message, function(data) {
                state.protagchan = data.strip();
                advance();
            });
        };

        user.set_bg = function(bg_name, advance) {
            var time = advance ? 400 : 1;
            advance = advance || function(){};

            if (state.location === bg_name) {
                advance();
            } else {
                // if moving into room, play door sfx
                if (state.location === 'door' && bg_name !== 'black') {
                    //sounds.door.play();
                }

                state.location = bg_name;
                switch (bg_name) {
                case 'black':
                    $.when($('#bg-bedroom, #bg-door, #pio').fadeOut(time)).then(function() {
                        advance();
                    });
                    break;
                case 'door':
                    $('#bg-bedroom, #pio').fadeOut(time);
                    $.when($('#bg-door').fadeIn(time)).then(function() {
                        advance();
                    });
                    break;
                case 'pio':
                    $('#bg-door').fadeOut(time);
                    $.when($('#bg-bedroom, #pio').fadeIn(time)).then(function() {
                        advance();
                    });
                    break;
                case 'nopio':
                    $('#bg-door, #pio').fadeOut(time);
                    $.when($('#bg-bedroom').fadeIn(time)).then(function() {
                        advance();
                    });
                    break;
                }
            }
        }

        user.incpio = function() {
            state.pio_like += 1;
        };
        user.decpio = function() {
            state.pio_like -= 1;
        };


        function pio_animate_step(timestamp) {
            var seconds = timestamp / 1000.0;

            // pio blinking

            if (next_blink_time === null) {
                next_blink_time = Math.random() * 9 + seconds + 3;
            }

            var sheet_item = offset = pio_sprite_offset[current_expression === null ? 'default' : current_expression];
            if (sheet_item == null) { console.log(current_expression); }
            var do_blink = seconds > next_blink_time && sheet_item[1] !== null;
            var offset = sheet_item[do_blink ? 1 : 0];
            set_pio_expression(offset);

            if (seconds > next_blink_time + 0.15) {
                next_blink_time = null;
            }

            if (anim_running) {
                requestAnimationFrame(pio_animate_step);
            }
        }

        // set up graphix stuff and launch the first scene
        load_img("images/pio_base.png", function(pio_img) {
            load_img("images/peony00.png", function(bgelem1_img) {
                load_img("images/peony01.png", function(bgelem2_img) {
                    var ccs = color_change_selectors;
                    init_color_change_canvas(pio_img, ccs[0].start, ccs[0].end);
                    init_color_change_canvas(bgelem1_img, ccs[1].start, ccs[1].end);
                    init_color_change_canvas(bgelem2_img, ccs[2].start, ccs[2].end);

                    requestAnimationFrame(pio_animate_step);

                    $.when($('#bg-title, #title-window').fadeIn(5000)).then(function() {
                        jvn.jump_scene('title');
                        startfn();
                    });
                });
            });
        });
    };

    self.characters = {
        pio: 'Pio',
        nchar: ''
    };

    // based on MDN documentation of Math.random
    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min) + min);
    }

    self.on_line_displayed = function(jvn, user, state, line) {
        if (state.is_counter_running) {
            state.lines_remaining--;

            var color = state.lines_remaining / constants.line_limit;
            color = (color < 0.0) ? 0.0 : color;
            set_pio_image(color);
        }
    }

    self.on_scene_complete = function(jvn, user, state, old_scene) {

        console.log('scene complete!');

        // if nothing next is set, then we came from one of the standard scenes, go back to the hub
        if (state.next === undefined) {
            if (state.location === 'pio')
                user.jump_scene('hub');
            else
                user.jump_scene('doorhub');

            return;
        }

        // set possible scenes based on game state
        var possible, backup;

        if (state.next === 'pio') {
            possible = scenes.friendship;
            backup = scenes.friendship_backup;
            if (state.pio_like >= constants.pio_love_threshold) {
                possible = possible.concat(scenes.love);
            } else if (state.pio_like <= constants.pio_hate_threshold) {
                possible = possible.concat(scenes.hate);
            }
        } else if (state.next === 'flower') {
            possible = scenes.flower;
            backup = scenes.flower_backup;
        } else {
            throw new Error('no valid next scene to start!');
        }
        delete state.next;

        // choose one of them randomly that hasn't been scene before
        possible = _.filter(possible, function(x) { return !(x in state.seen); });
        if (_.size(possible) > 0) {
            var scene = possible[getRandomInt(0, possible.length)];
            state.seen[scene] = true;
            user.jump_scene(scene);
        } else {
            user.jump_scene(backup);
        }
    };

    self.display_character = function(character, expression) {
        if (character === 'pio') {
            current_expression = expression;
        }
    };

    function set_pio_expression(offset) {
        var pos = offset <= 0 ? '0 top' : '-{0}px top'.format(offset * pio_sprite_width);
        $('#pio-sheet').css('background-position', pos);
    }

    return self;
}();

// if this file is being run directly, then it's the nodejs cli version
if (typeof module !== 'undefined' && !module.parent) {
    var S = require('./simulator');
    var cli = require('./cli');
    var sim = S(cli, hanakotoba, ['script.txt']);
    sim.start();
}

