var SAMPLE_FILENAME = '../adamant.js'
$(function(){$.get(SAMPLE_FILENAME).done(main).fail(function(er){console.error(er)})})
function main(sample)
{
	console.log('ORIGINAL\n%s\n%o chars', sample.substr(0, 64), sample.length)
	var image = document.getElementById('image')
	var canvas = document.getElementById('canvas')
	var context = canvas.getContext('2d')
	var histogram = Adamant.histogram(sample)
	var prefix_code = Adamant.prefix_code(histogram)
	var encoded = Adamant.encode(sample, prefix_code)
	console.log('ENCODED', encoded.length/32)
	var image_data = Adamant.write(encoded)
	canvas.width = image_data.width
	canvas.height = image_data.height
	context.putImageData(image_data, 0, 0)
	var dataURL = canvas.toDataURL('image/png')


	image.src = dataURL
	image.onload = Adamant.init


	// console.table(histogram)
	// console.dir(encoded)
	// console.dir(prefix_code)
	// console.log(Adamant.write(encoded))
	// console.log(Adamant.dictionary_coder(sample))
	console.log(Adamant)
}