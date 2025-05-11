import { Categorizer } from './categorizer-default';

interface CallGraphNode {
    id: number;
    functionName: string;
    url?: string;
    lineNumber?: number;
    children: CallGraphNode[];
}

export interface StackFrame {
    category: string;
    name: string;
    parent?: number;
}

function nodeName(node: CallGraphNode): string {
    let n = node.functionName;
    if (node.url) {
        n += ' ' + node.url + ':' + node.lineNumber;
    }
    return n;
}

export class StackFrameMapper {
    private readonly _callgraphRoot: CallGraphNode;
    private readonly _categorizer: Categorizer;
    private readonly _frames: { [key: number]: StackFrame };

    constructor(callgraphRoot: CallGraphNode, categorizer: Categorizer) {
        this._callgraphRoot = callgraphRoot;
        this._categorizer = categorizer;
        this._frames = {};
    }

    private _addFrame(node: CallGraphNode, parent?: number): void {
        const id = node.id;

        // root node has no parent, also protect against circular references
        if (typeof parent === 'undefined' || id === parent) {
            this._frames[id] = {
                category: this._categorizer.categorize(node.functionName, node.url),
                name: nodeName(node)
            };
        } else {
            this._frames[id] = {
                category: this._categorizer.categorize(node.functionName, node.url),
                name: nodeName(node),
                parent: parent
            };
        }

        for (const child of node.children) {
            this._addFrame(child, id);
        }
    }

    map(): { [key: number]: StackFrame } {
        this._addFrame(this._callgraphRoot);
        return this._frames;
    }
}

export default StackFrameMapper; 