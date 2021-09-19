import fs from 'fs'

import prettyBytes from 'pretty-bytes'

export default class FileHelper {
	static async getFileStatus(downloadsFolder) {
		const currentFiles = await fs.promises.readdir(downloadsFolder)

		const statusesPromises = currentFiles.map((file) =>
			fs.promises.stat(`${downloadsFolder}/${file}`)
		)
		const statuses = await Promise.all(statusesPromises)

		const filesStatuses = []
		for (const fileIndex in currentFiles) {
			const { birthtime, size } = statuses[fileIndex]
			if (currentFiles[fileIndex] === '.gitkeep') continue

			filesStatuses.push({
				size: prettyBytes(size),
				file: currentFiles[fileIndex],
				lastModified: birthtime,
				owner: process.env.USER,
			})
		}

		return filesStatuses
	}
}
