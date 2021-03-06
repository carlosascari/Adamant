/**
* Provides Adamant singleton
*
* @module Adamant
*/
var Adamant = (function (instance) {

/**
* @class Adamant
* @constructor
*/
var Adamant = instance = new (function Adamant(){if (instance) return instance})

/**
* @class Toolbox
* @constructor
*/
var Toolbox = new (function Toolbox(){})

/**
* @class AdamantModule
* @constructor
* @param js_string {String}
* @param metadata {Object}
*/
function AdamantModule(js_string, metadata)
{
	/**
	* A dynamic method whose body is the javascript string encoded in 
	* the Adamant image.
	*
	* @method init
	*/
	Object.defineProperty(
		this, 
		'init', 
		{
			configurable: false, writable: false, enumerable: true,
			value: new Function(js_string)
		}
	)

	// The structure of the Adamant image is still in the kitchen, its
	// properties will be supplied dynamically.
	if (metadata && typeof metadata === 'object')
	{
		var keys = Object.keys(metadata)
		for (var i = 0; i < keys.length; i++) 
		{
			var key = keys[i]
			Object.defineProperty(
				this, 
				key, 
				{
					configurable: false, writable: false, enumerable: true,
					value: metadata[key]
				}
			)
		}
	}
}

Adamant.toolbox = Toolbox

// -----------------------------------------------------------------------------

/**
* Adamant Image Signature. Each character is represented in ASCII bytes. The
* Byte following the signature is always the format version.
*
* @property SIGNATURE
* @type String
* @final
*/
const SIGNATURE = 'ADA'

/**
* Huffman Tree Leaf node type
*
* @property NODE_LEAF
* @type Number
* @final
*/
const NODE_LEAF = 0x01

/**
* Huffman Tree node type
*
* @property NODE_TREE
* @type Number
* @final
*/
const NODE_TREE = 0x02

/**
* @property BIT_ZERO
* @type Number
* @final
*/
const BIT_ZERO = 0x0

/**
* @property BIT_ONE
* @type Number
* @final
*/
const BIT_ONE = 0x1

/**
* In JS endianness is that of the underlying hardware, so we'll detect it now.
*
* Little Endian  	BE
* Big Endian 		LE
*
* @property ENDIANNESS
* @type String
* @final
*/
const ENDIANNESS = (function find_endianness () {
	var b = new ArrayBuffer(4)
	var a = new Uint32Array(b)
	var c = new Uint8Array(b)
	a[0] = 0xDEADBEEF
	if (c[0] == 0xDE) return 'BE'
	if (c[0] == 0xEF) return 'LE'
	console.warn('ENDIANNESS could not be determined, assuming Little Endian')
	return 'LE'
})()

/**
* Whether to automatically execute a decoded Adamant image when **watch** is 
* active.
*
* @property AUTO_EXECUTE
* @type Boolean
*/
var AUTO_EXECUTE = true

/**
* Function called everytime a new Adamant image is decoded before emiting the 
* module event and before storing the Adamant Module instance in `Adamant.modules`
*
* @property WATCH_PROCESSOR
* @type Function 
*/
var WATCH_PROCESSOR = function watch_processor (module, image_element) 
{
	if (AUTO_EXECUTE) module.init.apply(module, image_element)
}

/**
* Event handler called everytime a new Adamant image is decoded.
*
* @property ON_MODULE
* @type Function
*/
var ON_MODULE = function onmodule_default(){}

/**
* @property CANVAS
* @type Object
*/
var CANVAS = document.createElement('canvas')

/**
* @property CONTEXT
* @type Object
*/
var CONTEXT = CANVAS.getContext('2d')

/**
* Look up table for converting characters to their charcodes without a function
* call.
*
* @property CHARCODE_LOOKUP
* @type Object
*/
var CHARCODE_LOOKUP = {}

/**
* Look up table for converting charcodes to their characters without a function
* call.
*
* @property CHARCODE_LOOKUP
* @type Object
*/
var CHARACTER_LOOKUP = {}

for (var i = 0; i < 0xFF; i++) 
{
	var character = String.fromCharCode(i)
	CHARCODE_LOOKUP[character] = i
	CHARACTER_LOOKUP[i] = character
}

/**
* @method sort_histogram_desc
* @private
*/
function sort_histogram_desc(a, b)
{
	return b[1] - a[1]
}

// -----------------------------------------------------------------------------

/**
* Gathers the frequency of each character in a body of text, and sorts so most
* frequent character codes are first.
* 
* A histogram is a Array with each element an array with the following 2 elements:
*
*	charcode  - Number representation of a character
*	frequency - Number of times the charcode occured in the given text
* 
* respectively.
*
* @method histogram 
* @param text {String}
* @return Array
*/
Toolbox.histogram = function Toolbox__histogram (text) 
{
	var freq_hash = {}, histogram = []
	for (var i = 0, l = text.length; i < l; i++)
	{
		var character = text[i]
		var charcode = CHARCODE_LOOKUP[character] 
					|| (CHARCODE_LOOKUP[character] = character.charCodeAt(0))
		freq_hash[charcode] = (freq_hash[charcode] >>> 0) + 1
	}

	var charcodes = Object.keys(freq_hash)
	for (var i = 0, l = charcodes.length; i < l; i++) 
	{
		var charcode = charcodes[i] >>> 0
		histogram[histogram.length] = [charcode, freq_hash[charcode]]
	}

	histogram.sort(sort_histogram_desc)

	return histogram
}

/**
* Uses a histogram to build huffman code (bits) for each charcode.
* 
* A prefix_code is a Hash/Object with each key as the charcode and its value
* an Array of zeroes and ones representing huffman encoded bits.
*
* @method prefix_code 
* @param histogram {Array}
* @return Array
*/
Toolbox.prefix_code = function Toolbox__prefix_code (histogram) 
{
	var histogram = histogram.slice(0)
	var prefix_code = {}

	// Build Forest
	var forest = []
	for (var i = 0, l = histogram.length; i < l; i++) 
	{
		var distribution = histogram[i]
		forest[i] = {
			type: NODE_LEAF,
			symbol: distribution[0],
			value: distribution[1]
		}
	}

	// Join Leafs
	while (forest.length > 1) 
	{
		var size = forest.length - 2,
		nodeA = forest[size + 1],
		nodeB = forest[size]
		forest.length = size

		var tree = {
			type: NODE_TREE,
			value: nodeA.value + nodeB.value,
			a: nodeA,
			b: nodeB
		}

		var i = 0
		for (; i < size && forest[i].value > tree.value; i++);
		forest.splice(i, 0, tree)
	}

	/**
	* Generate Huffman encoded bits. Recursive.
	*
	* @method traverse
	* @param node {Object}
	* @param code {Array}
	* @private
	*/
	function traverse(node, huffman_code) 
	{
		if (node.type === NODE_LEAF)
		{
			prefix_code[node.symbol] = huffman_code.slice(0)
		}
		else
		{
			huffman_code[huffman_code.length] = BIT_ZERO
			traverse(node.a, huffman_code)
			huffman_code.length--

			huffman_code[huffman_code.length] = BIT_ONE
			traverse(node.b, huffman_code)
			huffman_code.length--
		}
	}

	// Begin.
	traverse(forest[0], [])

	return prefix_code
}

/**
* Converts a text into a huffman encoded bit array. A custom prefix_code object
* can be used, as well as a custom histogram.
*
* @method huffman_bits
* @param text {String}
* @param [prefix_code] {Object}
* @param [histogram] {Array}
* @return Array
*/
Toolbox.huffman_bits = function Toolbox__huffman_code (text, histogram, prefix_code) 
{
	if (!prefix_code || typeof prefix_code  !== 'object')
	{
		histogram = typeof histogram === 'array' ? histogram : Toolbox.histogram(text)
		prefix_code = Toolbox.prefix_code(histogram)
	}

	var bitarray = []
	for (var i = 0, l = text.length; i < l; i++)
	{
		var character = text[i]
		var charcode = CHARCODE_LOOKUP[character] || (CHARCODE_LOOKUP[character] = character.charCodeAt(0))
		var huffman_bits = prefix_code[charcode]
		bitarray.push.apply(bitarray, huffman_bits)
	}
	return bitarray
}

/**
* For the given length, calls the callback the amount of times each time passing
* the callback the x and y coordinate for a in-grid, outward spiral.
*
* @method spiral
* @param length {Number}
* @param callback {Function}
*/
Toolbox.spiral = function Toolbox__spiral (length, callback) 
{
	var n = length >>> 0
	if (!n) throw new Error('length should be a positive integer')

	var x = 0
	var y = 0
	var dx = 0
	var dy = -1 
	var i = 0
	while(i < n)
	{
		if (false === callback(x, y, i, n)) break;

		// Corner Detection
		if (x === y || (x < 0 && x === -y) || (x > 0 && x === 1 - y))
		{
			var tmp = dx, dx = -dy, dy = tmp
		}
		// Movement
		x += dx, y += dy, i++
	}
}

/**
* Turns a bitarray into a 32bit bitmap URI
*
* @method bitmap_uri
* @param bitarray {Array}
* @return String
*/
Toolbox.bitmap_uri = function Toolbox__bitmap_uri(bitarray)
{
	bitmap_data_bitarray = bitarray.slice(0)
	var magnitude = Math.ceil(Math.sqrt((bitmap_data_bitarray.length/8)/4))
	var row_size = magnitude
	var col_size = magnitude
	var bitmap_bytes = []
	/*
	* Windows v3 BMP (Little Endian)
	*
	* # File Header
	* ['B']['M'] 			Signature
	* [0x0][0x0][0x0][0x0] 	Size of the bmp in bytes
	* [0x0][0x0] 			Reserved for Application
	* [0x0][0x0] 			Reserved for Application
	* [0x0][0x0][0x0][0x0] 	Start Address/Offset to bitmap data
	* 
	* # DIB Header version 3
	* [0x0][0x0][0x0][0x0] 	Size of this header (40 bytes)
	* [0x0][0x0][0x0][0x0] 	Width in Pixels
	* [0x0][0x0][0x0][0x0] 	Height in Pixels
	* [0x0][0x0]		 	Number of color planes. MUST be 1.
	* [0x0][0x0]		 	Color Deph for each Pixel e.g 1, 2, 4, 8, 16, 24, 32
	* [0x0][0x0][0x0][0x0] 	Compression Method being used...
	* [0x0][0x0][0x0][0x0] 	Raw bitmap data size (NOT filesize)
	* [0x0][0x0][0x0][0x0] 	Horizontal resolution (pixels per meter)
	* [0x0][0x0][0x0][0x0] 	Vertical resolution (pixels per meter)
	* [0x0][0x0][0x0][0x0] 	Number of colors in color palette. CAN be zero.
	* [0x0][0x0][0x0][0x0] 	Important colors used. Ignore.
	*
	* # Compression Field Values
	* 0x0 BI_RGB 			No compression
	* 0x1 BI_RLE8			Only in 8bit/pixel bitmaps
	* 0x2 BI_RLE4			Only in 4bit/pixel bitmaps
	* 0x3 BI_BITFIELDS		Only in 16bit & 32bit per pixel bitmaps
	* 0x4 BI_JPEG			Bitmap contains JPG
	* 0x5 BI_PNG			Bitmap contains PNG
	*/

	// Header
	bitmap_bytes.push(0x42, 0x4D) 				// [const] "BM" Signature
	bitmap_bytes.push(0x00, 0x00, 0x00, 0x00)	// Filesize in bytes
	bitmap_bytes.push(0x00, 0x00, 0x00, 0x00)	// Reserved
	bitmap_bytes.push(0x36, 0x00, 0x00, 0x00) 	// [const] Offset to Pixel Data bytes
	
	// DIB
	bitmap_bytes.push(0x28, 0x00, 0x00, 0x00) 	// [const] Size of this header
	bitmap_bytes.push(0x02, 0x00, 0x00, 0x00) 	// Width
	bitmap_bytes.push(0x02, 0x00, 0x00, 0x00) 	// Height
	bitmap_bytes.push(0x01, 0x00) 				// [const] Number of planes. Must be one.
	bitmap_bytes.push(0x20, 0x00)				// [const] Bits per pixel (Using 32bits)
	bitmap_bytes.push(0x00, 0x00, 0x00, 0x00) 	// [const] No Compression used.
	bitmap_bytes.push(0x00, 0x00, 0x00, 0x00) 	// Size of BMP data in bytes (after this header)
	bitmap_bytes.push(0x13, 0x0B, 0x00, 0x00) 	// Horizontal Resultion of image
	bitmap_bytes.push(0x13, 0x0B, 0x00, 0x00) 	// Vertical Resultion of image (2835 pixels/m)
	bitmap_bytes.push(0x00, 0x00, 0x00, 0x00)	// [const] Colors in pallete (zero, there is no pallete)
	bitmap_bytes.push(0x00, 0x00, 0x00, 0x00)	// [const] All colors are important.

	// Bitmap Data From lower left cornor up, each row is from left to right
	for (var row = row_size - 1; row >= 0; row--)
	{
		for (var column = 0; column < col_size; column++) 
		{
			var bitsB = bitmap_data_bitarray.splice(0, 8)
			var bitsG = bitmap_data_bitarray.splice(0, 8)
			var bitsR = bitmap_data_bitarray.splice(0, 8)
			var bitsA = bitmap_data_bitarray.splice(0, 8)
			var byteB = parseInt(bitsB.join(''), 2) >>> 0
			var byteG = parseInt(bitsG.join(''), 2) >>> 0
			var byteR = parseInt(bitsR.join(''), 2) >>> 0
			var byteA = parseInt(bitsA.join(''), 2) >>> 0
			var pixel32 = (byteB << 24) | byteG << 16 | byteR  << 8 | byteA
			bitmap_bytes.push(byteB, byteG, byteR, byteA)
			console.log(row, column, pixel32) // BGRA32
		}
	}

	var result = ''
	for (var i = 0; i < bitmap_bytes.length; i++)
	{
		result += String.fromCharCode(bitmap_bytes[i]&0xFF) 
	}
	var src = 'data:image/bmp;base64,' + btoa(result);
	return src

	return 



	var header = [
		0x42, 0x4D, 0x4C, 0x00, 0x00, 0x00, 0x00, 0x00, 
		0x00, 0x00, 0x1A, 0x00, 0x00, 0x00, 0x0C, 0x00, 
		0x00, 0x00
	]
	var width = [0x04, 0x00]
	var height = [0x04, 0x00]
	var bitmap_stuff = [0x01, 0x00, 0x18, 0x00]
	var tail_offset = [0x00, 0x00]

	var spiraled_blocks = []
	var bitsize = bitarray.length
	var bytesize = bitsize/8
	var blocksize = bytesize/3
	var n = Math.round(blocksize)
	var magnitude = Math.round(Math.sqrt(blocksize))
	var ox = ~~(magnitude/2) - 1
	var oy = ~~(magnitude/2) - 1

	width[0] = magnitude
	height[0] = magnitude

	Toolbox.spiral(n, function oncoordchange (x, y, index) {
		x = ox + x 
		y = oy + y
		var index = (y * magnitude) + x
		spiraled_blocks[index] = bitarray.splice(0, 24)
	})

	var rows = []

	for (var y = 0; y < magnitude; y++) 
	{
		rows[y] = []
		for (var x = 0; x < magnitude; x++) 
		{
			var index = (y * magnitude) + x
			var blockbits = spiraled_blocks[index]
			if (!blockbits)
			{
				console.log('empty index', index)
				y = magnitude + 20
				break
			}
			var value = parseInt(blockbits.join(''), 2)
			rows[y][rows[y].length] = value & 0xFF0000 >> 16
			rows[y][rows[y].length] = value & 0x00FF00 >> 8
			rows[y][rows[y].length] = value & 0x0000FF 
		}
	}

	// Build Bitmap (byte by byte)
	bitmap_uri.push.apply(bitmap_uri, header)
	bitmap_uri.push.apply(bitmap_uri, width)
	bitmap_uri.push.apply(bitmap_uri, height)
	bitmap_uri.push.apply(bitmap_uri, bitmap_stuff)
	for (var i = 0; i < rows.length; i++) 
	{
		bitmap_uri.push.apply(bitmap_uri, rows[i])
	}

	var result = ''
	for (var i = 0; i < bitmap_uri.length; i++)
	{
		result += String.fromCharCode(bitmap_uri[i] & 0xFF) 
	}
	var src = 'data:image/bmp;base64,' + btoa(result);
	return src
}

/**
* Removes c-style comments from a given string.
*
* @method remove_comments
* @param text {String}
* @return String
*/
Toolbox.remove_comments = function Toolbox__remove_comments(text)
{
	return text.replace(
		/(\/\*([^*]|[\r\n]|(\*+([^*\/]|[\r\n])))*\*+\/)|(\/{2}.*)/g, 
		''
	)
}

// -----------------------------------------------------------------------------

/**
* Converts a prefix_code object to a Array of bits with Adamants structure rules
* so to allow decoding of Adamant javascript content on any image.
*
* Structure of a prefix_code element:
*	
*	<charcode>  				16bit
*	<bitarray>.length			 8bit
*	<bitarray>					n-bit
*
* @method prefix_code
* @param prefix_code {Object}
* @return Array
*/
Toolbox.prefix_code_to_bitarray = function Toolbox__prefix_code_to_bitarray(prefix_code)
{
	var bitarray = []
	var charcodes = Object.keys(prefix_code)
	for (var i = 0, l = charcodes.length; i < l; i++) 
	{
		var charcode = charcodes[i]
		var huffman_bits = prefix_code[charcode]
		bitarray.push.apply(bitarray, Toolbox.charcode_to_bitarray(charcode))
		bitarray.push.apply(bitarray, Toolbox.bitsize_to_bitarray(huffman_bits.length))
		bitarray.push.apply(bitarray, huffman_bits)
	}
	return bitarray
}

/**
* Covnerts a bitarray into a prefix_code object
*
* @method bitarray_to_prefix_code
* @param bitarray {Array}
* @return Object
*/
Toolbox.bitarray_to_prefix_code = function Toolbox__bitarray_to_prefix_code(bitarray)
{
	var prefix_code = {}
	var key, value 
	while(bitarray.length)
	{
		var charcode_bitarray = bitarray.splice(0, 16)
		var size_bitarray = bitarray.splice(0, 8)
		var charcode = parseInt(charcode_bitarray.join(''), 2)
		var size = parseInt(size_bitarray.join(''), 2)
		var code_bitarray = bitarray.splice(0, size)
		prefix_code[charcode] = code_bitarray
	}
	return prefix_code
}

/**
* Convert a Adamant Header object into a bitarray
*
* @method header_object_to_bitarray
* @param header_object {Object}
* @return Array
*/
Toolbox.header_object_to_bitarray = function Toolbox__header_object_to_bitarray(header_object)
{
	var bitarray = []
	var version = header_object.version & 0xFF
	var prefix_code_bitsize = header_object.prefix_code_bitsize >>> 0
	var content_bitsize = header_object.content_bitsize >>> 0

	// Signature
	for (var i = 0; i < SIGNATURE.length; i++) 
	{
		var character = SIGNATURE[i]
		var charcode = CHARCODE_LOOKUP[character] 
					|| (CHARCODE_LOOKUP[character] = character.charCodeAt(0))
		bitarray.push.apply(bitarray, byte_to_bitarray(charcode))
	}

	// Version
	bitarray.push.apply(bitarray, byte_to_bitarray(version))

	// Prefix Code size
	bitarray.push.apply(bitarray, dword_to_bitarray(prefix_code_bitsize))
	
	// Content size
	bitarray.push.apply(bitarray, dword_to_bitarray(content_bitsize))

	return bitarray
}

/**
* Convert a bitarray into a Adamant Header object
* @method bitarray_to_header_object
* @return Array
*/
Toolbox.bitarray_to_header_object = function Toolbox__bitarray_to_header_object(bitarray)
{
	var bitarray = bitarray.slice(0)
	var header_object = {}
	var signature_bitarray = bitarray.splice(0, SIGNATURE.length * 8)
	var version_bitarray = bitarray.splice(0, 8)
	var signature = signature_bitarray.map(function (charcode) {
		return String.fromCharCode(charcode)
	})
	var version = Toolbox.bitarray_to_byte(version_bitarray)

	// header_object.signature = signature
	header_object.version = version

	if (version === 0)
	{
		var prefix_code_size = Toolbox.bitarray_to_dword(bitarray.splice(0, 32))
		var content_size = Toolbox.bitarray_to_dword(bitarray.splice(0, 32))
		header_object.prefix_code_bitsize = prefix_code_size
		header_object.content_bitsize = content_size
	}
	else
	{
		throw new Error('unsupported version: ' + version)
	}

	return header_object
}

// -----------------------------------------------------------------------------

/**
* Converts a charcode of up to 16 bits of size, into a Array of ones and zeroes
*
* @method charcode_to_bitarray
* @param charcode {Number}
* @return Array
*/
Toolbox.charcode_to_bitarray = function Toolbox__charcode_to_bitarray (charcode) 
{
	charcode = charcode >>> 0
	return [
		(charcode) & (BIT_ONE << 0xF) ? BIT_ONE : BIT_ZERO,
		(charcode) & (BIT_ONE << 0xE) ? BIT_ONE : BIT_ZERO,
		(charcode) & (BIT_ONE << 0xD) ? BIT_ONE : BIT_ZERO,
		(charcode) & (BIT_ONE << 0xC) ? BIT_ONE : BIT_ZERO,
		(charcode) & (BIT_ONE << 0xB) ? BIT_ONE : BIT_ZERO,
		(charcode) & (BIT_ONE << 0xA) ? BIT_ONE : BIT_ZERO,
		(charcode) & (BIT_ONE << 0x9) ? BIT_ONE : BIT_ZERO,
		(charcode) & (BIT_ONE << 0x8) ? BIT_ONE : BIT_ZERO,
		(charcode) & (BIT_ONE << 0x7) ? BIT_ONE : BIT_ZERO,
		(charcode) & (BIT_ONE << 0x6) ? BIT_ONE : BIT_ZERO,
		(charcode) & (BIT_ONE << 0x5) ? BIT_ONE : BIT_ZERO,
		(charcode) & (BIT_ONE << 0x4) ? BIT_ONE : BIT_ZERO,
		(charcode) & (BIT_ONE << 0x3) ? BIT_ONE : BIT_ZERO,
		(charcode) & (BIT_ONE << 0x2) ? BIT_ONE : BIT_ZERO,
		(charcode) & (BIT_ONE << 0x1) ? BIT_ONE : BIT_ZERO,
		(charcode) & (BIT_ONE << 0x0) ? BIT_ONE : BIT_ZERO,
	]
}

/**
* Converts a size of up to 255, into an Array of ones and zeroes (8 bits)
*
* @method bitsize_to_bitarray
* @param size {Number}
* @return Array
*/
Toolbox.bitsize_to_bitarray = function Toolbox__bitsize_to_bitarray (size) 
{
	size = size >>> 0
	return [
		(size) & (BIT_ONE << 0x7) ? BIT_ONE : BIT_ZERO,
		(size) & (BIT_ONE << 0x6) ? BIT_ONE : BIT_ZERO,
		(size) & (BIT_ONE << 0x5) ? BIT_ONE : BIT_ZERO,
		(size) & (BIT_ONE << 0x4) ? BIT_ONE : BIT_ZERO,
		(size) & (BIT_ONE << 0x3) ? BIT_ONE : BIT_ZERO,
		(size) & (BIT_ONE << 0x2) ? BIT_ONE : BIT_ZERO,
		(size) & (BIT_ONE << 0x1) ? BIT_ONE : BIT_ZERO,
		(size) & (BIT_ONE << 0x0) ? BIT_ONE : BIT_ZERO,
	]
}

/**
* Converts a 32bit Number to a bitarray
*
* @method int32_to_bitarray
* @param int32 {Number}
* @return Array
*/
Toolbox.int32_to_bitarray = function Toolbox__int32_to_bitarray (int32) 
{
	int32 = int32 >>> 0
	return [
		(int32) & (BIT_ONE << 0x1F) ? BIT_ONE : BIT_ZERO,
		(int32) & (BIT_ONE << 0x1E) ? BIT_ONE : BIT_ZERO,
		(int32) & (BIT_ONE << 0x1D) ? BIT_ONE : BIT_ZERO,
		(int32) & (BIT_ONE << 0x1C) ? BIT_ONE : BIT_ZERO,
		(int32) & (BIT_ONE << 0x1B) ? BIT_ONE : BIT_ZERO,
		(int32) & (BIT_ONE << 0x1A) ? BIT_ONE : BIT_ZERO,
		(int32) & (BIT_ONE << 0x19) ? BIT_ONE : BIT_ZERO,
		(int32) & (BIT_ONE << 0x18) ? BIT_ONE : BIT_ZERO,
		(int32) & (BIT_ONE << 0x17) ? BIT_ONE : BIT_ZERO,
		(int32) & (BIT_ONE << 0x16) ? BIT_ONE : BIT_ZERO,
		(int32) & (BIT_ONE << 0x15) ? BIT_ONE : BIT_ZERO,
		(int32) & (BIT_ONE << 0x14) ? BIT_ONE : BIT_ZERO,
		(int32) & (BIT_ONE << 0x13) ? BIT_ONE : BIT_ZERO,
		(int32) & (BIT_ONE << 0x12) ? BIT_ONE : BIT_ZERO,
		(int32) & (BIT_ONE << 0x11) ? BIT_ONE : BIT_ZERO,
		(int32) & (BIT_ONE << 0x10) ? BIT_ONE : BIT_ZERO,
		(int32) & (BIT_ONE << 0xF) ? BIT_ONE : BIT_ZERO,
		(int32) & (BIT_ONE << 0xE) ? BIT_ONE : BIT_ZERO,
		(int32) & (BIT_ONE << 0xD) ? BIT_ONE : BIT_ZERO,
		(int32) & (BIT_ONE << 0xC) ? BIT_ONE : BIT_ZERO,
		(int32) & (BIT_ONE << 0xB) ? BIT_ONE : BIT_ZERO,
		(int32) & (BIT_ONE << 0xA) ? BIT_ONE : BIT_ZERO,
		(int32) & (BIT_ONE << 0x9) ? BIT_ONE : BIT_ZERO,
		(int32) & (BIT_ONE << 0x8) ? BIT_ONE : BIT_ZERO,
		(int32) & (BIT_ONE << 0x7) ? BIT_ONE : BIT_ZERO,
		(int32) & (BIT_ONE << 0x6) ? BIT_ONE : BIT_ZERO,
		(int32) & (BIT_ONE << 0x5) ? BIT_ONE : BIT_ZERO,
		(int32) & (BIT_ONE << 0x4) ? BIT_ONE : BIT_ZERO,
		(int32) & (BIT_ONE << 0x3) ? BIT_ONE : BIT_ZERO,
		(int32) & (BIT_ONE << 0x2) ? BIT_ONE : BIT_ZERO,
		(int32) & (BIT_ONE << 0x1) ? BIT_ONE : BIT_ZERO,
		(int32) & (BIT_ONE << 0x0) ? BIT_ONE : BIT_ZERO,
	]	
}

/**
* Converts a bitarray of any length a number
*
* @method bitarray_to_number
* @param bitarray {Array}
* @param bitsize {Number}
* @return Number
*/
Toolbox.bitarray_to_number = function Toolbox___bitarray_to_number (bitarray, bitsize) 
{
	return parseInt(bitarray.slice(0, bitsize || 32).join(''), 2)
}

/**
* Converts a bitarray of length 8 into a number
*
* @method bitarray_to_byte
* @param bitarray {Array}
* @return Number
*/
Toolbox.bitarray_to_byte = function Toolbox___bitarray_to_byte (bitarray) 
{ 
	return Toolbox.bitarray_to_number(bitarray, 8)
}

/**
* Converts a bitarray of length 16 into a number
*
* @method bitarray_to_word
* @param bitarray {Array}
* @return Number
*/
Toolbox.bitarray_to_word = function Toolbox___bitarray_to_word (bitarray) 
{ 
	return Toolbox.bitarray_to_number(bitarray, 16)
}

/**
* Converts a bitarray of length 32 into a number
*
* @method bitarray_to_dword
* @param bitarray {Array}
* @return Number
*/
Toolbox.bitarray_to_dword = function Toolbox___bitarray_to_dword (bitarray) 
{ 
	return Toolbox.bitarray_to_number(bitarray, 32)
}

/**
* @method image_element_to_image_data
* @param image_element {HTMLImageElement}
* @return ImageData
*/
Toolbox.image_element_to_image_data = function Toolbox__image_element_to_image_data (image_element) 
{
	CANVAS.width = image_element.width, CANVAS.height = image_element.height
	CONTEXT.drawImage(image_element, 0, 0)
	var image_data = CONTEXT.getImageData(0,0, image_element.width, image_element.height)
	return image_data
}

// Private Alias
var byte_to_bitarray = Toolbox.bitsize_to_bitarray
var word_to_bitarray = Toolbox.charcode_to_bitarray
var dword_to_bitarray = Toolbox.int32_to_bitarray

// =============================================================================

/**
* Event Handler called everytime a new Adamant image is decoded
*
* @event onmodule
* @param module {AdamantModule}
* @param image_element {HTMLImageElement}
*/
Object.defineProperty(
	Adamant, 
	'onmodule', 
	{
		configurable: false, enumerable: true,
		get: function()
		{
			return ON_MODULE
		},
		set: function(cb)
		{
			if (typeof cb === 'function')
			{
				ON_MODULE = cb
			}
			else if (!cb)
			{
				ON_MODULE = function NOP(){}
			}
		},
	}
)

// -----------------------------------------------------------------------------

/**
* Encodes a string into a 24bit bitmap image in a data URI digest.
*
* @example
*
*	// Sample JS string
* 	var JS_FILE_CONTENTS = 'console.log("executable images ftw!")'
*
*	// Create, show and execute Adamant image
*	var image_element = document.createElement('img')
*	image_element.onload = Adamant.init
*	document.body.appendChild(image_element)
*	image_element.src = Adamant.encode(JS_FILE_CONTENTS)
*
* @method encode
* @param text {String}
* @return String
*/
Adamant.encode = function Adamant__encode(text)
{
	var histogram = Toolbox.histogram(text)
	var prefix_code = Toolbox.prefix_code(histogram)
	var huffman_bits = Toolbox.huffman_bits(text, histogram, prefix_code)
	var prefix_code_bits = Toolbox.prefix_code_to_bitarray(prefix_code)
	var header_object = {
		version: 0,
		content_bitsize: huffman_bits.length,
		prefix_code_bitsize: prefix_code_bits.length
	}
	var header_bitarray = Toolbox.header_object_to_bitarray(header_object)




	console.log(histogram)
	// console.log(prefix_code)
	// console.log(huffman_bits)
	// console.log(prefix_code_bits)
	// console.log('-- HEADER --')
	// console.log(header_object)
	// console.log(header_bitarray)
	// console.log('---')
	// console.log(Toolbox.bitarray_to_prefix_code(prefix_code_bits))
	// console.log(Toolbox.bitarray_to_header_object(header_bitarray))

	var merged_bitarray = header_bitarray.slice(0)
	merged_bitarray.push.apply(merged_bitarray, prefix_code_bits)
	for (var i = 0; i < huffman_bits.length; i++) {
		merged_bitarray[merged_bitarray.length] = huffman_bits[i]
	};
	// merged_bitarray.push.apply(merged_bitarray, huffman_bits)

	// console.log(' --- OUT 0 --- ')
	// console.log(merged_bitarray)
	return Toolbox.bitmap_uri(merged_bitarray)
}

/**
* Decodes a Adamant encoded image back to its original string.
*
* @method decode
* @param image {HTMLImageElement|ImageData}
* @return String
*/
Adamant.decode = function Adamant__decode(image)
{
	var image_data = image instanceof HTMLImageElement
		? Toolbox.image_element_to_image_data(image)
		: image instanceof ImageData
			? image
			: null

	if (!image_data)
	{
		throw new Error('Image must be a HTMLImageElement or ImageData instance')
	}

	var pixelview = new Uint32Array(image_data.data.buffer)
	var magnitude = image_data.width
	var oy = ~~(magnitude/2) - 1
	var ox = ~~(magnitude/2) - 1
	var oindex =  (magnitude * oy) + ox
	var pixel = pixelview[oindex]
	var red = pixel & 0x000000FF
	var blue = (pixel & 0x0000FF00) >> 8
	var green = (pixel & 0x00FF0000) >> 16
	console.log(oindex)
	console.log(pixelview[oindex])
	console.log(String.fromCharCode(red), String.fromCharCode(blue), String.fromCharCode(green))
}

/**
* Watches a page for new images that are inserted into the DOM. The `Adamant Signature`
* is searched, if found it MAY be executed, or passed to a custom callback depending on 
* option provided.
*
* ### Option
*
* `option` by default is **true**
*
* If option is **true** then 
* Watch entire page and autoexecute incoming Adamant images.
*
* If option is **false** then 
* Watch entire page and only decode incoming Adamant images. Decoded Images, as module
* instances will be stored in the `Adamant.modules` Array Getter Property 
*
* If typeof option is a **function** then
* It will be called everytime a Adamant image is decoded. The first argument will be 
* a `Adamant Module` instance. This allows you to execute modules based on your own 
* critera with `module.init()`. The callback must return the module instance to store
* the module in the `Adamant.modules` property. This callback is also called before
* `Adamant.onmodule` and can serve as a preprocessor for said event handler.
*
* @method watch
* @param option {Boolean|Function|Object}
* @callback `onmodule (module, element){}`
*/
Adamant.watch = function Adamant__watch (option) 
{
	if (Adamant.watchref) return

	var interval = 400
	var processing = false
	var auto_execute = false
	var watch_processor = WATCH_PROCESSOR

	// Resolve option
	if (option === true)
	{
		auto_execute = true
	}
	else if (option === false)
	{
		auto_execute = false
	}
	else if (typeof option === 'function')
	{
		watch_processor = option
	}
	else if (option && typeof option === 'object')
	{
		if (typeof option.interval === 'number' && option.interval >= 0)
		{
			interval = option.interval
		}
		if (typeof option.auto_execute === 'boolean')
		{
			auto_execute = option.auto_execute
		}
		if (typeof option.onmodule === 'function')
		{
			watch_processor = onmodule
		}
	}

	function is_image_tagged (image_element) 
	{
		return undefined !== image_element.__ADAMANT_MODULE__
	}

	function is_adamant_image (image_element) 
	{
		// var image_data = Toolbox.image_element_to_image_data(image_element)
		return false
	}

	function initialize_adamant_image (adamant_image) 
	{
		var decoded_text = (adamant_image)
		var module = {}
		module.init = function () {eval(decoded_text)}

		if (typeof watch_processor === onmodule)
		{
			onmodule(module, adamant_image)
		}
		else
		{
			watch_processor(module, adamant_image)
		}
	}

	function heartbeat () 
	{
		if (processing) return
		processing = true
		var image_elements = document.getElementsByTagName('img')
		for (var i = 0, l = image_elements.length; i < l; i++) 
		{
			image_element = image_elements[i]
			is_image_tagged(image_element)
			? 0
			: is_adamant_image(image_element)
			  ? initialize_adamant_image(image_element)
			  : 0	
		}
		processing = false
	}

	Adamant.watchref = setInterval(heartbeat, interval)
}

/**
* Stop watching page for new Adamant images to decode.
*
* @method unwatch
*/
Adamant.unwatch = function Adamant__unwatch()
{
	if (!Adamant.watchref) return
	clearInterval(Adamant.watchref)
	Adamant.watchref = null
}

/**
* Initializes an Adamant encoded image
*
* This method can be used as an image `onload` event handler so it is executed
* upon being loaded.
*
* @example
*
*	<imgs src="calculator.js.bmp", onload="Adamant.init">
*
* @method init
* @param image {HTMLImageElement|ImageData}
*/
Adamant.init = function Adamant__init(image)
{
	var image_data = this instanceof HTMLImageElement
	? Toolbox.image_element_to_image_data(this)
	: image instanceof HTMLImageElement
		? Toolbox.image_element_to_image_data(image)
		: image instanceof ImageData
			? image
			: null

	if (!image_data)
	{
		throw new Error('Image must be a HTMLImageElement or ImageData instance')
	}

	var js_string = Adamant.decode(image_data)
	var module = new AdamantModule(js_string)
}

return Object.freeze(Adamant)
})(null)
