# IdleBatchedMint

The `IdleBatchedMint` contract allows to queue multiple deposits of underlying tokens and
send them to its `IdleToken` contract to mint Idle tokens in batches, allowing multiple users to
avoid paying high gas fees for the final `mintIdleToken` transaction.

## Example:

* User A calls `IdleBatchedMint.deposit(uint256 amount)`
* User B calls `IdleBatchedMint.deposit(uint256 amount)`
* User C calls `IdleBatchedMint.deposit(uint256 amount)`
* Any user can call `IdleBatchedMint.executeBatch(bool _skipRebalance)`

After the last step, the `IdleBatchedMint` contract is the owner of the Idle tokens, but at any point in time,
users A, B, and C can call `IdleBatchedMint.withdraw(uint256 batchId)` to withdraw their own Idle tokens.

## Setup

`yarn install`


## Tests

`npx hardhat test`

## Integration test with network fork

Start a mainnet fork:

```
export IDLE_INFURA_KEY=YOUR_INFURA_KEY
./fork.sh mainnet # or ./fork.sh kovan
```

Run the test:

```
export HOLDER=0x.... # address of an account with DAI funds
npx hardhat run scripts/integration_test.js --network local
```
