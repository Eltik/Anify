import { setIntervalImmediately } from "../helper";

export default class QueueExecutor<T> {
    id: string;
    private intervalId: NodeJS.Timer | undefined;
    private intervalN: number | undefined;
    private executorFunc: ((args: T, meta: any) => Promise<void>) | undefined;
    private callbackFunc: ((args: T) => Promise<void> | void) | undefined;
    private errorFunc: ((error: Error, args: T) => Promise<void> | void) | undefined;
    private runConditionFunc: (() => boolean) | undefined;

    private queue: Set<T> = new Set<T>();
    private metaMap: Map<T, any> = new Map<T, any>();
    private paused = false;
    private activeBySwitch = false;
    private active = true;
    private isExecuteAfterDone = false;
    private running = false;
    private isSelfRunning = false;

    constructor(id: string) {
        this.id = id;
    }

    selfRunning(): QueueExecutor<T> {
        this.isSelfRunning = true;

        return this;
    }

    interval(n: number): QueueExecutor<T> {
        this.intervalN = n;

        return this;
    }

    executor(func: (args: T, meta: any) => Promise<any>): QueueExecutor<T> {
        this.executorFunc = func;

        return this;
    }

    callback(func: (args: T) => Promise<any> | void): QueueExecutor<T> {
        this.callbackFunc = func;

        return this;
    }

    error(func: (error: Error, args: T) => Promise<any> | void): QueueExecutor<T> {
        this.errorFunc = func;

        return this;
    }

    add(arg: T, meta: any = undefined) {
        this.queue.add(arg);
        if (meta) {
            this.metaMap.set(arg, meta);
        }
    }

    executeAfterDone(): QueueExecutor<T> {
        this.isExecuteAfterDone = true;

        return this;
    }

    runCondition(func: () => boolean): QueueExecutor<T> {
        this.runConditionFunc = func;

        return this;
    }

    deactivate() {
        this.active = false;

        return this;
    }

    activate() {
        this.active = true;

        return this;
    }

    activateBySwitch() {
        this.activeBySwitch = true;

        return this;
    }

    start() {
        if (!this.intervalN || !this.executorFunc) throw new Error("Both interval and executor function need to be supplied");

        this.intervalId = setIntervalImmediately(async () => {
            if (this.paused || (this.queue.size <= 0 && !this.activeBySwitch && !this.isSelfRunning)) return;
            if (this.runConditionFunc && !this.runConditionFunc()) return;
            if (this.isExecuteAfterDone && this.running) return;

            if (this.activeBySwitch) {
                if (this.active) {
                    this.running = true;
                    if (this.executorFunc)
                        this.executorFunc(true as any, undefined)
                            .then((_) => {
                                if (this.callbackFunc) this.callbackFunc(true as any);
                                this.running = false;
                            })
                            .catch((err) => {
                                if (this.errorFunc) this.errorFunc(err, true as any);
                                this.running = false;
                            });
                }
            } else {
                if (this.isSelfRunning) {
                    if (this.executorFunc)
                        this.executorFunc(undefined as T, undefined)
                            .then((_) => {
                                if (this.callbackFunc) this.callbackFunc(undefined as T);
                                this.running = false;
                            })
                            .catch((err) => {
                                if (this.errorFunc) this.errorFunc(err, undefined as T);
                                this.running = false;
                            });
                } else {
                    const value = this.queue.values().next().value;
                    if (value) {
                        const meta = this.metaMap.get(value);
                        this.queue.delete(value);
                        this.metaMap.delete(value);
                        this.running = true;
                        if (this.executorFunc)
                            this.executorFunc(value, meta)
                                .then((_) => {
                                    if (this.callbackFunc) this.callbackFunc(value);
                                    this.running = false;
                                })
                                .catch((err) => {
                                    if (this.errorFunc) this.errorFunc(err, value);
                                    this.running = false;
                                });
                    }
                }
            }
        }, this.intervalN);

        return this;
    }

    pause() {
        this.paused = true;
    }

    unpause() {
        this.paused = false;
    }

    destroy() {
        this.queue.clear();
        clearInterval(this.intervalId);
    }
}
