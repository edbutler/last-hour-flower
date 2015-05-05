// Copyright 2015 Kristin Siu and Eric Butler
var gulp = require('gulp');

var usemin = require('gulp-usemin');
var uglify = require('gulp-uglify');
var minifyHtml = require('gulp-minify-html');
var minifyCss = require('gulp-minify-css');
var preprocess = require('gulp-preprocess');
var rev = require('gulp-rev');
var rimraf = require('rimraf');

var BUILD_DIR = __dirname + '/../build/';

gulp.task('clean', function(cb) {
    rimraf(BUILD_DIR, cb);
});

gulp.task('usemin', ['clean'], function() {
    return gulp.src('index.html')
        .pipe(preprocess({context: {}}))
        .pipe(usemin({
            css: [minifyCss(), 'concat'],
            html: [minifyHtml({empty: true})],
            // preserve the copyright notices
            js: [uglify({preserveComments:'some'})]
        }))
        .pipe(gulp.dest(BUILD_DIR));
});

gulp.task('copy_images', ['clean'], function() {
    return gulp.src(['images/**'])
        .pipe(gulp.dest(BUILD_DIR + 'images/'));
});

/*
gulp.task('copy_sounds', ['clean'], function() {
    return gulp.src(['sounds/**'])
        .pipe(gulp.dest(BUILD_DIR + 'sounds/'));
});
*/

gulp.task('copy_content', ['clean'], function() {
    return gulp.src(['script.txt','about.html'])
        .pipe(gulp.dest(BUILD_DIR));
});

gulp.task('copy_static', ['copy_images', /*'copy_sounds',*/ 'copy_content']);

gulp.task('default', ['usemin', 'copy_static']);

