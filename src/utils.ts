

class Observable<T> {
  private value: T;
  private changeListener: {(value: T): void}[] = [];
  set(value:T): void {
    let changed: boolean = (value !== this.value);
	this.value = value;
	if(changed)
	  this.changeListener.filter(listener=>listener).forEach(listener=>listener(value));
  }
  constructor(value:T) {
    this.value =value;
  }
  get(): T {
    return this.value;
  }
  addChangeListener(listener: {(value: T): void }): number {
    return this.changeListener.push(listener) - 1;
  }
  
  removeChangeListener(index: number) : void {
    this.changeListener[index] = null;
  }
}

class ObservableArray<T> {
  private value: Array<T>;
  private listener: {(value: Array<T>): void}[] = [];
  set(value:Array<T>): void {
	  this.value = value;
	  this.listener.filter(listener=>listener).forEach(listener=>listener(value));
  }
  constructor(value: Array<T>) {
    this.value =value;
  }
  get(): Array<T> {
    return this.value;
  }
  addListener(listener: {(value: Array<T>): void }): number {
    return this.listener.push(listener) - 1;
  }
  
  removeListener(index: number) : void {
    this.listener[index] = null;
  }
}

class ObservableMap<S,T> {
  private map: Map<S,T> = new Map<S,T>();
  private changeListener: {(key: S, value: T): void }[] = [];
  
  set(key: S, value: T): void {
    let changed = this.map.get(key) !== value;
    this.map.set(key, value);
	if(changed) 
	  this.changeListener.filter(listener=>listener).forEach(listener=>listener(key, value));
  }
  
  get(key: S): T {
    return this.map.get(key);
  }
  addChangeListener(listener: {(key: S, value: T): void }): number {
    return this.changeListener.push(listener) - 1;
  }
  
  removeChangeListener(index: number) : void {
    this.changeListener[index] = null;
  }
  getAll():Map<S,T> {
    return this.map;
  }
}

function removeItem<T>(arr: Array<T>, value: T): Array<T> { 
  const index = arr.indexOf(value);
  if (index > -1) {
    arr.splice(index, 1);
  }
  return arr;
}

function moveElement<Type>(array: Type[], fromIndex: number, toIndex: number): Type[] {
    let startEntry = array[fromIndex];
    if(toIndex>fromIndex) {
      for(let i = fromIndex; i < toIndex; i++) {
        array[i] = array[i+1];
      }
      array[toIndex] = startEntry;
    } else if(toIndex<fromIndex) {
      for(let i = fromIndex; i > toIndex; i--) {
        array[i] = array[i-1];
      }
      array[toIndex] = startEntry;
    }
	return array;
}