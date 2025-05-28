import {describe, expect, it, vi} from 'vitest';
import {cpuProfilesToTraceFile} from './cpu-to-trace-events';
import * as profileSelection from './profile-selection';
import {mkdir} from 'fs/promises';
import {join} from 'path';
import {fileURLToPath} from 'url';
import {CPUProfile} from './cpuprofile.types';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const minimalCpuProfile: CPUProfile = {
    "nodes": [
        {
            "id": 1,
            "callFrame": {
                "functionName": "(root)",
                "scriptId": "0",
                "url": "",
                "lineNumber": -1,
                "columnNumber": -1
            },
            "children": [2, 3]
        },
        {
            "id": 2,
            "callFrame": {
                "functionName": "work-1",
                "scriptId": "1",
                "url": "file:///a.js",
                "lineNumber": 92,
                "columnNumber": 19
            },
            "children": [4]
        },
        {
            "id": 4,
            "callFrame": {
                "functionName": "helper",
                "scriptId": "1",
                "url": "file:///a.js",
                "lineNumber": 98,
                "columnNumber": 5
            },
            "children": [5]
        },
        {
            "id": 5,
            "callFrame": {
                "functionName": "compute",
                "scriptId": "1",
                "url": "file:///a.js",
                "lineNumber": 99,
                "columnNumber": 5
            },
            "children": []
        }
    ],
    "startTime": 1,
    "endTime": 160,
    "samples": [
        1, 2, 4, 5, 4, 2, 1
    ],
    "timeDeltas": [
        0, 10, 10, 10, 10, 10, 10
    ]
};
const minimalCpuProfile2: CPUProfile = {
        "nodes": [
            {
                "id": 1,
                "callFrame": {
                    "functionName": "(root)",
                    "scriptId": "0",
                    "url": "",
                    "lineNumber": -1,
                    "columnNumber": -1
                },
                "children": [3]
            },
            {
                "id": 3,
                "callFrame": {
                    "functionName": "work-2",
                    "scriptId": "2",
                    "url": "file:///b.js",
                    "lineNumber": 92,
                    "columnNumber": 19
                },
                "children": [6]
            },
            {
                "id": 6,
                "callFrame": {
                    "functionName": "fetch-data",
                    "scriptId": "2",
                    "url": "file:///b.js",
                    "lineNumber": 120,
                    "columnNumber": 3
                },
                "children": [7]
            },
            {
                "id": 7,
                "callFrame": {
                    "functionName": "parse-result",
                    "scriptId": "2",
                    "url": "file:///b.js",
                    "lineNumber": 121,
                    "columnNumber": 5
                },
                "children": []
            }
        ],
        "startTime": 1,
        "endTime": 160,
        "samples": [
            1, 3, 6, 7, 6, 7, 6, 3, 1
        ],
        "timeDeltas": [
            10, 10, 10, 10, 10, 10, 10, 10, 10
        ]
    }
;

// Create a shared test fixture
const createTestProfileInfo = (overrides?: {
    cpuProfile?: Partial<CPUProfile>;
    startDate?: Date;
    pid?: number;
    tid?: number;
    sequence?: number;
}) => {
    const {cpuProfile, ...rest} = overrides || {};
    return {
        cpuProfile: {
            ...minimalCpuProfile,
            ...cpuProfile,
        },
        startDate: new Date('2025-05-17T20:56:31.714Z'),
        pid: 10001,
        tid: 20001,
        sequence: 1,
        ...rest,
    };
}

describe('cpuProfilesToTraceFile', () => {
    let getMainProfileInfoSpy: any;

    beforeAll(async () => {
        await mkdir(join(__dirname, '__snapshots__'), {recursive: true});
    });

    beforeEach(() => {
        getMainProfileInfoSpy = vi.spyOn(profileSelection, 'getMainProfileInfo');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should convert a single CPU profile into a trace file with correct metadata and events', async () => {
        const profiles = [createTestProfileInfo()];

        const result = cpuProfilesToTraceFile(profiles);

        expect(getMainProfileInfoSpy).toHaveBeenCalledWith(profiles);
        await expect(JSON.stringify(result, null, 2)).toMatchFileSnapshot(
            join(__dirname, '__snapshots__', '1-simple-cup-trace.json')
        );
    });

  it('should convert multiple CPU profiles with different thread IDs into a trace file format', async () => {
    const profiles = [
      createTestProfileInfo(),
      createTestProfileInfo({ tid: 20002 }),
      createTestProfileInfo({tid: 20003, cpuProfile: {...minimalCpuProfile2, startTime: 20}}),
    ];

        const output = cpuProfilesToTraceFile(profiles);

        expect(getMainProfileInfoSpy).toHaveBeenCalledWith(profiles);
        await expect(JSON.stringify(output, null, 2)).toMatchFileSnapshot(
            join(__dirname, '__snapshots__', 'multiple-cup-pids-trace.json')
        );
    });

    it('should convert multiple CPU profiles with smosh option a trace file format', async () => {
        const profiles = [
            createTestProfileInfo(),
            createTestProfileInfo({pid: 10002, cpuProfile: {...minimalCpuProfile2, startTime: 20}}),
            createTestProfileInfo({tid: 20003, cpuProfile: {startTime: 40, endTime: 300}}),
        ];

        const output = cpuProfilesToTraceFile(profiles, { smosh: true });

        expect(getMainProfileInfoSpy).toHaveBeenCalledWith(profiles.map((z) => ({...z, pid: 1, tid: 1})));
        await expect(JSON.stringify(output, null, 2)).toMatchFileSnapshot(
            join(__dirname, '__snapshots__', 'multiple-cup-smoosh-trace.json')
        );
    });

    it('should throw error when no CPU profiles are provided', () => {
        expect(() => cpuProfilesToTraceFile([])).toThrow(
            'No CPU profiles provided'
        );
    });
});
