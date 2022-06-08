function Env (outer, binds, exprs) {
  this.outer = outer;
  this.data = {};
  this.set = (sym, val) => this.data[sym] = val;
  this.find = sym => {
    if (sym in this.data) {
      return this;    
    } else {
      return this.outer ? this.outer.find(sym) : null
    } 
  }
  this.get = sym => {
    const env = this.find(sym);
    if (!!env){
      return env.data[sym];
    } else {
      throw new Error(`${sym} not found.`);
    }
  }
  if (binds && exprs && binds.length === exprs.length){
    binds.forEach((symbol, i) => {
      this.set(symbol, exprs[i]);
    })
  }
}

exports.Env = Env;