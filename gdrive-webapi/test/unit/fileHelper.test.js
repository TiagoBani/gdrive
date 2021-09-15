import { describe, test, expect, jest } from '@jest/globals'
import fs from 'fs'
import FileHelper from '../../src/fileHelper.js'
import Routes from '../../src/routes.js'

describe('#FileHelper suite test', () => {
	describe('#getFileStatus', () => {
		test('it should return files statuses in correct format', async () => {
			const statMock = {
				dev: 66307,
				mode: 33204,
				nlink: 1,
				uid: 1000,
				gid: 1000,
				rdev: 0,
				blksize: 4096,
				ino: 7736329,
				size: 266331,
				blocks: 528,
				atimeMs: 1631677787778,
				mtimeMs: 1631677826867,
				ctimeMs: 1631677826862.679,
				birthtimeMs: 1631677787778.0347,
				atime: '2021-09-15T03:49:47.778Z',
				mtime: '2021-09-15T03:50:26.867Z',
				ctime: '2021-09-15T03:50:26.863Z',
				birthtime: '2021-09-15T03:49:47.778Z',
			}
			const userMock = 'tiagobani'
			process.env.USER = userMock
			const filename = 'file.png'
			jest
				.spyOn(fs.promises, fs.promises.readdir.name)
				.mockResolvedValue([filename])
			jest.spyOn(fs.promises, fs.promises.stat.name).mockResolvedValue(statMock)

			const result = await FileHelper.getFileStatus('/tmp')
			const expectedResult = [
				{
					size: '266 kB',
					lastModified: statMock.birthtime,
					owner: userMock,
					file: filename,
				},
			]

			expect(fs.promises.stat).toHaveBeenCalledWith(`/tmp/${filename}`)
			expect(result).toMatchObject(expectedResult)
		})
	})
})
