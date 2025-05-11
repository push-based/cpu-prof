import { describe, it, expect } from 'vitest';
import { traceviewify } from './index';

describe('traceviewify', () => {
    it('should convert a minimal CPU profile to trace viewer format', () => {
        const minimalProfile = {
            head: {
                id: 1,
                functionName: 'root',
                children: [
                    {
                        id: 2,
                        functionName: 'main',
                        url: 'file:///main.js',
                        lineNumber: 10,
                        children: []
                    }
                ]
            },
            startTime: 100,
            endTime: 200,
            samples: [1, 2, 1],
            title: 'Test Profile'
        };

        const result = traceviewify(minimalProfile, { pid: 1234, tid: 5678, cpu: 0 });

        expect(result).toMatchInlineSnapshot(`
          {
            "samples": [
              {
                "cpu": 0,
                "name": "Test Profile",
                "sf": 1,
                "tid": 5678,
                "ts": 100000000,
                "weight": 33333333.333333332,
              },
              {
                "cpu": 0,
                "name": "Test Profile",
                "sf": 2,
                "tid": 5678,
                "ts": 133333333.33333333,
                "weight": 33333333.333333332,
              },
              {
                "cpu": 0,
                "name": "Test Profile",
                "sf": 1,
                "tid": 5678,
                "ts": 166666666.66666666,
                "weight": 33333333.333333332,
              },
            ],
            "stackFrames": {
              "2": {
                "category": "Test",
                "name": "root",
              },
              "3": {
                "category": "Test",
                "name": "main file:///main.js:10",
                "parent": 2,
              },
            },
            "traceEvents": [
              {
                "args": {},
                "cat": "Test Profile",
                "name": "root",
                "ph": "B",
                "pid": 1234,
                "tid": 5678,
                "ts": 100000000,
              },
              {
                "args": {},
                "cat": "Test Profile",
                "name": "main file:///main.js:10",
                "ph": "B",
                "pid": 1234,
                "tid": 5678,
                "ts": 133333333.33333333,
              },
              {
                "args": {},
                "cat": "Test Profile",
                "name": "main file:///main.js:10",
                "ph": "E",
                "pid": 1234,
                "tid": 5678,
                "ts": 166666666.66666666,
              },
              {
                "args": {},
                "cat": "Test Profile",
                "name": "root",
                "ph": "E",
                "pid": 1234,
                "tid": 5678,
                "ts": 200000000,
              },
            ],
          }
        `);
    });
}); 