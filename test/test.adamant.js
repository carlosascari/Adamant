assert = function vvvvvvvvvvvvvvvvvvvv (whatever, message) {if (!whatever) throw new Error(message || 'assertion failed')}

suite('Module Sanity Check')

test('Module Exposed', function () {
	assert(window.Adamant !== undefined)
	assert(typeof Adamant === 'object')
	assert(Adamant.constructor.name === 'Adamant')
})

test('Public Methods & Properties', function () {
	var public_stuff = ['decode', 'encode', 'init', 'onmodule', 'watch', 'unwatch', 'toolbox']
	Object.keys(Adamant).forEach(function (name) {
		var index = public_stuff.indexOf(name)
		assert(index !== -1, 'non-public property is exposed: ' + name)
		public_stuff.splice(index, 1)
	})
	assert(public_stuff.length === 0, 'public properties are not exposed: ' + public_stuff)
})

test('Frozen Singleton', function () {
	assert(new Adamant.constructor === Adamant)
	Adamant.x = 1111
	assert(Adamant.x === undefined)
})

suite('Toolbox')

test('Toolbox#histogram', function () {
	assert(typeof Adamant.toolbox.histogram === 'function')

	var SAMPLE = 'hello world'
	var RESULT = Adamant.toolbox.histogram(SAMPLE)

	assert(RESULT[0][0] === ('l').charCodeAt(0))
	assert(RESULT[0][1] === 3) // letter l occurs 3 times

	assert(RESULT[1][0] === ('o').charCodeAt(0))
	assert(RESULT[1][1] === 2) // letter o occurs 2 times

	for (var i = 2; i < RESULT.length; i++) {
		assert(RESULT[i][1] === 1) // every other letter occurs once
	}
})

test('Toolbox#prefix_code', function () {
	assert(typeof Adamant.toolbox.prefix_code === 'function')
	
	var SAMPLE = 'hello world', uniq_hash = {}, huff_bitstrings = {}, uniq_charcode_count
	
	// prefix_codes will have its keys match each unique charcode in the sample text
	var SAMPLE_CHARCODE_ARRAY = SAMPLE.split('').map(function (v) {
		var charcode = v.charCodeAt(0)
		if (!uniq_hash[charcode]) return uniq_hash[charcode] = charcode
	}).filter(function (v) {
		return v !== undefined
	}); 

	uniq_charcode_count = SAMPLE_CHARCODE_ARRAY.length

	var histogram = Adamant.toolbox.histogram(SAMPLE)
	var RESULT = Adamant.toolbox.prefix_code(histogram)

	// Result keys should match charcodes from each unique
	Object.keys(RESULT).forEach(function (v) {
		var index = SAMPLE_CHARCODE_ARRAY.indexOf(+v)
		assert(index !== -1)
		SAMPLE_CHARCODE_ARRAY.splice(index, 1)

		// Each value is an array of ones an zeroes only
		assert(RESULT[v].length > 1)
		RESULT[v].forEach(function (vv) {
			assert(vv === 1 || vv === 0)
		})

		// Each bitarray must be unique
		huff_bitstrings[RESULT[v].join('')] = 1
	})

	// Make sure there were charcodes missing
	assert(SAMPLE_CHARCODE_ARRAY.length === 0)

	// Each bitarray must be unique and there should be the same number
	// of bitarrays for the number of unique charcodes found
	assert(Object.keys(huff_bitstrings).length === uniq_charcode_count)
})

test('Toolbox#huffman_bits', function () {
	assert(typeof Adamant.toolbox.huffman_bits === 'function')

	// NOTICEL: We will need #prefix_code and #histogram to be valid. As they 
	// will be used to validate this method. Otherwise some external huffman encoder
	// should be used and a object should return with keys referencing the charcodes 
	// in the sample text and their values being an array of ones and zeroes.

	var SAMPLE = 'hello world'
	var RESULT_SHOULD_BE = []

	// Manual Histogram and prefix_code
	var histogram = Adamant.toolbox.histogram(SAMPLE)
	var prefix_code = Adamant.toolbox.prefix_code(histogram)
	SAMPLE.split('').forEach(function (character) {
		var charcode = character.charCodeAt(0)
		RESULT_SHOULD_BE.push.apply(RESULT_SHOULD_BE, prefix_code[charcode])
	})

	var RESULT_A = Adamant.toolbox.huffman_bits(SAMPLE, histogram, prefix_code)
	var RESULT_B = Adamant.toolbox.huffman_bits(SAMPLE, null, prefix_code)
	var RESULT_C = Adamant.toolbox.huffman_bits(SAMPLE, histogram)
	var RESULT_D = Adamant.toolbox.huffman_bits(SAMPLE)

	assert('' + RESULT_SHOULD_BE === RESULT_A + '')
	assert('' + RESULT_SHOULD_BE === RESULT_B + '')
	assert('' + RESULT_SHOULD_BE === RESULT_C + '')
	assert('' + RESULT_SHOULD_BE === RESULT_D + '')
})

