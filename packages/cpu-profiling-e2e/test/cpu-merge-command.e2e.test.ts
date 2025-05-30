import {describe} from "vitest";
import {executeProcess} from "@push-based/testing-utils"
describe('cpu-merge-command', () => {
    it('should merge profiles in a folder with defaults', async () => {

        await expect(executeProcess('cpu-merge-command')).toStrictEqual({})

    })
})
