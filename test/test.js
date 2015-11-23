var SAMPLE_FILENAME = '../adamant.js'
$(function(){$.get(SAMPLE_FILENAME).done(main).fail(function(er){console.error(er)})})
function main(sample)
{
	console.log(Adamant.dictionary_coder(sample))
	console.log(Adamant)
}

