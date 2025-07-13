/**
 * ImageUploader.js - a client-side image resize and upload javascript module
 *
 * @author Ross Turner (https://github.com/zsinj)
 */
const applyBilinearInterpolation = (srcCanvasData, destCanvasData, scale) => {
	function inner(f00, f10, f01, f11, x, y) {
		const un_x = 1.0 - x;
		const un_y = 1.0 - y;
		return f00 * un_x * un_y + f10 * x * un_y + f01 * un_x * y + f11 * x * y;
	}

	let i;
	let j;
	let iyv;
	let iy0;
	let iy1;
	let ixv;
	let ix0;
	let ix1;
	let idxD;
	let idxS00;
	let idxS10;
	let idxS01;
	let idxS11;
	let dx;
	let dy;
	let r;
	let g;
	let b;
	let a;
	for (i = 0; i < destCanvasData.height; ++i) {
		iyv = i / scale;
		iy0 = Math.floor(iyv);
		// Math.ceil can go over bounds
		iy1 = Math.ceil(iyv) > srcCanvasData.height - 1 ? srcCanvasData.height - 1 : Math.ceil(iyv);
		for (j = 0; j < destCanvasData.width; ++j) {
			ixv = j / scale;
			ix0 = Math.floor(ixv);
			// Math.ceil can go over bounds
			ix1 = Math.ceil(ixv) > srcCanvasData.width - 1 ? srcCanvasData.width - 1 : Math.ceil(ixv);
			idxD = (j + destCanvasData.width * i) * 4;
			// Matrix to vector indices
			idxS00 = (ix0 + srcCanvasData.width * iy0) * 4;
			idxS10 = (ix1 + srcCanvasData.width * iy0) * 4;
			idxS01 = (ix0 + srcCanvasData.width * iy1) * 4;
			idxS11 = (ix1 + srcCanvasData.width * iy1) * 4;
			// Overall coordinates to unit square
			dx = ixv - ix0;
			dy = iyv - iy0;
			// I let the r, g, b, a on purpose for debugging
			r = inner(
				srcCanvasData.data[idxS00],
				srcCanvasData.data[idxS10],
				srcCanvasData.data[idxS01],
				srcCanvasData.data[idxS11],
				dx,
				dy,
			);
			destCanvasData.data[idxD] = r;

			g = inner(
				srcCanvasData.data[idxS00 + 1],
				srcCanvasData.data[idxS10 + 1],
				srcCanvasData.data[idxS01 + 1],
				srcCanvasData.data[idxS11 + 1],
				dx,
				dy,
			);
			destCanvasData.data[idxD + 1] = g;

			b = inner(
				srcCanvasData.data[idxS00 + 2],
				srcCanvasData.data[idxS10 + 2],
				srcCanvasData.data[idxS01 + 2],
				srcCanvasData.data[idxS11 + 2],
				dx,
				dy,
			);
			destCanvasData.data[idxD + 2] = b;

			a = inner(
				srcCanvasData.data[idxS00 + 3],
				srcCanvasData.data[idxS10 + 3],
				srcCanvasData.data[idxS01 + 3],
				srcCanvasData.data[idxS11 + 3],
				dx,
				dy,
			);
			destCanvasData.data[idxD + 3] = a;
		}
	}
};

const scaleCanvasWithAlgorithm = (canvas, config) => {
	const scaledCanvas = document.createElement('canvas');

	const scaleX = config.maxWidth / canvas.width;
	const scaleY = config.maxHeight / canvas.height;
	const scale = scaleX < scaleY ? scaleX : scaleY;

	scaledCanvas.width = canvas.width * scale;
	scaledCanvas.height = canvas.height * scale;

	const srcImgData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
	const destImgData = scaledCanvas.getContext('2d').createImageData(scaledCanvas.width, scaledCanvas.height);

	applyBilinearInterpolation(srcImgData, destImgData, scale);

	scaledCanvas.getContext('2d').putImageData(destImgData, 0, 0);

	return scaledCanvas;
};

const getHalfScaleCanvas = (canvas) => {
	const halfCanvas = document.createElement('canvas');
	halfCanvas.width = canvas.width / 2;
	halfCanvas.height = canvas.height / 2;

	halfCanvas.getContext('2d').drawImage(canvas, 0, 0, halfCanvas.width, halfCanvas.height);

	return halfCanvas;
};

const scaleImage = (img, config) => {
	let canvas = document.createElement('canvas');
	canvas.width = img.width;
	canvas.height = img.height;
	canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);

	while (canvas.width >= 2 * config.maxWidth || canvas.height >= 2 * config.maxHeight) {
		canvas = getHalfScaleCanvas(canvas);
	}

	if (canvas.width > config.maxWidth || canvas.height > config.maxHeight) {
		canvas = scaleCanvasWithAlgorithm(canvas, config);
	}

	return canvas.toDataURL('image/jpeg', config.quality);
};

const scaleFile = (file, {maxWidth = 350, maxHeight = 600, quality = 0.7}, callback) => {
	const config = {
		maxWidth,
		maxHeight,
		quality,
	};

	const img = document.createElement('img');
	const reader = new FileReader();
	reader.onload = (e) => {
		img.src = e.target.result;

		img.onload = () => {
			const imageData = scaleImage(img, config);
			if (callback) {
				return callback(imageData);
			}
		};
	};
	reader.readAsDataURL(file);
};

export default scaleFile;