test('Toolbox#spiral', function () {
	assert(typeof Adamant.toolbox.spiral === 'function')
	var coordinates = []

	// spiral throws incase you accidently (as i have) forget to put 
	// a number as the first argument.
	try
	{
		Adamant.toolbox.spiral(function (x, y, index) {throw new Error('oh noooo')})
		throw new Error('nuuuuh :(')
	}
	catch(ex){/*shuuushh*/}

	// Run with different lengths
	[30, 453, 534, 23, 34].forEach(function (length) {
		Adamant.toolbox.spiral(length, function (x, y, index) {
			assert(typeof x === 'number')
			assert(typeof y === 'number')
			assert(typeof index === 'number')
			coordinates.push(index)
		})
		assert(coordinates.length === length)
		coordinates.length = 0
	})

    // Well if spiral follows first 11 blocks correctly, we can assume everything 
    // will be ok
    // 
    // 
    //  x-coord  -1   0   1   2
    // ----------------------------|--
    //          [ 4][ 3][ 2]  ^    | 1
    //          [ 5][ 0][ 1][10]   | 0
    //          [ 6][ 7][ 8][ 9]   | -1
    //                             |  y-coord
    // So it: 
	var SHOULD_BE = [
		'0,0', 
        '1,0',
        '1,1',
        '0,1',
        '-1,1',
        '-1,0',
        '-1,-1',
        '0,-1',
        '1,-1',
        '2,-1',
        '2,0',
	] 
	Adamant.toolbox.spiral(10, function (x, y, index) {
        assert(SHOULD_BE[index] === [x, y].join(','))
	})
})

test('Toolbox#bitmap_uri', function (done) {
	assert(typeof Adamant.toolbox.bitmap_uri === 'function')
    
    var SAMPLE = []
    SAMPLE.push.apply(SAMPLE, Adamant.toolbox.charcode_to_bitarray('H'.charCodeAt(0)))
    SAMPLE.push.apply(SAMPLE, Adamant.toolbox.charcode_to_bitarray('E'.charCodeAt(0)))
    SAMPLE.push.apply(SAMPLE, Adamant.toolbox.charcode_to_bitarray('L'.charCodeAt(0)))
    SAMPLE.push.apply(SAMPLE, Adamant.toolbox.charcode_to_bitarray('L'.charCodeAt(0)))
    SAMPLE.push.apply(SAMPLE, Adamant.toolbox.charcode_to_bitarray('O'.charCodeAt(0)))

    var RESULT = Adamant.toolbox.bitmap_uri(SAMPLE)

    assert(RESULT && typeof RESULT === 'string')
    assert(RESULT.indexOf('data:image/bmp;base64,') === 0)

    var image = document.createElement('img')
    image.src = RESULT
    image.onerror = function () {
    	throw new Error('invalid image was generated')
    }
    image.onload = function () {
    	console.log(this)
    	document.body.appendChild(this)
    	done()
    }

    var JUST_BASE64 = RESULT.substr('data:image/bmp;base64,'.length)
    var BASE64_DECODED = atob(JUST_BASE64)
    console.log(SAMPLE)
    console.log(JUST_BASE64)
    console.log(BASE64_DECODED)
})

test('Toolbox#remove_comments', function () {
	assert(typeof Adamant.toolbox.remove_comments === 'function')
       var SAMPLE = 'hello // there how\n is the /*wather*/ sun feeling? // boom'
    var SHOULD_BE = 'hello \n is the  sun feeling? '
    var RESULT = Adamant.toolbox.remove_comments(SAMPLE)
    assert(RESULT === SHOULD_BE)
})

