import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { firebaseStorage } from './firebase';

const MAX_DIMENSION = 1280;
const TARGET_MAX_BYTES = 500 * 1024;

function loadImage(file) {
	return new Promise((resolve, reject) => {
		const img = new Image();
		const objectUrl = URL.createObjectURL(file);

		img.onload = () => {
			URL.revokeObjectURL(objectUrl);
			resolve(img);
		};

		img.onerror = () => {
			URL.revokeObjectURL(objectUrl);
			reject(new Error('Falha ao ler imagem para compressao.'));
		};

		img.src = objectUrl;
	});
}

function canvasToBlob(canvas, type, quality) {
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (!blob) {
					reject(new Error('Falha ao gerar blob da imagem.'));
					return;
				}

				resolve(blob);
			},
			type,
			quality
		);
	});
}

export async function compressImage(file) {
	if (!file?.type?.startsWith('image/') || file.type === 'image/svg+xml') {
		return file;
	}

	const image = await loadImage(file);
	const originalWidth = image.width;
	const originalHeight = image.height;

	let width = originalWidth;
	let height = originalHeight;

	if (Math.max(width, height) > MAX_DIMENSION) {
		if (width >= height) {
			width = MAX_DIMENSION;
			height = Math.round((originalHeight / originalWidth) * MAX_DIMENSION);
		} else {
			height = MAX_DIMENSION;
			width = Math.round((originalWidth / originalHeight) * MAX_DIMENSION);
		}
	}

	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;

	const ctx = canvas.getContext('2d');
	if (!ctx) {
		return file;
	}

	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = 'high';
	ctx.drawImage(image, 0, 0, width, height);

	const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
	const extension = outputType === 'image/png' ? 'png' : 'jpg';

	let quality = outputType === 'image/png' ? undefined : 0.9;
	let blob = await canvasToBlob(canvas, outputType, quality);

	if (outputType !== 'image/png' && blob.size > TARGET_MAX_BYTES) {
		for (let i = 0; i < 8 && blob.size > TARGET_MAX_BYTES; i += 1) {
			quality = Math.max(0.4, Number(quality || 0.9) - 0.08);
			blob = await canvasToBlob(canvas, outputType, quality);
		}
	}

	if (blob.size >= file.size) {
		return file;
	}

	const outputName = file.name.replace(/\.[^.]+$/, `.${extension}`);
	return new File([blob], outputName, { type: outputType });
}

export async function uploadImage(file, { folder = 'chat-images', onProgress } = {}) {
	const optimized = await compressImage(file);
	const extension = optimized.name.split('.').pop() || 'jpg';
	const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;
	const storageRef = ref(firebaseStorage, path);

	const task = uploadBytesResumable(storageRef, optimized, {
		contentType: optimized.type || 'application/octet-stream',
	});

	return new Promise((resolve, reject) => {
		task.on(
			'state_changed',
			(snapshot) => {
				const progress = snapshot.totalBytes > 0 ? (snapshot.bytesTransferred / snapshot.totalBytes) * 100 : 0;
				if (onProgress) {
					onProgress(progress);
				}
			},
			(error) => {
				reject(error);
			},
			async () => {
				const url = await getDownloadURL(task.snapshot.ref);
				resolve({ url, path, size: optimized.size });
			}
		);
	});
}
