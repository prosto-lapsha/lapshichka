module.exports = class IteratorWithFilter {
    constructor(somethingWithIterator) {
        const iterator = somethingWithIterator[Symbol.iterator];
        if (!iterator) {
            throw new Error('Filterable iterable accepts only objects that are iterable');
        }
        this.iterator = iterator.call(somethingWithIterator);
        this.predicates = [];
    }
    
    addPredicate(predicate) {
        this.predicates.push(predicate);
    }
    
    toArray() {
        const predicate = (item) => this.predicates.reduce((result, nextPredicate) => {
            return result && nextPredicate(item);
        }, true);
        const result = [];
        let { value, done } = this.iterator.next();
        while (!done) {
            if (predicate(value)) {
                result.push(value);
            }
            
            const { value: nextValue, done: nextDone } = this.iterator.next();
            value = nextValue;
            done = nextDone;
        }
        
        return result;
    }
}