const reader = require('./reader');
const fs = require('fs');

const ns = {
  '+': (a, b) => a + b,
  '-': (a, b) => a - b,
  '*': (a, b) => a * b,
  '/': (a, b) => a / b,
  '<': (a, b) => a < b,
  '<=': (a, b) => a <= b,
  '>': (a, b) => a > b,
  '>=': (a, b) => a >= b,
  'inc': (x) => x + 1,
  'range': (start, end) => {
    let range = [];
    for (let i = start; i < end; i++) {
      range.push(i);
    }
    return range;
  },
  'str': (...params) => {
    let newString = params.join('');
    if (!/^".*"$/gs.test(newString)){
      newString = `"${newString}"`
    }
    return newString;
  },
  'list': (...params) => params,
  'list?': (list) => list instanceof Array,
  'empty?': (list) => list.length === 0,
  'count': (list) => list instanceof Array ? list.length : 0,
  '=': (a, b) => {
    if ((typeof(a) === typeof(b)) && (a === b)){
      return true;
    }
    if (a instanceof Array &&
        b instanceof Array && 
        a.length === b.length){
      let isEqual = true; 
      for (i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
          isEqual = false;
        }
      }
      return isEqual;
    }
    return false;
  },
  'prn': (x) => {
    console.log(x);
    // PMTODO: something with `print_readably`? 
    return x;
  },
  'read-string': (input) => {
    input = input.slice(1, -1)
    return reader.read_str(input);
  },
  'slurp': (filename) =>  { 
    filename = filename.slice(1, -1);
    return `"${fs.readFileSync(filename, 'utf8')}"`;
  },
  'atom': (val) => ({val}),
  'atom?': (input) => typeof input === 'object' ? "val" in input : false,
  'deref': (atom) => atom.val,
  'reset!': (atom, newVal) => atom.val = newVal,
  'swap!': (atom, fnObj, ...args) => {
    const fn = typeof fnObj === 'function' ? fnObj : fnObj.fn;
    atom.val = fn.apply(undefined, [atom.val, ...args]);
    return atom.val;
  },
  'cons': (item, list) => [item, ...list],
  'concat': (first, ...rest) => {
    if (!!first && first instanceof Array){
      return first.concat(...rest);
    } else 
      return [];
  },
  'nth': (list, index) => {
    if (list instanceof Array && list.length > index) {
      return list[index];
    }
    throw new Error('Error: index out of range')
  },
  'first': (list) => {
    if (list instanceof Array && list.length > 0) {
      return list[0];
    }
    return null;
  },
  'rest': (list) => {
    if (list instanceof Array && list.length > 1) {
      return list.slice(1);
    }
    return [];
  }
};

exports.ns = ns;