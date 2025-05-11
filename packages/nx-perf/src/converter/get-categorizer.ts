import { Categorizer } from './categorizer-default';
import IojsNodeCategorizer from './categorizer-iojs-node';
import DefaultCategorizer from './categorizer-default';

interface CpuProfile {
    title?: string;
    head?: {
        functionName?: string;
    };
}

interface CategorizerConstructor {
    new(indicators: string[]): Categorizer;
    canCategorize(indicators: string[]): boolean;
}

const categorizers: CategorizerConstructor[] = [
    IojsNodeCategorizer,
    DefaultCategorizer
];

export function getCategorizer(cpuprofile: CpuProfile): Categorizer {
    const indicators: string[] = [];

    // i.e. iojs -profile 1ms --> iojs
    if (cpuprofile.title?.length) {
        indicators.push(cpuprofile.title.split(' ')[0]);
    }
    
    if (cpuprofile.head?.functionName) {
        indicators.push(cpuprofile.head.functionName);
    }

    for (const Categorizer of categorizers) {
        if (Categorizer.canCategorize(indicators)) {
            return new Categorizer(indicators);
        }
    }

    // This should never happen as DefaultCategorizer always returns true
    return new DefaultCategorizer(indicators);
}

export default getCategorizer; 