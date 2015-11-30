var SAMPLE_FILENAME = '../adamant.js'
$(function(){$.get(SAMPLE_FILENAME).done(main).fail(function(er){console.error(er)})})
function main(sample)
{
	var textarea = document.getElementById('text')
	var image = document.getElementById('image')
	
	image.src = Adamant.encode(sample)
	image.onload = function onimageload() {
		textarea.style.minHeight = (image.height - 8) + 'px'
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