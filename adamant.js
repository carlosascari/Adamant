/**
* Provides Adamant singleton
*
* @module Adamant
*/
var Adamant = (function () {
var Adamant = {}

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
* Look up table for converting characters to their charcodes without a function
* call.
*
* @property CHARCODE_LOOKUP
* @type Object
*/
var CHARCODE_LOOKUP = {}

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
* Hash of JS keywords, common patterns, in order to improve compression
*
* @property JS_DICT
* @type Object
* @final
*/
var JS_DICT = [
	'this', 'function', 'if', 'return', 'var', 'else',
	'for', 'new', 'typeof', 'while', 'case', 'break',
	'do', 'in', 'try', 'enum', 'null', 'true', 'void', 
	'with', 'catch', 'class', 'const', 'false', 'super', 
	'throw', 'delete', 'export', 'import', 'switch', 
	'default', 'extends', 'finally', 'continue', 'debugger',
	'0;', '/*', '**', '*/', '//', '++', '--', '()', '  ', '[]',
	'setTimeout', 'setInterval', 'toString'
]

// -----------------------------------------------------------------------------

/**
* Gathers the frequency of each character in a body of text, and sorts so most
* frequent character codes are first.
* 
* **Note** Each element is an array: `[<charcode>, <frequency>]`
*
* @method histogram 
* @param text {String}
* @return Array
*/
function histogram(text)
{
	var freq_hash = {}, histogram = []
	for (var i = 0, l = text.length; i < l; i++)
	{
		var character = text[i]
		var charcode = CHARCODE_LOOKUP[character] || (CHARCODE_LOOKUP[character] = character.charCodeAt(0))
		freq_hash[charcode] = (freq_hash[charcode] >>> 0) + 1
	}

	var charcodes = Object.keys(freq_hash)
	for (var i = 0, l = charcodes.length; i < l; i++) 
	{
		var charcode = charcodes[i] >>> 0
		histogram[histogram.length] = [charcode, freq_hash[charcode]]
	}

	histogram.sort(function sortFunction(a, b){return b[1] - a[1]})

	return histogram
}

/**
* Uses a histogram to build huffman code for each charcode.
* 
* **Note** Each element is an array: `[<charcode>, <Array code>]`
*
* @method prefix_code 
* @param histogram {Array}
* @return Array
*/
function prefix_code (histogram) 
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

	return histogram
}

// -----------------------------------------------------------------------------

function spiral(){}

// -----------------------------------------------------------------------------

Adamant.spiral = function Adamant__spiral()
{
	spiral.apply(spiral, arguments)
}

// -----------------------------------------------------------------------------

return Adamant
})();