suite('Toolbox Converters')

test('Toolbox#image_element_to_image_data', function () {
	assert(typeof Adamant.toolbox.image_element_to_image_data === 'function')
	var img = document.createElement('img')
	img.width = 1, img.height = 1
	assert(Adamant.toolbox.image_element_to_image_data(img) instanceof ImageData)
})

test('Toolbox#prefix_code_to_bitarray', function () {
	assert(typeof Adamant.toolbox.prefix_code_to_bitarray === 'function')
	var SAMPLE = 'hello world'
	var histogram = Adamant.toolbox.histogram(SAMPLE)
	var prefix_code = Adamant.toolbox.prefix_code(histogram)
	var bitarray = Adamant.toolbox.prefix_code_to_bitarray(prefix_code)
	assert(bitarray instanceof Array)
	assert(bitarray.length)
	bitarray.forEach(function (v) {
		assert(v === 0 || v === 1)
	})
})

test('Toolbox#bitarray_to_prefix_code', function () {
	assert(typeof Adamant.toolbox.bitarray_to_prefix_code === 'function')
	var SAMPLE = 'hello world'
	var histogram = Adamant.toolbox.histogram(SAMPLE)
	var prefix_code = Adamant.toolbox.prefix_code(histogram)
	var bitarray = Adamant.toolbox.prefix_code_to_bitarray(prefix_code)
	var RESULT = Adamant.toolbox.bitarray_to_prefix_code(bitarray)
	assert(RESULT && typeof RESULT === 'object')
	assert(JSON.stringify(prefix_code) === JSON.stringify(RESULT))
})

test('Toolbox#header_object_to_bitarray', function () {
	assert(typeof Adamant.toolbox.header_object_to_bitarray === 'function')

	var SIGNATURE = 'ADA'
	var SAMPLE = {
		version: 0,
		content_bitsize: 32,
		prefix_code_bitsize: 32
	}

	var bitarray = Adamant.toolbox.header_object_to_bitarray(SAMPLE)
	assert(bitarray instanceof Array)
	assert(bitarray.length)
	bitarray.forEach(function (v) {
		assert(v === 0 || v === 1)
	})

	var sigA = parseInt(bitarray.splice(0, 8).join(''), 2)
	var sigB = parseInt(bitarray.splice(0, 8).join(''), 2)
	var sigC = parseInt(bitarray.splice(0, 8).join(''), 2)
	var version = parseInt(bitarray.splice(0, 8).join(''), 2)
	var prefix_code_size = parseInt(bitarray.splice(0, 32).join(''), 2)
	var content_size = parseInt(bitarray.splice(0, 32).join(''), 2)

	assert(sigA === SIGNATURE[0].charCodeAt(0))
	assert(sigB === SIGNATURE[1].charCodeAt(0))
	assert(sigC === SIGNATURE[2].charCodeAt(0))
	assert(version === SAMPLE.version)
	assert(prefix_code_size === SAMPLE.prefix_code_bitsize)
	assert(content_size === SAMPLE.content_bitsize)
	assert(bitarray.length === 0)
})

test('Toolbox#bitarray_to_header_object', function () {
	assert(typeof Adamant.toolbox.bitarray_to_header_object === 'function')
	var header_object = {
		version: 0,
		content_bitsize: Math.random() * 0xFFFFFFFFFF >>> 0,
		prefix_code_bitsize: Math.random() * 0xFFFFFFFFFF >>> 0
	}
	var SAMPLE = Adamant.toolbox.header_object_to_bitarray(header_object)
	var RESULT = Adamant.toolbox.bitarray_to_header_object(SAMPLE)

	assert(RESULT && typeof RESULT === 'object')
	assert(RESULT.version === header_object.version)
	assert(RESULT.content_bitsize === header_object.content_bitsize)
	assert(RESULT.prefix_code_bitsize === header_object.prefix_code_bitsize)
})

