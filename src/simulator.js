// Copyright 2015 Kristin Siu and Eric Butler
if (typeof require !== "undefined") {
    parsing = require('./parsing');
    jvnutil = require('./util');
    _ = require('lodash');
}

var Simulator = function(renderer, script_runner, script_files) {
    "use strict";

    var self = {};
    /// place for script_runner to store custom functions for use by scripts
    var user = {};
    /// place for all game state to be stored
    var state = {};
    /// scenes, mapped by name
    var scenes = {};
    /// instruction pointer, stores the current scene/line and the stack
    var ip;

    /// the index of the furthered reached line for each scene, mapped by name
    var scene_progress = {};

    var running = true;

    /// sets the instruction pointer to the beginning of the given scene and starts execution
    function jump_scene(scene_name) {
        ip = {
            scene: scenes[scene_name].lines,
            line: scenes[scene_name].do_track_progress ? scene_progress[scene_name] : 0,
            name: scene_name,
            parent: null
        };

        if (ip.line > 0) {
            // find the nearest entry point to the current line
            for (var i = ip.line; i < ip.scene.length; i++) {
                if (ip.line.type === 'entry') {
                    ip.line = i;
                    ip.do_run_entry = true;
                    return;
                }
            }
            // if we didn't find one then end the scene immediately by setting counter past the end
            ip.line = ip.scene.length;
        }
    }

    function stop() {
        running = false;
    }

    /// the jonquil API, for use by scripts and script_runner
    var jvn = {
        jump_scene: jump_scene,
        stop: stop,
        input: renderer.query_text_input,
        get_current_scene: function() { return ip.name; }
    };

    /// Executes a single line at the current instruction pointer.
    /// Will continue executing subsequent lines (via events) until the scene ends.
    renderer.on('execute_line', function() {
        if (!running) return;

        var current_scene = ip.name;

        /// advances to the next line of the scene
        function advance() {
            // check current scene name; if the scene was changed during execution,
            // then DONT advance the pointer because we will run the first line of the new scene next
            if (current_scene !== ip.name) {
                renderer.emit('execute_line');
                return;
            }

            ip.line++;
            if (ip.line < ip.scene.length) {
                // if more, just bump the line index and go again
                renderer.emit('execute_line');
            } else if (ip.parent !== null) {
                // if there is something higher up the stack, move back to that
                ip = ip.parent;
                advance();
            } else {
                // otherwise, we're done, fire the 'scene complete' message
                on_scene_complete(ip.name);
                renderer.emit('execute_line');
            }
        }

        // if already at end, just advance to trigger scene complete callback
        if (ip.line >= ip.scene.length) {
            advance();
            return;
        }

        var line = ip.scene[ip.line];

        // mark line read iff it's top level
        if (ip.parent === null) {
            scene_progress[ip.name] = ip.line + 1;
        }

        switch (line.type)
        {
        case 'js':
            /* jshint -W054 */
            if (line.async) {
                // if async, the script is responsible for calling advance itself
                new Function('jvn', 'user', 'state', 'advance', line.text)(jvn, user, state, advance);
            } else {
                new Function('jvn', 'user', 'state', line.text)(jvn, user, state);
                advance();
            }
            break;

        case 'say':
            // TODO: should do error checking :(
            script_runner.display_character(line.character, line.expression);
            renderer.display_text(script_runner.characters[line.character], line.text.dictformat(state), advance);
            script_runner.on_line_displayed(jvn, user, state, line);
            break;

        case 'choice':
            var choices;

            // mark which choices have been visited
            if (line.kind === 'exhaustive' && typeof ip.visited === 'undefined') {
                ip.visited = {};
            }

            if (line.kind === 'exhaustive') {
                choices = _.filter(line.choices, function(c) { return !(c.id in ip.visited); });
            } else {
                choices = line.choices;
            }

            renderer.query_choice(_.map(choices, function(c) { return {id:c.id, text:c.text.dictformat(state)}; }), function(choice_id) {
                // check to scene if scene was changed out from under us
                if (current_scene !== ip.name) {
                    renderer.emit('execute_line');
                    return;
                }

                // HACK for exhaustive searches, we want to force the player to visit everything
                // so set the ip one back, when the player returns, it'll repeat the choice
                if (line.kind === 'exhaustive' && _.size(ip.visited) + 1 < _.size(line.choices)) {
                    ip.visited[choice_id] = true;
                    ip.line--;
                } else {
                    delete ip.visited;
                }

                // assumes choice ids are also indices
                ip = {
                    scene: line.choices[choice_id].response,
                    line: 0,
                    name: ip.name,
                    parent: ip
                };
                renderer.emit('execute_line');
            });

            break;

        case 'entry':
            // only run entry lines if we've just started and this was flagged by ip
            if (ip.do_run_entry) {
                ip.do_run_entry = false;
                ip = {
                    scene: line.lines,
                    line: 0,
                    name: ip.name,
                    parent: ip
                };
                renderer.emit('execute_line');
            } else {
                advance();
            }

            break;
        }
    });

    /// notifies the game script that the top-level scene is done executing
    function on_scene_complete(old_scene) {
        script_runner.on_scene_complete(jvn, user, state, old_scene);
    }

    /// Begin execution.
    /// Parses the script files then calls the script's init function.
    self.start = function() {

        function load_script(fname, callback) {
            parsing.parse_scene(fname, function(ast) {
                // copy scenes to scene object
                ast.forEach(function(scene) {
                    scenes[scene.name] = scene;
                    scene_progress[scene.name] = 0;
                });
                callback();
            });
        }

        function go() {
            var debugSelect = $('#debug-scene-jump');
            // create the debug scene jumper
            debugSelect.change(function() {
                var scene = debugSelect.val();
                console.log("Jumping to '" + scene + "'...");
                jvn.jump_scene(scene);
            });
            _.each(scenes, function(c, i) {
                $('<option/>', {value:i, text:i}).appendTo(debugSelect);
            });

            // invoke the runner's start function
            script_runner.start(jvn, user, state, function() {
                renderer.emit('execute_line');
            });
        }

        jvnutil.async_each(script_files, load_script, go);
    };

    return self;

};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Simulator;
}

