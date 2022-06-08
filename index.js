const express = require('express');
const cors = require('cors');
const { interpretString } = require('./interpreter.js')

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('hi');
});

app.post('/interpret', (req, res) => {
  const input = req.body.input;
  console.log(input)
  const result = interpretString(input);
  console.log({result});
  res.json({result});
  
})

app.listen();