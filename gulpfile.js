/*
 * Vers
 * Copyright (c) 2015 TechnologyAdvice
 */

var gulp = require('gulp');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');

gulp.task('dist', function() {
  return gulp.src('./lib/Vers.js')
    .pipe(uglify())
    .pipe(rename({
      basename: 'vers',
      extname: '.min.js'
    }))
    .pipe(gulp.dest('./dist/'));
});

gulp.task('default', ['dist']);
