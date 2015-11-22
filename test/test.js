$(function () {
	$.get('../adamant.js').done(function(res){
		var sample = "console.log('look im adamant')"
		var sample = res
		// var encoded = Adamant.encode(sample)
		// var probabilities = Adamant.probabilities(sample)
		// var decoded = Adamant.decode(encoded.concat(), Adamant.probabilities(sample))
		// console.log('#:', sample)
		// console.log('#:', decoded)
		// console.log('#:', Adamant.group(encoded.concat(), 32))
		// var image = document.getElementById('image')
		var canvas = document.getElementById('canvas')
		Adamant.spiral(canvas)
		// Adamant.draw(canvas, encoded, probabilities)
		// var imageData = canvas.toDataURL("image/png")//.replace("image/png", "image/octet-stream")
		// image.src = imageData
		// Adamant.init(image)
	}).fail(function(err){console.error(err)})
})