/* jshint node: true */
/* global $: true */
"use strict";

var gulp = require( "gulp" ),
	/** @type {Object} Loader of Gulp plugins from `package.json` */
	$ = require( "gulp-load-plugins" )({
		rename: {
			"postcss-partial-import" : "partials",
			"gulp-postcss" : "postcss",
			"gulp-shrinkwrap" : "shrinkwrap"
		}
	}),
	/** @type {Array} JS source files to concatenate and uglify */
	uglifySrc = [
		/** Modernizr */
		"src/bower_components/modernizr/modernizr.js",
		/** Conditionizr */
		"src/js/lib/conditionizr-4.3.0.min.js",
		/** jQuery */
		"src/bower_components/jquery/dist/jquery.js",
		/** Page scripts */
		"src/js/scripts.js"
	],
	/** @type {Object of Array} CSS source files to concatenate and minify */
	cssminSrc = {
		development: [
			/** The banner of `style.css` */
			"src/css/banner.css",
			/** Theme style */
			"src/css/style.css"
		],
		production: [
			/** The banner of `style.css` */
			"src/css/banner.css",
			/** Normalize */
			"src/bower_components/normalize.css/normalize.css",
			/** Theme style */
			"src/css/style.css"
		]
	},
	/** @type {String} Used inside task for set the mode to 'development' or 'production' */
	env = (function() {
		/** @type {String} Default value of env */
		var env = "development";

		/** Test if there was a different value from CLI to env
			Example: gulp styles --env=production
			When ES6 will be default. `find` will replace `some`  */
		process.argv.some(function( key ) {
			var matches = key.match( /^\-{2}env\=([A-Za-z]+)$/ );

			if ( matches && matches.length === 2 ) {
				env = matches[1];
				return true;
			}
		});

		return env;
	} ());

/** Error handling **/
var handleErrors = function() {
	var args = Array.prototype.slice.call(arguments);

	// Send error to notification center with gulp-notify
	notify.onError({
		title: 'Compile Error',
		message: '<%= error %>'
	}).apply(this, args);

	// Keep gulp from hanging on this task
	this.emit('end');
};

/** Clean */
gulp.task( "clean", require( "del" ).bind( null, [ ".tmp", "dist" ] ) );

/** Copy */
gulp.task( "copy", function() {
	return gulp.src([
			"src/*.{php,png,css}",
			"src/modules/*.php",
			"src/img/**/*.{jpg,png,svg,gif,webp,ico}",
			"src/fonts/*.{woff,woff2,ttf,otf,eot,svg}",
			"src/languages/*.{po,mo,pot}"
		], {
			base: "src"
		})
		.pipe( gulp.dest( "dist" ) );
});

/** PostCSS **/
gulp.task( "postcss", function() {
	var processors = [
		require("postcss-partial-import"),
		require("lost"),
		require("rucksack-css"),
		require("postcss-nested"),
		require("postcss-simple-extend"),
		require("autoprefixer")({
			browsers: [
				"last 2 version",
				"ie 8",
				"ie 9",
				"safari 5",
				"opera 12",
				"android 2.3",
				"android 4",
				"ios 6"
			]
		})
  ];

	return gulp.src( "src/css/styles/style.css" )
		.pipe( $.sourcemaps.init() )
		.pipe( $.postcss( processors ) )
		.on( "error", handleErrors )
		.pipe( $.sourcemaps.write({ includeContent: false }) )
		.pipe( gulp.dest( "src/css" ) );
});

/** STYLES */
gulp.task( "styles", [ "postcss" ], function() {
	console.log( "`styles` task run in `" + env + "` environment" );

	var stream = gulp.src( cssminSrc[ env ] )
		.pipe( $.concat( "style.css" ))
		// .pipe( $.autoprefixer( "last 2 version" ) );

	if ( env === "production" ) {
		stream = stream.pipe( $.csso() );
	}

	return stream.on( "error", function( e ) {
			console.error( e );
		})
		.pipe( gulp.dest( "src" ) );
});

/** JSHint */
gulp.task( "jshint", function () {
	/** Test all `js` files exclude those in the `lib` folder */
	return gulp.src( "src/js/{!(lib)/*.js,*.js}" )
		.pipe( $.jshint() )
		.pipe( $.jshint.reporter( "jshint-stylish" ) )
		.pipe( $.jshint.reporter( "fail" ) );
});

/** Templates */
gulp.task( "template", function() {
	console.log( "`template` task run in `" + env + "` environment" );

    var is_debug = ( env === "production" ? "false" : "true" );

    return gulp.src( "src/dev-templates/is-debug.php" )
        .pipe( $.template({ is_debug: is_debug }) )
        .pipe( gulp.dest( "src/modules" ) );
});

/** Uglify */
gulp.task( "uglify", function() {
	return gulp.src( uglifySrc )
		.pipe( $.concat( "scripts.min.js" ) )
		.pipe( $.uglify() )
		.pipe( gulp.dest( "dist/js" ) );
});

/** `env` to 'production' */
gulp.task( "envProduction", function() {
	env = "production";
});

/** Livereload */
gulp.task( "watch", [ "template", "styles", "jshint" ], function() {
	var server = $.livereload();

	/** Watch for livereoad */
	gulp.watch([
		"src/js/**/*.js",
		"src/*.php",
		"src/css/styles/**/*.css"
	]).on( "change", function( file ) {
		console.log( "File changed: \n" + file.path );
		server.changed( file.path );
	});

	/** Watch for autoprefix */
	gulp.watch( [
		// "src/css/*.css",
		// "src/css/sass/**/*.scss",
		"src/css/styles/**/*.css"
	], [ "styles" ] );

	/** Watch for JSHint */
	gulp.watch( "src/js/{!(lib)/*.js,*.js}", ["jshint"] );
});

/** Build */
gulp.task( "build", [
	"envProduction",
	"clean",
	"template",
	"styles",
	"jshint",
	"copy",
	"uglify"
], function () {
	console.log("Build is finished");
});

/** Lock package.json **/
gulp.task( "shrinkwrap", function() {
  return gulp.src("./package.json")
    .pipe( $.shrinkwrap.lock() ) // modifies dependencies and devDependencies in package.json to specific versions
    .pipe( gulp.dest( "./" ) ); // writes newly modified `package.json`
});

/** Gulp default task */
gulp.task( "default", ["watch"] );
