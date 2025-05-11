import { StackFrame } from './stackframe-mapper';

interface Sample {
    name: string;
    weight: number;
    ts: number;
    sf: number;
    tid: number;
    cpu: number;
}

interface Event {
    name: string;
    cat: string;
    ph: 'B' | 'E';
    pid: number;
    tid: number;
    ts: number;
    args: Record<string, unknown>;
}

interface SampleInfo {
    id: number;
    ticks: number;
}

function getParentIds(frames: { [key: number]: StackFrame }, node: StackFrame): number[] {
    const acc: number[] = [];
    let currentNode = node;
    
    while (currentNode.parent) {
        const id = currentNode.parent;
        currentNode = frames[id];
        acc.push(id);
    }
    
    return acc;
}

export class SampleMapper {
    private readonly _frames: { [key: number]: StackFrame };
    private readonly _startTime: number;
    private readonly _endTime: number;
    private readonly _samplesIn: number[];
    private readonly _samplesInLen: number;
    private readonly _tickLen: number;
    private readonly _name: string;
    private readonly _pid: number;
    private readonly _tid: number;
    private readonly _cpu: number;

    private readonly _inside: { [key: number]: boolean } = {};
    private readonly _infos: SampleInfo[] = [];
    private readonly _events: Event[] = [];
    private readonly _samples: Sample[] = [];

    private _previousFunctionExit?: Event;
    private _previousFunctionId?: number;

    constructor(
        frames: { [key: number]: StackFrame },
        startTime: number,
        endTime: number,
        samples: number[],
        name: string,
        pid: number,
        tid: number,
        cpu: number
    ) {
        this._frames = frames;
        this._startTime = startTime;
        this._endTime = endTime;
        this._samplesIn = samples;
        this._samplesInLen = this._samplesIn.length;
        this._tickLen = (this._endTime - this._startTime) / this._samplesInLen;

        this._name = name;
        this._pid = pid;
        this._tid = tid;
        this._cpu = cpu;
    }

    map(): { samples: Sample[]; events: Event[] } {
        this._consolidateSamples();
        return this._processInfos();
    }

    private _consolidateSamples(): void {
        // Consolidate cases in which the same script ID appears in a row
        // In that case we'll increase its ticks count
        let prevId = -1;
        let prevInfo: SampleInfo | undefined;

        for (let i = 0; i < this._samplesInLen; i++) {
            if (this._samplesIn[i] === prevId) {
                if (prevInfo) {
                    prevInfo.ticks++;
                }
            } else {
                prevId = this._samplesIn[i];
                prevInfo = { id: prevId, ticks: 1 };
                this._infos.push(prevInfo);
            }
        }
    }

    private _addSample(info: SampleInfo, timestamp: number): void {
        this._samples.push({
            name: this._name,
            weight: info.ticks * this._tickLen,
            ts: timestamp,
            sf: info.id,
            tid: this._tid,
            cpu: this._cpu
        });
    }

    private _maybeExitPreviousFunction(parentIds: number[]): void {
        // Only if the previous leaf function is not part of the parents anymore did we actually exit it
        if (this._previousFunctionExit && this._previousFunctionId !== undefined && !parentIds.includes(this._previousFunctionId)) {
            this._events.push(this._previousFunctionExit);
            this._inside[this._previousFunctionId] = false;
        }
    }

    private _exitParentsNowOffStack(parentIds: number[], info: SampleInfo): void {
        // Some functions were part of the stack of the previous function, but aren't part 
        // of the stack of the current one.
        // Therefore we need to emit exit events for them.
        for (const [key, isInside] of Object.entries(this._inside)) {
            const id = parseInt(key);
            if (isInside && id !== info.id && id !== this._previousFunctionId && !parentIds.includes(id)) {
                this._events.push({
                    name: this._frames[id].name,
                    cat: this._name,
                    ph: 'E',
                    pid: this._pid,
                    tid: this._tid,
                    ts: this._previousFunctionExit?.ts ?? this._endTime,
                    args: {}
                });

                this._inside[id] = false;
            }
        }
    }

    private _enterParentsNewOnStack(parentIds: number[], timestamp: number): void {
        // We might have entered parent functions that called the current function
        // Ensure to raise an event that they have been entered
        for (let j = parentIds.length - 1; j >= 0; j--) {
            const id = parentIds[j];
            if (!this._inside[id]) {
                this._events.push({
                    name: this._frames[id].name,
                    cat: this._name,
                    ph: 'B',
                    pid: this._pid,
                    tid: this._tid,
                    ts: timestamp,
                    args: {}
                });
                this._inside[id] = true;
            }
        }
    }

    private _enterCurrentFunction(info: SampleInfo, stackFrame: StackFrame, timestamp: number): void {
        // Enter current function
        if (!this._inside[info.id]) {
            this._events.push({
                name: stackFrame.name,
                cat: this._name,
                ph: 'B',
                pid: this._pid,
                tid: this._tid,
                ts: timestamp,
                args: {}
            });
            this._inside[info.id] = true;
        }

        // Define exit event of current function to be used when processing next function
        this._previousFunctionExit = {
            name: stackFrame.name,
            cat: this._name,
            ph: 'E',
            pid: this._pid,
            tid: this._tid,
            ts: timestamp + (info.ticks * this._tickLen),
            args: {}
        };

        this._previousFunctionId = info.id;
    }

    private _exitAllRemainingFunctions(): void {
        for (const [key, isInside] of Object.entries(this._inside)) {
            if (isInside) {
                const id = parseInt(key);
                this._events.push({
                    name: this._frames[id].name,
                    cat: this._name,
                    ph: 'E',
                    pid: this._pid,
                    tid: this._tid,
                    ts: this._endTime,
                    args: {}
                });
            }
        }
    }

    private _processInfos(): { samples: Sample[]; events: Event[] } {
        let currentTick = 0;

        for (const info of this._infos) {
            const ts = this._startTime + (this._tickLen * currentTick);
            const stackFrame = this._frames[info.id];

            this._addSample(info, ts);

            // Get IDs of all functions that are parents to this function
            const parentIds = getParentIds(this._frames, stackFrame);
            this._maybeExitPreviousFunction(parentIds);

            this._exitParentsNowOffStack(parentIds, info);
            
            this._enterParentsNewOnStack(parentIds, ts);

            this._enterCurrentFunction(info, stackFrame, ts);
            
            currentTick += info.ticks;
        }

        // Finally exit all functions we are still in after all is finished
        this._exitAllRemainingFunctions();

        return { samples: this._samples, events: this._events };
    }
}

export default SampleMapper; 