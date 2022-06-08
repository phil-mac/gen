const reader = require('./reader');
const printer = require('./printer');
const { Env } = require('./env');
const core = require('./core');

const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout,
});

const repl_env = new Env();
for (let [key, value] of Object.entries(core.ns)) {
  repl_env.set(key, value);
}  
repl_env.set('eval', (ast) => EVAL(ast, repl_env));

let blocks = [];

function READ (input) {
  return reader.read_str(input);
}

function EVAL (ast, env) {
  
  while (true) {
    if (! (ast instanceof Array)) {
      return eval_ast(ast, env);
    }
    if (ast.length === 0) {
      return ast;
    } 
    
    ast = macroexpand(ast, env);
    if (! (ast instanceof Array)){
      return eval_ast(ast, env);
    }
    
    switch (ast[0]) {
      case 'block':
        const [x, y, z] = eval_ast(ast.slice(1), env);
        blocks.push({x, y, z});
        return 7;
      case 'def':
        const val = EVAL(ast[2], env);
        env.set(ast[1], val);
        return val;
      case 'let':
        const letEnv = new Env(env);
        const letBindings = ast[1];
        for (i = 0; i < letBindings.length; i += 2) {
          const val = EVAL(letBindings[i + 1], letEnv);
          letEnv.set(letBindings[i], val);
        }
        ast = ast[2];
        env = letEnv;
        break;
      case 'do':
        eval_ast(ast.slice(1, -1), env);
        ast = ast[ast.length - 1];
        break;
      case 'doseq':
        const doseqEnv = new Env(env);
        const doseqBindings = ast[1];

        function doseqEval (bindings, doseqEnv) {
          const list = EVAL(bindings[1], doseqEnv);
          for (const val of list) {
            doseqEnv.set(bindings[0], val);
            if (bindings.length === 2) {
              EVAL(ast[2], doseqEnv);
            } else {
              doseqEval(bindings.slice(2), doseqEnv);
            }
          }
        }

        doseqEval(doseqBindings, doseqEnv);

        // TODO: potential bug where this may produce the last block twice
        ast = ast[ast.length - 1];
        env = doseqEnv;
        break;
      case 'if':
        const conditional = EVAL(ast[1], env);
        if (conditional === null || conditional === false) {
          ast = ast[3];
          break;
        } else {
          ast = ast[2];
          break;
        }
      case 'fn':
        return {
          ast: ast[2],
          params: ast[1],
          env: env,
          fn: function() {
            const fnEnv = new Env(env, ast[1], arguments);
            return EVAL(ast[2], fnEnv);
          }
        } 
      case 'quote':
        return ast[1];
      case 'quasiquote':
        ast = quasiquote(ast[1]);
        break;
      case 'quasiquoteexpand':
        return quasiquote(ast[1]);
      case 'defmacro!':
        let macro = EVAL(ast[2], env);
        macro = {isMacro: true, fn: macro.fn};
        env.set(ast[1], macro);
        return macro.fn;
      case 'macroexpand':
        return macroexpand(ast[1], env);
      default:
        let [f, ...args] = eval_ast(ast, env);
        if (typeof f === 'object' && f.isMacro){
          f = f.fn;
        }
        if (typeof f === 'function'){
          return f.apply(undefined, args);
        } else {
          ast = f.ast;
          env = new Env(f.env, f.params, args);
          break;
        }
    }
  }
}

function eval_ast (ast, env) {
  if (typeof ast === 'string') {
    if (/^".*"$/gs.test(ast)) {
      return ast;
    } else {
      return env.get(ast);
    } 
  } else if (ast instanceof Array) {
    return ast.map(node => EVAL(node, env));
  } else {
    return ast;
  }
}

function quasiquote (ast) {
  if (ast instanceof Array && ast[0] === 'unquote') {
    return ast[1];
  } else if (ast instanceof Array) {
    let result = [];
    for (let i = ast.length - 1; i >= 0; i--) {
      const elt = ast[i];
      if (elt instanceof Array && elt[0] === 'splice-unquote'){
        result = ['concat', elt[1], result];
      } else {
        result = ['cons', quasiquote(elt), result];
      }
    }
    return result;
  } else if (typeof ast === 'string' && !/^".*"$/gs.test(ast)) {
    return ['quote', ast];
  } else {
    return ast;
  }
}

function is_macro_call (ast, env) {
  if (ast instanceof Array && ast.length > 0) {
    const firstEl = ast[0];
    if (typeof(firstEl) === 'string' && !/^".*"$/gs.test(firstEl)) {
      const symbol = firstEl;
      if (env.find(symbol)){
        const fn = env.get(symbol);
        if (!!fn && fn.isMacro) {
          return true;
        }
      }
    }
  }
  return false;
}

function macroexpand (ast, env) {
  let isMacro = is_macro_call(ast, env);
  while (isMacro) {
    const macro = env.get(ast[0]);
    ast = macro.fn.apply(undefined, ast.slice(1));
    isMacro = is_macro_call(ast, env);
  }
  return ast;
}

function PRINT (input) {
  return printer.pr_str(input);
}

function rep (input) {
  return PRINT(EVAL(READ(input), repl_env));
}

rep(`(def load-file (fn (f) (eval (read-string (str "(do " (slurp f) "nil)")))))`)

rep(`(def not (fn (a) (if a false true)))`)

function repl () {
  readline.question('user> ', input => {
    if (input === 'exit'){
      return;
    }
    try {
      const result = rep(input);
      const response = {result, blocks};
      console.log(response)
    } catch (e) {
      console.log(e.message);
    }
    blocks = [];
    repl();
  })
}

// repl();

function interpretString (input) {
  let result, error;
  try {
    result = rep(`(do ${input})`);
  } catch (e) {
    error = e.message; 
  }
  const response = { result, error, blocks };
  blocks = [];
  console.log(response);
  return response;
}

function test () {
  return interpretString(`(doseq (x (range 10 20) y (range 1 5)) (prn x))`);
}

test();

exports.interpretString = interpretString;