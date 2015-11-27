/**
* Provides Adamant singleton
*
* @module Adamant
*/
var Adamant = (function () {
var Adamant = new (function Adamant(){})

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

function image_element_to_image_data (image_element) 
{
	CANVAS.width = image_element.width, CANVAS.height = image_element.height
	CONTEXT.drawImage(image_element, 0, 0)
	var image_data = CONTEXT.getImageData(0,0, image_element.width, image_element.height)
	return image_data
}	
function image_data_to_image_element (image_data) 
{

}
function image_data_to_byte_array (image_data) {}	
function byte_array_to_image_data (byte_array) {}	
function byte_array_to_bitmap_data_url (byte_array) {}	
function bitmap_data_url_to_byte_array (bitmap_data_url) {}	
function text_find_patterns (text) {}
function text_remove_comments (text) {}
function text_minifyjs (text) {}
function text_custom_processor (text, processor) {}
function text_histogram (text) {}
function histogram_prefix_code (histogram) {}
function text_prefix_code (text) {}
function text_huffman_encode (text, prefix_code, histogram) {}

// -----------------------------------------------------------------------------

/**
* @method watch
* @param option {Boolean|Function}
* @return 
*/
Adamant.watch = function Adamant__watch (option) 
{
	if (Adamant.watchref) return

	var interval = 400
	var processing = false, 
	var auto_execute = false,
	var watch_processor = function onmodule (module, image_element) {
		if (auto_execute)
		{
			module.init.apply(module, image_element)
		}
	}

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
		var image_data = image_element_to_image_data(image_element)
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

Adamant.unwatch()
Adamant.unwatch(Function)
Adamant.watch(true)
Adamant.watch(false)
Adamant.watch(function onmodule (module, element){})
Adamant.write(text)
Adamant.read(image_element)
Adamant.read(image_data)
Adamant.init(image_element)
Adamant.download(image_element)
Adamant.download(image_data)
Adamant.toolbox.

})()
