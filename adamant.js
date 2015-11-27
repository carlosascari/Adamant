/**
* Provides Adamant singleton
*
* @module Adamant
*/
var Adamant = (function () {

/**
* @class Adamant
* @constructor
*/
var Adamant = new (function Adamant(){})

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
	Object.defineProperty(
		this, 
		'init', 
		{
			configurable: false, writable: false, enumerable: true,
			value: new Function(js_string)
		}
	)

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
* Huffman Tree Node
*
* @property NODE_LEAF
* @type Number
* @final
*/
const NODE_LEAF = 0x01

/**
* Huffman Tree.
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
* @property REDMASK
* @type Number
* @final
*/
const REDMASK = 0x000000FF

/**
* @property GREENMASK
* @type Number
* @final
*/
const GREENMASK = 0x0000FF00

/**
* @property BLUEMASK
* @type Number
* @final
*/
const BLUEMASK = 0x00FF0000

/**
* @property ALPHAMASK
* @type Number
* @final
*/
const ALPHAMASK = 0xFF000000

/**
* Event handler called everytime a new Adamant image is decoded
*
* @property ON_MODULE
* @type Function
*/
var ON_MODULE = function(){}

/**
* Whether to automatically execute a decoded Adamant image when watch is active
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
var WATCH_PROCESSOR = function onmodule (module, image_element) 
{
	if (AUTO_EXECUTE) module.init.apply(module, image_element)
}

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

// -----------------------------------------------------------------------------

/**
* Gathers the frequency of each character in a body of text, and sorts so most
* frequent character codes are first.
* 
* A histogram is a Array with each element an array with the following 2 elements:
*
*	charcode  - Number representation of a character
*	frequency - Number of times the charcode occured in text
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

	histogram.sort(f_sort_histogram_desc)

	return histogram
}

/**
* Uses a histogram to build huffman code for each charcode.
* 
* A prefix_code is a Hash/Object with each key as the charcode and its value
* an Array of zeroes and ones representing huffman encoded bits
* 
* respectively.
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
	var histogram = typeof histogram  === 'array' || Toolbox.histogram(text)
	var prefix_code = prefix_code && typeof prefix_code  === 'object' || Toolbox.prefix_code(histogram)
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

/**
* Converts a prefix_code object to a Array of bits with Adamants structure rules
* so to allow decoding of Adamant javascript content on any image.
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
		bitarray.push.apply(bitarray, charcode_to_bitarray(charcode))
		bitarray.push.apply(bitarray, bitsize_to_bitarray(huffman_bits.length))
		bitarray.push.apply(bitarray, huffman_bits)
	}
	return bitarray
}

/**
* 
*
* @method adamant_header
* @param image_data {ImageData}
* @return Object
*/
Toolbox.adamant_header = function Toolbox__adamant_header(image_data)
{

}

/**
* 
*
* @method adamant_metadata
* @param image_data {ImageData}
* @param [adamant_header] {Object}
* @return Object
*/
Toolbox.adamant_metadata = function Toolbox__adamant_metadata(image_data, adamant_header)
{

}

// -----------------------------------------------------------------------------

/**
* Converts a charcode of up to 16 bits of size, into a Array of ones and zeroes
*
* @method charcode_to_bitarray
* @param charcode {Number}
* @return Array
*/
function charcode_to_bitarray (charcode) 
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
* Converts a size of up to 255, into an Array of ones and zeroes
*
* @method bitsize_to_bitarray
* @param size {Number}
* @return Array
*/
function bitsize_to_bitarray (size) 
{
	charcode = charcode >>> 0
	return [
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
* @method image_element_to_image_data
* @param image_element {HTMLImageElement}
* @return ImageData
*/
function image_element_to_image_data (image_element) 
{
	CANVAS.width = image_element.width, CANVAS.height = image_element.height
	CONTEXT.drawImage(image_element, 0, 0)
	var image_data = CONTEXT.getImageData(0,0, image_element.width, image_element.height)
	return image_data
}

// -----------------------------------------------------------------------------

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
		configurable: false, writable: true, enumerable: true,
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
		// var image_data = image_element_to_image_data(image_element)
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
}

/**
* Decodes a Adamant encoded image back to its original string.
*
* @method decode
* @param image {HTMLImageElement|ImageData}
* @return String
*/
Adamant.decode = function Adamant__decode(image){}

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
	? image_element_to_image_data(this)
	: image instanceof HTMLImageElement
		? image_element_to_image_data(image)
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

return Adamant
})()
