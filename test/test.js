var SAMPLE_FILENAME = '../adamant.js'
$(function(){$.get(SAMPLE_FILENAME).done(main).fail(function(er){console.error(er)})})
function compare(imageDataA, imageDataB, raw)
{
	var w = imageDataA.width
	var pixelviewA = new Uint32Array(imageDataA.data.buffer)
	var pixelviewB = new Uint32Array(imageDataB.data.buffer)
	var n = pixelviewB.length
	for (var i = 0; i < n; i++)
	{
		if (pixelviewA[i] != pixelviewB[i])
		{
			console.log(i,'\t',pixelviewA[i],pixelviewB[i])
		}
	}

	var ox = 20, oy = 20
	console.log('A', pixelviewA[(oy*w)+ ox].toString(16), (oy*w)+ ox)
	console.log('B', pixelviewB[(oy*w)+ ox].toString(16), (oy*w)+ ox)
	console.log('C', raw[(oy*w)+ ox].toString(16), (oy*w)+ ox)

	ox += 1, oy += 0
	console.log('A', pixelviewA[(oy*w)+ ox].toString(16), (oy*w)+ ox)
	console.log('B', pixelviewB[(oy*w)+ ox].toString(16), (oy*w)+ ox)

	ox += 0, oy += 1
	console.log('A', pixelviewA[(oy*w)+ ox].toString(16), (oy*w)+ ox)
	console.log('B', pixelviewB[(oy*w)+ ox].toString(16), (oy*w)+ ox)

	ox += -1, oy += 0
	console.log('A', pixelviewA[(oy*w)+ ox].toString(16), (oy*w)+ ox)
	console.log('B', pixelviewB[(oy*w)+ ox].toString(16), (oy*w)+ ox)
}
function main(sample)
{
	var image = document.getElementById('image')
	var canvas = document.getElementById('canvas')
	var canvas2 = document.getElementById('canvas2')
	var context = canvas.getContext('2d')
	var context2 = canvas2.getContext('2d')
	var histogram = Adamant.histogram(sample)
	var prefix_code = Adamant.prefix_code(histogram)
	var encoded = Adamant.encode(sample, prefix_code)
	var image_data = Adamant.write(encoded)
	canvas2.width = canvas.width = image_data.width
	canvas2.height = canvas.height = image_data.height
	// context.putImageData(image_data, 0, 0)
	var dataURL = canvas.toDataURL('image/png')
	// image.src = dataURL
	image.src = generate_24bit_bmp()
	image.onload = function()
	{
		return
		context2.drawImage(this, 0, 0)
		compare(
			context.getImageData(0,0, image.width, image.height),
			context2.getImageData(0,0, image.width, image.height),
			Adamant.convert_bitarray_to_pixelarray(encoded)
		)
	}
}

/**
* @method generate_24bit_bmp
* @param image_data {ImageData}
* @reference http://blog.art21.org/2011/09/13/how-to-create-a-bitmap-image-file-by-hand-without-stencils/#.VleAFnarS00
*/
function generate_24bit_bmp(image_data)
{
	// var pixelview = new Uint8Array(image_data.data.buffer)
	// 42 4D 4C 00 00 00 00 00 
	// 00 00 1A 00 00 00 0C 00 
	// 00 00
	var header = [
		0x42, 0x4D, 0x4C, 0x00, 0x00, 0x00, 0x00, 0x00, 
		0x00, 0x00, 0x1A, 0x00, 0x00, 0x00, 0x0C, 0x00, 
		0x00, 0x00
	]
	
	// width
	header.push(0x04, 0x00)

	// height
	header.push(0x04, 0x00)

	// ...
	header.push(0x01, 0x00, 0x18, 0x00)

	// Pixel Data (b,g, r)

	// Bottom Row
	header.push(0x00, 0x00, 0xFF) // leftmost
	header.push(0x00, 0x00, 0xFF)
	header.push(0x00, 0x00, 0xFF)
	header.push(0x00, 0x00, 0x00) // rightmost

	header.push(0x00, 0xFF, 0x00)
	header.push(0x00, 0xFF, 0x00)
	header.push(0x00, 0xFF, 0x00)
	header.push(0x00, 0xFF, 0x00)
	
	header.push(0x00, 0x00, 0xFF)
	header.push(0x00, 0x00, 0xFF)
	header.push(0x00, 0x00, 0xFF)
	header.push(0x00, 0x00, 0xFF)
	
	// Top row
	header.push(0x00, 0xFF, 0x00)
	header.push(0x00, 0xFF, 0x00)
	header.push(0x00, 0xFF, 0x00)
	header.push(0x00, 0xFF, 0x00) 

	//offset
	header.push(0x00, 0x00)

	// cluster fuck
	var result = ''
	for (var i = 0; i < header.length; i++)
	{
		result += String.fromCharCode(header[i] & 0xFF) 
	}
	// console.log(result)
	// console.log(result)
	var src = 'data:image/bmp;base64,' + btoa(result);
	return src
}