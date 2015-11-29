var SAMPLE_FILENAME = '../adamant.js'
$(function(){$.get(SAMPLE_FILENAME).done(main).fail(function(er){console.error(er)})})
function main(sample)
{
	Adamant.decode
	Adamant.encode
	Adamant.init
	Adamant.watch
	Adamant.unwatch
	Adamant.onmodule
	Adamant.toolbox

	var dataURL = Adamant.encode(sample)
	console.log('Adamant.encode(sample)', dataURL)
}