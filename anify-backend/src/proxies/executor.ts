export default class ChunkedExecutor<T, R> {
    private items: T[];
    private chunkSize: number;
    private executor: (item: T) => Promise<R>;
    private perChunkCallback?: (chunk: T[]) => void;
    private perResultCallback?: (result: R[]) => void;
    constructor(items: T[], chunkSize: number, executor: (item: T) => Promise<R>, perChunkCallback?: (chunk: T[]) => void, perResultCallback?: (result: R[]) => void) {
        this.items = items;
        this.chunkSize = chunkSize;
        this.executor = executor;
        this.perChunkCallback = perChunkCallback;
        this.perResultCallback = perResultCallback;
    }

    public async execute(): Promise<R[]> {
        const results: R[] = [];
        for (let i = 0; i < this.items.length; i += this.chunkSize) {
            const chunk = this.items.slice(i, i + this.chunkSize);
            if (this.perChunkCallback) {
                this.perChunkCallback(chunk);
            }
            const promises = chunk.map((item) => this.executor(item));
            const chunkResults = await Promise.all(promises);
            results.push(...chunkResults.filter((result) => result !== null));
            if (this.perResultCallback) {
                this.perResultCallback(results);
            }
        }
        return results;
    }
}
