const fs = require('node:fs');
const solc = require('solc');
const source = fs.readFileSync('Blockchain/src/RestaurantLoyalty.sol', 'utf8');
const output = JSON.parse(solc.compile(JSON.stringify({ language: 'Solidity', sources: { 'RestaurantLoyalty.sol': { content: source } }, settings: { outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } } } })));
const errors = (output.errors || []).filter(error => error.severity === 'error');
if (errors.length) { console.error(errors.map(error => error.formattedMessage).join('\n')); process.exit(1); }
const contract = output.contracts['RestaurantLoyalty.sol'].RestaurantLoyalty;
if (!contract.evm.bytecode.object) throw new Error('Contract bytecode missing');
console.log('Solidity compilation passed: ' + solc.version());
