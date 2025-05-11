# CPU Profile Format Changes

## Current Format vs New Format

### Current Format
```typescript
interface CpuProfile {
    head: {
        id: number;
        functionName: string;
        url?: string;
        lineNumber?: number;
        children: any[];
    };
    startTime: string | number;
    endTime: string | number;
    samples: number[];
    title?: string;
}
```

### New Format
```typescript
interface CpuProfile {
    nodes: {
        id: number;
        callFrame: {
            functionName: string;
            scriptId: string;
            url: string;
            lineNumber: number;
            columnNumber: number;
        };
        children?: number[];
        hitCount?: number;
    }[];
    startTime: number;
    endTime: number;
    samples: number[];
    timeDeltas: number[];
}
```

## Required Changes

1. **Interface Updates**
   - Replace `head` property with `nodes` array
   - Add `timeDeltas` array property
   - Remove optional `title` property
   - Make `startTime` and `endTime` strictly number types

2. **Node Structure Changes**
   - Move function details into `callFrame` object
   - Add `scriptId` and `columnNumber` to function information
   - Change `children` from direct array to array of IDs
   - Add optional `hitCount` property
   - Make `url` required (empty string if not available)
   - Make `lineNumber` required (use -1 if not available)

3. **Stack Frame Mapping**
   - Update `StackFrameMapper` to handle new node structure
   - Include column numbers in stack frame names when available
   - Use script IDs for better identification
   - Handle hit counts in profiling data

4. **Test Updates**
   - Update test fixtures to match new format
   - Verify proper handling of script IDs
   - Test column number inclusion in stack traces

5. **Time Delta Support** (Optional Enhancement)
   - Add support for `timeDeltas` array
   - Use actual time deltas instead of evenly distributing time
   - Update sample weight calculations to use time deltas

## Implementation Steps

### Phase 1: Core Structure Update
1. Update `CpuProfile` interface in `index.ts`:
   ```typescript
   interface CallFrame {
       functionName: string;
       scriptId: string;
       url: string;
       lineNumber: number;
       columnNumber: number;
   }

   interface ProfileNode {
       id: number;
       callFrame: CallFrame;
       children?: number[];
       hitCount?: number;
   }

   interface CpuProfile {
       nodes: ProfileNode[];
       startTime: number;
       endTime: number;
       samples: number[];
       timeDeltas?: number[]; // Optional for initial implementation
   }
   ```

2. Update `StackFrameMapper`:
   ```typescript
   class StackFrameMapper {
       constructor(nodes: ProfileNode[], categorizer: Categorizer) {
           this.nodes = nodes;
           this.categorizer = categorizer;
       }

       private formatStackFrame(node: ProfileNode): string {
           const { functionName, url, lineNumber, columnNumber } = node.callFrame;
           return columnNumber >= 0 
               ? `${functionName} ${url}:${lineNumber}:${columnNumber}`
               : `${functionName} ${url}:${lineNumber}`;
       }

       map(): { [key: number]: StackFrame } {
           return this.nodes.reduce((frames, node) => {
               frames[node.id] = {
                   name: this.formatStackFrame(node),
                   category: this.categorizer.categorize(node.callFrame.functionName, node.callFrame.url),
                   parent: node.children?.[0]
               };
               return frames;
           }, {} as { [key: number]: StackFrame });
       }
   }
   ```

### Phase 2: Test Infrastructure
1. Update test fixtures with new format:
   ```typescript
   const minimalProfile = {
       nodes: [
           {
               id: 1,
               callFrame: {
                   functionName: '(root)',
                   scriptId: '0',
                   url: '',
                   lineNumber: -1,
                   columnNumber: -1
               },
               children: [2]
           },
           {
               id: 2,
               callFrame: {
                   functionName: 'main',
                   scriptId: '1',
                   url: 'file:///main.js',
                   lineNumber: 10,
                   columnNumber: 0
               },
               hitCount: 1
           }
       ],
       startTime: 100,
       endTime: 200,
       samples: [1, 2, 1],
       timeDeltas: [50, 25, 25]
   };
   ```

2. Add validation tests:
   ```typescript
   describe('traceviewify', () => {
       it('should handle node structure with callFrame', () => {
           // Test proper handling of callFrame structure
       });

       it('should include column numbers in stack frame names', () => {
           // Test column number formatting
       });

       it('should handle script IDs', () => {
           // Test script ID handling
       });
   });
   ```

### Phase 3: Time Delta Enhancement (Optional)
1. Update sample processing:
   ```typescript
   class SampleMapper {
       private calculateTimestamp(sampleIndex: number): number {
           if (this._timeDeltas) {
               return this._startTime + this._timeDeltas
                   .slice(0, sampleIndex)
                   .reduce((sum, delta) => sum + delta, 0);
           }
           // Fallback to even distribution
           return this._startTime + (sampleIndex * this._tickLen);
       }
   }
   ```

## Example Migration

### Before:
```typescript
const profile = {
    head: {
        id: 1,
        functionName: 'root',
        children: [{
            id: 2,
            functionName: 'main',
            url: 'file:///main.js',
            lineNumber: 10,
            children: []
        }]
    },
    startTime: 100,
    endTime: 200,
    samples: [1, 2, 1]
};
```

### After:
```typescript
const profile = {
    nodes: [
        {
            id: 1,
            callFrame: {
                functionName: '(root)',
                scriptId: '0',
                url: '',
                lineNumber: -1,
                columnNumber: -1
            },
            children: [2]
        },
        {
            id: 2,
            callFrame: {
                functionName: 'main',
                scriptId: '1',
                url: 'file:///main.js',
                lineNumber: 10,
                columnNumber: 0
            },
            hitCount: 1
        }
    ],
    startTime: 100,
    endTime: 200,
    samples: [1, 2, 1],
    timeDeltas: [50, 25, 25]
};
```

## Impact on Trace Viewer Output

The changes will affect:
1. Stack frame names (now including column numbers)
2. Timing accuracy (using actual time deltas)
3. Event timestamps (based on time deltas instead of even distribution)
4. Profile categorization (additional context from script IDs)

## Implementation Priority

1. Core structure updates (Phase 1)
2. Test infrastructure updates (Phase 2)
3. Time delta support (Phase 3, optional)
4. Documentation updates

