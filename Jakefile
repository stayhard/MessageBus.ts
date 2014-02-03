var exec = require('child_process').exec,
	fs = require('fs'),
	Mocha = require('mocha');

task('default', {async: true}, function () {

	var getScripts = function(dir) {
	    var results = [];
	    var list = fs.readdirSync(dir);
	    list.forEach(function(file) {
	        file = dir + '/' + file;
	        var stat = fs.statSync(file);
	        if (stat && stat.isDirectory()) {
	        	results = results.concat(getScripts(file));
	        }
	        else if (file.indexOf('.ts', file.length - 3) !== -1) {
	        	results.push(file);
	        }
	    })
	    return results
	}

	var files = ['MessageBus.ts', 'MessageBus.tests.ts'];
	files = files.concat(getScripts('definitions'));


	var args = [
		'tsc',
		'--out work/all.js',
		files.join(' ')
		];

	console.log('Building project...');

	console.log();
	var child = exec(args.join(' '),
	                function(error, stdout, stderr) {
	                    if (stderr) {
	                      console.log(stderr);
	                      console.log();
	                      console.log('Build failed.')
	                    }
	                    else {

	                    	console.log('Built ' + files.length + ' files successfully.');

	                    	console.log('Running test');

	                    	var mocha = new Mocha;

							mocha.addFile('work/all.js');
							mocha.addFile(require.resolve('should'));

							mocha.run(function(failures){
								process.on('exit', function () {
									process.exit(failures);

									complete();
								});
							});
	                    }
	                });
	
});


jake.addListener('complete', function () {
  
});