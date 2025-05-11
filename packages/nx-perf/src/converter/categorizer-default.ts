export interface Categorizer {
    categorize(name: string, url?: string): string;
}

export class DefaultCategorizer implements Categorizer {
    private readonly _category: string;

    constructor(indicators: string[]) {
        this._category = indicators[0] || 'CPU';
    }

    categorize(name: string, url?: string): string {
        return this._category;
    }

    static canCategorize(): boolean {
        // we get called when all other categorizers passed
        return true;
    }
}

export default DefaultCategorizer; 