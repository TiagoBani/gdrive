import fs from 'fs'
import { resolve } from 'path'
import { pipeline } from 'stream/promises'

import { describe, test, expect, jest, beforeEach } from '@jest/globals'

import UploadHandler from '../../src/uploadHandler'
import TestUtil from '../_util/testUtil'
import { logger } from '../../src/logger'

describe('#UploadHandler suite test', () => {
	const ioObj = {
		to: (io) => ioObj,
		emit: (event, message) => {},
	}

	beforeEach(() => jest.spyOn(logger, 'info').mockResolvedValue())

	describe('#registerEvents', () => {
		test('should call onFile and onFinish functions on BusBoy instance', () => {
			const uploadHandler = new UploadHandler({ io: ioObj, socketId: '01' })
			jest.spyOn(uploadHandler, uploadHandler.onFile.name).mockResolvedValue()
			const headers = { 'content-type': 'multipart/form-data; boundary=' }
			const fn = jest.fn()

			const busboyInstance = uploadHandler.registerEvents(headers, fn)

			const fileStream = TestUtil.generateReadableStream([
				'chunck',
				'of',
				'data',
			])
			busboyInstance.emit('file', 'fieldname', fileStream, 'filename.txt')
			busboyInstance.listeners('finish')[0].call()

			expect(uploadHandler.onFile).toHaveBeenCalled()
			expect(fn).toHaveBeenCalled()
		})
	})
	describe('#onFile', () => {
		test('given a stream file it should save it n disk', async () => {
			const chunks = ['hey', 'dude']
			const downloadsFolder = '/tmp'
			const handler = new UploadHandler({
				io: ioObj,
				socketId: '01',
				downloadsFolder,
			})
			const onData = jest.fn()
			jest
				.spyOn(fs, fs.createWriteStream.name)
				.mockImplementation(() => TestUtil.generateWritableStream(onData))
			const onTransform = jest.fn()
			jest
				.spyOn(handler, handler.handleFileBytes.name)
				.mockImplementation(() => TestUtil.generateTransformStream(onTransform))
			const params = {
				fieldname: 'video',
				file: TestUtil.generateReadableStream(chunks),
				filename: 'mockFile.rmvb',
			}

			await handler.onFile(...Object.values(params))

			expect(onData.mock.calls.join()).toEqual(chunks.join())
			expect(onTransform.mock.calls.join()).toEqual(chunks.join())
			const expectedFilename = resolve(handler.downloadsFolder, params.filename)
			expect(fs.createWriteStream).toHaveBeenCalledWith(expectedFilename)
		})
	})
	describe('#handleFileBytes', () => {
		test('should call emit function an it is a transform stream', async () => {
			jest.spyOn(ioObj, ioObj.to.name)
			jest.spyOn(ioObj, ioObj.emit.name)
			const messages = ['hello']
			const source = TestUtil.generateReadableStream(messages)
			const onWrite = jest.fn()
			const target = TestUtil.generateWritableStream(onWrite)
			const handler = new UploadHandler({ io: ioObj, socketId: '01' })
			jest.spyOn(handler, handler.canExecute.name).mockReturnValue(true)

			await pipeline(source, handler.handleFileBytes('filename.txt'), target)

			expect(ioObj.to).toHaveBeenCalledTimes(messages.length)
			expect(ioObj.emit).toHaveBeenCalledTimes(messages.length)

			expect(onWrite).toBeCalledTimes(messages.length)
			expect(onWrite.mock.calls.join()).toEqual(messages.join())
		})
		test('given message timerDelay as 2 seconds it should emit only two on message during 2 seconds period', async () => {
			jest.spyOn(ioObj, ioObj.emit.name)
			const day = '2021-07-02 01:01'
			const messageTimeDelay = 2000
			const onFirstLastMessageSent = TestUtil.getTimeFromDate(`${day}:00`)
			const onFirstCanExecute = TestUtil.getTimeFromDate(`${day}:02`)
			const onSecondUpdateLastMessageSent = onFirstCanExecute
			const onSecondCanExecute = TestUtil.getTimeFromDate(`${day}:03`)
			const onThirdCanExecute = TestUtil.getTimeFromDate(`${day}:04`)
			TestUtil.mockDateNow([
				onFirstLastMessageSent,
				onFirstCanExecute,
				onSecondUpdateLastMessageSent,
				onSecondCanExecute,
				onThirdCanExecute,
			])
			const messages = ['hello', 'hello', 'world']
			const expectedMessageSent = 2
			const filename = 'filename.avi'
			const source = TestUtil.generateReadableStream(messages)

			const handler = new UploadHandler({
				io: ioObj,
				socketId: '01',
				messageTimeDelay,
			})
			await pipeline(source, handler.handleFileBytes(filename))

			expect(ioObj.emit).toHaveBeenCalledTimes(expectedMessageSent)
			const [firstCallResult, secondCallResult] = ioObj.emit.mock.calls
			expect(firstCallResult).toEqual([
				handler.ON_UPLOAD_EVENT,
				{ processedAlready: 'hello'.length, filename },
			])
			expect(secondCallResult).toEqual([
				handler.ON_UPLOAD_EVENT,
				{ processedAlready: messages.join('').length, filename },
			])
		})
	})
	describe('#canExecute', () => {
		test('should return true when time is later than specified delay', () => {
			const timerDelay = 1000
			const uploadHandler = new UploadHandler({
				io: {},
				socketId: '',
				messageTimeDelay: timerDelay,
			})
			const tickNow = TestUtil.getTimeFromDate('2021-07-01 00:00:03')
			TestUtil.mockDateNow([tickNow])
			const lastExecution = TestUtil.getTimeFromDate('2021-07-01 00:00:00')

			const result = uploadHandler.canExecute(lastExecution)

			expect(result).toBeTruthy()
		})
		test('should return false when time is not later than specified delay', () => {
			const timerDelay = 3000
			const uploadHandler = new UploadHandler({
				io: {},
				socketId: '',
				messageTimeDelay: timerDelay,
			})
			const now = TestUtil.getTimeFromDate('2021-07-01 00:00:01')
			TestUtil.mockDateNow([now])
			const lastExecution = TestUtil.getTimeFromDate('2021-07-01 00:00:00')

			const result = uploadHandler.canExecute(lastExecution)

			expect(result).toBeFalsy()
		})
	})
})
