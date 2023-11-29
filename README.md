
# Biconomy Custom session storage tutorial

This Repository is used in the custom session storage guide for the [Biconomy SDK](https://docs.biconomy.io/docs/quickstart) as well as the Node JS guides.

It includes a script to create session and session details will be stored files. One will need to create two file in the root folder with ${ smartAccountAddress }_sessions.json and ${ smartAccountAddress }_signers.json. For example if the account address is 0x123 then create 0x123_sessions.json and 0x123_signers.json.
It also contains a script to execute ERC20 transfers using that session.
Smart account needs to have the funds to perform the transactions, this will run on Mumbai testnet. And we are transferring USDC, So one will need to have USDC and matic in the smart account.

## Installation

Clone this repository and then run

```bash
  npm i
  npx ts-node ./src/index.ts  // creates session
  npx ts-node ./src/erc20Transfer.ts // execute ERC20 transactions
```

Alternatively you can use `npm` or `pnpm` if that suits you. 

The main purpose of this repository is to implement a custom file storage and use as session storage. 



## Pull requests welcome

Have any improvements to be made? Feel free to make a Pull Request! 