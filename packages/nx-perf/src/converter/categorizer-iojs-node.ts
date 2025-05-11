import { Categorizer } from './categorizer-default';

interface Category {
    regex: RegExp;
    name: string;
}

export class IojsNodeCategorizer implements Categorizer {
    private readonly _cache: { [key: string]: string };
    private readonly categories: Category[] = [
        { regex: /^uv_/, name: 'libuv' },
        { regex: /^http_/, name: 'http_parser' },
        { regex: /^v8::/, name: 'v8' },
        { regex: /^lib/, name: 'system' },
        { regex: /^iojs::/, name: 'io.js' },
        { regex: /^(?:\*|\~|native )|\.js/, name: 'JavaScript' },
        { regex: /^(?:node::|void node::|_register_tty|start)/, name: 'node' }
    ];

    constructor(indicators: string[]) {
        this._cache = {};
    }

    categorize(name: string, url?: string): string {
        if (url && /\.js$/.test(url)) return 'JavaScript';

        if (!this._cache[name]) {
            let found: string | undefined;
            
            for (const category of this.categories) {
                if (category.regex.test(name)) {
                    found = category.name;
                    break;
                }
            }

            this._cache[name] = found || 'Unknown';
        }

        return this._cache[name];
    }

    static canCategorize(indicators: string[]): boolean {
        return indicators.includes('iojs') || indicators.includes('node');
    }
}

export default IojsNodeCategorizer; 