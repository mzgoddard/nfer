export interface ResourceId<T = any> {
    index: number;
}

interface Stack<T> {
    push(item: T): any;
    pop(): T;
}

export interface Resource<T = any> {
    create(): T;
    destroy(item: T): void;
    clone(): Resource<T>;
}

export class StackedResource<T = any> {
    constructor(public factory: () => T, public unused: Stack<T> = []) {}

    create(): T {
        return this.unused.pop() || this.factory();
    }

    destroy(item: T) {
        this.unused.push(item);
    }

    clone() {
        return new StackedResource(this.factory, []);
    }
}

export class ListResource<T extends {next: T}> {
    head: T;

    constructor(public factory: () => T) {}

    create(): T {
        return this.head || this.factory();
    }

    destroy(item: T) {
        item.next = this.head;
        this.head = item;
    }

    clone() {
        return new ListResource<T>(this.factory);
    }
}

export class ResourceManager {
    resources: Resource[] = [];

    registerFactory<T>(factory: () => T) {
        return this.registerResource(new StackedResource(factory, []));
    }

    registerResource<T>(resource: Resource<T>) {
        const index = this.resources.length;
        this.resources.push(resource);
        return {index} as ResourceId<T>;
    }

    create<T>(id: ResourceId<T>): T {
        return this.resources[id.index].create();
    }

    destroy<T>(id: ResourceId<T>, item: T) {
        this.resources[id.index].destroy(item);
    }

    clone() {
        const copy = new ResourceManager();
        for (const resource of this.resources) {
            copy.registerResource(resource.clone());
        }
    }
}