test('Toolbox#charcode_to_bitarray', function () {
	assert(typeof Adamant.toolbox.charcode_to_bitarray === 'function')
	var SAMPLE = 'G'.charCodeAt(0)
	var RESULT = Adamant.toolbox.charcode_to_bitarray(SAMPLE)
	assert(RESULT instanceof Array)
	assert(RESULT.length)
	var index = 0 
	SAMPLE.toString(2).split('').reverse().forEach(function (bit) {
		assert(RESULT[RESULT.length - index - 1] === +bit)
		index ++
	})
})

test('Toolbox#bitsize_to_bitarray', function () {
	assert(typeof Adamant.toolbox.bitsize_to_bitarray === 'function')
	var SAMPLE = Math.random() * 0xFF >>> 0
	var RESULT = Adamant.toolbox.bitsize_to_bitarray(SAMPLE)
	assert(typeof RESULT === 'object' && RESULT.length)
	assert(parseInt(RESULT.join(''), 2) === SAMPLE)
})

test('Toolbox#int32_to_bitarray', function () {
	assert(typeof Adamant.toolbox.int32_to_bitarray === 'function')
	var SAMPLE = Math.random() * 0xFFFFFFFF >>> 0
	var RESULT = Adamant.toolbox.int32_to_bitarray(SAMPLE)
	assert(typeof RESULT === 'object' && RESULT.length)
	assert(parseInt(RESULT.join(''), 2) === SAMPLE)
})

test('Toolbox#bitarray_to_number', function () {
	assert(typeof Adamant.toolbox.bitarray_to_number === 'function')
	var SAMPLE = Math.random() * 0xFFFFFFFF >>> 0
	var SAMPLE2 = Adamant.toolbox.int32_to_bitarray(SAMPLE)
	var RESULT = Adamant.toolbox.bitarray_to_number(SAMPLE2)
	assert(RESULT === SAMPLE)
})

test('Toolbox#bitarray_to_byte', function () {
	assert(typeof Adamant.toolbox.bitarray_to_byte === 'function')
	var SAMPLE = Math.random() * 0xFF >>> 0
	var SAMPLE2 = Adamant.toolbox.int32_to_bitarray(SAMPLE).slice(-8)
	var RESULT = Adamant.toolbox.bitarray_to_byte(SAMPLE2)
	assert(RESULT === SAMPLE)
})

test('Toolbox#bitarray_to_word', function () {
	assert(typeof Adamant.toolbox.bitarray_to_word === 'function')
	var SAMPLE = Math.random() * 0xFFFF >>> 0
	var SAMPLE2 = Adamant.toolbox.int32_to_bitarray(SAMPLE).slice(-16)
	var RESULT = Adamant.toolbox.bitarray_to_word(SAMPLE2)
	assert(RESULT === SAMPLE)
})

test('Toolbox#bitarray_to_dword', function () {
	assert(typeof Adamant.toolbox.bitarray_to_dword === 'function')
	var SAMPLE = Math.random() * 0xFFFFFFFF >>> 0
	var SAMPLE2 = Adamant.toolbox.int32_to_bitarray(SAMPLE).slice(-32)
	var RESULT = Adamant.toolbox.bitarray_to_dword(SAMPLE2)
	assert(RESULT === SAMPLE)
})

suite('Public API')

test('Adamant#encode', function () {
	assert(typeof Adamant.encode === 'function')

	var SAMPLE = "console.log('Adamant')"
	var RESULT = Adamant.encode(SAMPLE)
	assert(RESULT)
	assert(typeof RESULT === 'string')

	throw new Error('not finished')
})

test('Adamant#decode', function () {
	assert(typeof Adamant.decode === 'function')

	var SAMPLE = "console.log('Adamant')"
	var ENCODED = Adamant.encode(SAMPLE)
	var img = document.createElement('img')
	img.src = ENCODED
	var DECODED = Adamant.decode(img)

	assert(DECODED === SAMPLE, 'decoding failed')

})

test('Adamant#watch', function () {
	assert(typeof Adamant.watch === 'function')
	throw new Error('not finished')
})

test('Adamant#unwatch', function () {
	assert(typeof Adamant.unwatch === 'function')
	throw new Error('not finished')
})

test('Adamant#init', function () {
	assert(typeof Adamant.init === 'function')
	throw new Error('not finished')
})

test('Adamant#onmodule', function () {
	assert(typeof Adamant.onmodule === 'function')
	throw new Error('not finished')
})
