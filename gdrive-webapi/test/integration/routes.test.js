import fs from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

import {
	describe,
	test,
	expect,
	jest,
	beforeAll,
	afterAll,
} from '@jest/globals'
import FormData from 'form-data'

import Routes from '../../src/routes.js'
import TestUtil from '../_util/testUtil.js'
import { logger } from '../../src/logger.js'

describe('#Routes Integration suite test', () => {
	let defaultDownloadsFolder = ''

	beforeAll(async () => {
		defaultDownloadsFolder = await fs.promises.mkdtemp(
			join(tmpdir(), 'downloads-')
		)
	})

	afterAll(
		async () =>
			await fs.promises.rm(defaultDownloadsFolder, { recursive: true })
	)

	beforeEach(() => jest.spyOn(logger, 'info').mockResolvedValue())

	describe('#getFileStatus', () => {
		const ioObj = {
			to: (io) => ioObj,
			emit: (event, message) => {},
		}

		test('should upload file to the folder', async () => {
			const filename = 'example.png'
			const fileStream = fs.createReadStream(
				join('.', 'test', 'integration', 'mocks', filename)
			)
			const response = TestUtil.generateWritableStream(() => {})
			const form = new FormData()
			form.append('photo', fileStream)
			const defaultParams = {
				request: Object.assign(form, {
					headers: form.getHeaders(),
					method: 'POST',
					url: 'http://localhost?socketId=10',
				}),
				response: Object.assign(response, {
					setHeader: jest.fn(),
					writeHead: jest.fn(),
					end: jest.fn(),
				}),
				values: () => Object.values(defaultParams),
			}
			const routes = new Routes(defaultDownloadsFolder)
			routes.setSocketInstance(ioObj)

			const dirBeforeRan = await fs.promises.readdir(defaultDownloadsFolder)
			expect(dirBeforeRan).toEqual([])

			await routes.handler(...defaultParams.values())

			const dirAfterRan = await fs.promises.readdir(defaultDownloadsFolder)
			expect(dirAfterRan).toEqual([filename])
			expect(defaultParams.response.writeHead).toHaveBeenCalledWith(200)
			expect(defaultParams.response.end).toHaveBeenCalledWith(
				JSON.stringify({
					result: 'Files uploaded with success',
				})
			)
		})
	})
})
