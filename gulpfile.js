/*jshint node: true*/
var gulp = require('gulp');
var runSequence = require('run-sequence');
var exec = require('child_process').exec;
var zip = require('gulp-zip');
var clean = require('gulp-clean');
var jshint = require('gulp-jshint');


var path = {
  src: {
    blocks: 'blocks/**',
    javascriptSources: 'blocks/**/*.js',
    manifest: 'manifest.json',
    node_modules: 'node_modules/js-md5/build/*'
  },
  notTests: '!./**/*.test.js',
  dist: {
    all: 'dist/**',
    alljs: 'dist/blocks/**/*.js',
    blocks: 'dist/blocks',
    manifest: 'dist',
    node_modules: 'dist/components'
  },
  build: {
    itself: 'build',
    firefox: 'build/firefox',
    chrome: 'build/chrome'
  },
  // environment file with API Credentials
  // from addons.mozilla.org
  // looks like:
  // {
  // "issuer": "************",
  // "secret": "************************************************************"
  // }

  env: '.env.json'
};

gulp.task('clean', function() {
  return gulp.src([path.build.itself, path.dist.all], {read: false})
    .pipe(clean());
});

gulp.task('copy-blocks', function() {
  return gulp.src([path.src.blocks, path.notTests])
    .pipe(gulp.dest(path.dist.blocks));
});
gulp.task('copy-manifest', function() {
  return gulp.src(path.src.manifest)
    .pipe(gulp.dest(path.dist.manifest));
});
gulp.task('copy-node_modules', function() {
  return gulp.src(path.src.node_modules)
    .pipe(gulp.dest(path.dist.node_modules));
});

gulp.task('copy', function(finishCallback) {
  runSequence('clean', ['copy-blocks', 'copy-manifest', 'copy-node_modules'], finishCallback);
});

// Recopy all before watch
gulp.task('watch', ['copy'], function() {
  gulp.watch(path.src.blocks, ['copy-blocks']);
  gulp.watch(path.src.manifest, ['copy-manifest']);
  gulp.watch(path.src.node_modules, ['copy-node_modules']);
});

// Linter
gulp.task('lint', function() {
  return gulp.src(path.src.javascriptSources)
    .pipe(jshint())
    .pipe(jshint.reporter('default'))
    .pipe(jshint.reporter('fail'));
});

// Executing signing of Firefox WebExtension.
// It will send package to AMO and return
// signed extension to `build` folder
gulp.task('sign:firefox', function(cb) {
  // getting issuer and secret from env file
  var signParams = require('./' + path.env);

  var execSign = 'web-ext sign' +
    ' -s dist' +
    ' -a ' + path.build.firefox +
    ' --api-secret ' + signParams.secret +
    ' --api-key ' + signParams.issuer;

  exec(execSign, function(err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
});

gulp.task('pack:firefox', function(cb) {
  // -a build dir, -s source dir
  var execPack = 'web-ext build' +
    ' -s dist' +
    ' -a ' + path.build.firefox;

  exec(execPack, function(err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });

});

// Packing for Chrome
gulp.task('pack:chrome', function() {
  var manifest = require('./' + path.dist.manifest + '/manifest.json'),
    distFileName = manifest.name + '-' + manifest.version + '.zip';
  // Build distributable extension
  return gulp.src(path.dist.all)
    .pipe(zip(distFileName))
    .pipe(gulp.dest(path.build.chrome));
});

gulp.task('build', function() {
  runSequence('copy', 'pack:chrome', 'sign:firefox');
});

gulp.task('build:firefox', function() {
  runSequence('copy', 'sign:firefox', 'pack:firefox');
});

gulp.task('build:chrome', function() {
  runSequence('copy', 'pack:chrome');
});
