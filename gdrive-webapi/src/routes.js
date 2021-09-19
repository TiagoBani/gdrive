import { dirname, resolve } from 'path'
import { fileURLToPath, URL } from 'url'
import { pipeline } from 'stream/promises'

import FileHelper from './fileHelper.js'
import { logger } from './logger.js'
import UploadHandler from './uploadHandler.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const defaultDownloadsFolder = resolve(__dirname, '../', 'downloads')

export default class Routes {
	constructor(downloadsFolder = defaultDownloadsFolder) {
		this.downloadsFolder = downloadsFolder
		this.fileHelper = FileHelper
		this.io = {}
	}

	setSocketInstance(io) {
		this.io = io
	}

	async defaultRoute(request, response) {
		response.end('hello')
	}

	async options(request, response) {
		response.writeHead(204)
		response.end()
	}

	async post(request, response) {
		const { headers } = request
		const { searchParams } = new URL(request.url)
		const socketId = searchParams.get('socketId')

		const uploadHandler = new UploadHandler({
			socketId,
			io: this.io,
			downloadsFolder: this.downloadsFolder,
		})

		const onFinish = (res) => () => {
			res.writeHead(200)
			const data = JSON.stringify({
				result: 'Files uploaded with success',
			})
			res.end(data)
		}

		const busboyInstance = uploadHandler.registerEvents(
			headers,
			onFinish(response)
		)

		await pipeline(request, busboyInstance)

		logger.info('Request finished with success!')
	}
	async get(request, response) {
		const files = await this.fileHelper.getFileStatus(this.downloadsFolder)

		response.writeHead(200)
		response.end(JSON.stringify(files))
	}

	async handler(request, response) {
		response.setHeader('Access-Control-Allow-Origin', '*')

		const chosen = this[request.method.toLowerCase()] || this.defaultRoute
		return chosen.apply(this, [request, response])
	}
}
