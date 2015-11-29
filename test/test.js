var SAMPLE_FILENAME = '../adamant.js'
$(function(){$.get(SAMPLE_FILENAME).done(main).fail(function(er){console.error(er)})})
function main(sample)
{
	var textarea = document.getElementById('text')
	var image = document.getElementById('image')
	var dataURL = Adamant.encode(sample)
	image.src = dataURL
	image.onload = function onimageload() {
		textarea.style.minHeight = image.height - 10 + 'px'
		textarea.value = Adamant.decode(this)
	}
}

Adamant.encode
Adamant.decode
Adamant.init
Adamant.watch
Adamant.unwatch
Adamant.onmodule
Adamant.toolbox